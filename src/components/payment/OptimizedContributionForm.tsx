import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Smartphone, CreditCard, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { calculatePayoutFees, formatMWK } from '@/utils/feeCalculations';
import { PaymentStatusTracker } from './PaymentStatusTracker';
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
  const [amount, setAmount] = useState(contributionAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    fetchPaymentAccounts();
  }, []);

  const fetchPaymentAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [mobileData, bankData] = await Promise.all([
        supabase.from('mobile_money_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true),
        supabase.from('bank_accounts')
          .select('*')
          .eq('user_id', user.id)
      ]);

      const formattedAccounts = [
        ...(mobileData.data || []).map((acc: any) => ({
          id: acc.id,
          type: 'mobile' as const,
          provider: acc.provider,
          phone_number: acc.phone_number,
          account_name: acc.account_name,
          is_primary: acc.is_primary,
          bank_name: undefined,
          account_number: undefined
        })),
        ...(bankData.data || []).map((acc: any) => ({
          id: acc.id,
          type: 'bank' as const,
          bank_name: acc.bank_name,
          account_number: acc.account_number,
          account_name: acc.account_name,
          is_primary: acc.is_primary,
          provider: undefined,
          phone_number: undefined
        }))
      ];

      setAccounts(formattedAccounts);
      
      const primaryAccount = formattedAccounts.find(acc => acc.is_primary);
      if (primaryAccount) {
        setSelectedAccountId(primaryAccount.id);
        setPaymentMethod(primaryAccount.type === 'mobile' ? primaryAccount.provider : 'bank');
        if (primaryAccount.phone_number) {
          setPhoneNumber(primaryAccount.phone_number);
        }
      }
    } catch (error) {
      console.error('Error fetching payment accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

    try {
      const { data, error } = await supabase.functions.invoke('process-contribution', {
        body: {
          groupId,
          amount: numAmount,
          paymentMethod,
          phoneNumber: phoneNumber || undefined,
          accountId: selectedAccountId,
          pin
        }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Payment failed');
      }

      setStatus('processing');
      setStatusMessage('Payment initiated. Approve on your phone if prompted.');
      setTransactionId(data.contribution?.id || '');
      
      // Listen for status updates
      const channel = supabase
        .channel(`contribution-${data.contribution?.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'contributions',
            filter: `id=eq.${data.contribution?.id}`
          } as any,
          (payload: any) => {
            const newStatus = payload?.new?.status;
            if (newStatus === 'completed') {
              setStatus('completed');
              setStatusMessage('Payment successful! Your contribution has been recorded.');
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

      // Cleanup after 5 minutes
      setTimeout(() => {
        supabase.removeChannel(channel);
      }, 300000);

    } catch (error: any) {
      console.error('Contribution error:', error);
      setStatus('failed');
      setStatusMessage(error?.message || 'Failed to process payment');
      toast.error(error?.message || 'Failed to process payment');
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
  const numAmount = parseFloat(amount) || 0;
  const feeBreakdown = calculatePayoutFees(numAmount);

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentStatusTracker 
        status={status} 
        message={statusMessage} 
        transactionId={transactionId}
      />

      <Card className="p-6 space-y-4">
        <div>
          <Label htmlFor="amount">Amount (MWK)</Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            disabled={loading || status === 'completed'}
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Required: {formatMWK(contributionAmount)}
          </p>
        </div>

        <div>
          <Label>Payment Method</Label>
          {accounts.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No payment methods found. 
                <Button variant="link" className="px-1" onClick={() => window.open('/payment-accounts', '_blank')}>
                  Add one here
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      {account.type === 'mobile' ? <Smartphone className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                      <span>
                        {account.type === 'mobile' 
                          ? `${account.provider || 'Mobile'} - ${account.phone_number || ''}`
                          : `${account.bank_name || 'Bank'} - ${account.account_number || ''}`}
                      </span>
                      {account.is_primary && <Badge variant="secondary">Primary</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedAccount?.type === 'mobile' && !selectedAccount.phone_number && (
          <div>
            <Label htmlFor="phone">Mobile Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+265..."
              disabled={loading}
              required
            />
          </div>
        )}

        <div>
          <Label htmlFor="pin">Security PIN</Label>
          <Input
            id="pin"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter your 4-digit PIN"
            maxLength={4}
            disabled={loading || status === 'completed'}
            required
          />
        </div>
      </Card>

      {numAmount > 0 && (
        <FeeBreakdownDisplay amount={numAmount} />
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          className="flex-1"
          disabled={loading || status === 'completed' || !selectedAccountId}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : status === 'completed' ? (
            'Contribution Complete'
          ) : (
            `Pay ${formatMWK(numAmount)}`
          )}
        </Button>
      </div>
    </form>
  );
};
