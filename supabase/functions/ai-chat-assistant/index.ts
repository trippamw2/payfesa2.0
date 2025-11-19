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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { messages, userId } = await req.json();

    // Fetch comprehensive user context
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: groups } = await supabase
      .from('group_members')
      .select(`
        *,
        rosca_groups(*)
      `)
      .eq('user_id', userId);

    const { data: contributions } = await supabase
      .from('contributions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: payouts } = await supabase
      .from('payouts')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Build user context for AI
    const userContext = {
      name: user?.name,
      trustScore: user?.trust_score,
      walletBalance: user?.wallet_balance,
      escrowBalance: user?.escrow_balance,
      totalContributions: user?.total_contributions,
      phoneNumber: user?.phone_number,
      language: user?.language,
      groups: groups?.map(g => ({
        name: g.rosca_groups?.name,
        amount: g.rosca_groups?.amount,
        status: g.rosca_groups?.status,
        hasContributed: g.has_contributed,
        payoutPosition: g.payout_position,
        contributionAmount: g.contribution_amount,
        nextContributionDate: g.rosca_groups?.next_contribution_date
      })),
      recentContributions: contributions?.map(c => ({
        amount: c.amount,
        date: c.created_at,
        status: c.status,
        groupId: c.group_id
      })),
      recentPayouts: payouts?.map(p => ({
        amount: p.amount,
        date: p.payout_date,
        status: p.status
      }))
    };

    const systemPrompt = `You are PayFesa AI Assistant, helping users with their Rosca (chipereganyu) savings groups in Malawi.

User Context:
${JSON.stringify(userContext, null, 2)}

Your role:
- Answer questions about their groups, contributions, payouts, and trust scores
- Explain how PayFesa works (group savings, payout rotation, trust scores)
- Provide insights about their financial progress
- Be warm, encouraging, and culturally appropriate for Malawi
- Use simple language, avoid jargon
- When appropriate, use Chichewa phrases (like "Zikomo" for thanks, "chipereganyu" for group savings)
- Always be truthful - if you don't know something, say so

Key PayFesa Concepts:
- Trust Score: 0-100 rating based on payment history (higher = better)
- Chipereganyu/Rosca: Traditional rotating savings group in Malawi
- Payout Position: Order in which members receive payouts (based on trust score)
- Escrow: Money held securely until payout
- Contribution: Regular payment to the group
- PayFesa Guarantee: Protection if someone misses payment

Guidelines:
- Keep responses concise (under 200 words)
- Be supportive and encouraging
- Celebrate their progress
- If they seem worried, reassure them
- For complex questions, break down the answer
- Always end positively`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service temporarily unavailable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('AI chat error:', error);
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