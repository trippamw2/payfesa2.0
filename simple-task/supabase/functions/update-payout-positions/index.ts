import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MemberWithScore {
  user_id: string;
  group_id: string;
  current_position: number | null;
  trust_score: number;
  joined_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { groupId, userId } = await req.json();

    console.log(`Updating payout positions for: ${groupId ? 'group ' + groupId : userId ? 'user ' + userId : 'all groups'}`);

    // Get groups to process
    let groupIds: string[] = [];
    if (groupId) {
      groupIds = [groupId];
    } else if (userId) {
      // Get all groups for specific user
      const { data: userGroups, error: userGroupsError } = await supabaseClient
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (userGroupsError) throw userGroupsError;
      groupIds = userGroups?.map(g => g.group_id) || [];
    } else {
      // Get all active groups
      const { data: groups, error: groupsError } = await supabaseClient
        .from('rosca_groups')
        .select('id')
        .eq('status', 'active');

      if (groupsError) throw groupsError;
      groupIds = groups?.map(g => g.id) || [];
    }

    console.log(`Processing ${groupIds.length} groups...`);

    let totalUpdates = 0;
    let totalNotifications = 0;

    for (const gId of groupIds) {
      try {
        // Get all members with their current positions and trust scores
        const { data: members, error: membersError } = await supabaseClient
          .from('group_members')
          .select(`
            user_id,
            group_id,
            payout_position,
            joined_at,
            users!inner(trust_score)
          `)
          .eq('group_id', gId);

        if (membersError) throw membersError;
        if (!members || members.length === 0) continue;

        // Map to proper structure with current positions
        const memberData: MemberWithScore[] = members.map(m => ({
          user_id: m.user_id,
          group_id: m.group_id,
          current_position: m.payout_position,
          trust_score: (m.users as any).trust_score || 50,
          joined_at: m.joined_at,
        }));

        // Sort by trust score (highest first), then by join date (earliest first) for ties
        const sortedMembers = [...memberData].sort((a, b) => {
          if (b.trust_score !== a.trust_score) {
            return b.trust_score - a.trust_score;
          }
          return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
        });

        // Track position changes for notifications
        const positionChanges: Array<{
          user_id: string;
          old_position: number | null;
          new_position: number;
          trust_score: number;
        }> = [];

        // Update payout positions and track changes
        for (let i = 0; i < sortedMembers.length; i++) {
          const newPosition = i + 1;
          const member = sortedMembers[i];
          const oldPosition = member.current_position;

          if (oldPosition !== newPosition) {
            positionChanges.push({
              user_id: member.user_id,
              old_position: oldPosition,
              new_position: newPosition,
              trust_score: member.trust_score,
            });

            // Update position in database
            const { error: updateError } = await supabaseClient
              .from('group_members')
              .update({ payout_position: newPosition })
              .eq('group_id', gId)
              .eq('user_id', member.user_id);

            if (updateError) {
              console.error(`Error updating position for user ${member.user_id}:`, updateError);
              continue;
            }

            totalUpdates++;
          }
        }

        // Send notifications for position changes
        if (positionChanges.length > 0) {
          console.log(`${positionChanges.length} position changes in group ${gId}`);

          // Get group name for notifications
          const { data: group } = await supabaseClient
            .from('rosca_groups')
            .select('name')
            .eq('id', gId)
            .single();

          const groupName = group?.name || 'Your group';

          for (const change of positionChanges) {
            const moved = change.old_position === null 
              ? 'assigned'
              : change.old_position > change.new_position 
                ? 'earlier' 
                : 'later';

            let title = '';
            let message = '';

            if (moved === 'assigned') {
              title = '🎯 Payout Position Assigned';
              message = `You've been assigned position #${change.new_position} in ${groupName}. Your trust score (${change.trust_score}) determines your payout order.`;
            } else if (moved === 'earlier') {
              title = '🎉 Payout Moved Earlier!';
              message = `Great news! Your payout in ${groupName} moved from position #${change.old_position} to #${change.new_position}. Your improved trust score (${change.trust_score}) earned you an earlier payout!`;
            } else {
              title = '⚠️ Payout Position Updated';
              message = `Your payout in ${groupName} moved from position #${change.old_position} to #${change.new_position}. Improve your trust score (${change.trust_score}) for an earlier payout next cycle.`;
            }

            // Send notification
            try {
              await supabaseClient.functions.invoke('send-push-notification', {
                body: {
                  userIds: [change.user_id],
                  title,
                  body: message,
                  data: {
                    type: 'payout_position_change',
                    group_id: gId,
                    old_position: change.old_position,
                    new_position: change.new_position,
                    trust_score: change.trust_score,
                  },
                },
              });

              totalNotifications++;
            } catch (notifError) {
              console.error(`Error sending notification to ${change.user_id}:`, notifError);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing group ${gId}:`, error);
      }
    }

    console.log(`✅ Payout positions updated: ${totalUpdates} changes, ${totalNotifications} notifications sent`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated payout positions for ${groupIds.length} groups`,
        total_updates: totalUpdates,
        notifications_sent: totalNotifications,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Payout position update error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
