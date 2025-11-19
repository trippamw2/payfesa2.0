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
    const { reportType = 'daily', category = 'system_health', periodStart, periodEnd } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const start = periodStart || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const end = periodEnd || new Date().toISOString();

    console.log(`Generating ${reportType} ${category} report from ${start} to ${end}`);

    // Gather data based on category
    let reportData: any = {};

    if (category === 'revenue' || category === 'system_health') {
      const { data: transactions } = await supabaseClient
        .from('mobile_money_transactions')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end);

      const { data: payouts } = await supabaseClient
        .from('payouts')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end);

      reportData.revenue = {
        total_transactions: transactions?.length || 0,
        successful_transactions: transactions?.filter(t => t.status === 'completed').length || 0,
        failed_transactions: transactions?.filter(t => t.status === 'failed').length || 0,
        total_amount: transactions?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0,
        total_payouts: payouts?.length || 0,
        payout_amount: payouts?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0
      };
    }

    if (category === 'contributions' || category === 'system_health') {
      const { data: contributions } = await supabaseClient
        .from('contributions')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end);

      reportData.contributions = {
        total: contributions?.length || 0,
        completed: contributions?.filter(c => c.status === 'completed').length || 0,
        pending: contributions?.filter(c => c.status === 'pending').length || 0,
        total_amount: contributions?.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0
      };
    }

    if (category === 'groups' || category === 'system_health') {
      const { data: groups } = await supabaseClient
        .from('rosca_groups')
        .select('*, group_members(count)')
        .gte('created_at', start)
        .lte('created_at', end);

      reportData.groups = {
        total: groups?.length || 0,
        active: groups?.filter(g => g.status === 'active').length || 0,
        new_groups: groups?.length || 0,
        avg_members: groups?.reduce((sum, g) => sum + (g.group_members?.[0]?.count || 0), 0) / (groups?.length || 1)
      };
    }

    if (category === 'users' || category === 'system_health') {
      const { data: users } = await supabaseClient
        .from('users')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end);

      reportData.users = {
        new_users: users?.length || 0,
        active_users: users?.filter(u => !u.frozen).length || 0
      };
    }

    if (category === 'fraud' || category === 'system_health') {
      const { data: fraudDetections } = await supabaseClient
        .from('ai_fraud_detections')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end);

      reportData.fraud = {
        total_detections: fraudDetections?.length || 0,
        high_risk: fraudDetections?.filter(f => f.risk_level === 'high').length || 0,
        resolved: fraudDetections?.filter(f => f.status === 'resolved').length || 0
      };
    }

    console.log('Report data gathered:', reportData);

    // Ask AI to analyze and generate insights
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
            content: `You are a business intelligence AI for PayFesa. Generate insightful reports with trends and recommendations. Return JSON with:
{
  "summary": "Brief executive summary",
  "key_insights": ["insight 1", "insight 2", "insight 3"],
  "trends": {
    "positive": ["trend 1"],
    "negative": ["trend 1"],
    "neutral": ["trend 1"]
  },
  "recommendations": ["action 1", "action 2", "action 3"]
}`
          },
          {
            role: 'user',
            content: `Generate a ${reportType} ${category} report based on this data:
${JSON.stringify(reportData, null, 2)}

Period: ${start} to ${end}

Provide actionable insights and recommendations.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const aiInsights = JSON.parse(aiResult.choices[0].message.content);

    console.log('AI insights generated');

    // Store report in database
    const { data: report, error: insertError } = await supabaseClient
      .from('ai_reports')
      .insert({
        report_type: reportType,
        report_category: category,
        title: `${category.replace('_', ' ').toUpperCase()} Report - ${reportType}`,
        summary: aiInsights.summary,
        data: reportData,
        insights: aiInsights.key_insights,
        recommendations: aiInsights.recommendations,
        period_start: start,
        period_end: end
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing report:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        report
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-report-generator:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});