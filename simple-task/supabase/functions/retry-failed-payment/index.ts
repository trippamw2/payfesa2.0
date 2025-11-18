import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetryPaymentRequest {
  transaction_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: RetryPaymentRequest = await req.json();

    if (!body.transaction_id) {
      throw new Error('Transaction ID is required');
    }

    // Get the failed transaction
    const { data: transaction, error: txError } = await supabase
      .from('mobile_money_transactions')
      .select('*')
      .eq('transaction_id', body.transaction_id)
      .eq('user_id', user.id)
      .single();

    if (txError || !transaction) {
      throw new Error('Transaction not found');
    }

    // Check if transaction is retryable
    if (transaction.status !== 'failed' && transaction.status !== 'pending') {
      throw new Error('Only failed or pending transactions can be retried');
    }

    // Check retry count
    if (transaction.retry_count >= 3) {
      throw new Error('Maximum retry attempts reached (3)');
    }

    // Update retry count
    const { error: updateError } = await supabase
      .from('mobile_money_transactions')
      .update({
        retry_count: transaction.retry_count + 1,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      throw new Error('Failed to update transaction status');
    }

    // Call the appropriate payment processing function based on transaction type
    let retryResult;
    
    if (transaction.type === 'collection') {
      // Retry contribution payment
      const { data: retryData, error: retryError } = await supabase.functions.invoke(
        'process-contribution',
        {
          body: {
            transaction_id: transaction.transaction_id,
            retry: true,
          },
        }
      );

      if (retryError) {
        console.error('Retry failed:', retryError);
        throw new Error('Payment retry failed');
      }

      retryResult = retryData;
    } else if (transaction.type === 'payout') {
      // Retry payout
      const { data: retryData, error: retryError } = await supabase.functions.invoke(
        'process-instant-payout',
        {
          body: {
            transaction_id: transaction.transaction_id,
            retry: true,
          },
        }
      );

      if (retryError) {
        console.error('Retry failed:', retryError);
        throw new Error('Payout retry failed');
      }

      retryResult = retryData;
    } else {
      throw new Error('Unsupported transaction type for retry');
    }

    console.log('Payment retry initiated:', transaction.transaction_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment retry initiated successfully',
        transaction_id: transaction.transaction_id,
        retry_count: transaction.retry_count + 1,
        result: retryResult,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
