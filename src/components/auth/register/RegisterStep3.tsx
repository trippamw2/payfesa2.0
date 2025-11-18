import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';
import { RegisterFormData } from '../Register';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Smartphone, Building2 } from 'lucide-react';
import bcrypt from 'bcryptjs';
import airtelLogo from '@/assets/airtel-money-logo.png';
import tnmLogo from '@/assets/tnm-mpamba-logo.jpg';

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
  formData: RegisterFormData;
  updateFormData: (data: Partial<RegisterFormData>) => void;
  onBack: () => void;
}

const RegisterStep3 = ({ formData, updateFormData, onBack }: Props) => {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Auto-detect provider based on phone number
  const detectProvider = (phone: string) => {
    if (phone.startsWith('+2659') || phone.startsWith('2659') || phone.startsWith('09')) {
      return 'airtel';
    } else if (phone.startsWith('+2658') || phone.startsWith('2658') || phone.startsWith('08')) {
      return 'tnm';
    }
    return formData.mobileMoneyProvider;
  };

  // Update provider when phone number changes
  const handlePhoneChange = (phone: string) => {
    updateFormData({ 
      mobileMoneyPhone: phone,
      mobileMoneyProvider: detectProvider(phone)
    });
  };

  const handleSubmit = async () => {
    // Validate based on payment method
    if (!formData.paymentMethod) {
      toast.error(language === 'en' ? 'Please select a payment method' : 'Chonde sankhani njira yolipirira');
      return;
    }

    if (formData.paymentMethod === 'mobile_money') {
      if (!formData.mobileMoneyProvider || !formData.mobileMoneyPhone || !formData.mobileMoneyName) {
        toast.error(t('required'));
        return;
      }
    } else if (formData.paymentMethod === 'bank') {
      if (!formData.bankName || !formData.bankAccountNumber || !formData.bankAccountName) {
        toast.error(t('required'));
        return;
      }
    }

    setLoading(true);

    try {
      // Check if user already exists in users table
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, phone_number')
        .eq('phone_number', formData.phoneNumber)
        .maybeSingle();

      if (existingUser) {
        toast.error(language === 'en' ? 'Phone number already registered. Please login.' : 'Nambala ya foni yalembetsedwa kale. Chonde lowani.');
        setLoading(false);
        return;
      }

      // Hash PIN
      const pinHash = await bcrypt.hash(formData.pin, 10);

      // Create email format that passes Supabase validation
      const cleanPhone = formData.phoneNumber.replace(/[^0-9]/g, '');
      const email = `phone${cleanPhone}@payfesa.app`;
      const password = `${cleanPhone}${formData.pin}`;
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            phone_number: formData.phoneNumber,
            name: formData.fullName
          }
        }
      });

      if (signUpError) {
        const errorCode = (signUpError as any).code || signUpError.message;
        
        if (errorCode === 'user_already_exists' || errorCode.includes('already registered')) {
          toast.error(
            language === 'en' 
              ? 'This phone number is already registered. Please use the Login tab.' 
              : 'Nambala ya foni yalembetsedwa kale. Chonde lowani.'
          );
          setLoading(false);
          return;
        }

        console.error('Auth signup error:', signUpError);
        toast.error(language === 'en' ? 'Registration failed' : 'Kulembetsa kwalephera');
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error(language === 'en' ? 'Registration failed' : 'Kulembetsa kwalephera');
        setLoading(false);
        return;
      }

      // Create user in users table with auth user id
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name: formData.fullName,
          phone_number: formData.phoneNumber,
          wallet_balance: 0,
          escrow_balance: 0
        } as any);

      if (userError) {
        console.error('User creation error:', userError);
        throw userError;
      }

      // Create payment account based on selection
      if (formData.paymentMethod === 'mobile_money') {
        const { error: mobileMoneyError } = await supabase
          .from('mobile_money_accounts')
          .insert({
            user_id: authData.user.id,
            provider: formData.mobileMoneyProvider,
            phone_number: formData.mobileMoneyPhone,
            account_name: formData.mobileMoneyName,
            is_active: true,
            is_primary: true
          });

        if (mobileMoneyError) {
          console.error('Mobile money error:', mobileMoneyError);
        }
      } else if (formData.paymentMethod === 'bank') {
        const { error: bankError } = await supabase
          .from('bank_accounts')
          .insert({
            user_id: authData.user.id,
            bank_name: formData.bankName,
            account_number: formData.bankAccountNumber,
            account_name: formData.bankAccountName,
            is_primary: true
          });

        if (bankError) {
          console.error('Bank account error:', bankError);
        }
      }

      toast.success(language === 'en' ? 'Account created successfully!' : 'Akaunti yapangidwa bwino!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || (language === 'en' ? 'Registration failed' : 'Kulembetsa kwalephera'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Payment Method Selection */}
      <div className="space-y-1.5">
        <Label className="text-sm">{language === 'en' ? 'Payment Method' : 'Njira Yolipirira'}</Label>
        <div className="grid grid-cols-2 gap-2">
          <Card
            className={`p-3 cursor-pointer transition-all hover:scale-105 ${
              formData.paymentMethod === 'mobile_money'
                ? 'border-2 border-primary bg-primary/5'
                : 'border'
            }`}
            onClick={() => updateFormData({ paymentMethod: 'mobile_money' })}
          >
            <div className="text-center space-y-1">
              <Smartphone className="w-8 h-8 mx-auto text-primary" />
              <p className="font-medium text-xs">{language === 'en' ? 'Mobile Money' : 'Mobile Money'}</p>
            </div>
          </Card>
          
          <Card
            className={`p-3 cursor-pointer transition-all hover:scale-105 ${
              formData.paymentMethod === 'bank'
                ? 'border-2 border-primary bg-primary/5'
                : 'border'
            }`}
            onClick={() => updateFormData({ paymentMethod: 'bank' })}
          >
            <div className="text-center space-y-1">
              <Building2 className="w-8 h-8 mx-auto text-primary" />
              <p className="font-medium text-xs">{language === 'en' ? 'Bank Account' : 'Akaunti ya Banki'}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Mobile Money Fields */}
      {formData.paymentMethod === 'mobile_money' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-sm">{t('selectProvider')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Card
                className={`p-2.5 cursor-pointer transition-all hover:scale-105 ${
                  formData.mobileMoneyProvider === 'airtel'
                    ? 'border-2 border-primary bg-primary/5'
                    : 'border'
                }`}
                onClick={() => updateFormData({ mobileMoneyProvider: 'airtel' })}
              >
                <div className="text-center">
                  <img src={airtelLogo} alt="Airtel Money" className="w-16 h-16 mx-auto object-contain mb-1" />
                  <p className="font-medium text-xs">{t('airtelMoney')}</p>
                </div>
              </Card>
              
              <Card
                className={`p-2.5 cursor-pointer transition-all hover:scale-105 ${
                  formData.mobileMoneyProvider === 'tnm'
                    ? 'border-2 border-secondary bg-secondary/5'
                    : 'border'
                }`}
                onClick={() => updateFormData({ mobileMoneyProvider: 'tnm' })}
              >
                <div className="text-center">
                  <img src={tnmLogo} alt="TNM Mpamba" className="w-16 h-16 mx-auto object-contain mb-1" />
                  <p className="font-medium text-xs">{t('tnmMpamba')}</p>
                </div>
              </Card>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mobileMoneyPhone" className="text-sm">{t('phoneNumber')}</Label>
            <Input
              id="mobileMoneyPhone"
              type="tel"
              placeholder="+265..."
              value={formData.mobileMoneyPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="h-10"
            />
            {formData.mobileMoneyProvider && (
              <p className="text-xs text-muted-foreground">
                {formData.mobileMoneyProvider === 'airtel' ? t('airtelMoney') : t('tnmMpamba')} detected
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mobileMoneyName" className="text-sm">{t('accountName')}</Label>
            <Input
              id="mobileMoneyName"
              type="text"
              placeholder="John Doe"
              value={formData.mobileMoneyName}
              onChange={(e) => updateFormData({ mobileMoneyName: e.target.value })}
              className="h-10"
            />
          </div>
        </>
      )}

      {/* Bank Account Fields */}
      {formData.paymentMethod === 'bank' && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="bankName" className="text-sm">{language === 'en' ? 'Select Bank' : 'Sankhani Banki'}</Label>
            <Select value={formData.bankName} onValueChange={(value) => updateFormData({ bankName: value })}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={language === 'en' ? 'Choose your bank' : 'Sankhani banki yanu'} />
              </SelectTrigger>
              <SelectContent>
                {MALAWI_BANKS.map((bank) => (
                  <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bankAccountNumber" className="text-sm">{language === 'en' ? 'Account Number' : 'Nambala ya Akaunti'}</Label>
            <Input
              id="bankAccountNumber"
              type="text"
              placeholder="1234567890"
              value={formData.bankAccountNumber}
              onChange={(e) => updateFormData({ bankAccountNumber: e.target.value })}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bankAccountName" className="text-sm">{language === 'en' ? 'Account Name' : 'Dzina la Akaunti'}</Label>
            <Input
              id="bankAccountName"
              type="text"
              placeholder="John Doe"
              value={formData.bankAccountName}
              onChange={(e) => updateFormData({ bankAccountName: e.target.value })}
              className="h-10"
            />
          </div>
        </>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 h-10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')}
        </Button>
        
        <Button 
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 bg-primary hover:bg-primary/90 text-white h-10"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {language === 'en' ? 'Creating...' : 'Kupanga...'}
            </>
          ) : (
            language === 'en' ? 'Create Account' : 'Pangani Akaunti'
          )}
        </Button>
      </div>
    </div>
  );
};

export default RegisterStep3;
