import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateGroupRequest {
  name: string;
  description?: string;
  amount: number;
  max_members: number;
  frequency: 'weekly' | 'bi-weekly' | 'monthly';
  start_date?: string;
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

    const body: CreateGroupRequest = await req.json();

    // Validate input
    if (!body.name || !body.amount || !body.max_members || !body.frequency) {
      throw new Error('Missing required fields: name, amount, max_members, frequency');
    }

    if (body.max_members < 2 || body.max_members > 50) {
      throw new Error('max_members must be between 2 and 50');
    }

    if (body.amount < 1000) {
      throw new Error('Amount must be at least MWK 1000');
    }

    // Generate unique group code
    const groupCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('rosca_groups')
      .insert({
        name: body.name,
        description: body.description,
        amount: body.amount,
        contribution_amount: body.amount,
        max_members: body.max_members,
        frequency: body.frequency,
        group_code: groupCode,
        creator_id: user.id,
        created_by: user.id,
        current_members: 1,
        status: 'pending',
        start_date: body.start_date || null,
      })
      .select()
      .single();

    if (groupError) {
      console.error('Error creating group:', groupError);
      throw new Error(`Failed to create group: ${groupError.message}`);
    }

    // Add creator as first member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        payout_position: 1,
        position_in_cycle: 1,
        contribution_amount: body.amount,
      });

    if (memberError) {
      console.error('Error adding creator as member:', memberError);
      // Rollback: delete the group
      await supabase.from('rosca_groups').delete().eq('id', group.id);
      throw new Error(`Failed to add creator as member: ${memberError.message}`);
    }

    // Initialize group escrow
    const { error: escrowError } = await supabase
      .from('group_escrows')
      .insert({
        group_id: group.id,
        total_balance: 0,
        locked: false,
        payout_cycle: 0,
      });

    if (escrowError) {
      console.error('Error creating group escrow:', escrowError);
    }

    // Send system message
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        group_id: group.id,
        sender_id: null,
        message: `Welcome! ${body.name} has been created. Share the group code ${groupCode} with others to join.`,
        message_type: 'system',
      });

    if (messageError) {
      console.error('Error creating welcome message:', messageError);
    }

    // Send notification to creator
    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          userIds: [user.id],
          title: 'Group Created Successfully! 🎉',
          body: `${body.name} is ready! Share code ${groupCode} to invite members.`,
          data: {
            type: 'group_created',
            groupId: group.id,
            groupCode: groupCode,
          },
        },
      });
    } catch (notifError) {
      console.error('Error sending group creation notification:', notifError);
    }

    console.log('Group created successfully:', group.id);

    return new Response(
      JSON.stringify({
        success: true,
        group,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Create group error:', error);
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
