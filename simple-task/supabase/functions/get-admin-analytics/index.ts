import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get overview stats
    const { data: users } = await supabaseClient.from('users').select('id, trust_score, wallet_balance, escrow_balance, created_at');
    const { data: groups } = await supabaseClient.from('groups').select('id, created_at');
    const { data: contributions } = await supabaseClient.from('contributions').select('*');
    const { data: payouts } = await supabaseClient.from('payouts').select('*');
    const { data: transactions } = await supabaseClient.from('transactions').select('*');
    const { data: messages } = await supabaseClient.from('messages').select('id, created_at');
    const { data: revenueTransactions } = await supabaseClient.from('revenue_transactions').select('*');

    // Calculate overview metrics
    const totalUsers = users?.length || 0;
    const activeGroups = groups?.length || 0;
    const totalContributions = contributions?.length || 0;
    const completedContributions = contributions?.filter(c => c.status === 'completed').length || 0;
    const contributionRate = totalContributions > 0 ? (completedContributions / totalContributions) * 100 : 0;
    
    const totalContributionAmount = contributions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
    const totalPayouts = payouts?.length || 0;
    const completedPayouts = payouts?.filter(p => p.status === 'completed').length || 0;
    const pendingPayouts = payouts?.filter(p => p.status === 'pending').length || 0;
    const totalPayoutAmount = payouts?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const totalFeesRevenue = revenueTransactions?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
    
    const averageTrustScore = users && users.length > 0 
      ? users.reduce((sum, u) => sum + (u.trust_score || 0), 0) / users.length 
      : 0;
    
    const totalEscrowBalance = users?.reduce((sum, u) => sum + (u.escrow_balance || 0), 0) || 0;
    const totalWalletBalance = users?.reduce((sum, u) => sum + (u.wallet_balance || 0), 0) || 0;

    // Contribution breakdown
    const contributionBreakdown = {
      total: totalContributions,
      completed: completedContributions,
      pending: contributions?.filter(c => c.status === 'pending').length || 0,
      failed: contributions?.filter(c => c.status === 'failed').length || 0,
      late: 0,
      missed: 0
    };

    // Trust score distribution
    const trustScoreDistribution = {
      excellent: users?.filter(u => (u.trust_score || 0) >= 80).length || 0,
      good: users?.filter(u => (u.trust_score || 0) >= 60 && (u.trust_score || 0) < 80).length || 0,
      fair: users?.filter(u => (u.trust_score || 0) >= 40 && (u.trust_score || 0) < 60).length || 0,
      poor: users?.filter(u => (u.trust_score || 0) < 40).length || 0
    };

    // Contribution trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const contributionTrend = contributions
      ?.filter(c => new Date(c.created_at) >= thirtyDaysAgo)
      .reduce((acc: any[], c) => {
        const date = new Date(c.created_at).toISOString().split('T')[0];
        const existing = acc.find(item => item.date === date);
        if (existing) {
          existing.count++;
          existing.amount += c.amount || 0;
        } else {
          acc.push({ date, count: 1, amount: c.amount || 0 });
        }
        return acc;
      }, []) || [];

    // System health
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);
    const messagesLast24h = messages?.filter(m => new Date(m.created_at) >= last24h).length || 0;

    // Financial metrics
    const { data: mobileMoneyTransactions } = await supabaseClient
      .from('mobile_money_transactions')
      .select('*');

    const totalTransactionVolume = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const mobileMoneyVolume = mobileMoneyTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    
    // Payment issues
    const failedTransactions = transactions?.filter(t => t.status === 'failed').length || 0;
    const pendingTransactions = transactions?.filter(t => t.status === 'pending').length || 0;

    // User growth trend
    const userGrowthTrend = users
      ?.reduce((acc: any[], u) => {
        const date = new Date(u.created_at).toISOString().split('T')[0];
        const existing = acc.find(item => item.date === date);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ date, count: 1 });
        }
        return acc;
      }, [])
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];

    // Group performance
    const { data: groupMembers } = await supabaseClient.from('group_members').select('*');
    const avgMembersPerGroup = groups && groups.length > 0 ? (groupMembers?.length || 0) / groups.length : 0;

    return new Response(
      JSON.stringify({
        overview: {
          totalUsers,
          totalGroups: groups?.length || 0,
          activeGroups,
          totalContributions,
          completedContributions,
          contributionRate,
          totalContributionAmount,
          totalPayouts,
          completedPayouts,
          pendingPayouts,
          totalFeesRevenue,
          totalPayoutAmount,
          averageTrustScore,
          totalEscrowBalance,
          totalWalletBalance,
          totalTransactionVolume,
          mobileMoneyVolume,
          avgMembersPerGroup
        },
        contributions: contributionBreakdown,
        trustScoreDistribution,
        contributionTrend,
        userGrowthTrend,
        systemHealth: {
          messagesLast24h,
          activeGroups,
          pendingPayouts,
          failedTransactions,
          pendingTransactions
        },
        financial: {
          totalRevenue: totalFeesRevenue,
          totalPayouts: totalPayoutAmount,
          escrowBalance: totalEscrowBalance,
          walletBalance: totalWalletBalance,
          netProfit: totalFeesRevenue - (totalPayoutAmount * 0.022) // Estimate MM fees
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error fetching admin analytics:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
