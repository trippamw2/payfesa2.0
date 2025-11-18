import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get webhook secret for signature verification
    const { data: payConfig } = await supabaseClient
      .from('api_configurations')
      .select('webhook_secret')
      .eq('provider', 'paychangu')
      .eq('enabled', true)
      .single();

    // Read request body once
    const rawBody = await req.text();
    let webhookData;

    // Verify webhook signature if secret is configured
    if (payConfig?.webhook_secret) {
      const signature = req.headers.get('Signature') || req.headers.get('X-Paychangu-Signature');
      
      // Compute expected signature using HMAC-SHA256
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(payConfig.webhook_secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (signature && signature !== computedSignature) {
        console.error('Webhook signature verification failed');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Webhook signature verified successfully');
    }

    // Parse webhook data
    webhookData = JSON.parse(rawBody);
    console.log('Paychangu webhook received:', webhookData);

    const { event_type, data } = webhookData;
    const transaction = data.transaction;

    if (!transaction) {
      console.error('No transaction data in webhook');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chargeId = transaction.charge_id;
    const status = transaction.status;
    const refId = transaction.ref_id;

    console.log('Processing webhook:', { event_type, chargeId, status, refId });

    // Map Paychangu status to our internal status
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
        case 'pending':
        case 'processing':
          return 'pending';
        default:
          return 'pending';
      }
    };

    const internalStatus = mapStatus(status);

    // Handle payment charge callbacks (collections)
    if (event_type === 'api.charge.payment') {
      console.log('Processing payment callback:', { chargeId, internalStatus });

      // Update contribution status
      const { error: contributionError } = await supabaseClient
        .from('contributions')
        .update({
          status: internalStatus,
          completed_at: internalStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('transaction_id', chargeId);

      if (contributionError) {
        console.error('Error updating contribution:', contributionError);
      } else {
        console.log('Contribution updated successfully');
      }

      // Update mobile money transaction
      const { error: mmError } = await supabaseClient
        .from('mobile_money_transactions')
        .update({
          status: internalStatus,
          provider_reference: refId,
          callback_received: true,
          callback_response: webhookData,
          updated_at: new Date().toISOString(),
        })
        .eq('transaction_id', chargeId);

      if (mmError) {
        console.error('Error updating mobile money transaction:', mmError);
      } else {
        console.log('Mobile money transaction updated successfully');
      }

      // Update main transaction
      const { error: txnError } = await supabaseClient
        .from('transactions')
        .update({
          status: internalStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('details->>charge_id', chargeId);

      if (txnError) {
        console.error('Error updating transaction:', txnError);
      } else {
        console.log('Transaction updated successfully');
      }

      // If successful, update escrow balance and group member status
      if (internalStatus === 'completed') {
        console.log('Payment successful, updating escrow and group status');

        // Get contribution details
        const { data: contribution, error: contributionFetchError } = await supabaseClient
          .from('contributions')
          .select('user_id, group_id, amount')
          .eq('transaction_id', chargeId)
          .single();

        if (contributionFetchError || !contribution) {
          console.error('Error fetching contribution:', contributionFetchError);
          return new Response(
            JSON.stringify({ error: 'Contribution not found', received: true }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const feeAmount = contribution.amount * 0.11;
        const netAmount = contribution.amount - feeAmount;

        // Update escrow balance
        const { error: escrowError } = await supabaseClient.rpc('update_escrow_balance', {
          p_user_id: contribution.user_id,
          p_amount: netAmount
        });

        if (escrowError) {
          console.error('Error updating escrow balance:', escrowError);
        } else {
          console.log('Escrow balance updated:', netAmount);
        }

        // Update group member status
        const { error: memberError } = await supabaseClient
          .from('group_members')
          .update({
            has_contributed: true,
            contribution_amount: contribution.amount,
          })
          .eq('user_id', contribution.user_id)
          .eq('group_id', contribution.group_id);

        if (memberError) {
          console.error('Error updating group member:', memberError);
        } else {
          console.log('Group member status updated');
        }

        // Update trust score
        const { error: trustError } = await supabaseClient.rpc('update_trust_score', {
          p_user_id: contribution.user_id,
          p_change_amount: 5,
          p_reason: 'Contribution completed successfully'
        });

        if (trustError) {
          console.error('Error updating trust score:', trustError);
        } else {
          console.log('Trust score updated');
        }

        // Create in-app notification for successful contribution
        await supabaseClient
          .from('user_notifications')
          .insert({
            user_id: contribution.user_id,
            type: 'contribution',
            title: 'Contribution Successful',
            message: `Your contribution of MWK ${contribution.amount} has been processed successfully.`,
            metadata: { 
              contribution_id: chargeId, 
              group_id: contribution.group_id,
              amount: contribution.amount 
            }
          });

        // Also send push notification
        await supabaseClient.functions.invoke('send-push-notification', {
          body: {
            userIds: [contribution.user_id],
            title: 'Contribution Successful',
            body: `Your contribution of MWK ${contribution.amount} has been processed successfully.`,
            data: { 
              type: 'contribution', 
              contributionId: chargeId, 
              groupId: contribution.group_id 
            }
          }
        });

        console.log('Contribution completed and escrow updated:', chargeId);
      } else if (internalStatus === 'failed') {
        // Create notification for failed contribution
        const { data: contribution } = await supabaseClient
          .from('contributions')
          .select('user_id, amount, group_id')
          .eq('transaction_id', chargeId)
          .single();

        if (contribution) {
          await supabaseClient
            .from('user_notifications')
            .insert({
              user_id: contribution.user_id,
              type: 'contribution',
              title: 'Contribution Failed',
              message: `Your contribution of MWK ${contribution.amount} could not be processed. Please try again.`,
              metadata: { 
                contribution_id: chargeId, 
                group_id: contribution.group_id,
                amount: contribution.amount 
              }
            });
        }
      }
    }

    // Handle payout callbacks (disbursements)
    if (event_type === 'api.payout') {
      console.log('Processing payout callback:', { chargeId, internalStatus });

      // Update payout status
      const { error: payoutError } = await supabaseClient
        .from('payouts')
        .update({
          status: internalStatus === 'completed' ? 'completed' : internalStatus === 'failed' ? 'failed' : 'processing',
          processed_at: internalStatus === 'completed' ? new Date().toISOString() : null,
          mobile_money_reference: refId,
          failure_reason: internalStatus === 'failed' ? transaction.failure_reason || 'Payment failed' : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chargeId);

      if (payoutError) {
        console.error('Error updating payout:', payoutError);
      } else {
        console.log('Payout updated successfully');
      }

      // Update transaction
      const { error: txnError } = await supabaseClient
        .from('transactions')
        .update({
          status: internalStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('details->>payout_id', chargeId);

      if (txnError) {
        console.error('Error updating payout transaction:', txnError);
      } else {
        console.log('Payout transaction updated successfully');
      }

      // Send notification to user
      if (internalStatus === 'completed' || internalStatus === 'failed') {
        const { data: payoutData } = await supabaseClient
          .from('payouts')
          .select('recipient_id, amount')
          .eq('id', chargeId)
          .single();

        if (payoutData) {
          // Create in-app notification
          await supabaseClient
            .from('user_notifications')
            .insert({
              user_id: payoutData.recipient_id,
              type: 'payout',
              title: internalStatus === 'completed' ? 'Payout Successful' : 'Payout Failed',
              message: internalStatus === 'completed' 
                ? `Your payout of MWK ${payoutData.amount} has been processed successfully.`
                : `Your payout of MWK ${payoutData.amount} has failed. Please contact support.`,
              metadata: { 
                payout_id: chargeId, 
                amount: payoutData.amount, 
                status: internalStatus 
              }
            });

          // Also send push notification
          await supabaseClient.functions.invoke('send-push-notification', {
            body: {
              userIds: [payoutData.recipient_id],
              title: internalStatus === 'completed' ? 'Payout Successful' : 'Payout Failed',
              body: internalStatus === 'completed' 
                ? `Your payout of MWK ${payoutData.amount} has been processed successfully.`
                : `Your payout of MWK ${payoutData.amount} has failed. Please contact support.`,
              data: { type: 'payout', payoutId: chargeId, status: internalStatus }
            }
          });
        }
      }

      console.log('Payout callback processed:', { chargeId, internalStatus });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in paychangu-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
