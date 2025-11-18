import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';

interface CreateDisputeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    type: string;
    amount: number;
    created_at: string;
  };
  onSuccess?: () => void;
}

const disputeTypes = [
  { value: 'wrong_amount', label: 'Wrong Amount' },
  { value: 'unauthorized', label: 'Unauthorized Transaction' },
  { value: 'not_received', label: 'Payment Not Received' },
  { value: 'duplicate', label: 'Duplicate Charge' },
  { value: 'other', label: 'Other Issue' },
];

export default function CreateDisputeDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: CreateDisputeDialogProps) {
  const [disputeType, setDisputeType] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!disputeType || !reason) {
      toast.error('Please fill in all fields');
      return;
    }

    if (reason.length < 10) {
      toast.error('Reason must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-dispute', {
        body: {
          transaction_id: transaction.id,
          dispute_type: disputeType,
          reason: reason.trim(),
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Dispute submitted successfully');
        onSuccess?.();
        onOpenChange(false);
        setDisputeType('');
        setReason('');
      } else {
        throw new Error(data.error || 'Failed to create dispute');
      }
    } catch (error) {
      console.error('Error creating dispute:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create Payment Dispute</DialogTitle>
        </DialogHeader>

        <div className="bg-muted/50 p-4 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Transaction Details</p>
              <p className="text-sm text-muted-foreground">
                {transaction.type} • MWK {transaction.amount.toLocaleString()} •{' '}
                {new Date(transaction.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dispute-type">Dispute Type</Label>
            <Select value={disputeType} onValueChange={setDisputeType} disabled={submitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select dispute type" />
              </SelectTrigger>
              <SelectContent>
                {disputeTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Detailed Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a detailed explanation of the issue (minimum 10 characters)"
              disabled={submitting}
              rows={5}
              required
              minLength={10}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/1000 characters (minimum 10 required)
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
              Submit Dispute
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
