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

    console.log('Starting daily engagement messages...');

    // Get all active groups
    const { data: groups, error: groupsError } = await supabase
      .from('rosca_groups')
      .select('id, name')
      .eq('status', 'active');

    if (groupsError) throw groupsError;

    const engagementMessages = [
      '💪 Good morning! Let\'s make today count! Remember to contribute on time.',
      '🌟 Your group is doing great! Keep up the momentum.',
      '📊 Check your contribution status today and stay on track!',
      '🎯 Every contribution brings us closer to our goals. You\'ve got this!',
      '☀️ New day, new opportunities! Let\'s support each other.',
      '💡 Tip: Regular contributions help build your trust score!',
      '🤝 Stronger together! Thanks for being part of this community.',
      '⭐ Your participation matters. Check in with your group today!',
    ];

    let messagesSent = 0;

    for (const group of groups || []) {
      // Check if group has had activity in last 24 hours
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('group_id', group.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      // If no recent activity, send engagement message
      if (!recentMessages || recentMessages.length === 0) {
        const randomMessage = engagementMessages[Math.floor(Math.random() * engagementMessages.length)];
        
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            group_id: group.id,
            message: randomMessage,
            message_type: 'system',
            metadata: { type: 'daily_engagement' },
            sender_id: null
          });

        if (messageError) {
          console.error(`Failed to send message to group ${group.name}:`, messageError);
        } else {
          messagesSent++;
          console.log(`Sent engagement message to ${group.name}`);
        }
      }
    }

    console.log(`Daily engagement complete: ${messagesSent} messages sent to ${groups?.length || 0} groups`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messagesSent,
        totalGroups: groups?.length || 0 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in daily engagement:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
