/**
 * Unified Payment Service
 * Handles all payment operations: mobile money, bank transfers, contributions, payouts
 */

import { supabase } from '@/integrations/supabase/client';

export interface PaymentAccount {
  id: string;
  type: 'mobile_money' | 'bank_account';
  provider?: string;
  phone_number?: string;
  bank_name?: string;
  account_number?: string;
  account_name: string;
  is_primary: boolean;
  is_verified: boolean;
}

export interface PaymentTransaction {
  id?: string;
  type: 'contribution' | 'payout' | 'deposit' | 'withdrawal';
  method: 'mobile_money' | 'bank_transfer';
  amount: number;
  groupId?: string;
  accountId?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  reference?: string;
  message?: string;
  error?: string;
}

class PaymentService {
  /**
   * Get all payment accounts for current user
   */
  async getPaymentAccounts(): Promise<PaymentAccount[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const [mobileData, bankData] = await Promise.all([
        supabase
          .from('mobile_money_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('is_primary', { ascending: false }),
        supabase
          .from('bank_accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false })
      ]);

      const mobileAccounts: PaymentAccount[] = (mobileData.data || []).map(acc => ({
        id: acc.id,
        type: 'mobile_money',
        provider: acc.provider,
        phone_number: acc.phone_number,
        account_name: acc.account_name || '',
        is_primary: acc.is_primary || false,
        is_verified: acc.is_verified || false
      }));

      const bankAccounts: PaymentAccount[] = (bankData.data || []).map(acc => ({
        id: acc.id,
        type: 'bank_account',
        bank_name: acc.bank_name,
        account_number: acc.account_number,
        account_name: acc.account_name,
        is_primary: acc.is_primary || false,
        is_verified: acc.is_verified || false
      }));

      return [...mobileAccounts, ...bankAccounts];
    } catch (error) {
      console.error('Error fetching payment accounts:', error);
      return [];
    }
  }

  /**
   * Get primary payment account
   */
  async getPrimaryAccount(): Promise<PaymentAccount | null> {
    const accounts = await this.getPaymentAccounts();
    return accounts.find(acc => acc.is_primary) || accounts[0] || null;
  }

  /**
   * Process a contribution payment
   */
  async processContribution(
    groupId: string,
    amount: number,
    accountId?: string
  ): Promise<PaymentResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      // Get account if not specified
      if (!accountId) {
        const primary = await this.getPrimaryAccount();
        if (!primary) return { success: false, error: 'No payment account found' };
        accountId = primary.id;
      }

      // Call edge function to process contribution
      const { data, error } = await supabase.functions.invoke('process-contribution', {
        body: { groupId, amount, accountId }
      });

      if (error) throw error;

      if (!data?.success) {
        return {
          success: false,
          error: data?.error || data?.message || 'Payment failed'
        };
      }

      return {
        success: true,
        transactionId: data.transactionId,
        reference: data.reference,
        message: 'Contribution processed successfully'
      };
    } catch (error: any) {
      console.error('Error processing contribution:', error);
      return {
        success: false,
        error: error.message || 'Failed to process contribution'
      };
    }
  }

  /**
   * Request instant payout
   */
  async requestInstantPayout(
    payoutId: string,
    pin: string,
    accountId?: string
  ): Promise<PaymentResult> {
    try {
      const { data, error } = await supabase.functions.invoke('process-instant-payout', {
        body: { payoutId, pin, accountId }
      });

      if (error) throw error;

      if (!data?.success) {
        return {
          success: false,
          error: data?.error || data?.message || 'Payout request failed'
        };
      }

      return {
        success: true,
        transactionId: data.payout?.id,
        reference: data.payout?.paychangu_ref,
        message: 'Instant payout processed successfully'
      };
    } catch (error: any) {
      console.error('Error requesting instant payout:', error);
      return {
        success: false,
        error: error.message || 'Failed to request instant payout'
      };
    }
  }

  /**
   * Add mobile money account
   */
  async addMobileMoneyAccount(
    provider: string,
    phoneNumber: string,
    accountName: string
  ): Promise<PaymentResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      // Validate phone number format
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length < 9) {
        return { success: false, error: 'Invalid phone number format' };
      }

      // Check if account already exists
      const { data: existing } = await supabase
        .from('mobile_money_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('phone_number', cleanPhone)
        .eq('provider', provider)
        .maybeSingle();

      if (existing) {
        return { success: false, error: 'Account already exists' };
      }

      // Get current accounts to determine if this should be primary
      const accounts = await this.getPaymentAccounts();
      const isPrimary = accounts.length === 0;

      // Insert new account
      const { data, error } = await supabase
        .from('mobile_money_accounts')
        .insert({
          user_id: user.id,
          provider,
          phone_number: cleanPhone,
          account_name: accountName,
          is_primary: isPrimary,
          is_verified: false,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        transactionId: data.id,
        message: 'Mobile money account added successfully'
      };
    } catch (error: any) {
      console.error('Error adding mobile money account:', error);
      return {
        success: false,
        error: error.message || 'Failed to add mobile money account'
      };
    }
  }

  /**
   * Verify mobile money account
   */
  async verifyMobileAccount(accountId: string): Promise<PaymentResult> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-mobile-account', {
        body: { accountId }
      });

      if (error) throw error;

      if (!data?.success) {
        return {
          success: false,
          error: data?.error || 'Verification failed'
        };
      }

      return {
        success: true,
        reference: data.verification?.reference,
        message: data.message || 'Verification initiated'
      };
    } catch (error: any) {
      console.error('Error verifying mobile account:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify mobile account'
      };
    }
  }

  /**
   * Verify bank account
   */
  async verifyBankAccount(accountId: string): Promise<PaymentResult> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-bank-account', {
        body: { accountId }
      });

      if (error) throw error;

      if (!data?.success) {
        return {
          success: false,
          error: data?.error || 'Verification failed'
        };
      }

      return {
        success: true,
        message: data.message || 'Bank account verified'
      };
    } catch (error: any) {
      console.error('Error verifying bank account:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify bank account'
      };
    }
  }

  /**
   * Add bank account
   */
  async addBankAccount(
    bankName: string,
    accountNumber: string,
    accountName: string
  ): Promise<PaymentResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      // Validate account number
      if (accountNumber.length < 8) {
        return { success: false, error: 'Invalid account number' };
      }

      // Check if account already exists
      const { data: existing } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('account_number', accountNumber)
        .eq('bank_name', bankName)
        .maybeSingle();

      if (existing) {
        return { success: false, error: 'Account already exists' };
      }

      // Get current accounts to determine if this should be primary
      const accounts = await this.getPaymentAccounts();
      const isPrimary = accounts.length === 0;

      // Insert new account
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: user.id,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          is_primary: isPrimary,
          is_verified: false
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        transactionId: data.id,
        message: 'Bank account added successfully'
      };
    } catch (error: any) {
      console.error('Error adding bank account:', error);
      return {
        success: false,
        error: error.message || 'Failed to add bank account'
      };
    }
  }

  /**
   * Set primary payment account
   */
  async setPrimaryAccount(accountId: string, type: 'mobile_money' | 'bank_account'): Promise<PaymentResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      const table = type === 'mobile_money' ? 'mobile_money_accounts' : 'bank_accounts';

      // Remove primary from all accounts
      await Promise.all([
        supabase
          .from('mobile_money_accounts')
          .update({ is_primary: false })
          .eq('user_id', user.id),
        supabase
          .from('bank_accounts')
          .update({ is_primary: false })
          .eq('user_id', user.id)
      ]);

      // Set new primary
      const { error } = await supabase
        .from(table)
        .update({ is_primary: true })
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (error) throw error;

      return {
        success: true,
        message: 'Primary account updated successfully'
      };
    } catch (error: any) {
      console.error('Error setting primary account:', error);
      return {
        success: false,
        error: error.message || 'Failed to set primary account'
      };
    }
  }

  /**
   * Delete payment account
   */
  async deleteAccount(accountId: string, type: 'mobile_money' | 'bank_account'): Promise<PaymentResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      if (type === 'mobile_money') {
        const { error } = await supabase
          .from('mobile_money_accounts')
          .update({ is_active: false })
          .eq('id', accountId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bank_accounts')
          .delete()
          .eq('id', accountId)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      return {
        success: true,
        message: 'Account deleted successfully'
      };
    } catch (error: any) {
      console.error('Error deleting account:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete account'
      };
    }
  }

  /**
   * Get payment gateway status
   */
  async getPaymentGatewayStatus(): Promise<{
    available: boolean;
    provider?: string;
    message?: string;
  }> {
    try {
      const { data } = await supabase
        .from('api_configurations')
        .select('*')
        .eq('provider', 'paychangu')
        .eq('enabled', true)
        .maybeSingle();

      if (!data || !data.api_key) {
        return {
          available: false,
          message: 'Payment gateway not configured. Please contact support.'
        };
      }

      return {
        available: true,
        provider: 'PayChangu',
        message: `Using ${data.test_mode ? 'TEST' : 'LIVE'} mode`
      };
    } catch (error) {
      console.error('Error checking payment gateway:', error);
      return {
        available: false,
        message: 'Failed to check payment gateway status'
      };
    }
  }
}

export const paymentService = new PaymentService();
