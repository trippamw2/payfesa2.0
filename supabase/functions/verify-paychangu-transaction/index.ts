import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { transactionId, chargeId } = await req.json();

    if (!transactionId && !chargeId) {
      return new Response(
        JSON.stringify({ error: 'Transaction ID or Charge ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get PayChangu configuration
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
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify transaction with PayChangu
    const verifyUrl = `${PAYCHANGU_BASE_URL}/verify-payment`;
    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${payConfig.api_secret}`,
      },
      body: JSON.stringify({
        tx_ref: chargeId || transactionId,
      }),
    });

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error('PayChangu verification failed:', errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Transaction verification failed',
          details: errorText 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verificationData = await verifyResponse.json();
    console.log('PayChangu verification response:', verificationData);

    // Map status
    const mapStatus = (paychanguStatus: string): string => {
      switch (paychanguStatus?.toLowerCase()) {
        case 'success':
        case 'successful':
        case 'completed':
          return 'completed';
        case 'failed':
        case 'failure':
        case 'declined':
          return 'failed';
        default:
          return 'pending';
      }
    };

    const status = mapStatus(verificationData.data?.status || verificationData.status);
    const refId = verificationData.data?.tx_ref || verificationData.data?.ref_id;

    // Update our database
    const searchId = chargeId || transactionId;
    
    // Update contribution
    const { error: contributionError } = await supabaseClient
      .from('contributions')
      .update({
        status: status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('transaction_id', searchId);

    if (contributionError) {
      console.error('Error updating contribution:', contributionError);
    }

    // Update mobile money transaction
    const { error: mmError } = await supabaseClient
      .from('mobile_money_transactions')
      .update({
        status: status,
        provider_reference: refId,
        updated_at: new Date().toISOString(),
      })
      .eq('transaction_id', searchId);

    if (mmError) {
      console.error('Error updating mobile money transaction:', mmError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: status,
        transaction: verificationData.data || verificationData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error verifying transaction:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
