import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { checkRateLimit } from "../_shared/rateLimiter.ts";
import { PaychanguService } from "../_shared/paychangu.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Instant payout fee (MWK 1500)
const INSTANT_PAYOUT_FEE = 1500;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Also create user client for auth
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
      'process-instant-payout',
      50,
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

    // Extract JWT and authenticate user
    const authHeader = req.headers.get('Authorization');
    const jwt = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { payoutId, pin } = await req.json();

    console.log('Processing instant payout:', { payoutId, user: user.id });

    // Fetch PayChangu configuration from api_configurations
    const { data: payConfig, error: configError } = await supabaseAdmin
      .from('api_configurations')
      .select('*')
      .eq('provider', 'paychangu')
      .eq('enabled', true)
      .order('test_mode', { ascending: false }) // Prefer live mode if both enabled
      .limit(1)
      .maybeSingle();

    if (configError || !payConfig || !payConfig.api_key) {
      console.error('PayChangu not configured:', configError);
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Using PayChangu ${payConfig.test_mode ? 'TEST' : 'LIVE'} mode for instant payout`);

    // Get user data and verify PIN
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('pin_hash, escrow_balance, name')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify PIN
    const pinValid = await bcrypt.compare(pin, userData.pin_hash);
    if (!pinValid) {
      console.error('Invalid PIN');
      return new Response(
        JSON.stringify({ error: 'Invalid PIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payout details
    const { data: payout, error: payoutError } = await supabaseClient
      .from('payouts')
      .select('*')
      .eq('id', payoutId)
      .eq('recipient_id', user.id)
      .eq('status', 'pending')
      .single();

    if (payoutError || !payout) {
      console.error('Payout not found:', payoutError);
      return new Response(
        JSON.stringify({ error: 'Payout not found or already processed' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate fees (11% total: 10% platform + 1% reserve)
    const instantFee = 1500; // Fixed instant payout fee
    const feeAmount = payout.gross_amount * 0.11;
    const platformFee = payout.gross_amount * 0.10; // 10% for platform earnings
    const reserveFee = payout.gross_amount * 0.01;  // 1% for reserve wallet
    const totalFees = feeAmount + instantFee;
    const netPayout = payout.gross_amount - totalFees;

    // Check if user has sufficient escrow balance
    if (userData.escrow_balance < payout.gross_amount) {
      console.error('Insufficient escrow balance');
      return new Response(
        JSON.stringify({ error: 'Insufficient escrow balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's primary payment method (mobile money or bank account)
    const { data: mobileAccount } = await supabaseClient
      .from('mobile_money_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .maybeSingle();

    const { data: bankAccount } = await supabaseClient
      .from('bank_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .maybeSingle();

    if (!mobileAccount && !bankAccount) {
      return new Response(
        JSON.stringify({ error: 'No payment method found. Please add a mobile money or bank account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique charge ID for payout
    const chargeId = `IPO-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Prepare payment request using unified PaychanguService
    const paymentRequest: any = {
      type: 'payout',
      method: mobileAccount ? 'mobile_money' : 'bank_transfer',
      amount: netPayout,
      chargeId,
      currency: 'MWK',
    };

    if (mobileAccount) {
      paymentRequest.phoneNumber = mobileAccount.phone_number;
      paymentRequest.provider = mobileAccount.provider;
      paymentRequest.accountName = userData.name || mobileAccount.account_name || 'User';
      console.log('Mobile money payout:', { provider: mobileAccount.provider, phone: mobileAccount.phone_number });
    } else if (bankAccount) {
      paymentRequest.accountNumber = bankAccount.account_number;
      paymentRequest.accountName = bankAccount.account_name;
      paymentRequest.bankName = bankAccount.bank_name;
      console.log('Bank payout:', { bank: bankAccount.bank_name, account: bankAccount.account_number });
    }

    console.log('Processing payout via PaychanguService:', { chargeId, method: paymentRequest.method });

    // Process payment via unified service
    const paymentResult = await PaychanguService.processPayment(
      {
        secretKey: payConfig.api_key,
        baseUrl: 'https://api.paychangu.com',
      },
      paymentRequest
    );

    if (!paymentResult.success) {
      console.error('Payout failed:', paymentResult.error);
      return new Response(
        JSON.stringify({ 
          error: paymentResult.error || 'Payout initialization failed',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paychanguTxn = paymentResult.transaction;

    // Update escrow balance (debit)
    const { error: escrowError } = await supabaseClient.rpc('update_escrow_balance', {
      p_user_id: user.id,
      p_amount: -payout.gross_amount
    });

    if (escrowError) {
      console.error('Error updating escrow:', escrowError);
      return new Response(
        JSON.stringify({ error: 'Failed to update escrow balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payout status with Paychangu transaction details
    const { error: payoutUpdateError } = await supabaseClient
      .from('payouts')
      .update({
        status: paychanguTxn.status === 'pending' ? 'processing' : 'completed',
        processed_at: new Date().toISOString(),
        amount: netPayout,
        fee_amount: totalFees,
        mobile_money_reference: paychanguTxn.ref_id
      })
      .eq('id', payoutId);

    if (payoutUpdateError) {
      console.error('Error updating payout:', payoutUpdateError);
      // Try to rollback escrow
      await supabaseClient.rpc('update_escrow_balance', {
        p_user_id: user.id,
        p_amount: payout.gross_amount
      });
      return new Response(
        JSON.stringify({ error: 'Failed to process payout' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create transaction record
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'payout',
        amount: payout.gross_amount,
        status: paychanguTxn.status === 'pending' ? 'processing' : 'completed',
        group_id: payout.group_id,
        details: {
          instant_fee: instantFee,
          fee: feeAmount,
          net_payout: netPayout,
          payout_type: 'instant',
          charge_id: chargeId,
          paychangu_ref_id: paychanguTxn.ref_id,
          paychangu_trace_id: paychanguTxn.trace_id,
          payment_method_type: mobileAccount ? 'mobile_money' : 'bank_account'
        }
      });

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
    }

    // Route 1% to reserve wallet using service role client
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseAdmin.rpc('add_to_reserve_wallet', {
        p_amount: reserveFee,
        p_group_id: payout.group_id,
        p_user_id: user.id,
        p_reason: `Reserve contribution from instant payout ${payoutId}`
      });
      console.log(`Added ${reserveFee} to reserve wallet from instant payout ${payoutId}`);
    } catch (reserveError) {
      console.error(`Error adding to reserve wallet for instant payout ${payoutId}:`, reserveError);
    }

    // Create revenue transaction records (10% platform fee only)
    const { error: revenueError } = await supabaseClient
      .from('revenue_transactions')
      .insert([
        {
          transaction_id: payoutId,
          user_id: user.id,
          group_id: payout.group_id,
          revenue_type: 'fee',
          amount: platformFee,
          original_payout_amount: payout.gross_amount,
          net_payout: netPayout,
          fee_percentage: 10
        },
        {
          transaction_id: payoutId,
          user_id: user.id,
          group_id: payout.group_id,
          revenue_type: 'instant_payout_fee',
          amount: instantFee,
          original_payout_amount: payout.gross_amount,
          net_payout: netPayout
        }
      ]);

    if (revenueError) {
      console.error('Error creating revenue transactions:', revenueError);
    }

    // Update trust score
    const { error: trustError } = await supabaseClient.rpc('update_trust_score', {
      p_user_id: user.id,
      p_change_amount: 2,
      p_reason: 'Instant payout received'
    });

    if (trustError) {
      console.error('Error updating trust score:', trustError);
    }

    // Send success notification to user
    try {
      await supabaseClient.functions.invoke('send-push-notification', {
        body: {
          userIds: [user.id],
          title: 'Instant Payout Processed',
          body: `Your instant payout of MWK ${netPayout.toLocaleString()} has been processed. Instant fee: MWK ${instantFee.toLocaleString()}, Total fees: MWK ${totalFees.toLocaleString()}`,
          data: {
            type: 'instant_payout_success',
            payoutId,
            netAmount: netPayout.toString(),
            instantFee: instantFee.toString(),
            totalFees: totalFees.toString(),
          },
        },
      });
    } catch (notifError) {
      console.error('Failed to send instant payout notification:', notifError);
    }

    // Notify group members about instant payout
    try {
      const { data: groupMembers } = await supabaseClient
        .from('group_members')
        .select('user_id')
        .eq('group_id', payout.group_id)
        .neq('user_id', user.id);

      if (groupMembers && groupMembers.length > 0) {
        const memberIds = groupMembers.map(m => m.user_id);
        await supabaseClient.functions.invoke('send-push-notification', {
          body: {
            userIds: memberIds,
            title: 'Group Member Payout',
            body: `${userData.name} has received an instant payout of MWK ${netPayout.toLocaleString()}.`,
            data: {
              type: 'group_instant_payout',
              groupId: payout.group_id,
              userId: user.id,
            },
          },
        });
      }
    } catch (groupNotifError) {
      console.error('Failed to send group notification:', groupNotifError);
    }

    console.log('Instant payout processed successfully:', payoutId);

    return new Response(
      JSON.stringify({
        success: true,
        payout: {
          id: payoutId,
          gross_amount: payout.gross_amount,
          net_payout: netPayout,
          instant_fee: instantFee,
          fee: feeAmount,
          total_fees: totalFees,
          mobile_number: mobileAccount?.phone_number,
          bank_account: bankAccount?.account_number,
          status: paychanguTxn.status,
          paychangu_ref: paychanguTxn.ref_id
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-instant-payout:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
