import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get current user
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get user balance
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('wallet_balance, escrow_balance')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;

    // Get completed payouts (money received)
    const { data: payouts, error: payoutsError } = await supabaseClient
      .from('payouts')
      .select('amount, payout_date, status, rosca_groups(name)')
      .eq('recipient_id', user.id)
      .eq('status', 'completed')
      .order('payout_date', { ascending: false });

    if (payoutsError) throw payoutsError;

    const total_received = payouts?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // Get completed contributions (money paid)
    const { data: contributions, error: contribError } = await supabaseClient
      .from('contributions')
      .select('amount, created_at, status, rosca_groups(name)')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (contribError) throw contribError;

    const total_contributed = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

    // Get pending payouts (expected income)
    const { data: pendingPayouts, error: pendingError } = await supabaseClient
      .from('payout_schedule')
      .select('amount, scheduled_date, rosca_groups(name)')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (pendingError) throw pendingError;

    const expected_income = pendingPayouts?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // Combine recent transactions from both payouts and contributions
    const recentPayouts = payouts?.slice(0, 25).map(p => {
      const groupName = p.rosca_groups ? (Array.isArray(p.rosca_groups) ? (p.rosca_groups[0] as any)?.name : (p.rosca_groups as any)?.name) : 'Unknown Group';
      return {
        id: Math.random().toString(),
        type: 'payout',
        amount: Number(p.amount),
        created_at: p.payout_date,
        status: p.status,
        group_name: groupName || 'Unknown Group'
      };
    }) || [];

    const recentContributions = contributions?.slice(0, 25).map(c => {
      const groupName = c.rosca_groups ? (Array.isArray(c.rosca_groups) ? (c.rosca_groups[0] as any)?.name : (c.rosca_groups as any)?.name) : 'Unknown Group';
      return {
        id: Math.random().toString(),
        type: 'contribution',
        amount: Number(c.amount),
        created_at: c.created_at,
        status: c.status,
        group_name: groupName || 'Unknown Group'
      };
    }) || [];

    // Combine and sort by date
    const allTransactions = [...recentPayouts, ...recentContributions]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);

    return new Response(
      JSON.stringify({
        total_received,
        total_contributed,
        expected_income,
        ready_to_withdraw: userData?.escrow_balance || 0,
        wallet_balance: userData?.wallet_balance || 0,
        escrow_balance: userData?.escrow_balance || 0,
        transactions: allTransactions,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error calculating wallet stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
