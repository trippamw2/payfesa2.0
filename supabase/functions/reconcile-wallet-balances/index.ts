import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting wallet balance reconciliation...');

    // Get all users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, wallet_balance, escrow_balance, name');

    if (usersError) throw usersError;

    let reconciledCount = 0;
    let discrepanciesFound = 0;
    const discrepancies = [];

    for (const user of users || []) {
      // Calculate expected escrow balance from contributions
      const { data: contributions } = await supabaseAdmin
        .from('contributions')
        .select('amount, status')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      // Calculate expected wallet deductions from payouts
      const { data: payouts } = await supabaseAdmin
        .from('payouts')
        .select('gross_amount, status')
        .eq('recipient_id', user.id)
        .eq('status', 'completed');

      // Calculate contributions with fees (11% deducted)
      const totalContributed = contributions?.reduce((sum, c) => {
        const amount = Number(c.amount);
        const feeAmount = amount * 0.11;
        return sum + (amount - feeAmount); // Net amount added to escrow
      }, 0) || 0;

      // Calculate payouts deducted from escrow
      const totalPayouts = payouts?.reduce((sum, p) => sum + Number(p.gross_amount), 0) || 0;

      // Expected escrow balance
      const expectedEscrow = totalContributed - totalPayouts;
      const actualEscrow = Number(user.escrow_balance);
      const escrowDiff = Math.abs(expectedEscrow - actualEscrow);

      // Flag significant discrepancies (more than 100 MWK difference)
      if (escrowDiff > 100) {
        discrepanciesFound++;
        discrepancies.push({
          user_id: user.id,
          user_name: user.name,
          expected_escrow: expectedEscrow,
          actual_escrow: actualEscrow,
          difference: escrowDiff
        });

        console.log(`Discrepancy found for user ${user.name}:`, {
          expected: expectedEscrow,
          actual: actualEscrow,
          diff: escrowDiff
        });

        // Auto-correct if difference is reasonable (less than 10% of expected)
        if (expectedEscrow > 0 && (escrowDiff / expectedEscrow) < 0.1) {
          await supabaseAdmin.rpc('update_escrow_balance', {
            p_user_id: user.id,
            p_amount: expectedEscrow - actualEscrow
          });
          
          // Log adjustment
          await supabaseAdmin
            .from('audit_logs')
            .insert({
              action: 'WALLET_RECONCILIATION',
              resource_type: 'users',
              resource_id: user.id,
              metadata: {
                expected_escrow: expectedEscrow,
                actual_escrow: actualEscrow,
                adjustment: expectedEscrow - actualEscrow,
                reason: 'Automatic reconciliation'
              }
            });
        }
      }

      reconciledCount++;
    }

    console.log(`Reconciliation complete: ${reconciledCount} users processed, ${discrepanciesFound} discrepancies found`);

    return new Response(
      JSON.stringify({ 
        success: true,
        reconciled_users: reconciledCount,
        discrepancies_found: discrepanciesFound,
        discrepancies: discrepancies.slice(0, 10), // Return first 10 for review
        message: 'Wallet reconciliation completed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error reconciling wallet balances:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
