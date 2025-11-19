/**
 * Mock Payment Service for Development/Testing
 * Simulates payment processing when PayChangu is not configured
 */

import { supabase } from '@/integrations/supabase/client';

export const mockPaymentService = {
  async simulateContribution(
    groupId: string,
    amount: number,
    userId: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log('🧪 MOCK PAYMENT: Simulating contribution', { groupId, amount, userId });
      
      // Create a mock contribution record
      const { data: contribution, error: contribError } = await supabase
        .from('contributions')
        .insert({
          user_id: userId,
          group_id: groupId,
          amount,
          status: 'completed',
          payment_method: 'mock_payment',
          payment_provider: 'development_mode',
          payment_reference: `MOCK-${Date.now()}`,
          completed_at: new Date().toISOString(),
          metadata: {
            mode: 'development',
            simulated: true,
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (contribError) {
        console.error('Mock contribution error:', contribError);
        return { success: false, error: contribError.message };
      }

      // Update group member contribution status
      await supabase
        .from('group_members')
        .update({ 
          has_contributed: true,
          contribution_amount: amount
        })
        .eq('user_id', userId)
        .eq('group_id', groupId);

      console.log('✅ MOCK PAYMENT: Success', contribution.id);

      return {
        success: true,
        transactionId: contribution.id
      };
    } catch (error) {
      console.error('Mock payment service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Mock payment failed'
      };
    }
  },

  async simulatePayout(
    userId: string,
    groupId: string,
    amount: number
  ): Promise<{ success: boolean; payoutId?: string; error?: string }> {
    try {
      console.log('🧪 MOCK PAYOUT: Simulating payout', { userId, groupId, amount });

      const { data: payout, error: payoutError } = await supabase
        .from('payouts')
        .insert({
          recipient_id: userId,
          group_id: groupId,
          amount,
          gross_amount: amount,
          fee_amount: 0,
          commission_amount: 0,
          status: 'completed',
          payment_method: 'mock_payment',
          payment_provider: 'development_mode',
          payment_reference: `MOCK-PAYOUT-${Date.now()}`,
          processed_at: new Date().toISOString(),
          payout_date: new Date().toISOString(),
          metadata: {
            mode: 'development',
            simulated: true
          }
        })
        .select()
        .single();

      if (payoutError) {
        console.error('Mock payout error:', payoutError);
        return { success: false, error: payoutError.message };
      }

      // Update user wallet
      const { error: walletError } = await supabase.rpc('update_wallet_balance', {
        p_user_id: userId,
        p_amount: amount
      });

      if (walletError) {
        console.error('Wallet update error:', walletError);
      }

      console.log('✅ MOCK PAYOUT: Success', payout.id);

      return {
        success: true,
        payoutId: payout.id
      };
    } catch (error) {
      console.error('Mock payout service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Mock payout failed'
      };
    }
  },

  isEnabled: async (): Promise<boolean> => {
    // Check if we're in development mode or if PayChangu is not configured
    const { data: config } = await supabase
      .from('api_configurations')
      .select('api_secret, enabled')
      .eq('provider', 'paychangu')
      .single();

    // Enable mock if no secret or explicitly in test mode
    return !config?.api_secret || config?.enabled === false;
  }
};
