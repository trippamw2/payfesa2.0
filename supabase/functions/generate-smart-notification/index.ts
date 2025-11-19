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

    const { userId, notificationType, context } = await req.json();

    if (!userId || !notificationType) {
      throw new Error('Missing required fields: userId and notificationType');
    }

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
      case 'reminder':
        systemPrompt = `You are a friendly neighbor helping ${user?.name} save money. Write like you're talking to a friend using simple Grade 6 English. Use Donald Miller's StoryBrand style: make them the hero of their money story. Be warm, personal, and encouraging. NO asterisks, dashes, or special characters. Write in plain sentences. Keep under 120 characters for title and under 200 for message.`;
        userPrompt = `${user?.name} saved MWK ${totalSaved.toLocaleString()} in ${groups?.length || 0} groups. They made ${recentContributions?.length || 0} contributions. Write a personal reminder that makes them feel proud of their progress and gently reminds them their group needs their next contribution. Talk like you're their friend who believes in them.`;
        break;

      case 'education':
        systemPrompt = `You are a trusted friend teaching ${user?.name} about money using Grade 6 English. Use Donald Miller's style: make the lesson clear, simple, and about how it helps them win. One simple money tip they can use today. NO lists, asterisks, or dashes. Just friendly advice in plain sentences. Keep under 120 characters for title and under 250 for message.`;
        userPrompt = `${user?.name} has MWK ${totalSaved.toLocaleString()} saved (average MWK ${avgContribution.toFixed(0)} per time). ${totalSaved > 50000 ? 'Teach them one simple way to grow this money further - maybe starting a small business, buying goods to resell, or investing with trusted people.' : 'Teach them why saving small amounts regularly is powerful - how MWK 1,000 today becomes MWK 50,000 over time.'} Make it feel like advice from a caring friend.`;
        break;

      case 'promotion':
        systemPrompt = `You are telling ${user?.name} about how PayFesa helps them win with money. Use Grade 6 English and Donald Miller's style: show the problem they face, then how PayFesa helps them overcome it. Make it personal and real. NO asterisks or special formatting. Plain friendly sentences. Keep under 120 characters for title and under 200 for message.`;
        userPrompt = `${user?.name} has ${groups?.length || 0} groups and saved MWK ${totalSaved.toLocaleString()}. ${totalSaved > 100000 ? 'Show how they can use this money to start something big - a business, property, or helping family with school fees.' : totalSaved > 30000 ? 'Show how inviting friends to save together makes everyone reach their goals faster.' : 'Show how saving with friends they trust makes reaching money goals easier than saving alone.'} Write like you're sharing good news with a friend.`;
        break;

      case 'update':
        systemPrompt = `You are sharing good news with ${user?.name} about PayFesa improvements. Use Grade 6 English and Donald Miller's style: tell them what problem is now solved and how it makes their life easier. Be clear and positive. NO special characters or formatting. Plain sentences only. Keep under 120 characters for title and under 200 for message.`;
        userPrompt = `Tell ${user?.name} (${groups?.length || 0} groups, MWK ${totalSaved.toLocaleString()} saved) about: ${context || 'faster payouts, better security, and easier group management'}. Explain how this one improvement makes saving money with their groups safer and easier. Write like a friend sharing good news.`;
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
        temperature: 0.8,
        max_tokens: 200,
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
      reminder: '💰 Time to Save!',
      education: '📚 Financial Tip',
      promotion: '🎉 Exciting News!',
      update: '✨ What\'s New'
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
