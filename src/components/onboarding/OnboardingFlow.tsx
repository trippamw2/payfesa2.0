import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Check, ArrowRight, ArrowLeft, Sparkles, Users, Wallet, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export function OnboardingFlow() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_step')
        .eq('id', user.id)
        .single();

      if (!data?.onboarding_completed) {
        setOpen(true);
        setCurrentStep(data?.onboarding_step || 0);
      }
    } catch (error) {
      console.error('Error checking onboarding:', error);
    }
  };

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to PayFesa! 🎉',
      description: 'Your journey to smart savings starts here',
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4 text-center">
          <div className="rounded-full bg-primary/10 w-20 h-20 flex items-center justify-center mx-auto">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold">Welcome to PayFesa!</h3>
          <p className="text-muted-foreground">
            Join thousands of people saving together through rotating savings and credit groups (ROSCAs).
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="text-center">
              <div className="font-bold text-2xl text-primary">10K+</div>
              <div className="text-xs text-muted-foreground">Active Users</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl text-primary">MWK 5M+</div>
              <div className="text-xs text-muted-foreground">Total Savings</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl text-primary">95%</div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'how_it_works',
      title: 'How It Works',
      description: 'Understanding ROSCAs and group savings',
      icon: <Users className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-center">How PayFesa Works</h3>
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4 flex gap-3">
                <div className="rounded-full bg-primary/10 w-10 h-10 flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-primary">1</span>
                </div>
                <div>
                  <h4 className="font-semibold">Join or Create a Group</h4>
                  <p className="text-sm text-muted-foreground">
                    Find people with similar savings goals and form a group
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex gap-3">
                <div className="rounded-full bg-primary/10 w-10 h-10 flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-primary">2</span>
                </div>
                <div>
                  <h4 className="font-semibold">Contribute Regularly</h4>
                  <p className="text-sm text-muted-foreground">
                    Everyone contributes the same amount on schedule
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex gap-3">
                <div className="rounded-full bg-primary/10 w-10 h-10 flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-primary">3</span>
                </div>
                <div>
                  <h4 className="font-semibold">Receive Your Payout</h4>
                  <p className="text-sm text-muted-foreground">
                    Take turns receiving the pooled contributions
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },
    {
      id: 'setup_payment',
      title: 'Setup Payment Method',
      description: 'Add your mobile money or bank account',
      icon: <Wallet className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4 text-center">
          <div className="rounded-full bg-primary/10 w-20 h-20 flex items-center justify-center mx-auto">
            <Wallet className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold">Setup Your Payment Method</h3>
          <p className="text-muted-foreground">
            Add a mobile money account or bank account to start contributing and receiving payouts
          </p>
          <div className="space-y-2 pt-4">
            <Button
              className="w-full"
              onClick={() => {
                completeOnboarding();
                window.location.href = '/mobile-money';
              }}
            >
              Add Mobile Money
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                completeOnboarding();
                window.location.href = '/bank-accounts';
              }}
            >
              Add Bank Account
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: 'trust_score',
      title: 'Build Your Trust Score',
      description: 'Earn trust by being reliable',
      icon: <TrendingUp className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-4 text-center">
          <div className="rounded-full bg-primary/10 w-20 h-20 flex items-center justify-center mx-auto">
            <TrendingUp className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold">Your Trust Score Matters</h3>
          <p className="text-muted-foreground">
            Build trust by making timely contributions and completing cycles
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-success mb-1">+10</div>
                <div className="text-xs text-muted-foreground">On-time payment</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary mb-1">+50</div>
                <div className="text-xs text-muted-foreground">Complete cycle</div>
              </CardContent>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground pt-2">
            Higher trust scores unlock better group opportunities and lower fees
          </p>
        </div>
      ),
    },
  ];

  const completeOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      toast.success('Welcome aboard! 🎉');
      setOpen(false);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const saveProgress = async (step: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ onboarding_step: step })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      saveProgress(nextStep);
      setCompletedSteps([...completedSteps, steps[currentStep].id]);
    } else {
      completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const currentStepData = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <div className="space-y-6 py-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>

          {/* Content */}
          <div className="min-h-[400px]">{currentStepData.content}</div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="outline" onClick={handlePrevious}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <Button onClick={handleNext}>
                {currentStep === steps.length - 1 ? (
                  <>
                    Get Started
                    <Check className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
