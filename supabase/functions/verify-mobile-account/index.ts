import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PaychanguService } from "../_shared/paychangu.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYCHANGU_BASE_URL = 'https://api.paychangu.com';
const VERIFICATION_AMOUNT = 1; // MWK 1 for verification

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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { accountId } = await req.json();

    if (!accountId) {
      return new Response(
        JSON.stringify({ error: 'Account ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch mobile money account
    const { data: account, error: accountError } = await supabaseClient
      .from('mobile_money_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ error: 'Account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (account.is_verified) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Account already verified',
          account
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    if (configError || !payConfig || !payConfig.api_key) {
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured. Contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate verification charge ID
    const verificationChargeId = `VERIFY${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Send verification payment (MWK 1)
    const paymentResult = await PaychanguService.processPayment(
      {
        secretKey: payConfig.api_key,
        baseUrl: PAYCHANGU_BASE_URL,
      },
      {
        type: 'collection',
        method: 'mobile_money',
        amount: VERIFICATION_AMOUNT,
        phoneNumber: account.phone_number,
        provider: account.provider,
        chargeId: verificationChargeId,
        currency: 'MWK',
      }
    );

    if (!paymentResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: paymentResult.error || 'Verification failed. Please check your phone number and try again.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update account with verification details
    await supabaseClient
      .from('mobile_money_accounts')
      .update({ 
        verification_reference: paymentResult.transaction.ref_id,
        verification_method: 'paychangu',
        is_verified: paymentResult.transaction.status === 'success',
        verified_at: paymentResult.transaction.status === 'success' ? new Date().toISOString() : null,
        account_status: paymentResult.transaction.status === 'success' ? 'verified' : 'pending'
      })
      .eq('id', accountId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification initiated. Please approve the MWK 1 charge on your phone.',
        verification: {
          reference: paymentResult.transaction.ref_id,
          status: paymentResult.transaction.status
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error verifying account:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
