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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { groupId, messageType, template, data } = await req.json();

    if (!groupId || !template) {
      throw new Error('Missing required fields: groupId and template');
    }

    // Generate system message based on template
    let message = '';
    const metadata: Record<string, any> = { template, ...data };

    switch (template) {
      case 'contribution_made':
        message = `🎉 ${data.userName} paid their contribution! Trust Score +${data.trustScoreChange || 5}`;
        break;
      
      case 'contribution_completed':
        message = `🎉 ${data.userName} completed their contribution of ${data.amount} MWK! Great job! 💪`;
        break;
      
      case 'missed_payment':
        message = `⚠️ ${data.userName} missed their payment. Covered by PayFesa Guarantee.`;
        break;
      
      case 'group_full_contribution':
        message = `🌟 Amazing! Group reached 100% contributions today! Great teamwork everyone!`;
        break;
      
      case 'payout_approaching':
        message = `💰 ${data.userName}'s payout is coming soon! Expected on ${data.payoutDate}`;
        break;
      
      case 'payout_completed':
        message = `✅ ${data.userName} received their payout of ${data.amount} MWK! Congratulations! 🎊`;
        break;
      
      case 'bonus_awarded':
        message = `🎁 ${data.userName} earned a ${data.bonusName} bonus of ${data.amount} MWK! Well done! 🌟`;
        break;
      
      case 'achievement_earned':
        message = `🏆 ${data.userName} unlocked "${data.achievementTitle}" achievement! ${data.achievementDescription || 'Keep up the great work!'}`;
        break;
      
      case 'trust_score_milestone':
        message = `🏆 ${data.userName} reached Trust Score ${data.score}! Keep up the excellent work!`;
        break;
      
      case 'new_member':
        message = `👋 Welcome ${data.userName} to the group! Let's achieve our goals together!`;
        break;
      
      case 'group_milestone':
        message = `🎯 Group milestone reached: ${data.milestone}! We're making great progress!`;
        break;
      
      case 'encouragement':
        message = data.message || `💪 Keep up the great work everyone! Together we're stronger!`;
        break;
      
      default:
        message = data.message || 'System notification';
    }

    // Insert system message
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        group_id: groupId,
        message,
        message_type: messageType || 'system',
        metadata,
        sender_id: null
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Send push notifications to group members
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (members && members.length > 0) {
      const userIds = members.map(m => m.user_id);
      
      // Get group name for notification
      const { data: group } = await supabase
        .from('rosca_groups')
        .select('name')
        .eq('id', groupId)
        .single();

      // Send push notification (fire and forget)
      supabase.functions.invoke('send-push-notification', {
        body: {
          userIds,
          title: group?.name || 'Group Update',
          body: message,
          data: { groupId, messageId: messageData.id }
        }
      }).catch(err => console.error('Failed to send push notification:', err));
    }

    return new Response(
      JSON.stringify({ success: true, message: messageData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending system message:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
