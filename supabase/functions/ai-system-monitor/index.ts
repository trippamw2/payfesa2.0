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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Starting system monitoring...');

    // Gather system metrics
    const [
      { data: failedTransactions },
      { data: delayedPayouts },
      { data: errorLogs },
      { data: apiErrors },
      { data: systemWarnings }
    ] = await Promise.all([
      // Failed transactions in last hour
      supabaseClient
        .from('mobile_money_transactions')
        .select('*')
        .eq('status', 'failed')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()),
      
      // Delayed payouts
      supabaseClient
        .from('payouts')
        .select('*')
        .eq('status', 'pending')
        .lt('payout_date', new Date().toISOString()),
      
      // Recent error patterns
      supabaseClient
        .from('fraud_alerts')
        .select('*')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(10),
      
      // API configuration issues
      supabaseClient
        .from('api_configurations')
        .select('*')
        .eq('enabled', false),
      
      // System warnings
      supabaseClient
        .from('ai_system_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    const metrics = {
      failed_transactions: failedTransactions?.length || 0,
      delayed_payouts: delayedPayouts?.length || 0,
      unresolved_fraud_alerts: errorLogs?.length || 0,
      disabled_apis: apiErrors?.length || 0,
      active_alerts: systemWarnings?.length || 0
    };

    console.log('System metrics:', metrics);

    // Ask AI to analyze the metrics
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
            content: `You are a system monitoring AI for PayFesa. Analyze system metrics and identify critical issues. Return JSON with:
{
  "alerts": [
    {
      "type": "api_error" | "payment_failure" | "payout_delay" | "spike_detected" | "system_warning",
      "severity": "info" | "warning" | "critical",
      "title": "Brief title",
      "description": "Detailed description",
      "recommendation": "What to do",
      "affected_entity_type": "system" | "user" | "group" | "transaction",
      "metrics": {}
    }
  ],
  "overall_health": "healthy" | "degraded" | "critical"
}`
          },
          {
            role: 'user',
            content: `Analyze these system metrics:
- Failed transactions (last hour): ${metrics.failed_transactions}
- Delayed payouts: ${metrics.delayed_payouts}
- Unresolved fraud alerts: ${metrics.unresolved_fraud_alerts}
- Disabled API providers: ${metrics.disabled_apis}
- Active system alerts: ${metrics.active_alerts}

Recent failed transactions: ${JSON.stringify(failedTransactions?.slice(0, 3))}
Delayed payouts: ${JSON.stringify(delayedPayouts?.slice(0, 3))}

Identify critical issues and provide recommendations.`
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
    const aiAnalysis = JSON.parse(aiResult.choices[0].message.content);

    console.log('AI analysis complete:', aiAnalysis);

    // Store alerts in database
    const alertsToInsert = aiAnalysis.alerts.map((alert: any) => ({
      alert_type: alert.type,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      ai_recommendation: alert.recommendation,
      affected_entity_type: alert.affected_entity_type || 'system',
      metrics: alert.metrics || metrics,
      status: 'active'
    }));

    if (alertsToInsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('ai_system_alerts')
        .insert(alertsToInsert);

      if (insertError) {
        console.error('Error inserting alerts:', insertError);
      } else {
        console.log(`Inserted ${alertsToInsert.length} new alerts`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        overall_health: aiAnalysis.overall_health,
        alerts_created: alertsToInsert.length,
        metrics
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-system-monitor:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});