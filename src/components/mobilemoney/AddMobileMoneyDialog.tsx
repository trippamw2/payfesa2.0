import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';
import airtelLogo from '@/assets/airtel-money-logo.png';
import tnmLogo from '@/assets/tnm-mpamba-logo.jpg';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddMobileMoneyDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<'airtel' | 'tnm' | ''>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const detectProvider = (phone: string) => {
    if (phone.startsWith('+2659') || phone.startsWith('2659') || phone.startsWith('09')) {
      return 'airtel';
    } else if (phone.startsWith('+2658') || phone.startsWith('2658') || phone.startsWith('08')) {
      return 'tnm';
    }
    return provider;
  };

  const handlePhoneChange = (phone: string) => {
    setPhoneNumber(phone);
    const detectedProvider = detectProvider(phone);
    if (detectedProvider) {
      setProvider(detectedProvider);
    }
  };

  const handleSubmit = async () => {
    if (!provider || !phoneNumber || !accountName) {
      toast.error(t('required'));
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if this is the first account
      const { data: existingAccounts } = await supabase
        .from('mobile_money_accounts')
        .select('id')
        .eq('user_id', user.id);

      const isFirstAccount = !existingAccounts || existingAccounts.length === 0;

      const { error } = await supabase
        .from('mobile_money_accounts')
        .insert({
          user_id: user.id,
          provider,
          phone_number: phoneNumber,
          account_name: accountName,
          is_primary: isFirstAccount, // First account is automatically primary
          is_verified: false
        });

      if (error) throw error;

      toast.success('Account added successfully');
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setProvider('');
      setPhoneNumber('');
      setAccountName('');
    } catch (error) {
      console.error('Error adding account:', error);
      toast.error('Failed to add account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-4">
        <DialogHeader>
          <DialogTitle className="text-sm">Add Mobile Money Account</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{t('selectProvider')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Card
                className={`p-2 cursor-pointer transition-all hover:scale-105 ${
                  provider === 'airtel'
                    ? 'border-2 border-primary bg-primary/5'
                    : 'border'
                }`}
                onClick={() => setProvider('airtel')}
              >
                <div className="text-center">
                  <img src={airtelLogo} alt="Airtel Money" className="w-12 h-12 mx-auto object-contain mb-1" />
                  <p className="text-[10px] font-semibold">{t('airtelMoney')}</p>
                </div>
              </Card>
              
              <Card
                className={`p-2 cursor-pointer transition-all hover:scale-105 ${
                  provider === 'tnm'
                    ? 'border-2 border-primary bg-primary/5'
                    : 'border'
                }`}
                onClick={() => setProvider('tnm')}
              >
                <div className="text-center">
                  <img src={tnmLogo} alt="TNM Mpamba" className="w-12 h-12 mx-auto object-contain mb-1" />
                  <p className="text-[10px] font-semibold">{t('tnmMpamba')}</p>
                </div>
              </Card>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phoneNumber" className="text-xs">{t('phoneNumber')}</Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="+265 888 123 456"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="h-8 text-xs"
            />
            {provider && (
              <p className="text-[9px] text-muted-foreground">
                {provider === 'airtel' ? t('airtelMoney') : t('tnmMpamba')} detected
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="accountName" className="text-xs">{t('accountName')}</Label>
            <Input
              id="accountName"
              type="text"
              placeholder="John Doe"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-8 text-xs"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !provider || !phoneNumber || !accountName}
              className="flex-1 h-8 text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Account'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddMobileMoneyDialog;
