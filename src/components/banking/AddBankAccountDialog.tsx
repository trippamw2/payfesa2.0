import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const MALAWI_BANKS = [
  'National Bank of Malawi',
  'Standard Bank Malawi',
  'FDH Bank',
  'First Capital Bank',
  'NBS Bank',
  'CDH Investment Bank',
  'Ecobank Malawi',
  'Centenary Bank'
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddBankAccountDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const handleSubmit = async () => {
    if (!bankName || !accountNumber || !accountName) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to add a bank account');
        return;
      }

      // Check if account already exists
      const { data: existing } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('account_number', accountNumber)
        .single();

      if (existing) {
        toast.error('This account is already added');
        return;
      }

      // Check if this is the first account
      const { count } = await supabase
        .from('bank_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const isPrimary = count === 0;

      const { error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: user.id,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          is_primary: isPrimary,
          is_verified: false
        });

      if (error) throw error;

      toast.success('Bank account added successfully');
      onSuccess();
      onOpenChange(false);
      setBankName('');
      setAccountNumber('');
      setAccountName('');
    } catch (error) {
      console.error('Error adding bank account:', error);
      toast.error('Failed to add bank account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Bank Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Bank Name</Label>
            <Select value={bankName} onValueChange={setBankName}>
              <SelectTrigger>
                <SelectValue placeholder="Select your bank" />
              </SelectTrigger>
              <SelectContent>
                {MALAWI_BANKS.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Account Number</Label>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter account number"
              type="text"
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
              {loading ? 'Adding...' : 'Add Account'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddBankAccountDialog;
