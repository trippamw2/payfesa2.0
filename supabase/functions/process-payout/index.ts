import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PaychanguService } from "../_shared/paychangu.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYCHANGU_BASE_URL = 'https://api.paychangu.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    const jwt = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { payoutId } = await req.json();

    if (!payoutId) {
      return new Response(
        JSON.stringify({ error: 'Payout ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch payout details
    const { data: payout, error: payoutError } = await supabaseClient
      .from('payouts')
      .select('*, rosca_groups(*)')
      .eq('id', payoutId)
      .eq('recipient_id', user.id)
      .single();

    if (payoutError || !payout) {
      return new Response(
        JSON.stringify({ error: 'Payout not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payout.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Payout already processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recipient payment method
    const { data: paymentAccount, error: accountError } = await supabaseClient
      .from('mobile_money_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .maybeSingle();

    if (accountError || !paymentAccount) {
      // Try bank account
      const { data: bankAccount, error: bankError } = await supabaseClient
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();

      if (bankError || !bankAccount) {
        return new Response(
          JSON.stringify({ error: 'No payment method configured. Please add a payment method.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch PayChangu configuration
    const { data: payConfig, error: configError } = await supabaseClient
      .from('api_configurations')
      .select('*')
      .eq('provider', 'paychangu')
      .eq('enabled', true)
      .order('test_mode', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (configError || !payConfig || !payConfig.api_secret) {
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured. Contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payout status to processing
    await supabaseClient
      .from('payouts')
      .update({ status: 'processing' })
      .eq('id', payoutId);

    // Process payout using PayChangu
    const paymentResult = await PaychanguService.processPayment(
      {
        secretKey: payConfig.api_secret,
        baseUrl: PAYCHANGU_BASE_URL,
      },
      {
        type: 'payout',
        method: paymentAccount ? 'mobile_money' : 'bank_transfer',
        amount: payout.amount,
        phoneNumber: paymentAccount?.phone_number,
        provider: paymentAccount?.provider,
        accountNumber: paymentAccount ? undefined : (await supabaseClient
          .from('bank_accounts')
          .select('account_number')
          .eq('user_id', user.id)
          .eq('is_primary', true)
          .single()).data?.account_number,
        accountName: user.email || 'Payfesa User',
        chargeId: payoutId,
        currency: 'MWK',
      }
    );

    if (!paymentResult.success) {
      await supabaseClient
        .from('payouts')
        .update({ 
          status: 'failed',
          failure_reason: paymentResult.error 
        })
        .eq('id', payoutId);

      return new Response(
        JSON.stringify({ 
          success: false,
          error: paymentResult.error || 'Payout processing failed'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payout with transaction details
    await supabaseClient
      .from('payouts')
      .update({ 
        mobile_money_reference: paymentResult.transaction.ref_id,
        status: 'processing'
      })
      .eq('id', payoutId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payout initiated successfully',
        payout: {
          id: payoutId,
          status: 'processing',
          reference: paymentResult.transaction.ref_id
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing payout:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
