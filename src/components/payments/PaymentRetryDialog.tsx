import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, RefreshCw, AlertTriangle, CreditCard } from 'lucide-react';
import { paymentService } from '@/services/paymentService';

interface PaymentRetryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    type: string;
    amount: number;
    status: string;
    error_message?: string;
    created_at: string;
    account_id?: string;
  };
  onSuccess?: () => void;
}

export function PaymentRetryDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: PaymentRetryDialogProps) {
  const [retrying, setRetrying] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(transaction.account_id || '');
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);

  useState(() => {
    if (open) {
      loadPaymentAccounts();
    }
  });

  const loadPaymentAccounts = async () => {
    const accounts = await paymentService.getPaymentAccounts();
    setPaymentAccounts(accounts);
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts.find(a => a.is_primary)?.id || accounts[0].id);
    }
  };

  const handleRetry = async () => {
    if (!selectedAccountId) {
      toast.error('Please select a payment method');
      return;
    }

    setRetrying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call retry payment edge function
      const { data, error } = await supabase.functions.invoke('retry-payment', {
        body: {
          transactionId: transaction.id,
          accountId: selectedAccountId,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Payment retry initiated successfully');
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error(data.error || 'Failed to retry payment');
      }
    } catch (error) {
      console.error('Error retrying payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to retry payment');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Retry Failed Payment
          </DialogTitle>
          <DialogDescription>
            Attempt to process this failed payment again with the same or different payment method.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Details */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Payment Failed</p>
                <p className="text-sm">Amount: MWK {transaction.amount.toLocaleString()}</p>
                <p className="text-sm">Date: {new Date(transaction.created_at).toLocaleDateString()}</p>
                {transaction.error_message && (
                  <p className="text-sm mt-2">
                    Reason: {transaction.error_message}
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label htmlFor="payment-method">
              <CreditCard className="h-4 w-4 inline mr-2" />
              Select Payment Method
            </Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId} disabled={retrying}>
              <SelectTrigger>
                <SelectValue placeholder="Choose payment method" />
              </SelectTrigger>
              <SelectContent>
                {paymentAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.type === 'mobile_money' ? (
                      <>
                        {account.provider} - {account.phone_number}
                        {account.is_primary && ' (Primary)'}
                      </>
                    ) : (
                      <>
                        {account.bank_name} - {account.account_number}
                        {account.is_primary && ' (Primary)'}
                      </>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {paymentAccounts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No payment methods available. Please add one in Settings.
              </p>
            )}
          </div>

          {/* Info */}
          <Alert>
            <AlertDescription className="text-sm">
              <ul className="list-disc list-inside space-y-1">
                <li>Make sure you have sufficient funds in your account</li>
                <li>The same amount will be charged: MWK {transaction.amount.toLocaleString()}</li>
                <li>You'll receive a confirmation once the payment is processed</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={retrying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRetry}
            disabled={retrying || !selectedAccountId || paymentAccounts.length === 0}
          >
            {retrying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Retry Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
