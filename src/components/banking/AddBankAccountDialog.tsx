import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { BANK_LOGOS, getBankLogo } from '@/utils/bankLogos';

const MALAWI_BANKS = Object.keys(BANK_LOGOS).map(bankName => ({
  name: bankName,
  logo: BANK_LOGOS[bankName]
}));

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
      <DialogContent className="p-4">
        <DialogHeader>
          <DialogTitle className="text-sm">Add Bank Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs">Bank Name</Label>
            <Select value={bankName} onValueChange={setBankName}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select your bank" />
              </SelectTrigger>
              <SelectContent>
                {MALAWI_BANKS.map((bank) => (
                  <SelectItem key={bank.name} value={bank.name}>
                    <div className="flex items-center gap-2">
                      <img src={bank.logo} alt={bank.name} className="w-5 h-5 object-contain" />
                      <span className="text-xs">{bank.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {bankName && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <img src={getBankLogo(bankName)} alt={bankName} className="w-6 h-6 object-contain" />
              <span className="text-xs text-muted-foreground">Selected: {bankName}</span>
            </div>
          )}

          <div>
            <Label className="text-xs">Account Number</Label>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter account number"
              type="text"
              className="h-9 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs">Account Holder Name</Label>
            <Input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Enter account holder name"
              type="text"
              className="h-9 text-xs"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} size="sm" className="h-8 text-xs">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} size="sm" className="h-8 text-xs">
              {loading ? 'Adding...' : 'Add Account'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddBankAccountDialog;
