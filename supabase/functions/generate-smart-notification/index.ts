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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, notificationType, context, dailyTheme, timeOfDay } = await req.json();

    if (!userId || !notificationType) {
      throw new Error('Missing required fields: userId and notificationType');
    }

    // Get the day's theme context
    const themeContext = dailyTheme ? `Today's focus: ${dailyTheme}. ` : '';

    // Fetch user data for context
    const { data: user } = await supabase
      .from('users')
      .select('name, created_at')
      .eq('id', userId)
      .single();

    // Fetch user's groups for context
    const { data: groups } = await supabase
      .from('group_members')
      .select('group_id, rosca_groups(name, contribution_amount, frequency)')
      .eq('user_id', userId);

    // Fetch recent contributions
    const { data: recentContributions } = await supabase
      .from('contributions')
      .select('amount, created_at, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Calculate user financial metrics
    const totalSaved = recentContributions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
    const avgContribution = recentContributions?.length ? totalSaved / recentContributions.length : 0;
    const groupsData = groups?.map(g => g.rosca_groups).filter(Boolean) || [];
    const totalPotentialSavings = groupsData.reduce((sum, g: any) => sum + (g?.contribution_amount || 0), 0);

    // Build AI prompt based on notification type with Malawi-specific context
    let systemPrompt = '';
    let userPrompt = '';

    switch (notificationType) {
      case 'welcome':
        systemPrompt = `You are welcoming ${user?.name} to PayFesa and Chipereganyu (savings groups). Write like a friend who's excited to show them something amazing using simple Grade 6 English. Use Donald Miller's StoryBrand style: show them the journey ahead and how they're the hero. Be warm and inspiring. NO asterisks, dashes, or special characters. Write in plain sentences. Keep under 120 characters for title and under 200 for message.`;
        userPrompt = `${themeContext}${user?.name} ${timeOfDay === 'morning' ? 'starts a new day with' : timeOfDay === 'afternoon' ? 'continues their journey with' : 'ends the day thinking about'} PayFesa. Welcome them warmly to the Chipereganyu community. Tell them they're about to start a journey where small steps lead to big dreams - school fees, business, helping family. Explain that saving with trusted friends makes goals possible. Make them excited to take their first step.`;
        break;

      case 'reminder':
        systemPrompt = `You are a caring friend reminding ${user?.name} about their Chipereganyu contribution using simple Grade 6 English. Use Donald Miller's style: make them the hero staying consistent. Be gentle, supportive, and encouraging. NO asterisks, dashes, or special characters. Write in plain sentences. Keep under 120 characters for title and under 200 for message.`;
        userPrompt = `${themeContext}${timeOfDay === 'morning' ? 'Start the day strong' : timeOfDay === 'afternoon' ? 'Quick reminder' : 'Before the day ends'}. ${user?.name} saved MWK ${totalSaved.toLocaleString()} in ${groups?.length || 0} Chipereganyu groups through ${recentContributions?.length || 0} contributions. Remind them their next contribution keeps their promise to the group. Show how their consistency builds trust and brings them closer to their goal. Talk like their friend who believes in them.`;
        break;

      case 'education':
        systemPrompt = `You are teaching ${user?.name} one simple money lesson about Chipereganyu using Grade 6 English. Use Donald Miller's style: make it clear how this helps them win. One practical tip they can use ${timeOfDay === 'morning' ? 'to start their day smart' : timeOfDay === 'afternoon' ? 'right now' : 'before tomorrow'}. NO lists, asterisks, or dashes. Just friendly advice in plain sentences. Keep under 120 characters for title and under 250 for message.`;
        userPrompt = `${themeContext}${timeOfDay === 'morning' ? 'Morning wisdom' : timeOfDay === 'afternoon' ? 'Afternoon learning' : 'Evening reflection'}: ${user?.name} has MWK ${totalSaved.toLocaleString()} saved in Chipereganyu. ${totalSaved > 50000 ? 'Teach them how to make money grow - buying goods to resell, starting a side business, or pooling resources with group members for bigger opportunities.' : 'Teach them why MWK 1,000 saved today becomes MWK 50,000 tomorrow through consistent Chipereganyu savings. Show how small regular amounts build big results.'} Make it feel like wisdom from a caring friend.`;
        break;

      case 'milestone':
        systemPrompt = `You are celebrating ${user?.name}'s progress with Chipereganyu using simple Grade 6 English. Use Donald Miller's style: make them feel like the hero of their money story. Be genuinely excited about their achievement. ${timeOfDay === 'morning' ? 'Start their day with pride' : timeOfDay === 'afternoon' ? 'Brighten their afternoon' : 'End their day on a high note'}. NO asterisks or special formatting. Plain celebratory sentences. Keep under 120 characters for title and under 200 for message.`;
        userPrompt = `${themeContext}${timeOfDay === 'morning' ? 'Good morning champion!' : timeOfDay === 'afternoon' ? 'Look how far you have come!' : 'Celebrate your progress today!'} ${user?.name} has saved MWK ${totalSaved.toLocaleString()} across ${groups?.length || 0} Chipereganyu groups with ${recentContributions?.length || 0} contributions! ${totalSaved > 100000 ? 'They crossed 100,000 MWK - that is life-changing money!' : totalSaved > 50000 ? 'They are building real savings that can change their future!' : 'Every Kwacha saved is a step toward their dreams!'} Make them proud of how far they have come.`;
        break;

      case 'growth':
        systemPrompt = `You are encouraging ${user?.name} to grow their Chipereganyu journey using Grade 6 English. Use Donald Miller's style: show the opportunity ahead. Be inspiring about helping others succeed too. ${timeOfDay === 'morning' ? 'Plant seeds for growth today' : timeOfDay === 'afternoon' ? 'Share the opportunity' : 'Reflect on growing together'}. NO asterisks or special formatting. Plain motivating sentences. Keep under 120 characters for title and under 200 for message.`;
        userPrompt = `${themeContext}${timeOfDay === 'morning' ? 'Start growing today' : timeOfDay === 'afternoon' ? 'Opportunity calling' : 'Think bigger together'}. ${user?.name} has ${(groups?.length || 0)} Chipereganyu groups and MWK ${totalSaved.toLocaleString()} saved. ${(groups?.length || 0) > 0 ? 'Encourage them to invite trusted friends to start their own Chipereganyu journey. When friends save together, everyone reaches goals faster.' : 'Encourage them to start or join a Chipereganyu group. Saving alone is hard, but with trusted friends it becomes possible and even enjoyable.'} Write like you are sharing an opportunity.`;
        break;

      case 'trust':
        systemPrompt = `You are building trust with ${user?.name} about PayFesa and Chipereganyu using Grade 6 English. Use Donald Miller's style: show how the system protects them and keeps their money safe. ${timeOfDay === 'morning' ? 'Give them confidence to start the day' : timeOfDay === 'afternoon' ? 'Reinforce their security' : 'Help them sleep peacefully'}. Be reassuring and clear. NO special characters or formatting. Plain confident sentences. Keep under 120 characters for title and under 200 for message.`;
        userPrompt = `${themeContext}${timeOfDay === 'morning' ? 'Your money is safe with us' : timeOfDay === 'afternoon' ? 'Security you can count on' : 'Rest easy tonight'}. ${user?.name} has MWK ${totalSaved.toLocaleString()} in ${groups?.length || 0} Chipereganyu groups. Reassure them their money is safe and their group members are real people they know and trust. Explain how Chipereganyu has helped Malawians save safely for generations - now made easier with PayFesa. Write like a trusted friend.`;
        break;

      case 'update':
        systemPrompt = `You are sharing exciting PayFesa improvements for ${user?.name}'s Chipereganyu using Grade 6 English. Use Donald Miller's style: tell them what got better and how it helps them win. ${timeOfDay === 'morning' ? 'Start their day with good news' : timeOfDay === 'afternoon' ? 'Brighten their afternoon' : 'End their day positively'}. Be clear and positive. NO special characters or formatting. Plain enthusiastic sentences. Keep under 120 characters for title and under 200 for message.`;
        userPrompt = `${themeContext}${timeOfDay === 'morning' ? 'Great news to start your day' : timeOfDay === 'afternoon' ? 'Exciting update for you' : 'Something new before tomorrow'}. Tell ${user?.name} (${groups?.length || 0} Chipereganyu groups, MWK ${totalSaved.toLocaleString()} saved) about: ${context || 'faster payouts, stronger security, and easier group management'}. Explain how this makes their Chipereganyu experience smoother and safer. Show them we're always working to serve them better. Write like a friend sharing good news.`;
        break;

      case 'trust':
        systemPrompt = `You are explaining a trust score change to ${user?.name} using simple Grade 6 English. Use Donald Miller's style: help them understand what happened and what to do next. Be honest but encouraging. NO special characters or formatting. Keep under 120 characters for title and under 250 for message.`;
        userPrompt = `${themeContext}Explain to ${user?.name} about their trust score change. Event: ${context?.event || 'trust score update'}. ${context?.change ? `Their score ${context.change > 0 ? 'increased' : 'decreased'} by ${Math.abs(context.change)} points.` : ''} Help them understand why this happened (on-time payments increase it, late/missed payments decrease it). ${context?.change && context.change < 0 ? 'Encourage them - one setback doesn\'t define them. Show how to rebuild trust through consistent payments.' : 'Celebrate their good behavior and encourage them to keep it up.'} Write like a supportive friend who believes in them.`;
        break;

      case 'insight':
        systemPrompt = `You are sharing personalized money insights with ${user?.name} about their Chipereganyu savings using Grade 6 English. Use Donald Miller's style: show them patterns they might not see and how to use this knowledge to win. ${timeOfDay === 'morning' ? 'Help them start the day informed' : timeOfDay === 'afternoon' ? 'Give them useful knowledge' : 'Help them reflect on their progress'}. NO special characters or lists. Plain insightful sentences. Keep under 120 characters for title and under 250 for message.`;
        userPrompt = `${themeContext}Analyze ${user?.name}'s wallet: MWK ${context?.walletBalance?.toLocaleString() || '0'} available, MWK ${context?.escrowBalance?.toLocaleString() || '0'} in Chipereganyu escrow, ${context?.totalContributions || 0} total contributions averaging MWK ${context?.avgContribution?.toLocaleString() || '0'}. ${context?.totalContributed > 0 ? `They've contributed MWK ${context.totalContributed.toLocaleString()} total.` : 'They are just starting their savings journey.'} Give them one powerful insight about their saving pattern - maybe they save more on certain days, or their contributions are growing, or they could optimize timing. Include one actionable tip to save smarter. Make it feel like advice from a financially savvy friend.`;
        break;

      default:
        throw new Error('Invalid notification type');
    }

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 200,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let generatedMessage = aiData.choices[0]?.message?.content || '';
    
    // Remove all markdown formatting: asterisks, dashes, hashtags, etc.
    generatedMessage = generatedMessage
      .replace(/\*\*/g, '')  // Remove bold
      .replace(/\*/g, '')    // Remove italic
      .replace(/^- /gm, '')  // Remove list dashes
      .replace(/^• /gm, '')  // Remove bullet points
      .replace(/^# /gm, '')  // Remove headers
      .replace(/\n\n+/g, ' ')  // Replace multiple newlines with space
      .replace(/\n/g, ' ')   // Replace single newlines with space
      .trim();

    // Generate title based on type
    const titles: Record<string, string> = {
      welcome: '👋 Welcome to PayFesa',
      reminder: '💰 Time to Save',
      education: '📚 Money Wisdom',
      milestone: '🎉 You\'re Winning!',
      growth: '🌱 Grow Together',
      trust: '🔒 Trust Score Update',
      update: '✨ Good News',
      insight: '💡 Wallet Insights'
    };

    // Create notification in database
    const { data: notification, error: notificationError } = await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        title: titles[notificationType] || 'PayFesa Alert',
        message: generatedMessage,
        type: notificationType === 'reminder' ? 'reminder' : 'system',
        metadata: {
          ai_generated: true,
          notification_type: notificationType,
          generated_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (notificationError) throw notificationError;

    // Send push notification
    const { data: fcmTokens } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (fcmTokens && fcmTokens.length > 0) {
      supabase.functions.invoke('send-push-notification', {
        body: {
          userIds: [userId],
          title: titles[notificationType],
          body: generatedMessage,
          data: { notificationId: notification.id, type: notificationType }
        }
      }).catch(err => console.error('Push notification error:', err));
    }

    console.log('Smart notification generated:', {
      userId,
      type: notificationType,
      messageLength: generatedMessage.length
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification,
        message: generatedMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating smart notification:', error);
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
