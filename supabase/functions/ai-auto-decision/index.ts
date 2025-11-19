import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { decisionId, adminId, action, notes } = await req.json();
    
    console.log('Processing AI decision:', { decisionId, action });

    // Get the decision
    const { data: decision } = await supabaseClient
      .from('ai_decisions')
      .select('*')
      .eq('id', decisionId)
      .single();

    if (!decision) {
      throw new Error('Decision not found');
    }

    // If admin is reviewing, update decision
    if (adminId && action) {
      const { data: updated } = await supabaseClient
        .from('ai_decisions')
        .update({
          status: action === 'approve' ? 'admin_approved' : 'admin_rejected',
          admin_id: adminId,
          admin_action: action,
          admin_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', decisionId)
        .select()
        .single();

      // Execute decision if approved
      if (action === 'approve') {
        await executeDecision(supabaseClient, updated);
      }

      return new Response(
        JSON.stringify({ success: true, decision: updated }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auto-execute low-risk decisions (confidence > 95%)
    if (decision.confidence_score > 95 && decision.status === 'pending') {
      const executed = await executeDecision(supabaseClient, decision);
      
      if (executed) {
        await supabaseClient
          .from('ai_decisions')
          .update({
            status: 'auto_approved',
            auto_executed: true,
            executed_at: new Date().toISOString()
          })
          .eq('id', decisionId);
      }

      return new Response(
        JSON.stringify({ success: true, autoExecuted: executed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Decision requires admin review',
        decision 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in AI auto-decision:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function executeDecision(supabase: any, decision: any): Promise<boolean> {
  console.log('Executing decision:', decision.decision_type, decision.ai_decision);
  
  try {
    switch (decision.decision_type) {
      case 'account_freeze':
        if (decision.ai_decision === 'approve') {
          await supabase
            .from('users')
            .update({ frozen: true })
            .eq('id', decision.entity_id);
          
          // Create notification
          await supabase
            .from('user_notifications')
            .insert({
              user_id: decision.entity_id,
              type: 'system',
              title: '⚠️ Account Security Alert',
              message: 'Your account has been temporarily frozen due to unusual activity. Please contact support.',
              metadata: { decision_id: decision.id, reason: 'fraud_prevention' }
            });
          
          return true;
        }
        break;

      case 'payout_approval':
        if (decision.ai_decision === 'reject') {
          await supabase
            .from('payouts')
            .update({ 
              status: 'rejected',
              failure_reason: 'Flagged by fraud detection system'
            })
            .eq('id', decision.entity_id);
          
          // Notify user
          const { data: payout } = await supabase
            .from('payouts')
            .select('recipient_id')
            .eq('id', decision.entity_id)
            .single();
          
          if (payout) {
            await supabase
              .from('user_notifications')
              .insert({
                user_id: payout.recipient_id,
                type: 'system',
                title: '⚠️ Payout Under Review',
                message: 'Your payout request is being reviewed for security purposes.',
                metadata: { decision_id: decision.id, payout_id: decision.entity_id }
              });
          }
          
          return true;
        }
        break;

      case 'contribution_review':
        // Flag contribution for manual review
        await supabase
          .from('contributions')
          .update({ 
            status: 'pending',
            metadata: { flagged_by_ai: true, decision_id: decision.id }
          })
          .eq('id', decision.entity_id);
        
        return true;

      case 'group_suspend':
        if (decision.ai_decision === 'approve') {
          await supabase
            .from('rosca_groups')
            .update({ status: 'suspended' })
            .eq('id', decision.entity_id);
          
          return true;
        }
        break;
    }
    
    return false;
  } catch (error) {
    console.error('Error executing decision:', error);
    return false;
  }
}