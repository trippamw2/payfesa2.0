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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting missed contribution detection...');

    // Get all active groups
    const { data: groups, error: groupsError } = await supabaseAdmin
      .from('rosca_groups')
      .select('*')
      .eq('status', 'active');

    if (groupsError) {
      console.error('Error fetching groups:', groupsError);
      throw groupsError;
    }

    console.log(`Checking ${groups?.length || 0} active groups for missed contributions`);

    let totalMissed = 0;
    let totalCovered = 0;
    const results = [];

    for (const group of groups || []) {
      try {
        // Get all group members
        const { data: members, error: membersError } = await supabaseAdmin
          .from('group_members')
          .select('user_id, has_contributed')
          .eq('group_id', group.id);

        if (membersError) {
          console.error(`Error fetching members for group ${group.id}:`, membersError);
          continue;
        }

        // Calculate total contributions needed
        const expectedTotal = group.contribution_amount * (members?.length || 0);

        // Get actual contributions
        const { data: contributions, error: contribError } = await supabaseAdmin
          .from('contributions')
          .select('amount, status')
          .eq('group_id', group.id)
          .eq('status', 'completed');

        if (contribError) {
          console.error(`Error fetching contributions for group ${group.id}:`, contribError);
          continue;
        }

        const actualTotal = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        const missedAmount = expectedTotal - actualTotal;

        if (missedAmount > 0) {
          console.log(`Group ${group.name} has ${missedAmount} MWK in missed contributions`);
          totalMissed++;

          // Check reserve wallet balance
          const { data: reserveWallet, error: reserveError } = await supabaseAdmin
            .from('reserve_wallet')
            .select('total_amount')
            .single();

          if (reserveError || !reserveWallet) {
            console.error(`Reserve wallet not found for group ${group.id}`);
            results.push({
              group_id: group.id,
              group_name: group.name,
              missed_amount: missedAmount,
              covered: false,
              reason: 'Reserve wallet not found'
            });
            continue;
          }

          // Check if reserve wallet has enough to cover
          if (reserveWallet.total_amount >= missedAmount) {
            // Cover the missed amount from reserve wallet
            const { error: withdrawError } = await supabaseAdmin.rpc('add_to_reserve_wallet', {
              p_amount: -missedAmount, // Negative amount for withdrawal
              p_group_id: group.id,
              p_user_id: null,
              p_reason: `Covered ${missedAmount} MWK missed contribution for group ${group.name}`
            });

            if (withdrawError) {
              console.error(`Error withdrawing from reserve for group ${group.id}:`, withdrawError);
              results.push({
                group_id: group.id,
                group_name: group.name,
                missed_amount: missedAmount,
                covered: false,
                reason: 'Failed to withdraw from reserve'
              });
              continue;
            }

            // Add to group's escrow balance
            const { data: escrow, error: escrowError } = await supabaseAdmin
              .from('group_escrows')
              .select('total_balance')
              .eq('group_id', group.id)
              .single();

            if (escrow) {
              await supabaseAdmin
                .from('group_escrows')
                .update({
                  total_balance: Number(escrow.total_balance) + missedAmount,
                  updated_at: new Date().toISOString()
                })
                .eq('group_id', group.id);
            } else {
              // Create escrow if doesn't exist
              await supabaseAdmin
                .from('group_escrows')
                .insert({
                  group_id: group.id,
                  total_balance: missedAmount
                });
            }

            console.log(`Successfully covered ${missedAmount} MWK for group ${group.name} from reserve wallet`);
            totalCovered++;

            results.push({
              group_id: group.id,
              group_name: group.name,
              missed_amount: missedAmount,
              covered: true,
              reserve_balance_after: reserveWallet.total_amount - missedAmount
            });

            // Send system message to group chat
            for (const member of members || []) {
              if (!member.has_contributed) {
                const { data: userData } = await supabaseAdmin
                  .from('users')
                  .select('name')
                  .eq('id', member.user_id)
                  .single();

                if (userData) {
                  supabaseAdmin.functions.invoke('send-system-message', {
                    body: {
                      groupId: group.id,
                      template: 'missed_payment',
                      data: { userName: userData.name }
                    }
                  }).catch(err => console.error('System message error:', err));
                }
              }
            }

            // Send notification to group admin
            try {
              await supabaseAdmin.functions.invoke('send-push-notification', {
                body: {
                  userIds: [group.creator_id],
                  title: 'Payout Guaranteed',
                  body: `PayFesa covered ${missedAmount.toLocaleString()} MWK in missed contributions for ${group.name}. Your group payout is SAFE! 🛡️`,
                  data: {
                    type: 'reserve_coverage',
                    groupId: group.id,
                    amount: missedAmount.toString()
                  }
                }
              });
            } catch (notifError) {
              console.error('Failed to send notification:', notifError);
            }
          } else {
            console.warn(`Reserve wallet insufficient to cover ${missedAmount} MWK for group ${group.name}`);
            results.push({
              group_id: group.id,
              group_name: group.name,
              missed_amount: missedAmount,
              covered: false,
              reason: `Insufficient reserve balance (${reserveWallet.total_amount} MWK available)`
            });
          }
        }
      } catch (error) {
        console.error(`Error processing group ${group.id}:`, error);
        results.push({
          group_id: group.id,
          group_name: group.name,
          covered: false,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`Missed contribution detection complete: ${totalMissed} groups with missed payments, ${totalCovered} covered from reserve`);

    return new Response(
      JSON.stringify({
        success: true,
        total_groups_checked: groups?.length || 0,
        groups_with_missed_contributions: totalMissed,
        covered_by_reserve: totalCovered,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in missed contribution detection:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
