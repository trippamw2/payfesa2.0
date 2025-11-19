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
    const { groupId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Analyzing health for group: ${groupId || 'all groups'}`);

    // Get groups to analyze
    let groupsQuery = supabaseClient
      .from('rosca_groups')
      .select('*, group_members(user_id, has_contributed, contribution_amount)');

    if (groupId) {
      groupsQuery = groupsQuery.eq('id', groupId);
    } else {
      groupsQuery = groupsQuery.eq('status', 'active').limit(20);
    }

    const { data: groups, error: groupsError } = await groupsQuery;

    if (groupsError) throw groupsError;
    if (!groups || groups.length === 0) {
      throw new Error('No groups found');
    }

    const insights = [];

    for (const group of groups) {
      // Get additional data for this group
      const [
        { data: contributions },
        { data: payouts },
        { data: members }
      ] = await Promise.all([
        supabaseClient
          .from('contributions')
          .select('*')
          .eq('group_id', group.id)
          .order('created_at', { ascending: false })
          .limit(50),
        
        supabaseClient
          .from('payouts')
          .select('*')
          .eq('group_id', group.id),
        
        supabaseClient
          .from('group_members')
          .select('*, users!inner(trust_score, wallet_balance)')
          .eq('group_id', group.id)
      ]);

      const groupData = {
        id: group.id,
        name: group.name,
        status: group.status,
        member_count: group.group_members?.length || 0,
        contribution_rate: (contributions?.filter(c => c.status === 'completed').length || 0) / (contributions?.length || 1),
        total_contributions: contributions?.length || 0,
        total_payouts: payouts?.length || 0,
        avg_trust_score: members?.reduce((sum, m) => sum + (m.users?.trust_score || 0), 0) / (members?.length || 1),
        active_members: members?.filter(m => m.has_contributed).length || 0,
        created_at: group.created_at
      };

      // Ask AI to analyze this group
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp',
          messages: [
            {
              role: 'system',
              content: `You are a group health analyzer for PayFesa. Analyze group performance and predict outcomes. Return JSON with:
{
  "health_score": 0-100,
  "health_status": "excellent" | "good" | "warning" | "critical",
  "risk_level": "low" | "medium" | "high" | "critical",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "predictions": {
    "likely_to_collapse": boolean,
    "likely_to_grow": boolean,
    "stability_score": 0-100
  },
  "recommendation": "What admin should do"
}`
            },
            {
              role: 'user',
              content: `Analyze this group:
${JSON.stringify(groupData, null, 2)}

Provide health assessment and predictions.`
            }
          ],
          temperature: 0.7,
        }),
      });

      if (!aiResponse.ok) {
        console.error(`AI API error for group ${group.id}`);
        continue;
      }

      const aiResult = await aiResponse.json();
      const aiAnalysis = JSON.parse(aiResult.choices[0].message.content);

      // Store insight
      const { error: insertError } = await supabaseClient
        .from('ai_group_insights')
        .insert({
          group_id: group.id,
          health_score: aiAnalysis.health_score,
          health_status: aiAnalysis.health_status,
          risk_level: aiAnalysis.risk_level,
          analysis: groupData,
          strengths: aiAnalysis.strengths,
          weaknesses: aiAnalysis.weaknesses,
          predictions: aiAnalysis.predictions,
          ai_recommendation: aiAnalysis.recommendation,
          next_review_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (insertError) {
        console.error('Error storing group insight:', insertError);
      } else {
        insights.push({
          group_id: group.id,
          group_name: group.name,
          ...aiAnalysis
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        insights_generated: insights.length,
        insights
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-group-health-analyzer:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});