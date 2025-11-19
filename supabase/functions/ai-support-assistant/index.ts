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
    const { userId, issueType, userQuery } = await req.json();

    if (!userId || !issueType || !userQuery) {
      throw new Error('Missing required parameters');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Generating support suggestion for user ${userId}, issue: ${issueType}`);

    // Gather user context
    const { data: user } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: recentTransactions } = await supabaseClient
      .from('mobile_money_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: recentPayouts } = await supabaseClient
      .from('payouts')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: groups } = await supabaseClient
      .from('group_members')
      .select('*, rosca_groups(*)')
      .eq('user_id', userId);

    const contextData = {
      user: {
        id: user?.id,
        name: user?.name,
        phone: user?.phone_number,
        wallet_balance: user?.wallet_balance,
        trust_score: user?.trust_score,
        frozen: user?.frozen
      },
      recent_transactions: recentTransactions?.map(t => ({
        status: t.status,
        amount: t.amount,
        type: t.type,
        created_at: t.created_at
      })),
      recent_payouts: recentPayouts?.map(p => ({
        status: p.status,
        amount: p.amount,
        created_at: p.created_at
      })),
      groups: groups?.map(g => ({
        name: g.rosca_groups?.name,
        status: g.rosca_groups?.status,
        has_contributed: g.has_contributed
      }))
    };

    // Ask AI for support suggestion
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
            content: `You are a customer support AI for PayFesa. Analyze user issues and provide helpful responses. Return JSON with:
{
  "analysis": "Brief analysis of the issue",
  "suggested_answer": "Customer-friendly response to the user",
  "suggested_actions": [
    {"action": "check_transaction", "params": {"transaction_id": "..."}},
    {"action": "refund", "amount": 100}
  ],
  "confidence": 0-100,
  "requires_escalation": boolean
}`
          },
          {
            role: 'user',
            content: `User query: "${userQuery}"
Issue type: ${issueType}

User context:
${JSON.stringify(contextData, null, 2)}

Provide a helpful response and suggested actions.`
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
    const aiSuggestion = JSON.parse(aiResult.choices[0].message.content);

    console.log('AI suggestion generated');

    // Store suggestion
    const { data: suggestion, error: insertError } = await supabaseClient
      .from('ai_support_suggestions')
      .insert({
        user_id: userId,
        issue_type: issueType,
        user_query: userQuery,
        ai_analysis: aiSuggestion.analysis,
        suggested_answer: aiSuggestion.suggested_answer,
        suggested_actions: aiSuggestion.suggested_actions,
        confidence_score: aiSuggestion.confidence
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing suggestion:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        suggestion
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-support-assistant:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});