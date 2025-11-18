import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rateLimiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateDisputeRequest {
  transaction_id: string;
  dispute_type: 'wrong_amount' | 'unauthorized' | 'not_received' | 'duplicate' | 'other';
  reason: string;
  evidence?: Record<string, any>;
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

    // Rate limiting - 10 disputes per hour
    const rateLimitResult = await checkRateLimit(
      supabase,
      user.id,
      'create-payment-dispute',
      10,
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

    const body: CreateDisputeRequest = await req.json();

    if (!body.transaction_id || !body.dispute_type || !body.reason) {
      throw new Error('Transaction ID, dispute type, and reason are required');
    }

    if (body.reason.length < 10) {
      throw new Error('Dispute reason must be at least 10 characters');
    }

    // Get transaction details
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', body.transaction_id)
      .eq('user_id', user.id)
      .single();

    if (txError || !transaction) {
      throw new Error('Transaction not found or does not belong to you');
    }

    // Check if dispute already exists for this transaction
    const { data: existingDispute } = await supabase
      .from('payment_disputes')
      .select('id')
      .eq('transaction_id', body.transaction_id)
      .eq('status', 'pending')
      .single();

    if (existingDispute) {
      throw new Error('A pending dispute already exists for this transaction');
    }

    // Create dispute
    const { data: dispute, error: disputeError } = await supabase
      .from('payment_disputes')
      .insert({
        user_id: user.id,
        transaction_id: body.transaction_id,
        dispute_type: body.dispute_type,
        amount: transaction.amount,
        reason: body.reason,
        evidence: body.evidence || {},
        status: 'pending',
      })
      .select()
      .single();

    if (disputeError) {
      console.error('Error creating dispute:', disputeError);
      throw new Error('Failed to create dispute');
    }

    // Send notification to user (FIXED: use userIds array)
    await supabase.functions.invoke('send-push-notification', {
      body: {
        userIds: [user.id],
        title: 'Dispute Submitted',
        body: `Your payment dispute for MWK ${transaction.amount.toLocaleString()} has been submitted and is under review.`,
        data: {
          type: 'dispute_created',
          disputeId: dispute.id,
          amount: transaction.amount.toString(),
        },
      },
    });

    console.log('Payment dispute created:', dispute.id);

    return new Response(
      JSON.stringify({
        success: true,
        dispute,
      }),
      {
        headers: { ...corsHeaders, ...getRateLimitHeaders(rateLimitResult), 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Create dispute error:', error);
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
