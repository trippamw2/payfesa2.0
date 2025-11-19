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
      reminders: 0,
      education: 0,
      promotions: 0,
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
            .limit(10);  // Get last 10 to find AI-generated ones

          // Find the last AI-generated notification
          const lastNotification = notifications?.find(n => n.metadata?.ai_generated === true) || null;
          
          console.log(`User ${user.name} last AI notification:`, lastNotification?.type || 'none');

          const now = new Date();
          const lastNotificationTime = lastNotification 
            ? new Date(lastNotification.created_at)
            : new Date(0);
          const hoursSinceLastNotification = 
            (now.getTime() - lastNotificationTime.getTime()) / (1000 * 60 * 60);

          // Check if user has pending contributions
          const { data: groups } = await supabase
            .from('group_members')
            .select('group_id, has_contributed')
            .eq('user_id', user.id)
            .eq('has_contributed', false);

          // For immediate testing: always send a notification cycling through types
          let notificationType = null;
          
          // Cycle through notification types based on last sent
          if (!lastNotification) {
            notificationType = 'reminder';
          } else {
            switch (lastNotification.type) {
              case 'reminder':
                notificationType = 'education';
                break;
              case 'education':
                notificationType = 'promotion';
                break;
              case 'promotion':
                notificationType = 'update';
                break;
              case 'update':
                notificationType = 'reminder';
                break;
              default:
                notificationType = 'reminder';
            }
          }

          if (notificationType) {
            console.log(`Generating ${notificationType} for user ${user.name}`);
            
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
                case 'reminder':
                  results.reminders++;
                  break;
                case 'education':
                  results.education++;
                  break;
                case 'promotion':
                  results.promotions++;
                  break;
                case 'update':
                  results.updates++;
                  break;
              }
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
