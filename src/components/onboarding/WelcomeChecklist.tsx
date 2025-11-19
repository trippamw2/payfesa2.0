import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Check, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action: string;
  route?: string;
}

export function WelcomeChecklist() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Add your personal information',
      completed: false,
      action: 'Complete',
      route: '/settings/account',
    },
    {
      id: 'payment',
      title: 'Add Payment Method',
      description: 'Setup mobile money or bank account',
      completed: false,
      action: 'Setup',
      route: '/payment-accounts',
    },
    {
      id: 'group',
      title: 'Join Your First Group',
      description: 'Find a group that matches your goals',
      completed: false,
      action: 'Browse Groups',
      route: '/groups',
    },
    {
      id: 'contribution',
      title: 'Make First Contribution',
      description: 'Start your savings journey',
      completed: false,
      action: 'Contribute',
    },
    {
      id: 'invite',
      title: 'Invite a Friend',
      description: 'Get rewards for referrals',
      completed: false,
      action: 'Invite',
      route: '/invite',
    },
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkProgress();
  }, []);

  const checkProgress = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check profile completion
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single();

      // Check payment methods
      const { data: paymentAccounts } = await supabase
        .from('mobile_money_accounts')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      // Check group membership
      const { data: groupMemberships } = await supabase
        .from('group_members')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      // Check contributions
      const { data: contributions } = await supabase
        .from('contributions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .limit(1);

      // Check referrals (if you have a referrals table)
      // const { data: referrals } = await supabase
      //   .from('referrals')
      //   .select('id')
      //   .eq('referrer_id', user.id)
      //   .limit(1);

      setItems(prev => prev.map(item => {
        switch (item.id) {
          case 'profile':
            return { ...item, completed: !!(profile?.full_name && profile?.phone) };
          case 'payment':
            return { ...item, completed: !!paymentAccounts && paymentAccounts.length > 0 };
          case 'group':
            return { ...item, completed: !!groupMemberships && groupMemberships.length > 0 };
          case 'contribution':
            return { ...item, completed: !!contributions && contributions.length > 0 };
          case 'invite':
            return { ...item, completed: false }; // Update when referrals are implemented
          default:
            return item;
        }
      }));
    } catch (error) {
      console.error('Error checking progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = items.filter(item => item.completed).length;
  const progress = (completedCount / items.length) * 100;
  const isComplete = completedCount === items.length;

  if (loading) {
    return null;
  }

  // Don't show if all completed
  if (isComplete) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Welcome Checklist</CardTitle>
            <CardDescription>
              Complete these steps to get the most out of PayFesa
            </CardDescription>
          </div>
          <Badge variant={isComplete ? 'default' : 'secondary'}>
            {completedCount}/{items.length}
          </Badge>
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                item.completed
                  ? 'bg-success/5 border-success/20'
                  : 'hover:bg-accent/50 cursor-pointer'
              }`}
              onClick={() => !item.completed && item.route && navigate(item.route)}
            >
              <div className="flex-shrink-0">
                {item.completed ? (
                  <CheckCircle2 className="h-6 w-6 text-success" />
                ) : (
                  <Circle className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {item.title}
                </h4>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              {!item.completed && item.route && (
                <Button size="sm" variant="ghost">
                  {item.action}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              {item.completed && (
                <Badge variant="outline" className="text-success border-success">
                  <Check className="h-3 w-3 mr-1" />
                  Done
                </Badge>
              )}
            </div>
          ))}
        </div>

        {isComplete && (
          <div className="mt-4 p-4 bg-primary/5 rounded-lg text-center">
            <h4 className="font-semibold text-primary mb-2">🎉 All Set!</h4>
            <p className="text-sm text-muted-foreground">
              You've completed all the setup steps. Ready to start saving!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
