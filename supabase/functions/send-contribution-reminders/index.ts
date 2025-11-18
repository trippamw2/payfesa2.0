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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const now = new Date();
    
    // Get all active groups
    const { data: groups, error: groupsError } = await supabaseClient
      .from('rosca_groups')
      .select('id, name, contribution_amount')
      .eq('status', 'active');

    if (groupsError) throw groupsError;

    let remindersSent = 0;
    let failedCount = 0;

    for (const group of groups || []) {
      // Get members who haven't contributed in this cycle
      const { data: members, error: membersError } = await supabaseClient
        .from('group_members')
        .select(`
          user_id, 
          has_contributed,
          users!inner(name)
        `)
        .eq('group_id', group.id)
        .eq('has_contributed', false);

      if (membersError) {
        console.error(`Error fetching members for group ${group.id}:`, membersError);
        continue;
      }

      if (!members || members.length === 0) continue;

      const userIds = members.map(m => m.user_id);

      // Send batch reminder to all pending members
      try {
        await supabaseClient.functions.invoke('send-push-notification', {
          body: {
            userIds,
            title: `Contribution Reminder - ${group.name}`,
            body: `Don't forget to contribute MWK ${group.contribution_amount.toLocaleString()} to ${group.name}. Contribute now to maintain your trust score!`,
            data: {
              type: 'contribution_reminder',
              groupId: group.id,
              amount: group.contribution_amount.toString(),
            },
          },
        });

        remindersSent += members.length;
      } catch (error) {
        console.error(`Failed to send reminders for group ${group.id}:`, error);
        failedCount += members.length;
      }
    }

    console.log(`Sent ${remindersSent} contribution reminders, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: remindersSent,
        failed_count: failedCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending reminders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
