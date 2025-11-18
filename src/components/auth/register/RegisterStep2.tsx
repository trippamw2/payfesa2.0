import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';
import { RegisterFormData } from '../Register';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

interface Props {
  formData: RegisterFormData;
  updateFormData: (data: Partial<RegisterFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const RegisterStep2 = ({ formData, updateFormData, onNext, onBack }: Props) => {
  const { language } = useLanguage();
  const { t } = useTranslation(language);

  const handleNext = () => {
    if (!formData.pin || !formData.confirmPin) {
      toast.error(t('required'));
      return;
    }

    if (formData.pin.length !== 4) {
      toast.error(t('pinLength'));
      return;
    }

    if (formData.pin !== formData.confirmPin) {
      toast.error(t('pinMismatch'));
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="pin" className="text-sm">{t('pin')}</Label>
        <Input
          id="pin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="••••"
          value={formData.pin}
          onChange={(e) => updateFormData({ pin: e.target.value.replace(/\D/g, '') })}
          className="h-10 text-center tracking-widest"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPin" className="text-sm">{t('confirmPin')}</Label>
        <Input
          id="confirmPin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="••••"
          value={formData.confirmPin}
          onChange={(e) => updateFormData({ confirmPin: e.target.value.replace(/\D/g, '') })}
          className="h-10 text-center tracking-widest"
        />
      </div>

      <div className="flex gap-2 mt-2">
        <Button 
          type="button"
          onClick={onBack}
          variant="outline"
          className="flex-1 h-10"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          {t('back')}
        </Button>
        <Button 
          type="button"
          onClick={handleNext}
          className="flex-1 bg-primary hover:bg-primary/90 text-white h-10"
        >
          {t('next')}
        </Button>
      </div>
    </div>
  );
};

export default RegisterStep2;