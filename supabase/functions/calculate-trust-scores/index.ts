import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface User {
  id: string;
  created_at: string;
  is_kyc_verified: boolean;
  total_messages_sent: number;
  contribution_streak?: number;
  chat_messages_this_cycle?: number;
  completed_cycles?: number;
  elite_status?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: users, error: usersError } = await supabaseClient
      .from('users')
      .select('id, created_at, is_kyc_verified, total_messages_sent, contribution_streak, chat_messages_this_cycle, completed_cycles, elite_status');

    if (usersError) throw usersError;

    let updatedCount = 0;

    for (const user of users || []) {
      try {
        const scoreData = await calculateEliteTrustScore(supabaseClient, user);
        
        await supabaseClient
          .from('users')
          .update({ 
            trust_score: scoreData.score,
            elite_status: scoreData.isElite,
            contribution_streak: scoreData.streak,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        updatedCount++;

        if (scoreData.isElite && !user.elite_status) {
          await supabaseClient.functions.invoke('send-push-notification', {
            body: {
              userIds: [user.id],
              title: '🌟 Elite Status Unlocked!',
              body: `Elite status achieved! Trust Score: ${scoreData.score}`,
              data: { type: 'elite_status_achieved' },
            },
          });
        }
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
      }
    }

    await supabaseClient.functions.invoke('update-payout-positions', { body: { groupId: null } });

    return new Response(JSON.stringify({ success: true, updated_count: updatedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function calculateEliteTrustScore(supabase: any, user: User) {
  let score = 50;

  const days = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000);
  if (days >= 365) score += 10;
  else if (days >= 90) score += 5;

  if (user.is_kyc_verified) score += 15;

  const msgs = user.total_messages_sent || 0;
  if (msgs >= 100) score += 10;
  else if (msgs >= 20) score += 5;

  const { data: contribs } = await supabase
    .from('contributions')
    .select('status, created_at, completed_at')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false });

  let streak = 0, fast = 0, missed = 0;

  for (const c of contribs || []) {
    if (c.status === 'completed') {
      const hrs = (new Date(c.completed_at).getTime() - new Date(c.created_at).getTime()) / 3600000;
      if (hrs <= 3) { fast++; streak++; } else if (streak > 0) break;
    } else if (c.status === 'missed') {
      missed++;
      streak = 0;
    }
  }

  if (streak >= 20) score += 15;
  score -= missed * 20;

  const { data: refs } = await supabase
    .from('user_referrals')
    .select('*')
    .eq('referrer_id', user.id)
    .eq('is_active', true);

  const activeRefs = refs?.filter((r: any) => r.contribution_count >= 5).length || 0;
  if (activeRefs >= 1) score += 5;

  score = Math.max(0, Math.min(100, score));

  const isElite = score > 90 && streak >= 20 && missed === 0 && activeRefs >= 1;

  return { score, isElite, streak, fastContributions: fast, activeReferrals: activeRefs };
}
