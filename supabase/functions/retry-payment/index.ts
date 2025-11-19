import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rateLimiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetryPaymentRequest {
  transactionId: string;
  accountId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Rate limiting - 5 retries per hour
    const rateLimitResult = await checkRateLimit(
      supabase,
      user.id,
      'retry-payment',
      5,
      60
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: rateLimitResult.message || 'Rate limit exceeded',
        }),
        {
          headers: { ...corsHeaders, ...getRateLimitHeaders(rateLimitResult), 'Content-Type': 'application/json' },
          status: 429,
        }
      );
    }

    const body: RetryPaymentRequest = await req.json();

    if (!body.transactionId) {
      throw new Error('Transaction ID is required');
    }

    // Get original transaction
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', body.transactionId)
      .eq('user_id', user.id)
      .single();

    if (txError || !transaction) {
      throw new Error('Transaction not found or does not belong to you');
    }

    // Only allow retry for failed transactions
    if (transaction.status !== 'failed') {
      throw new Error('Only failed transactions can be retried');
    }

    // Create new transaction with retry flag
    const { data: newTransaction, error: newTxError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        type: transaction.type,
        method: transaction.method,
        amount: transaction.amount,
        net_amount: transaction.net_amount,
        fee_amount: transaction.fee_amount,
        account_id: body.accountId || transaction.account_id,
        group_id: transaction.group_id,
        status: 'pending',
        metadata: {
          ...transaction.metadata,
          is_retry: true,
          original_transaction_id: transaction.id,
          retry_attempt: (transaction.metadata?.retry_attempt || 0) + 1,
        },
      })
      .select()
      .single();

    if (newTxError) {
      console.error('Error creating retry transaction:', newTxError);
      throw new Error('Failed to create retry transaction');
    }

    // Process the payment based on type
    let processResult;
    
    if (transaction.type === 'contribution') {
      // Call process-contribution edge function
      const { data: contributionData, error: contributionError } = await supabase.functions.invoke(
        'process-contribution',
        {
          body: {
            groupId: transaction.group_id,
            amount: transaction.amount,
            accountId: body.accountId || transaction.account_id,
            transactionId: newTransaction.id,
          },
        }
      );

      if (contributionError) throw contributionError;
      processResult = contributionData;
    } else if (transaction.type === 'payout') {
      // Call appropriate payout function
      const { data: payoutData, error: payoutError } = await supabase.functions.invoke(
        'process-instant-payout',
        {
          body: {
            transactionId: newTransaction.id,
            accountId: body.accountId || transaction.account_id,
          },
        }
      );

      if (payoutError) throw payoutError;
      processResult = payoutData;
    } else {
      throw new Error('Unsupported transaction type for retry');
    }

    // Update original transaction with retry reference
    await supabase
      .from('payment_transactions')
      .update({
        metadata: {
          ...transaction.metadata,
          retried_at: new Date().toISOString(),
          retry_transaction_id: newTransaction.id,
        },
      })
      .eq('id', transaction.id);

    console.log('Payment retry initiated:', newTransaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        transaction: newTransaction,
        processResult,
      }),
      {
        headers: { ...corsHeaders, ...getRateLimitHeaders(rateLimitResult), 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Retry payment error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
