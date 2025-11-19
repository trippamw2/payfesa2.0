import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, RefreshCcw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RefundRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    type: string;
    amount: number;
    created_at: string;
    payment_method?: string;
    reference?: string;
  };
  onSuccess?: () => void;
}

const refundReasons = [
  { value: 'duplicate', label: 'Duplicate Transaction' },
  { value: 'service_not_received', label: 'Service Not Received' },
  { value: 'incorrect_amount', label: 'Incorrect Amount Charged' },
  { value: 'cancelled_service', label: 'Service Cancelled' },
  { value: 'technical_error', label: 'Technical Error' },
  { value: 'other', label: 'Other Reason' },
];

export function RefundRequestDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: RefundRequestDialogProps) {
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(transaction.amount.toString());
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!refundReason || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0 || amount > transaction.amount) {
      toast.error('Invalid refund amount');
      return;
    }

    if (description.length < 20) {
      toast.error('Description must be at least 20 characters');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create refund request in payment_disputes table
      const { data, error } = await supabase
        .from('payment_disputes')
        .insert({
          user_id: user.id,
          transaction_id: transaction.id,
          dispute_type: 'refund_request',
          amount: amount,
          reason: description,
          evidence: {
            refund_reason: refundReason,
            requested_amount: amount,
            original_amount: transaction.amount,
            payment_method: transaction.payment_method,
            reference: transaction.reference,
          },
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Refund request submitted successfully');
      onSuccess?.();
      onOpenChange(false);
      setRefundReason('');
      setDescription('');
      setRefundAmount(transaction.amount.toString());
    } catch (error) {
      console.error('Error submitting refund request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit refund request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5" />
            Request Refund
          </DialogTitle>
          <DialogDescription>
            Submit a refund request for this transaction. Our team will review it within 2-3 business days.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Transaction Details</p>
              <p className="text-sm">
                Type: {transaction.type} • Amount: MWK {transaction.amount.toLocaleString()}
              </p>
              <p className="text-sm">Date: {new Date(transaction.created_at).toLocaleDateString()}</p>
              {transaction.reference && (
                <p className="text-sm">Reference: {transaction.reference}</p>
              )}
            </div>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="refund-amount">Refund Amount (MWK)</Label>
            <Input
              id="refund-amount"
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              max={transaction.amount}
              min={1}
              step="0.01"
              disabled={submitting}
              required
            />
            <p className="text-xs text-muted-foreground">
              Maximum refundable: MWK {transaction.amount.toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-reason">Refund Reason</Label>
            <Select value={refundReason} onValueChange={setRefundReason} disabled={submitting} required>
              <SelectTrigger>
                <SelectValue placeholder="Select refund reason" />
              </SelectTrigger>
              <SelectContent>
                {refundReasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Detailed Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide detailed information about why you're requesting this refund..."
              rows={4}
              disabled={submitting}
              required
              minLength={20}
            />
            <p className="text-xs text-muted-foreground">
              Minimum 20 characters ({description.length}/20)
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Refund Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
