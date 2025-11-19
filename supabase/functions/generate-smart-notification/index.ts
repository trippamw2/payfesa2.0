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

    // Build AI prompt based on notification type
    let systemPrompt = '';
    let userPrompt = '';

    switch (notificationType) {
      case 'reminder':
        systemPrompt = `You are a friendly financial assistant for PayFesa, a savings group platform. Generate a personalized reminder message that is warm, encouraging, and actionable. Keep it under 150 characters.`;
        userPrompt = `User ${user?.name} has ${groups?.length || 0} active groups. Recent activity: ${recentContributions?.length || 0} contributions in the last month. Generate a friendly reminder to contribute to their savings group.`;
        break;

      case 'education':
        systemPrompt = `You are a financial education expert for PayFesa. Generate educational content that helps users understand savings, financial planning, or group savings benefits. Be informative but keep it digestible. Limit to 200 characters.`;
        userPrompt = `Generate a financial tip for ${user?.name} who is part of ${groups?.length || 0} savings groups. Make it relevant to group savings and trust building.`;
        break;

      case 'promotion':
        systemPrompt = `You are a growth marketing expert for PayFesa. Generate engaging promotional messages that highlight platform features and benefits. Be exciting but not pushy. Keep under 150 characters.`;
        userPrompt = `Create a promotion message for ${user?.name} about PayFesa features. They have ${groups?.length || 0} groups and ${recentContributions?.length || 0} recent contributions. Highlight relevant benefits.`;
        break;

      case 'update':
        systemPrompt = `You are a product announcer for PayFesa. Generate clear, concise update messages about platform improvements or new features. Be informative and positive. Keep under 150 characters.`;
        userPrompt = `Generate an update message for ${user?.name} about recent PayFesa improvements. Context: ${context || 'general platform updates'}`;
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
    const generatedMessage = aiData.choices[0]?.message?.content || '';

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
