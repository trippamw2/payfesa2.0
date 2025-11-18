import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Lock, CreditCard, Bell, Smartphone, Building2, ChevronRight, AlertTriangle } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();

  const settingsSections = [
    {
      title: 'Account',
      description: 'Personal information and preferences',
      icon: User,
      path: '/settings/account',
    },
    {
      title: 'Security',
      description: 'Change PIN and security settings',
      icon: Lock,
      path: '/settings/security',
    },
    {
      title: 'Payment Methods',
      description: 'Default payment settings',
      icon: CreditCard,
      path: '/settings/payment',
    },
    {
      title: 'Payment Disputes',
      description: 'Report and track transaction issues',
      icon: AlertTriangle,
      path: '/disputes',
      isDestructive: true,
    },
    {
      title: 'Notifications',
      description: 'Manage notification preferences',
      icon: Bell,
      path: '/notification-settings',
    },
    {
      title: 'Payment Accounts',
      description: 'Manage mobile money accounts',
      icon: Smartphone,
      path: '/payment-accounts',
    },
    {
      title: 'Bank Accounts',
      description: 'Manage bank accounts',
      icon: Building2,
      path: '/bank-accounts',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 pb-16">
      <div className="bg-gradient-to-r from-primary to-secondary text-white px-2 py-2 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="hover:bg-white/20 text-white hover:text-white h-7 w-7"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold">Settings</h1>
            <p className="text-[10px] text-white/80">Manage your account</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-2 space-y-2">
        {settingsSections.map((section) => (
          <Card 
            key={section.path}
            className={`cursor-pointer hover:shadow-md transition-all ${section.isDestructive ? 'border-destructive/50' : ''}`}
            onClick={() => navigate(section.path)}
          >
            <CardContent className="p-2.5">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${section.isDestructive ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                  <section.icon className={`h-4 w-4 ${section.isDestructive ? 'text-destructive' : 'text-primary'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-xs">{section.title}</h3>
                  <p className="text-[10px] text-muted-foreground">{section.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
