import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JoinGroupRequest {
  group_code: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: JoinGroupRequest = await req.json();

    if (!body.group_code) {
      throw new Error('Group code is required');
    }

    // Find group by code
    const { data: group, error: groupError } = await supabase
      .from('rosca_groups')
      .select('*')
      .eq('group_code', body.group_code.toUpperCase())
      .single();

    if (groupError || !group) {
      throw new Error('Group not found with this code');
    }

    // Check if group is full
    if (group.current_members >= group.max_members) {
      throw new Error('Group is already full');
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      throw new Error('You are already a member of this group');
    }

    // Get current member count to assign position
    const { count: memberCount } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id);

    const nextPosition = (memberCount || 0) + 1;

    // Add user as member
    const { data: newMember, error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        payout_position: nextPosition,
        position_in_cycle: nextPosition,
        contribution_amount: group.contribution_amount || group.amount,
      })
      .select()
      .single();

    if (memberError) {
      console.error('Error adding member:', memberError);
      throw new Error(`Failed to join group: ${memberError.message}`);
    }

    // Update group member count
    const { error: updateError } = await supabase
      .from('rosca_groups')
      .update({ 
        current_members: nextPosition,
        status: nextPosition === group.max_members ? 'active' : 'pending'
      })
      .eq('id', group.id);

    if (updateError) {
      console.error('Error updating group member count:', updateError);
    }

    // Get user profile for welcome message
    const { data: userProfile } = await supabase
      .from('users')
      .select('full_name, phone_number')
      .eq('id', user.id)
      .single();

    const userName = userProfile?.full_name || userProfile?.phone_number || 'New member';

    // Send system message
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        group_id: group.id,
        sender_id: null,
        message: `${userName} has joined the group! (Position: ${nextPosition}/${group.max_members})`,
        message_type: 'system',
      });

    if (messageError) {
      console.error('Error creating join message:', messageError);
    }

    // Notify all existing group members about new member
    const { data: existingMembers } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', group.id)
      .neq('user_id', user.id);

    if (existingMembers && existingMembers.length > 0) {
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userIds: existingMembers.map(m => m.user_id),
            title: `New Member in ${group.name}! 👋`,
            body: `${userName} has joined the group. ${group.max_members - nextPosition} spots remaining!`,
            data: {
              type: 'member_joined',
              groupId: group.id,
            },
          },
        });
      } catch (notifError) {
        console.error('Error sending member join notification:', notifError);
      }
    }

    console.log('User joined group successfully:', group.id);

    return new Response(
      JSON.stringify({
        success: true,
        group,
        member: newMember,
        position: nextPosition,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Join group error:', error);
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
