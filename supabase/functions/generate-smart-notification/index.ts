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
        systemPrompt = `You are a trusted financial advisor for PayFesa, deeply understanding Malawi's culture and economy. You combine traditional Malawian wisdom about money (like chilimba principles) with modern fintech. Generate warm, culturally-relevant reminders that inspire action. Use local context when appropriate. Keep under 150 characters.`;
        userPrompt = `${user?.name} has saved MWK ${totalSaved.toLocaleString()} across ${groups?.length || 0} groups with ${recentContributions?.length || 0} recent contributions. Remind them to contribute while acknowledging their progress. Consider Malawian values of community and mutual support.`;
        break;

      case 'education':
        systemPrompt = `You are a financial literacy expert specializing in Malawian economic realities. You understand local challenges: forex, inflation, agricultural cycles, and the informal economy. Provide practical, actionable financial advice rooted in both global best practices and Malawian context. Teach wealth-building principles. Limit to 200 characters.`;
        userPrompt = `${user?.name} has saved MWK ${totalSaved.toLocaleString()} (avg: MWK ${avgContribution.toFixed(0)}/contribution) in ${groups?.length || 0} groups. ${totalSaved > 50000 ? 'They are building wealth - suggest investment opportunities (SMEs, agriculture, bonds).' : 'They are starting their journey - teach basic money management and compound savings benefits.'} Make it relevant to Malawi's economy.`;
        break;

      case 'promotion':
        systemPrompt = `You are a fintech growth strategist who understands Malawian consumer behavior and mobile money culture. Create engaging messages that show how PayFesa helps users achieve financial freedom, start businesses, and support families. Highlight real benefits like group accountability and emergency funds. Be inspiring and authentic. Keep under 150 characters.`;
        userPrompt = `${user?.name}: ${groups?.length || 0} groups, MWK ${totalSaved.toLocaleString()} saved, ${recentContributions?.length || 0} recent contributions. ${totalSaved > 100000 ? 'Promote business funding capabilities and investment features.' : totalSaved > 30000 ? 'Highlight how they can invite friends and grow their savings faster.' : 'Show how regular saving leads to financial security.'} Frame around Malawian dreams (business, education, property).`;
        break;

      case 'update':
        systemPrompt = `You are PayFesa's community manager, speaking to Malawians about platform improvements. Be clear, positive, and show how updates solve real problems they face (like payout delays, trust issues, or contribution tracking). Keep under 150 characters.`;
        userPrompt = `Tell ${user?.name} (${groups?.length || 0} groups, MWK ${totalSaved.toLocaleString()} saved) about: ${context || 'improved security features, faster payouts, and better group management tools'}. Connect it to their financial goals and peace of mind.`;
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
