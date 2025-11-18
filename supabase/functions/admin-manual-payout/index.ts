import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PaychanguService } from "../_shared/paychangu.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { payoutId, adminId } = await req.json();

    console.log('Admin manual payout triggered:', { payoutId, adminId });

    // Verify admin permissions
    const { data: adminUser } = await supabaseAdmin
      .from('admin_users')
      .select('id, permissions')
      .eq('id', adminId)
      .single();

    if (!adminUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch PayChangu configuration
    const { data: payConfig, error: configError } = await supabaseAdmin
      .from('api_configurations')
      .select('*')
      .eq('provider', 'paychangu')
      .eq('enabled', true)
      .order('test_mode', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (configError || !payConfig || !payConfig.api_secret) {
      console.error('PayChangu not configured:', configError);
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Using PayChangu ${payConfig.test_mode ? 'TEST' : 'LIVE'} mode`);

    // Get payout details
    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('payouts')
      .select('*, users!payouts_recipient_id_fkey(name, escrow_balance)')
      .eq('id', payoutId)
      .single();

    if (payoutError || !payout) {
      return new Response(
        JSON.stringify({ error: 'Payout not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payout.status !== 'pending' && payout.status !== 'failed') {
      return new Response(
        JSON.stringify({ error: 'Payout already processed or in progress' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment method
    const { data: mobileAccount } = await supabaseAdmin
      .from('mobile_money_accounts')
      .select('*')
      .eq('user_id', payout.recipient_id)
      .eq('is_primary', true)
      .maybeSingle();

    const { data: bankAccount } = await supabaseAdmin
      .from('bank_accounts')
      .select('*')
      .eq('user_id', payout.recipient_id)
      .eq('is_primary', true)
      .maybeSingle();

    if (!mobileAccount && !bankAccount) {
      return new Response(
        JSON.stringify({ error: 'No payment method found for recipient' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate net payout (already has fees deducted)
    const netPayout = payout.amount;

    // Generate unique charge ID
    const chargeId = `ADMIN-PO-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Prepare payment request
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
      paymentRequest.accountName = payout.users?.name || mobileAccount.account_name || 'User';
    } else if (bankAccount) {
      paymentRequest.accountNumber = bankAccount.account_number;
      paymentRequest.accountName = bankAccount.account_name;
      paymentRequest.bankName = bankAccount.bank_name;
    }

    console.log('Processing admin manual payout:', { chargeId, method: paymentRequest.method });

    // Process payment via unified service
    const paymentResult = await PaychanguService.processPayment(
      {
        secretKey: payConfig.api_secret,
        baseUrl: 'https://api.paychangu.com',
      },
      paymentRequest
    );

    if (!paymentResult.success) {
      console.error('Admin payout failed:', paymentResult.error);
      
      // Update payout status to failed
      await supabaseAdmin
        .from('payouts')
        .update({
          status: 'failed',
          failure_reason: paymentResult.error,
          updated_at: new Date().toISOString()
        })
        .eq('id', payoutId);

      return new Response(
        JSON.stringify({ 
          success: false,
          error: paymentResult.error || 'Payout failed',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paychanguTxn = paymentResult.transaction;

    // Update payout status
    await supabaseAdmin
      .from('payouts')
      .update({
        status: 'processing',
        processed_at: new Date().toISOString(),
        mobile_money_reference: paychanguTxn.ref_id
      })
      .eq('id', payoutId);

    // Record transaction
    await supabaseAdmin
      .from('mobile_money_transactions')
      .insert({
        transaction_id: chargeId,
        user_id: payout.recipient_id,
        group_id: payout.group_id,
        type: 'payout',
        amount: netPayout,
        status: 'processing',
        provider: mobileAccount?.provider || bankAccount?.bank_name || 'unknown',
        phone_number: mobileAccount?.phone_number || bankAccount?.account_number || '',
        provider_reference: paychanguTxn.ref_id,
        provider_response: paymentResult,
        transaction_category: 'admin_manual_payout'
      });

    // Log admin action
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action: 'MANUAL_PAYOUT_TRIGGERED',
        resource_type: 'payouts',
        resource_id: payoutId,
        metadata: {
          payout_amount: netPayout,
          recipient_id: payout.recipient_id,
          paychangu_ref: paychanguTxn.ref_id
        }
      });

    // Send notification
    await supabaseAdmin.functions.invoke('send-push-notification', {
      body: {
        userId: payout.recipient_id,
        title: 'Payout Processing',
        message: `Your payout of MWK ${netPayout.toLocaleString()} is being processed.`,
        data: { type: 'payout_processing', payoutId: payout.id }
      }
    });

    console.log('Admin manual payout initiated successfully:', { payoutId, reference: paychanguTxn.ref_id });

    return new Response(
      JSON.stringify({ 
        success: true,
        payout: {
          id: payout.id,
          amount: netPayout,
          reference: paychanguTxn.ref_id,
          status: 'processing'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing admin manual payout:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
