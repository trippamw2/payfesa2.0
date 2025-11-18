import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import RegisterStep1 from './register/RegisterStep1';
import RegisterStep2 from './register/RegisterStep2';
import RegisterStep3 from './register/RegisterStep3';

export interface RegisterFormData {
  fullName: string;
  phoneNumber: string;
  pin: string;
  confirmPin: string;
  paymentMethod: 'mobile_money' | 'bank' | '';
  mobileMoneyProvider: 'airtel' | 'tnm' | '';
  mobileMoneyPhone: string;
  mobileMoneyName: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

const Register = () => {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: '',
    phoneNumber: '',
    pin: '',
    confirmPin: '',
    paymentMethod: '',
    mobileMoneyProvider: '',
    mobileMoneyPhone: '',
    mobileMoneyName: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: ''
  });

  const updateFormData = (data: Partial<RegisterFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <RegisterStep1 formData={formData} updateFormData={updateFormData} onNext={() => setStep(2)} />;
      case 2:
        return <RegisterStep2 formData={formData} updateFormData={updateFormData} onNext={() => setStep(3)} onBack={() => setStep(1)} />;
      case 3:
        return <RegisterStep3 formData={formData} updateFormData={updateFormData} onBack={() => setStep(2)} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {renderStep()}
    </div>
  );
};

export default Register;