import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { checkRateLimit } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitResult = await checkRateLimit(
      supabaseClient,
      clientIp,
      'transfer-escrow-to-wallet',
      20,
      60
    );
    
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded', 
          message: rateLimitResult.message 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    const jwt = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amount, pin } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Transfer request:', { userId: user.id, amount });

    // Get user data
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('escrow_balance, wallet_balance, pin_hash, name')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify PIN
    const pinValid = await bcrypt.compare(pin, userData.pin_hash);
    if (!pinValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check sufficient escrow balance
    if (userData.escrow_balance < amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient escrow balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use admin client for balance updates
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Deduct from escrow
    const { error: escrowError } = await supabaseAdmin.rpc('update_escrow_balance', {
      p_user_id: user.id,
      p_amount: -amount
    });

    if (escrowError) {
      console.error('Error updating escrow:', escrowError);
      throw new Error('Failed to update escrow balance');
    }

    // Credit to wallet
    const { error: walletError } = await supabaseAdmin.rpc('update_wallet_balance', {
      p_user_id: user.id,
      p_amount: amount
    });

    if (walletError) {
      console.error('Error updating wallet:', walletError);
      // Rollback escrow deduction
      await supabaseAdmin.rpc('update_escrow_balance', {
        p_user_id: user.id,
        p_amount: amount
      });
      throw new Error('Failed to update wallet balance');
    }

    // Record transaction
    const transactionId = `TRANSFER-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'transfer',
        amount: amount,
        status: 'completed',
        details: {
          transfer_type: 'escrow_to_wallet',
          transaction_id: transactionId,
          from_balance: 'escrow',
          to_balance: 'wallet'
        }
      });

    // Log audit trail
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'ESCROW_TO_WALLET_TRANSFER',
        resource_type: 'users',
        resource_id: user.id,
        metadata: {
          amount,
          transaction_id: transactionId,
          previous_escrow: userData.escrow_balance,
          previous_wallet: userData.wallet_balance,
          new_escrow: userData.escrow_balance - amount,
          new_wallet: userData.wallet_balance + amount
        }
      });

    console.log('Transfer completed successfully:', { transactionId, amount });

    return new Response(
      JSON.stringify({ 
        success: true,
        transaction_id: transactionId,
        new_escrow_balance: userData.escrow_balance - amount,
        new_wallet_balance: userData.wallet_balance + amount,
        amount_transferred: amount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error transferring escrow to wallet:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
