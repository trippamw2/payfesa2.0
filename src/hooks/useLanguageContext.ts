import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';

export const useLanguageContext = () => {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  
  return { language, t };
};
