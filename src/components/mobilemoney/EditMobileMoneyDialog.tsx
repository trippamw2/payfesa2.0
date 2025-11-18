import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface MobileMoneyAccount {
  id: string;
  provider: 'airtel' | 'tnm';
  phone_number: string;
  account_name: string;
  is_verified: boolean;
  is_primary: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: MobileMoneyAccount;
  onSuccess: () => void;
}

const EditMobileMoneyDialog = ({ open, onOpenChange, account, onSuccess }: Props) => {
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(account.phone_number);
  const [accountName, setAccountName] = useState(account.account_name);

  useEffect(() => {
    setPhoneNumber(account.phone_number);
    setAccountName(account.account_name);
  }, [account]);

  const handleSubmit = async () => {
    if (!phoneNumber || !accountName) {
      toast.error('All fields are required');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('mobile_money_accounts')
        .update({
          phone_number: phoneNumber,
          account_name: accountName
        })
        .eq('id', account.id);

      if (error) throw error;

      toast.success('Account updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Failed to update account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Mobile Money Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium">
                {account.provider === 'airtel' ? 'Airtel Money' : 'TNM Mpamba'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="editPhoneNumber">Phone Number</Label>
            <Input
              id="editPhoneNumber"
              type="tel"
              placeholder="+265..."
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="editAccountName">Account Name</Label>
            <Input
              id="editAccountName"
              type="text"
              placeholder="John Doe"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditMobileMoneyDialog;
