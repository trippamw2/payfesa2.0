import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ArrowRight, Wallet, Users, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action: string;
  route: string;
  icon: typeof Wallet;
}

export const OnboardingChecklist = ({ userId }: { userId: string }) => {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'payment_method',
      title: 'Add Payment Method',
      description: 'Connect mobile money or bank account',
      completed: false,
      action: 'Add Now',
      route: '/payment-accounts',
      icon: CreditCard
    },
    {
      id: 'join_group',
      title: 'Join or Create Group',
      description: 'Start saving with your community',
      completed: false,
      action: 'Get Started',
      route: '/dashboard',
      icon: Users
    },
    {
      id: 'first_contribution',
      title: 'Make First Contribution',
      description: 'Complete your first payment',
      completed: false,
      action: 'View Groups',
      route: '/dashboard',
      icon: Wallet
    }
  ]);

  useEffect(() => {
    checkOnboardingStatus();
  }, [userId]);

  const checkOnboardingStatus = async () => {
    try {
      // Check payment method
      const { data: paymentMethods } = await supabase
        .from('mobile_money_accounts')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      // Check group membership
      const { data: groups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .limit(1);

      // Check contributions
      const { data: contributions } = await supabase
        .from('contributions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .limit(1);

      setSteps(prev => prev.map(step => {
        if (step.id === 'payment_method' && paymentMethods && paymentMethods.length > 0) {
          return { ...step, completed: true };
        }
        if (step.id === 'join_group' && groups && groups.length > 0) {
          return { ...step, completed: true };
        }
        if (step.id === 'first_contribution' && contributions && contributions.length > 0) {
          return { ...step, completed: true };
        }
        return step;
      }));
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  if (completedSteps === steps.length) {
    return null; // Hide when all complete
  }

  return (
    <Card className="p-4 mb-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-foreground">Complete Your Setup</h3>
          <p className="text-sm text-muted-foreground">
            {completedSteps} of {steps.length} steps completed
          </p>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  step.completed 
                    ? 'bg-success/10 border border-success/20' 
                    : 'bg-background border border-border hover:border-primary/50'
                }`}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.description}
                  </p>
                </div>
                {!step.completed && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-shrink-0"
                    onClick={() => {
                      navigate(step.route);
                      if (step.id === 'join_group' || step.id === 'first_contribution') {
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('switch-to-tab', { detail: { tab: 'groups' } }));
                        }, 100);
                      }
                      toast.success(`Let's ${step.title.toLowerCase()}`);
                    }}
                  >
                    {step.action}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
