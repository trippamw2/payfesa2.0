import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EditGroupRequest {
  group_id: string;
  name?: string;
  description?: string;
  frequency?: 'weekly' | 'bi-weekly' | 'monthly';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: EditGroupRequest = await req.json();

    if (!body.group_id) {
      throw new Error('Group ID is required');
    }

    // Get group and verify user is creator/admin
    const { data: group, error: groupError } = await supabase
      .from('rosca_groups')
      .select('*')
      .eq('id', body.group_id)
      .single();

    if (groupError || !group) {
      throw new Error('Group not found');
    }

    if (group.creator_id !== user.id && group.created_by !== user.id) {
      throw new Error('Only group creator can edit group details');
    }

    // Prepare update object
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        throw new Error('Group name cannot be empty');
      }
      updates.name = body.name.trim();
    }

    if (body.description !== undefined) {
      updates.description = body.description.trim() || null;
    }

    if (body.frequency !== undefined) {
      // Only allow frequency change if group hasn't started
      if (group.status === 'active' || group.current_members === group.max_members) {
        throw new Error('Cannot change frequency for active groups');
      }
      updates.frequency = body.frequency;
    }

    // Update group
    const { data: updatedGroup, error: updateError } = await supabase
      .from('rosca_groups')
      .update(updates)
      .eq('id', body.group_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating group:', updateError);
      throw new Error('Failed to update group');
    }

    // Send system message about the update
    await supabase
      .from('messages')
      .insert({
        group_id: body.group_id,
        sender_id: null,
        message: `Group details have been updated by the admin.`,
        message_type: 'system',
      });

    console.log('Group updated successfully:', body.group_id);

    return new Response(
      JSON.stringify({
        success: true,
        group: updatedGroup,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Edit group error:', error);
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
