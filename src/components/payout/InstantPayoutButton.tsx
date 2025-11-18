import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Zap, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';

interface InstantPayoutButtonProps {
  payoutId: string;
  amount: number;
  groupName: string;
  onSuccess?: () => void;
}

export const InstantPayoutButton = ({ payoutId, amount, groupName, onSuccess }: InstantPayoutButtonProps) => {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [message, setMessage] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const { toast } = useToast();

  const handleInstantPayout = async () => {
    if (!pin || pin.length !== 4) {
      toast({
        title: "Invalid PIN",
        description: "Please enter your 4-digit PIN",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    setStatus('processing');
    setMessage('Processing your instant payout...');

    try {
      const { data, error } = await supabase.functions.invoke('process-instant-payout', {
        body: { payoutId, pin }
      });

      if (error) throw error;

      if (data?.success) {
        setStatus('success');
        setMessage('Payout successful! Money has been sent to your account.');
        setTransactionRef(data.transactionId || data.reference);
        
        toast({
          title: "Payout Successful!",
          description: `MWK ${amount.toLocaleString()} has been sent to your account.`,
        });

        // Close dialog after delay and trigger refresh
        setTimeout(() => {
          setOpen(false);
          onSuccess?.();
          resetForm();
        }, 3000);
      } else {
        throw new Error(data?.error || 'Payout failed');
      }
    } catch (error) {
      console.error('Instant payout error:', error);
      setStatus('failed');
      setMessage(error instanceof Error ? error.message : 'Payout request failed. Please try again.');
      
      toast({
        title: "Payout Failed",
        description: error instanceof Error ? error.message : 'Failed to process payout',
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setPin('');
    setStatus('idle');
    setMessage('');
    setTransactionRef('');
  };

  const handleClose = () => {
    if (!processing) {
      setOpen(false);
      resetForm();
    }
  };

  const renderStatusContent = () => {
    switch (status) {
      case 'success':
        return (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <h3 className="text-lg font-semibold text-green-900">Payout Successful!</h3>
                <p className="text-center text-green-700">{message}</p>
                {transactionRef && (
                  <div className="text-sm text-green-600">
                    <strong>Transaction ID:</strong> {transactionRef}
                  </div>
                )}
                <div className="text-2xl font-bold text-green-900">
                  MWK {amount.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      
      case 'failed':
        return (
          <Card className="border-destructive bg-red-50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <XCircle className="h-16 w-16 text-destructive" />
                <h3 className="text-lg font-semibold text-destructive">Payout Failed</h3>
                <p className="text-center text-muted-foreground">{message}</p>
                <Button onClick={resetForm} variant="outline">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      
      case 'processing':
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <h3 className="text-lg font-semibold">Processing...</h3>
                <p className="text-center text-muted-foreground">{message}</p>
              </div>
            </CardContent>
          </Card>
        );
      
      default:
        return (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You will receive <strong>MWK {amount.toLocaleString()}</strong> from {groupName} instantly.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="pin">Enter Your PIN</Label>
              <Input
                id="pin"
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="****"
                disabled={processing}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Enter your 4-digit PIN to confirm the instant payout
              </p>
            </div>

            <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payout Amount:</span>
                <span className="font-semibold">MWK {amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processing Fee:</span>
                <span className="font-semibold">MWK {Math.round(amount * 0.11).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="font-semibold">You Receive:</span>
                <span className="font-bold text-primary">
                  MWK {Math.round(amount * 0.89).toLocaleString()}
                </span>
              </div>
            </div>

            <Button 
              onClick={handleInstantPayout} 
              disabled={processing || pin.length !== 4}
              className="w-full"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Confirm Instant Payout
                </>
              )}
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="default">
          <Zap className="mr-2 h-4 w-4" />
          PAYOUT NOW
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {status === 'idle' ? 'Instant Payout' : status === 'success' ? 'Payout Complete' : status === 'failed' ? 'Payout Failed' : 'Processing'}
          </DialogTitle>
          <DialogDescription>
            {status === 'idle' && 'Request immediate payout to your registered account'}
          </DialogDescription>
        </DialogHeader>
        {renderStatusContent()}
      </DialogContent>
    </Dialog>
  );
};
