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

    console.log('Starting smart alerts generation...');

    // Get all users (for testing, remove active filter)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, created_at')
      .limit(20);

    console.log('Users found:', users?.length, 'Error:', usersError);

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users found', error: usersError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      welcome: 0,
      reminders: 0,
      education: 0,
      milestone: 0,
      growth: 0,
      trust: 0,
      updates: 0,
      errors: 0
    };

    // Process users in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (user) => {
        try {
          // Check user's last AI-generated notification
          const { data: notifications } = await supabase
            .from('user_notifications')
            .select('created_at, type, metadata')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

          // Find the last AI-generated notification
          const lastAiNotification = notifications?.find(n => n.metadata?.ai_generated === true) || null;
          
          console.log(`User ${user.name} last AI notification:`, lastAiNotification?.type || 'none');

          // Cycle through all 7 notification types to engage users throughout their journey
          const notificationTypes = ['welcome', 'reminder', 'education', 'milestone', 'growth', 'trust', 'update'];
          const lastType = lastAiNotification?.metadata?.notification_type as string;
          const lastIndex = lastType ? notificationTypes.indexOf(lastType) : -1;
          const nextIndex = (lastIndex + 1) % notificationTypes.length;
          const notificationType = notificationTypes[nextIndex];

          console.log('Sending notification:', {
            userId: user.id,
            userName: user.name,
            type: notificationType,
            lastType,
            nextIndex,
            allTypes: notificationTypes
          });
            
          // Call generate-smart-notification function
          const response = await supabase.functions.invoke('generate-smart-notification', {
            body: {
              userId: user.id,
              notificationType,
              context: notificationType === 'update' ? 'Platform improvements and new features' : null
            }
          });

          if (response.error) {
            console.error(`Error for user ${user.id}:`, response.error);
            results.errors++;
          } else {
            // Increment the correct counter based on type
            switch (notificationType) {
              case 'welcome':
                results.welcome = (results.welcome || 0) + 1;
                break;
              case 'reminder':
                results.reminders++;
                break;
              case 'education':
                results.education++;
                break;
              case 'milestone':
                results.milestone = (results.milestone || 0) + 1;
                break;
              case 'growth':
                results.growth = (results.growth || 0) + 1;
                break;
              case 'trust':
                results.trust = (results.trust || 0) + 1;
                break;
              case 'update':
                results.updates++;
                break;
            }
          }
        } catch (error) {
          console.error(`Error processing user ${user.id}:`, error);
          results.errors++;
        }
      }));

      // Small delay between batches
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('Smart alerts generation completed:', results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: users.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in smart alerts:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
