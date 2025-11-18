import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';
import Login from '@/components/auth/Login';
import Register from '@/components/auth/Register';
import payfesaLogo from '@/assets/payfesa-logo.jpg';

const Auth = () => {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-3">
      <Card className="w-full max-w-md shadow-xl border border-primary/10">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-48 h-20 mx-auto mb-3 flex items-center justify-center">
              <img src={payfesaLogo} alt="PayFesa" className="w-full h-full object-contain" style={{ imageRendering: 'crisp-edges' }} />
            </div>
            <p className="text-muted-foreground text-sm">
              {t('tagline')}
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'login' | 'register')}>
            <TabsList className="grid w-full grid-cols-2 mb-5">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-white text-sm">
                {t('login')}
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-secondary data-[state=active]:text-white text-sm">
                {t('register')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Login />
            </TabsContent>

            <TabsContent value="register">
              <Register />
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
};

export default Auth;