import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { paymentService } from '@/services/paymentService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useContributionRealtime } from '@/hooks/useContributionRealtime';
import { PaymentErrorFallback } from '@/components/error/PaymentErrorFallback';

interface ContributionFlowProps {
  groupId: string;
  requiredAmount?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const ContributionFlow = ({ 
  groupId, 
  requiredAmount,
  onSuccess, 
  onCancel 
}: ContributionFlowProps) => {
  const [amount, setAmount] = useState(requiredAmount?.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [contributionId, setContributionId] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'completed' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const { toast } = useToast();

  // Listen for real-time updates on this contribution
  useContributionRealtime(groupId, (contribution) => {
    if (contributionId && contribution.id === contributionId) {
      console.log('Contribution status updated:', contribution.status);
      
      if (contribution.status === 'completed') {
        setTransactionStatus('completed');
        setStatusMessage('Payment successful! Your contribution has been recorded.');
        toast({
          title: "Success!",
          description: `Your contribution of MWK ${contribution.amount} has been processed.`,
        });
        
        // Call success callback after a brief delay
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      } else if (contribution.status === 'failed') {
        setTransactionStatus('failed');
        setStatusMessage('Payment failed. Please try again or use a different payment method.');
        toast({
          title: "Payment Failed",
          description: "Your payment could not be processed. Please try again.",
          variant: "destructive"
        });
      } else if (contribution.status === 'pending' || contribution.status === 'processing') {
        setTransactionStatus('pending');
        setStatusMessage('Processing your payment...');
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !paymentMethod) {
      toast({
        title: "Validation Error",
        description: "Please enter amount and select payment method",
        variant: "destructive"
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    // Validate phone number for mobile money
    if (['airtel', 'tnm', 'mpamba'].includes(paymentMethod.toLowerCase())) {
      if (!phoneNumber) {
        toast({
          title: "Phone Required",
          description: "Please enter your mobile money number",
          variant: "destructive"
        });
        return;
      }
    }

    setProcessing(true);
    setTransactionStatus('pending');
    setStatusMessage('Initiating payment...');

    try {
      const result = await paymentService.processContribution(
        groupId,
        numAmount,
        undefined, // accountId
        paymentMethod,
        phoneNumber
      );

      if (result.success && result.transactionId) {
        setContributionId(result.transactionId);
        setStatusMessage(
          'Payment initiated. ' +
          (paymentMethod.toLowerCase() === 'airtel' || paymentMethod.toLowerCase() === 'tnm' 
            ? 'Please check your phone and approve the payment.'
            : 'Please complete the payment process.')
        );
        
        toast({
          title: "Payment Initiated",
          description: result.message || "Please complete the payment on your phone",
        });

        // Start polling for status updates
        startStatusPolling(result.transactionId);
      } else {
        throw new Error(result.error || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('Contribution error:', error);
      setTransactionStatus('failed');
      
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setStatusMessage(errorMessage);
      
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive"
      });
      setProcessing(false);
    }
  };

  const startStatusPolling = (txnId: string) => {
    let attempts = 0;
    const maxAttempts = 20; // Poll for up to 2 minutes (20 * 6 seconds)
    
    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        const { data, error } = await supabase.functions.invoke('verify-paychangu-transaction', {
          body: { chargeId: txnId }
        });

        if (error) throw error;

        if (data?.status === 'completed') {
          clearInterval(pollInterval);
          setTransactionStatus('completed');
          setProcessing(false);
        } else if (data?.status === 'failed') {
          clearInterval(pollInterval);
          setTransactionStatus('failed');
          setProcessing(false);
        }

        // Stop polling after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setProcessing(false);
          if (transactionStatus === 'pending') {
            setStatusMessage('Payment is taking longer than expected. Please check your account balance or try again.');
          }
        }
      } catch (error) {
        console.error('Status poll error:', error);
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setProcessing(false);
        }
      }
    }, 6000); // Poll every 6 seconds
  };

  const getStatusIcon = () => {
    switch (transactionStatus) {
      case 'completed':
        return <CheckCircle2 className="h-12 w-12 text-green-500" />;
      case 'failed':
        return <XCircle className="h-12 w-12 text-destructive" />;
      case 'pending':
        return <Clock className="h-12 w-12 text-primary animate-pulse" />;
      default:
        return null;
    }
  };

  if (transactionStatus !== 'idle') {
    return (
      <Card>
        <CardContent className="pt-6">
          {transactionStatus === 'failed' && (
            statusMessage.includes('not configured') || 
            statusMessage.includes('Network error') ||
            statusMessage.includes('service unavailable')
          ) ? (
            <PaymentErrorFallback 
              message={statusMessage}
              resetError={() => {
                setTransactionStatus('idle');
                setStatusMessage('');
                setProcessing(false);
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              {getStatusIcon()}
              <h3 className="text-lg font-semibold">
                {transactionStatus === 'completed' && 'Payment Successful!'}
                {transactionStatus === 'failed' && 'Payment Failed'}
                {transactionStatus === 'pending' && 'Processing Payment'}
              </h3>
              <p className="text-center text-muted-foreground max-w-md">
                {statusMessage}
              </p>
              {processing && (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              )}
              {transactionStatus === 'failed' && (
                <Button onClick={() => {
                  setTransactionStatus('idle');
                  setContributionId(null);
                  setStatusMessage('');
                }}>
                  Try Again
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Make Contribution</CardTitle>
        <CardDescription>
          Select your payment method and complete the transaction
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (MWK)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              disabled={processing || !!requiredAmount}
              required
            />
            {requiredAmount && (
              <p className="text-sm text-muted-foreground">
                Required contribution: MWK {requiredAmount}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="airtel" id="airtel" />
                <Label htmlFor="airtel" className="font-normal cursor-pointer">
                  Airtel Money
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tnm" id="tnm" />
                <Label htmlFor="tnm" className="font-normal cursor-pointer">
                  TNM Mpamba
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank" id="bank" />
                <Label htmlFor="bank" className="font-normal cursor-pointer">
                  Bank Transfer
                </Label>
              </div>
            </RadioGroup>
          </div>

          {['airtel', 'tnm', 'mpamba'].includes(paymentMethod.toLowerCase()) && (
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Money Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g., 0999123456"
                disabled={processing}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the number registered with {paymentMethod === 'airtel' ? 'Airtel Money' : 'TNM Mpamba'}
              </p>
            </div>
          )}

          <Alert>
            <AlertDescription>
              You will receive a payment prompt on your phone. Please approve the transaction to complete your contribution.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button type="submit" disabled={processing} className="flex-1">
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Proceed to Pay'
              )}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
