import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PaychanguService } from "../_shared/paychangu.ts";
import { checkRateLimit } from "../_shared/rateLimiter.ts";

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
      'process-contribution',
      100,
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

    // Safely parse request body
    const body = await req.json().catch(() => null);
    
    if (!body) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { groupId, amount, paymentMethod, phoneNumber, pin, accountId } = body;

    console.log('Processing contribution:', { groupId, amount, user: user.id, paymentMethod });

    // Fetch PayChangu configuration from api_configurations
    const { data: payConfig, error: configError } = await supabaseClient
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

    const PAYCHANGU_SECRET_KEY = payConfig.api_key;
    console.log(`Using PayChangu ${payConfig.test_mode ? 'TEST' : 'LIVE'} mode`);

    // Verify PIN
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('pin_hash')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique charge ID
    const chargeId = `PC${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`;

    const paymentMethodLower = (paymentMethod || '').toString().toLowerCase().trim();
    const isMobileMoney = ['airtel', 'tnm', 'mpamba', 'airtel money', 'tnm mpamba', 'mobilemoney'].includes(paymentMethodLower);
    const isBankTransfer = ['bank', 'banktransfer', 'mobilebanktransfer'].includes(paymentMethodLower);

    // Process payment using unified service
    const paymentResult = await PaychanguService.processPayment(
      {
        secretKey: PAYCHANGU_SECRET_KEY,
        baseUrl: PAYCHANGU_BASE_URL,
      },
      {
        type: 'collection',
        method: isMobileMoney ? 'mobile_money' : 'bank_transfer',
        amount: amount,
        phoneNumber: phoneNumber,
        provider: paymentMethod,
        chargeId: chargeId,
        currency: 'MWK',
      }
    );

    if (!paymentResult.success) {
      console.error('Payment failed:', paymentResult.error);
      return new Response(
        JSON.stringify({ 
          error: paymentResult.error || 'Payment initialization failed'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paychanguTxn = paymentResult.transaction;
    const paymentAccountDetails = paymentResult.payment_account_details;

    // Calculate fees (11%)
    const feeAmount = amount * 0.11;
    const netAmount = amount - feeAmount;

    // Create contribution record with pending status
    const { data: contribution, error: contributionError } = await supabaseClient
      .from('contributions')
      .insert({
        user_id: user.id,
        group_id: groupId,
        amount: amount,
        payment_method: paymentMethod,
        transaction_id: chargeId,
        status: paychanguTxn.status === 'pending' ? 'pending' : 'completed',
      })
      .select()
      .single();

    if (contributionError) {
      console.error('Error creating contribution:', contributionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create contribution' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create mobile money transaction record
    const { error: mobileMoneyError } = await supabaseClient
      .from('mobilemoney_transactions')
      .insert({
        transaction_id: chargeId,
        user_id: user.id,
        group_id: groupId,
        phone_number: phoneNumber,
        provider: paymentMethod,
        amount: amount,
        type: 'collection',
        status: paychanguTxn.status,
        provider_response: paymentResult,
        escrow_amount: netAmount,
        escrow_affected: false,
      });

    if (mobileMoneyError) {
      console.error('Error creating mobile money transaction:', mobileMoneyError);
    }

    // Create transaction record
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'contribution',
        amount: amount,
        status: paychanguTxn.status === 'pending' ? 'pending' : 'completed',
        group_id: groupId,
        details: {
          fee: feeAmount,
          net_amount: netAmount,
          payment_method: paymentMethod,
          phone_number: phoneNumber,
          charge_id: chargeId,
          paychangu_ref_id: paychanguTxn.ref_id,
          paychangu_trace_id: paychanguTxn.trace_id,
          payment_account_details: paymentAccountDetails,
        }
      });

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
    }

    console.log('Contribution created successfully:', contribution.id);

    // Get group name for notification
    const { data: groupData } = await supabaseClient
      .from('rosca_groups')
      .select('name')
      .eq('id', groupId)
      .single();

    // Send push notification
    try {
      await supabaseClient.functions.invoke('send-push-notification', {
        body: {
          userIds: [user.id],
          title: 'Contribution Successful',
          body: `Your contribution of MWK ${amount.toLocaleString()} to ${groupData?.name || 'group'} has been processed successfully.`,
          data: {
            type: 'contribution_success',
            groupId,
            amount: amount.toString(),
            contributionId: contribution.id,
          },
        },
      });
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
    }

    // Send system message to group chat
    try {
      const { data: userData } = await supabaseClient
        .from('users')
        .select('name, trust_score')
        .eq('id', user.id)
        .single();

      if (userData) {
        await supabaseClient.functions.invoke('send-system-message', {
          body: {
            groupId,
            template: 'contribution_made',
            data: {
              userName: userData.name,
              trustScoreChange: 5,
              amount: amount.toLocaleString()
            }
          }
        });
      }
    } catch (msgError) {
      console.error('Failed to send system message:', msgError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        contribution,
        paychangu_transaction: {
          ref_id: paychanguTxn.ref_id,
          trace_id: paychanguTxn.trace_id,
          status: paychanguTxn.status,
          charge_id: chargeId,
        },
        payment_account_details: paymentAccountDetails,
        fee: feeAmount,
        net_amount: netAmount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-contribution:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
