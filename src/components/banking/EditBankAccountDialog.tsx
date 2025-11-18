import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_verified: boolean;
  is_primary: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: BankAccount;
  onSuccess: () => void;
}

const EditBankAccountDialog = ({ open, onOpenChange, account, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  useEffect(() => {
    if (account) {
      setAccountNumber(account.account_number);
      setAccountName(account.account_name);
    }
  }, [account]);

  const handleSubmit = async () => {
    if (!accountNumber || !accountName) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('bank_accounts')
        .update({
          account_number: accountNumber,
          account_name: accountName
        })
        .eq('id', account.id);

      if (error) throw error;

      toast.success('Bank account updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating bank account:', error);
      toast.error('Failed to update bank account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Bank Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Bank Name</Label>
            <Input value={account.bank_name} disabled className="bg-muted" />
          </div>

          <div>
            <Label>Account Number</Label>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter account number"
            />
          </div>

          <div>
            <Label>Account Name</Label>
            <Input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Enter account holder name"
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditBankAccountDialog;
