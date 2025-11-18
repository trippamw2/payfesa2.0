import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { disputeId, userId, amount } = await req.json();

    console.log('Processing dispute refund:', { disputeId, userId, amount });

    // Validate inputs
    if (!disputeId || !userId || !amount) {
      throw new Error('Missing required fields: disputeId, userId, or amount');
    }

    // Credit user's wallet
    const { data: newBalance, error: walletError } = await supabaseClient.rpc(
      'update_wallet_balance',
      {
        p_user_id: userId,
        p_amount: amount,
      }
    );

    if (walletError) {
      console.error('Wallet update error:', walletError);
      throw new Error(`Failed to credit wallet: ${walletError.message}`);
    }

    // Record transaction
    const { error: txError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'refund',
        amount: amount,
        status: 'completed',
        details: {
          dispute_id: disputeId,
          reason: 'Payment dispute refund',
        },
      });

    if (txError) {
      console.error('Transaction record error:', txError);
      throw new Error(`Failed to record transaction: ${txError.message}`);
    }

    // Send notification to user (FIXED: use userIds array)
    await supabaseClient.functions.invoke('send-push-notification', {
      body: {
        userIds: [userId],
        title: 'Dispute Resolved',
        body: `Your payment dispute has been approved. MWK ${amount.toLocaleString()} has been credited to your wallet.`,
        data: { type: 'dispute_resolved', disputeId },
      },
    });

    console.log('Dispute refund processed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Refund processed successfully',
        newBalance,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing dispute refund:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
