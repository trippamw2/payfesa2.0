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

    const { userId, entityType, entityId } = await req.json();
    
    console.log('Analyzing fraud risk for:', { userId, entityType, entityId });

    // Gather user behavior data
    const userData = await gatherUserData(supabaseClient, userId);
    
    // Analyze with AI
    const analysis = await analyzeWithAI(userData, entityType);
    
    // Store fraud detection result
    let fraudDetection: any = null;
    if (analysis.riskLevel !== 'low') {
      const { data } = await supabaseClient
        .from('ai_fraud_detections')
        .insert({
          user_id: userId,
          detection_type: analysis.detectionType,
          risk_level: analysis.riskLevel,
          confidence_score: analysis.confidenceScore,
          detected_patterns: analysis.patterns,
          evidence: analysis.evidence,
          ai_analysis: analysis.reasoning,
          status: analysis.riskLevel === 'critical' ? 'reviewing' : 'pending'
        })
        .select()
        .single();
      
      fraudDetection = data;
      console.log('Fraud detection created:', fraudDetection?.id);
    }
    
    // Store risk score
    const { data: riskScore } = await supabaseClient
      .from('ai_risk_scores')
      .insert({
        entity_type: entityType || 'user',
        entity_id: entityId || userId,
        risk_score: analysis.riskScore,
        risk_category: 'fraud',
        risk_factors: analysis.riskFactors,
        ai_recommendation: analysis.recommendation,
        confidence_level: analysis.confidenceLevel,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    
    console.log('Risk score created:', riskScore?.id);

    // Create AI decision if high risk
    if (analysis.riskScore > 70) {
      const decision = await createAIDecision(supabaseClient, {
        entityType: entityType || 'user',
        entityId: entityId || userId,
        riskScore: analysis.riskScore,
        analysis
      });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          analysis, 
          fraudDetectionId: fraudDetection?.id,
          riskScoreId: riskScore?.id,
          decisionId: decision?.id,
          requiresAdminReview: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        riskScoreId: riskScore?.id,
        requiresAdminReview: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in AI fraud analyzer:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function gatherUserData(supabase: any, userId: string) {
  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  // Get recent transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  // Get group memberships
  const { data: groups } = await supabase
    .from('group_members')
    .select('*, rosca_groups(*)')
    .eq('user_id', userId);

  // Get contributions
  const { data: contributions } = await supabase
    .from('contributions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Get payouts
  const { data: payouts } = await supabase
    .from('payouts')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Get previous fraud detections
  const { data: previousFraud } = await supabase
    .from('ai_fraud_detections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    user,
    transactions: transactions || [],
    groups: groups || [],
    contributions: contributions || [],
    payouts: payouts || [],
    previousFraud: previousFraud || []
  };
}

async function analyzeWithAI(userData: any, entityType: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const prompt = `You are an AI fraud detection system for PayFesa, a financial application for group savings (ROSCA).

Analyze this user's behavior and financial patterns for potential fraud:

User Info:
- Account Age: ${userData.user?.created_at}
- Trust Score: ${userData.user?.trust_score || 50}/100
- Wallet Balance: ${userData.user?.wallet_balance || 0} MWK
- Frozen Status: ${userData.user?.frozen || false}
- Total Groups: ${userData.groups.length}
- Previous Fraud Flags: ${userData.previousFraud.length}

Recent Activity:
- Total Transactions: ${userData.transactions.length}
- Recent Contributions: ${userData.contributions.length}
- Payouts Received: ${userData.payouts.length}

Transaction Patterns:
${userData.transactions.slice(0, 5).map((t: any) => 
  `- ${t.type}: ${t.amount} MWK (${t.status}) at ${t.created_at}`
).join('\n')}

Analyze for:
1. Suspicious transaction patterns (rapid withdrawals, unusual amounts)
2. Account takeover indicators (sudden behavior changes)
3. Money laundering patterns (circular transactions)
4. Group fraud (joining many groups quickly)
5. Payout manipulation attempts

Provide:
- riskScore (0-100)
- riskLevel (low/medium/high/critical)
- detectionType (behavior/payout/contribution/device/location)
- confidenceScore (0-100)
- confidenceLevel (low/medium/high)
- patterns (array of detected pattern names)
- riskFactors (array of specific risk factors)
- evidence (object with specific evidence)
- reasoning (detailed explanation)
- recommendation (what admin should do)

Respond ONLY with valid JSON.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-exp",
      messages: [
        { role: "system", content: "You are a fraud detection AI. Respond only with valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add funds.");
    }
    throw new Error(`AI analysis failed: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Parse JSON response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Invalid AI response format");
  }
  
  return JSON.parse(jsonMatch[0]);
}

async function createAIDecision(supabase: any, params: any) {
  const { entityType, entityId, riskScore, analysis } = params;
  
  let decisionType = 'review_required';
  let aiDecision = 'review_required';
  
  // Determine decision type based on entity and risk
  if (entityType === 'payout' && riskScore > 85) {
    decisionType = 'payout_approval';
    aiDecision = 'reject';
  } else if (riskScore > 90) {
    decisionType = 'account_freeze';
    aiDecision = 'approve'; // Approve the freeze action
  } else if (entityType === 'contribution' && riskScore > 75) {
    decisionType = 'contribution_review';
    aiDecision = 'review_required';
  }
  
  const { data: decision } = await supabase
    .from('ai_decisions')
    .insert({
      decision_type: decisionType,
      entity_type: entityType,
      entity_id: entityId,
      ai_decision: aiDecision,
      confidence_score: analysis.confidenceScore,
      reasoning: analysis.reasoning,
      risk_assessment: {
        risk_score: riskScore,
        risk_level: analysis.riskLevel,
        risk_factors: analysis.riskFactors,
        patterns: analysis.patterns
      },
      status: riskScore > 90 ? 'pending' : 'pending',
      auto_executed: false
    })
    .select()
    .single();
  
  return decision;
}