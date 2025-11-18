import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FeeBreakdownCard } from '@/components/fees/FeeBreakdownCard';
import { calculatePayoutFees } from '@/utils/feeCalculations';
import { AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grossAmount: number;
  onSuccess: () => void;
}

export function PayoutRequestDialog({ open, onOpenChange, grossAmount, onSuccess }: Props) {
  const [pin, setPin] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const fees = calculatePayoutFees(grossAmount);

  const handleRequest = async () => {
    if (!pin || pin.length !== 4) {
      toast.error('Please enter your 4-digit PIN');
      return;
    }

    setProcessing(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('process-instant-payout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: { pin }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error?.message || 'Failed to connect to payment service');
      }

      if (data?.success) {
        toast.success(data?.message || 'Payout initiated! You will receive your money shortly.');
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(data?.error || 'Failed to process payout. Please try again.');
      }
    } catch (error: any) {
      console.error('Error requesting payout:', error);
      toast.error(error?.message || 'Failed to process payout. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Instant Payout</DialogTitle>
          <DialogDescription>
            Review fee breakdown and confirm your payout
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fee Breakdown */}
          <FeeBreakdownCard fees={fees} variant="detailed" />

          {/* Protection Notice */}
          <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold mb-1">Your Payout is Protected</p>
              <p className="text-muted-foreground">
                The 1% safety fee ensures you receive your money on time, even if other members pay late.
              </p>
            </div>
          </div>

          {/* PIN Input */}
          <div className="space-y-2">
            <Label htmlFor="payout-pin">Security PIN</Label>
            <Input
              id="payout-pin"
              type="password"
              placeholder="Enter 4-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              className="text-center text-2xl tracking-widest"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRequest}
              className="flex-1"
              disabled={processing || pin.length !== 4}
            >
              {processing ? 'Processing...' : 'Confirm Payout'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
