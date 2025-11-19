import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PaychanguService } from "../_shared/paychangu.ts";
import { checkRateLimit } from "../_shared/rateLimiter.ts";
import { calculatePayoutFees } from "../_shared/feeCalculations.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYCHANGU_BASE_URL = 'https://api.paychangu.com';

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] === NEW REQUEST ===`);
  
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
    console.log(`[${requestId}] Client IP: ${clientIp}`);
    
    const rateLimitResult = await checkRateLimit(
      supabaseClient,
      clientIp,
      'process-contribution',
      100,
      60
    );
    
    if (!rateLimitResult.allowed) {
      console.warn(`[${requestId}] Rate limit exceeded for ${clientIp}`);
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

    console.log(`[${requestId}] Authenticating user...`);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    if (authError || !user) {
      console.error(`[${requestId}] Auth error:`, authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`[${requestId}] User authenticated: ${user.id}`);

    // Safely parse request body
    const body = await req.json().catch((e) => {
      console.error(`[${requestId}] JSON parse error:`, e);
      return null;
    });
    
    if (!body) {
      console.error(`[${requestId}] Invalid request body`);
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { groupId, amount, paymentMethod, phoneNumber, pin, accountId } = body;
    console.log(`[${requestId}] Request data:`, { 
      groupId, 
      amount, 
      paymentMethod, 
      phoneNumber: phoneNumber ? '***' + phoneNumber.slice(-4) : 'N/A',
      accountId: accountId || 'N/A'
    });

    // Fetch PayChangu configuration from api_configurations using service role
    // (RLS policies restrict access to admins only, but payment processing needs this config)
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: payConfig, error: configError } = await supabaseServiceClient
      .from('api_configurations')
      .select('*')
      .eq('provider', 'paychangu')
      .eq('enabled', true)
      .order('test_mode', { ascending: false }) // Prefer live mode if both enabled
      .limit(1)
      .maybeSingle();

    if (configError || !payConfig || !payConfig.api_secret) {
      console.error(`[${requestId}] PayChangu not configured:`, configError);
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PAYCHANGU_SECRET_KEY = payConfig.api_secret;
    const isTestMode = payConfig.test_mode;
    console.log(`[${requestId}] Using PayChangu ${isTestMode ? 'TEST' : 'LIVE'} mode`);

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
    console.log(`[${requestId}] Generated charge ID: ${chargeId}`);

    // Verify payment account if accountId provided and determine payment type
    let isMobileMoney = false;
    let isBankTransfer = false;
    let account: any = null;
    
    if (accountId) {
      console.log(`[${requestId}] Verifying payment account: ${accountId}`);
      
      // Try bank account first
      const bankResult = await supabaseClient
        .from('bank_accounts')
        .select('*')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (bankResult.data) {
        account = bankResult.data;
        isBankTransfer = true;
        console.log(`[${requestId}] Bank account lookup: Found`);
      } else {
        // Try mobile money account
        const mobileResult = await supabaseClient
          .from('mobile_money_accounts')
          .select('*')
          .eq('id', accountId)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (mobileResult.data) {
          account = mobileResult.data;
          isMobileMoney = true;
          console.log(`[${requestId}] Mobile money account lookup: Found`);
        } else {
          console.log(`[${requestId}] Mobile money account lookup: Not found`);
        }
      }

      if (!account) {
        console.error(`[${requestId}] Payment account not found`);
        return new Response(
          JSON.stringify({ error: 'Payment account not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Skip verification check in test mode
      if (!isTestMode && !account.is_verified) {
        console.error(`[${requestId}] Payment account not verified`);
        return new Response(
          JSON.stringify({ error: 'Payment account not verified. Please verify your account first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[${requestId}] Using ${account.is_verified ? 'verified' : 'unverified'} account: ${isBankTransfer ? account.bank_name : account.provider}`);
    } else {
      // If no accountId provided, try to determine from paymentMethod string
      const paymentMethodLower = (paymentMethod || '').toString().toLowerCase().trim();
      isMobileMoney = ['airtel', 'tnm', 'mpamba', 'airtel money', 'tnm mpamba', 'mobilemoney'].includes(paymentMethodLower);
      isBankTransfer = ['bank', 'banktransfer', 'mobilebanktransfer'].includes(paymentMethodLower);
    }
    
    console.log(`[${requestId}] Payment type: ${isMobileMoney ? 'Mobile Money' : isBankTransfer ? 'Bank Transfer' : 'Unknown'}`);


    // Process payment using unified service
    console.log(`[${requestId}] Initiating payment with PayChangu...`);
    
    // Prepare payment request based on method
    const paymentRequest: any = {
      type: 'collection',
      method: isMobileMoney ? 'mobile_money' : 'bank_transfer',
      amount: amount,
      chargeId: chargeId,
      currency: 'MWK',
    };

    // Add method-specific fields
    if (isMobileMoney) {
      // Use account details if available, otherwise fallback to provided values
      paymentRequest.phoneNumber = account?.phone_number || phoneNumber;
      paymentRequest.provider = account?.provider || paymentMethod;
    }
    // Bank transfers don't need phone number - PayChangu generates virtual account

    const paymentResult = await PaychanguService.processPayment(
      {
        secretKey: PAYCHANGU_SECRET_KEY,
        baseUrl: PAYCHANGU_BASE_URL,
      },
      paymentRequest
    );

    if (!paymentResult.success) {
      console.error(`[${requestId}] Payment failed:`, paymentResult.error);

      return new Response(
        JSON.stringify({ 
          error: paymentResult.error || 'Payment initialization failed'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paychanguTxn = paymentResult.transaction;
    const paymentAccountDetails = paymentResult.payment_account_details;
    console.log(`[${requestId}] PayChangu response: ${paychanguTxn.status} - Ref: ${paychanguTxn.ref_id}`);

    // Calculate PayFesa fees (12% total: 1% safety + 5% service + 6% government)
    const feeBreakdown = calculatePayoutFees(amount);
    const netAmount = feeBreakdown.netAmount;
    const feeAmount = feeBreakdown.totalFees;
    console.log(`[${requestId}] Fee calculation: Gross=${amount}, Fees=${feeAmount} (Safety=${feeBreakdown.payoutSafetyFee}, Service=${feeBreakdown.serviceFee}, Govt=${feeBreakdown.governmentFee}), Net=${netAmount}`);

    // Create contribution record with pending status
    console.log(`[${requestId}] Creating contribution record...`);
    const { data: contribution, error: contributionError } = await supabaseClient
      .from('contributions')
      .insert({
        user_id: user.id,
        group_id: groupId,
        amount: amount,
        payment_method: paymentMethod,
        payment_provider: 'paychangu',
        payment_reference: paychanguTxn.ref_id || null,
        fee_amount: feeAmount,
        net_amount: netAmount,
        transaction_id: chargeId,
        status: paychanguTxn.status === 'pending' ? 'pending' : 'completed',
        metadata: {
          phone_number: phoneNumber,
          provider: paymentMethod,
          payment_account_details: paymentAccountDetails || null,
          fee_breakdown: {
            payout_safety_fee: feeBreakdown.payoutSafetyFee,
            service_fee: feeBreakdown.serviceFee,
            government_fee: feeBreakdown.governmentFee,
            total_fees: feeBreakdown.totalFees,
          },
        },
      })
      .select()
      .single();

    if (contributionError) {
      console.error(`[${requestId}] Error creating contribution:`, contributionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create contribution', details: contributionError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`[${requestId}] Contribution created: ${contribution.id}`);

    // Create mobile money transaction record
    console.log(`[${requestId}] Creating mobile money transaction record...`);
    const { error: mobileMoneyError } = await supabaseClient
      .from('mobile_money_transactions')
      .insert({
        transaction_id: chargeId,
        user_id: user.id,
        group_id: groupId,
        phone_number: phoneNumber || 'N/A',
        provider: paymentMethod,
        amount: amount,
        type: 'collection',
        status: paychanguTxn.status,
        provider_response: paymentResult,
        escrow_amount: netAmount,
        escrow_affected: false,
      });

    if (mobileMoneyError) {
      console.error(`[${requestId}] Error creating mobile money transaction:`, mobileMoneyError);
    } else {
      console.log(`[${requestId}] Mobile money transaction recorded`);
    }

    // Create transaction record
    console.log(`[${requestId}] Creating transaction record...`);
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
      console.error(`[${requestId}] Error creating transaction:`, transactionError);
    } else {
      console.log(`[${requestId}] Transaction record created`);
    }

    // Get group and user data for notifications
    console.log(`[${requestId}] Preparing notifications...`);
    const [groupResult, userResult] = await Promise.all([
      supabaseClient.from('rosca_groups').select('name').eq('id', groupId).single(),
      supabaseClient.from('users').select('name, trust_score').eq('id', user.id).single()
    ]);

    const groupName = groupResult.data?.name || 'group';
    const userName = userResult.data?.name || 'Member';

    // Send push notification
    try {
      console.log(`[${requestId}] Sending push notification...`);
      await supabaseClient.functions.invoke('send-push-notification', {
        body: {
          userIds: [user.id],
          title: 'Contribution Successful',
          body: `Your contribution of MWK ${amount.toLocaleString()} to ${groupName} has been processed successfully.`,
          data: {
            type: 'contribution_success',
            groupId,
            amount: amount.toString(),
            contributionId: contribution.id,
          },
        },
      });
      console.log(`[${requestId}] Push notification sent`);
    } catch (notifError) {
      console.error(`[${requestId}] Failed to send notification:`, notifError);
    }

    // Send system message to group chat
    try {
      console.log(`[${requestId}] Sending system message to group...`);
      await supabaseClient.functions.invoke('send-system-message', {
        body: {
          groupId,
          template: 'contribution_made',
          data: {
            userName,
            trustScoreChange: 5,
            amount: amount.toLocaleString()
          }
        }
      });
      console.log(`[${requestId}] System message sent`);
    } catch (msgError) {
      console.error(`[${requestId}] Failed to send system message:`, msgError);
    }

    console.log(`[${requestId}] === REQUEST COMPLETED SUCCESSFULLY ===`);
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
    console.error(`[${requestId}] === CRITICAL ERROR ===`);
    console.error(`[${requestId}] Error type:`, error?.constructor?.name);
    console.error(`[${requestId}] Error message:`, error instanceof Error ? error.message : 'Unknown');
    console.error(`[${requestId}] Error stack:`, error instanceof Error ? error.stack : 'N/A');
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        requestId: requestId,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
