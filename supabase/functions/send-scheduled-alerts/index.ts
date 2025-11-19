import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Daily themes for 7 days of the week
const dailyThemes = {
  1: { theme: 'Trust & Security', focus: 'Building confidence in PayFesa & Chipereganyu' },
  2: { theme: 'Growth & Success', focus: 'Celebrating milestones and encouraging progress' },
  3: { theme: 'Education & Learning', focus: 'Financial literacy and money wisdom' },
  4: { theme: 'Community & Together', focus: 'Social proof, inviting friends, saving together' },
  5: { theme: 'Rewards & Benefits', focus: 'Promotions, advantages, what users gain' },
  6: { theme: 'Planning & Goals', focus: 'Reminders, future planning, staying on track' },
  0: { theme: 'Inspiration & Vision', focus: 'Motivation, big picture, dreams coming true' }
};

// Notification scheduling strategy based on time of day and marketing best practices
const notificationStrategy = {
  morning: {  // 8 AM - Motivational, sets the tone
    types: ['milestone', 'welcome', 'growth', 'trust'],
    themes: {
      1: 'trust',      // Monday: Start week with confidence
      2: 'milestone',  // Tuesday: Celebrate your progress
      3: 'welcome',    // Wednesday: You're doing great
      4: 'growth',     // Thursday: Invite friends today
      5: 'milestone',  // Friday: Look how far you've come
      6: 'reminder',   // Saturday: Time to contribute
      0: 'growth'      // Sunday: Dream big together
    }
  },
  afternoon: {  // 2 PM - Educational or reminder
    types: ['education', 'update', 'reminder'],
    themes: {
      1: 'update',     // Monday: New features for you
      2: 'education',  // Tuesday: Learn something new
      3: 'education',  // Wednesday: Financial wisdom
      4: 'reminder',   // Thursday: Don't forget your group
      5: 'update',     // Friday: Weekend improvements
      6: 'education',  // Saturday: Grow your knowledge
      0: 'reminder'    // Sunday: Prepare for the week
    }
  },
  evening: {  // 7 PM - Reflection, reminder, planning
    types: ['reminder', 'trust', 'growth', 'education'],
    themes: {
      1: 'trust',      // Monday: Sleep well, money is safe
      2: 'growth',     // Tuesday: Expand your circle
      3: 'reminder',   // Wednesday: Complete your contribution
      4: 'education',  // Thursday: Evening wisdom
      5: 'growth',     // Friday: Weekend planning with friends
      6: 'trust',      // Saturday: Secure and growing
      0: 'reminder'    // Sunday: Ready for new week
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get time of day from request or determine from current time
    const { timeOfDay: requestedTime } = await req.json().catch(() => ({}));
    
    // Determine time of day (CAT - Central Africa Time)
    const now = new Date();
    const catTime = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Blantyre' }));
    const hour = catTime.getHours();
    
    let timeOfDay: string;
    if (requestedTime) {
      timeOfDay = requestedTime;
    } else {
      if (hour >= 6 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
      else timeOfDay = 'evening';
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = catTime.getDay();
    const todayTheme = dailyThemes[dayOfWeek as keyof typeof dailyThemes];
    
    console.log('Scheduled alerts triggered:', {
      timeOfDay,
      dayOfWeek,
      theme: todayTheme.theme,
      hour
    });

    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, created_at')
      .eq('frozen', false)
      .limit(50);

    if (usersError || !users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active users found', error: usersError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      welcome: 0,
      reminder: 0,
      education: 0,
      milestone: 0,
      growth: 0,
      trust: 0,
      update: 0,
      errors: 0
    };

    // Get notification strategy for this time
    const strategy = notificationStrategy[timeOfDay as keyof typeof notificationStrategy];
    const notificationTypeForToday = strategy.themes[dayOfWeek as keyof typeof strategy.themes];

    // Process users in batches
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (user) => {
        try {
          // Check if user already received a notification in the last 5 hours
          const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
          const { data: recentNotifications } = await supabase
            .from('user_notifications')
            .select('created_at')
            .eq('user_id', user.id)
            .gte('created_at', fiveHoursAgo)
            .order('created_at', { ascending: false })
            .limit(1);

          // Skip if user already got notification recently (rate limiting)
          if (recentNotifications && recentNotifications.length > 0) {
            console.log(`Skipping user ${user.name} - recent notification exists`);
            return;
          }

          console.log(`Sending ${notificationTypeForToday} notification to ${user.name} (${timeOfDay})`);
          
          // Call generate-smart-notification function
          const response = await supabase.functions.invoke('generate-smart-notification', {
            body: {
              userId: user.id,
              notificationType: notificationTypeForToday,
              dailyTheme: todayTheme.theme,
              timeOfDay: timeOfDay,
              context: notificationTypeForToday === 'update' ? todayTheme.focus : null
            }
          });

          if (response.error) {
            console.error(`Error for user ${user.id}:`, response.error);
            results.errors++;
          } else {
            // Increment counter
            results[notificationTypeForToday as keyof typeof results]++;
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

    console.log('Scheduled alerts completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        timeOfDay,
        theme: todayTheme.theme,
        notificationType: notificationTypeForToday,
        processed: users.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scheduled alerts:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
