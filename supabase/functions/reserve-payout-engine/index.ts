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

    const { groupId, userId, expectedAmount } = await req.json();

    console.log('Reserve Payout Engine activated:', { groupId, userId, expectedAmount });

    if (!groupId || !userId || !expectedAmount) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get group details
    const { data: group, error: groupError } = await supabaseAdmin
      .from('rosca_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      console.error('Group not found:', groupError);
      return new Response(
        JSON.stringify({ error: 'Group not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all contributions for this group
    const { data: contributions, error: contribError } = await supabaseAdmin
      .from('contributions')
      .select('amount, status, user_id')
      .eq('group_id', groupId)
      .eq('status', 'completed');

    if (contribError) {
      console.error('Error fetching contributions:', contribError);
      throw contribError;
    }

    // Calculate actual total contributed
    const actualTotal = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
    const shortfall = expectedAmount - actualTotal;

    console.log(`Group ${group.name}: Expected ${expectedAmount}, Got ${actualTotal}, Shortfall ${shortfall}`);

    if (shortfall > 0) {
      // Get reserve wallet
      const { data: reserveWallet, error: reserveError } = await supabaseAdmin
        .from('reserve_wallet')
        .select('*')
        .single();

      if (reserveError || !reserveWallet) {
        console.error('Reserve wallet not found');
        return new Response(
          JSON.stringify({ 
            error: 'Reserve wallet not available',
            covered: false,
            shortfall 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if reserve can cover shortfall
      if (reserveWallet.total_amount >= shortfall) {
        console.log(`Reserve wallet can cover ${shortfall} MWK shortfall`);

        // Withdraw from reserve wallet
        const { error: withdrawError } = await supabaseAdmin.rpc('add_to_reserve_wallet', {
          p_amount: -shortfall,
          p_group_id: groupId,
          p_user_id: userId,
          p_reason: `Covered ${shortfall} MWK shortfall for payout in group ${group.name}`
        });

        if (withdrawError) {
          console.error('Error withdrawing from reserve:', withdrawError);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to withdraw from reserve',
              covered: false,
              shortfall 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Add covered amount to user's escrow balance
        const { error: escrowError } = await supabaseAdmin.rpc('update_escrow_balance', {
          p_user_id: userId,
          p_amount: shortfall
        });

        if (escrowError) {
          console.error('Error updating escrow balance:', escrowError);
          // Rollback reserve withdrawal
          await supabaseAdmin.rpc('add_to_reserve_wallet', {
            p_amount: shortfall,
            p_group_id: groupId,
            p_user_id: userId,
            p_reason: `Rollback: Failed to add to escrow for ${group.name}`
          });
          return new Response(
            JSON.stringify({ 
              error: 'Failed to add to escrow balance',
              covered: false,
              shortfall 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Log the reserve coverage transaction
        await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: userId,
            type: 'reserve_coverage',
            amount: shortfall,
            status: 'completed',
            group_id: groupId,
            details: {
              covered_by_reserve: true,
              original_expected: expectedAmount,
              actual_contributions: actualTotal,
              reserve_coverage: shortfall,
              message: 'PayFesa Reserve Guarantee activated - Your payout is SAFE!'
            }
          });

        // Send success notification
        try {
          await supabaseAdmin.functions.invoke('send-push-notification', {
            body: {
              userIds: [userId],
              title: '🛡️ Payout Guaranteed!',
              body: `Great news! PayFesa covered ${shortfall.toLocaleString()} MWK from our reserve fund to guarantee your full payout. You'll receive the complete amount! 💰`,
              data: {
                type: 'reserve_guarantee',
                groupId,
                amount: shortfall.toString()
              }
            }
          });
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
        }

        console.log(`Successfully covered ${shortfall} MWK from reserve for user ${userId}`);

        return new Response(
          JSON.stringify({
            success: true,
            covered: true,
            shortfall,
            reserve_balance_after: reserveWallet.total_amount - shortfall,
            message: 'Payout guaranteed by PayFesa Reserve'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.warn(`Reserve wallet insufficient: Has ${reserveWallet.total_amount}, needs ${shortfall}`);
        return new Response(
          JSON.stringify({
            success: false,
            covered: false,
            shortfall,
            reserve_balance: reserveWallet.total_amount,
            message: 'Insufficient reserve balance to cover shortfall'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log('No shortfall detected, payout can proceed normally');
      return new Response(
        JSON.stringify({
          success: true,
          covered: false,
          shortfall: 0,
          message: 'All contributions received, no reserve coverage needed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in reserve payout engine:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
