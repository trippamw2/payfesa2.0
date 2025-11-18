import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';
import { RegisterFormData } from '../Register';
import { toast } from 'sonner';

interface Props {
  formData: RegisterFormData;
  updateFormData: (data: Partial<RegisterFormData>) => void;
  onNext: () => void;
}

const RegisterStep1 = ({ formData, updateFormData, onNext }: Props) => {
  const { language } = useLanguage();
  const { t } = useTranslation(language);

  const handleNext = () => {
    if (!formData.fullName || !formData.phoneNumber) {
      toast.error(t('required'));
      return;
    }

    if (formData.phoneNumber.length < 10) {
      toast.error(t('invalidPhone'));
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="fullName" className="text-sm">{t('fullName')}</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="John Doe"
          value={formData.fullName}
          onChange={(e) => updateFormData({ fullName: e.target.value })}
          className="h-10"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phoneNumber" className="text-sm">{t('phoneNumber')}</Label>
        <Input
          id="phoneNumber"
          type="tel"
          placeholder="+265..."
          value={formData.phoneNumber}
          onChange={(e) => updateFormData({ phoneNumber: e.target.value })}
          className="h-10"
        />
      </div>

      <Button 
        type="button"
        onClick={handleNext}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-2 h-10"
      >
        {t('next')}
      </Button>
    </div>
  );
};

export default RegisterStep1;