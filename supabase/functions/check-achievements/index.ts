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
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);

    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create client with service role for internal operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Create client with user auth for user verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get current user (for verification)
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    console.log('User fetch result:', { hasUser: !!user, error: userError?.message });

    if (!user || userError) {
      throw new Error(`Unauthorized: ${userError?.message || 'User not found'}`);
    }

    console.log('Fetching user data for:', user.id);

    // Get user data using service role to bypass RLS
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      console.error('Error fetching user data:', userDataError);
      throw new Error(`Failed to fetch user data: ${userDataError.message}`);
    }

    console.log('User data fetched successfully');

    // Get user's groups count using service role
    const { count: groupCount, error: groupError } = await supabaseAdmin
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (groupError) {
      console.error('Error fetching group memberships:', groupError);
    }
    console.log('Group count:', groupCount);

    // Get contributions count using service role
    const { count: contributionCount, error: contributionError } = await supabaseAdmin
      .from('contributions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed');

    if (contributionError) {
      console.error('Error fetching contributions:', contributionError);
    }
    console.log('Contribution count:', contributionCount);

    // Check and award achievements
    const newAchievements = [];

    // First group achievement
    if (groupCount && groupCount >= 1) {
      console.log('Checking first group achievement...');
      const { data: existingAchievement, error: checkError } = await supabaseAdmin
        .from('achievements')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'first_group')
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing achievement:', checkError);
      }

      if (!existingAchievement && !checkError) {
        console.log('Awarding first group achievement...');
        const { data: achievement, error: insertError } = await supabaseAdmin
          .from('achievements')
          .insert({
            user_id: user.id,
            type: 'first_group',
            title: 'First Group',
            name: 'Group Starter',
            description: 'Joined your first savings group',
            tier: 'bronze',
            icon: '👥',
            category: 'groups',
            points_awarded: 10,
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Error inserting achievement:', insertError);
        } else if (achievement) {
          newAchievements.push(achievement);
          console.log('First group achievement awarded!');
        }
      }
    }

    // Contributor achievement
    if (contributionCount && contributionCount >= 5) {
      console.log('Checking contributor achievement...');
      const { data: existingAchievement, error: checkError } = await supabaseAdmin
        .from('achievements')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'contributor')
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing achievement:', checkError);
      }

      if (!existingAchievement && !checkError) {
        console.log('Awarding contributor achievement...');
        const { data: achievement, error: insertError } = await supabaseAdmin
          .from('achievements')
          .insert({
            user_id: user.id,
            type: 'contributor',
            title: 'Active Contributor',
            name: 'Contributor',
            description: 'Made 5 successful contributions',
            tier: 'silver',
            icon: '💰',
            category: 'contributions',
            points_awarded: 25,
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Error inserting achievement:', insertError);
        } else if (achievement) {
          newAchievements.push(achievement);
          console.log('Contributor achievement awarded!');
        }
      }
    }

    // High trust score achievement
    if (userData && userData.trust_score >= 80) {
      console.log('Checking trusted member achievement...');
      const { data: existingAchievement, error: checkError } = await supabaseAdmin
        .from('achievements')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'trusted_member')
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing achievement:', checkError);
      }

      if (!existingAchievement && !checkError) {
        console.log('Awarding trusted member achievement...');
        const { data: achievement, error: insertError } = await supabaseAdmin
          .from('achievements')
          .insert({
            user_id: user.id,
            type: 'trusted_member',
            title: 'Trusted Member',
            name: 'High Trust',
            description: 'Achieved a trust score of 80 or higher',
            tier: 'gold',
            icon: '⭐',
            category: 'trust',
            points_awarded: 50,
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Error inserting achievement:', insertError);
        } else if (achievement) {
          newAchievements.push(achievement);
          console.log('Trusted member achievement awarded!');
        }
      }
    }

    console.log('Achievement check complete. New achievements:', newAchievements.length);

    return new Response(
      JSON.stringify({
        success: true,
        newAchievements,
        totalAchievements: newAchievements.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
