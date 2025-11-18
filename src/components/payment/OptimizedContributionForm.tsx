/**
 * Production-Ready Contribution Form
 * Crash-proof with comprehensive error handling
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Smartphone, CreditCard, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { calculatePayoutFees, formatMWK } from '@/utils/feeCalculations';
import { PaymentStatusTracker } from './PaymentStatusTracker';
import { PaymentFallbackUI } from './PaymentFallbackUI';
import { CrashProofWrapper } from './CrashProofWrapper';
import FeeBreakdownDisplay from '../fees/FeeBreakdownDisplay';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OptimizedContributionFormProps {
  groupId: string;
  contributionAmount: number;
  onSuccess?: () => void;
}

export const OptimizedContributionForm = ({
  groupId,
  contributionAmount,
  onSuccess
}: OptimizedContributionFormProps) => {
  const [amount, setAmount] = useState(contributionAmount?.toString?.() || '0');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    fetchPaymentAccounts();
  }, []);

  const fetchPaymentAccounts = async () => {
    try {
      setLoadingAccounts(true);
      setLoadError(null);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Authentication failed. Please log in again.');
      }

      const [mobileData, bankData] = await Promise.all([
        supabase.from('mobile_money_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .then(res => ({ data: res.data || [], error: res.error })),
        supabase.from('bank_accounts')
          .select('*')
          .eq('user_id', user.id)
          .then(res => ({ data: res.data || [], error: res.error }))
      ]);

      const formattedAccounts = [
        ...(mobileData?.data || []).map((acc: any) => ({
          id: acc?.id || '',
          type: 'mobile' as const,
          provider: acc?.provider || '',
          phone_number: acc?.phone_number || '',
          account_name: acc?.account_name || 'Mobile Money',
          is_primary: acc?.is_primary || false
        })),
        ...(bankData?.data || []).map((acc: any) => ({
          id: acc?.id || '',
          type: 'bank' as const,
          bank_name: acc?.bank_name || '',
          account_number: acc?.account_number || '',
          account_name: acc?.account_name || 'Bank Account',
          is_primary: acc?.is_primary || false
        }))
      ];

      setAccounts(formattedAccounts);
      
      const primaryAccount = formattedAccounts.find(acc => acc.is_primary);
      if (primaryAccount) {
        setSelectedAccountId(primaryAccount.id);
        setPaymentMethod(primaryAccount.type === 'mobile' ? (primaryAccount.provider || '') : 'bank');
        if (primaryAccount.type === 'mobile' && 'phone_number' in primaryAccount && primaryAccount.phone_number) {
          setPhoneNumber(primaryAccount.phone_number);
        }
      }
    } catch (error: any) {
      console.error('Error fetching payment accounts:', error);
      setLoadError(error?.message || 'Failed to load payment accounts');
      toast.error('Failed to load payment accounts. Please try again.');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!amount || !paymentMethod || !pin) {
        toast.error('Please fill in all required fields');
        return;
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      if (!selectedAccountId) {
        toast.error('Please select a payment method');
        return;
      }

      setLoading(true);
      setStatus('pending');
      setStatusMessage('Initiating payment...');

      const { data, error } = await supabase.functions.invoke('process-contribution', {
        body: {
          groupId,
          amount: numAmount,
          paymentMethod,
          phoneNumber: phoneNumber || undefined,
          accountId: selectedAccountId,
          pin
        }
      }).catch((err) => ({
        data: null,
        error: { message: err?.message || 'Network error. Please check your connection.' }
      }));

      if (error) {
        throw new Error(error?.message || 'Payment service unavailable');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Payment failed');
      }

      setStatus('processing');
      setStatusMessage('Payment initiated. Approve on your phone if prompted.');
      setTransactionId(data?.contribution?.id || '');
      
      const channel = supabase
        .channel(`contribution-${data?.contribution?.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'contributions',
            filter: `id=eq.${data?.contribution?.id}`
          } as any,
          (payload: any) => {
            const newStatus = payload?.new?.status;
            if (newStatus === 'completed') {
              setStatus('completed');
              setStatusMessage('Payment successful!');
              toast.success('Contribution successful!');
              setTimeout(() => onSuccess?.(), 2000);
            } else if (newStatus === 'failed') {
              setStatus('failed');
              setStatusMessage('Payment failed. Please try again.');
              toast.error('Payment failed');
              setLoading(false);
            }
          }
        )
        .subscribe();

      setTimeout(() => supabase.removeChannel(channel), 300000);

    } catch (error: any) {
      console.error('Payment error:', error);
      setStatus('failed');
      setStatusMessage(error?.message || 'Failed to process payment');
      toast.error(error?.message || 'Payment failed');
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
  const numAmount = parseFloat(amount) || 0;
  const feeBreakdown = calculatePayoutFees(numAmount);

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading payment methods...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <PaymentFallbackUI 
        message={loadError}
        onRetry={fetchPaymentAccounts}
      />
    );
  }

  return (
    <CrashProofWrapper fallbackMessage="Payment form encountered an error" onRetry={() => window.location.reload()}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentStatusTracker 
          status={status}
          message={statusMessage}
          transactionId={transactionId}
        />

        {status === 'idle' && (
          <>
            {/* Amount Display */}
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Contribution Amount</Label>
                <div className="text-2xl font-bold text-primary">{formatMWK(numAmount)}</div>
              </div>
            </Card>

            {/* Fee Breakdown */}
            <Card className="p-3 bg-muted/30 space-y-1.5">
              <p className="text-xs font-semibold mb-2">Fee Breakdown</p>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{formatMWK(numAmount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Service Fee (12%)</span>
                <span className="font-medium">{formatMWK(feeBreakdown.totalFees)}</span>
              </div>
              <div className="border-t pt-1.5 flex justify-between text-sm font-bold">
                <span>Total to Pay</span>
                <span className="text-primary">{formatMWK(numAmount + feeBreakdown.totalFees)}</span>
              </div>
            </Card>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              {accounts.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    No payment methods found. Please add a mobile money or bank account first.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          {account.type === 'mobile' ? (
                            <Smartphone className="h-4 w-4" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                          <span className="text-xs">
                            {account.account_name} 
                            {account.is_primary && (
                              <Badge variant="secondary" className="ml-2 text-[10px]">Primary</Badge>
                            )}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Phone Number (for mobile money) */}
            {selectedAccount?.type === 'mobile' && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g., 0999123456"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
            )}

            {/* PIN */}
            <div className="space-y-2">
              <Label htmlFor="pin">Enter PIN to Confirm</Label>
              <Input
                id="pin"
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={4}
                required
              />
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || accounts.length === 0}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ${formatMWK(numAmount + feeBreakdown.totalFees)}`
              )}
            </Button>
          </>
        )}
      </form>
    </CrashProofWrapper>
  );
};
