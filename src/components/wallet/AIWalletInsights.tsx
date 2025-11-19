import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Lightbulb, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WalletInsight {
  title: string;
  message: string;
  trend?: 'up' | 'down' | 'stable';
}

interface AIWalletInsightsProps {
  userId: string;
}

export const AIWalletInsights = ({ userId }: AIWalletInsightsProps) => {
  const [insight, setInsight] = useState<WalletInsight | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    generateInsight();
  }, [userId]);

  const generateInsight = async () => {
    setIsLoading(true);
    try {
      // Fetch user's wallet and contribution data
      const { data: user } = await supabase
        .from('users')
        .select('wallet_balance, total_contributions, escrow_balance')
        .eq('id', userId)
        .single();

      const { data: contributions } = await supabase
        .from('contributions')
        .select('amount, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('type, amount, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      // Calculate patterns
      const totalContributed = contributions?.reduce((sum, c) => sum + c.amount, 0) || 0;
      const avgContribution = contributions?.length ? totalContributed / contributions.length : 0;
      
      const deposits = transactions?.filter(t => t.type === 'credit') || [];
      const withdrawals = transactions?.filter(t => t.type === 'debit') || [];
      
      // Call AI to generate insight
      const { data, error } = await supabase.functions.invoke('generate-smart-notification', {
        body: {
          userId,
          notificationType: 'insight',
          context: {
            walletBalance: user?.wallet_balance || 0,
            escrowBalance: user?.escrow_balance || 0,
            totalContributions: user?.total_contributions || 0,
            avgContribution,
            totalContributed,
            depositsCount: deposits.length,
            withdrawalsCount: withdrawals.length,
            contributionFrequency: contributions?.length || 0
          },
          timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.notification) {
        setInsight({
          title: data.notification.title,
          message: data.notification.message,
          trend: determineTrend(contributions || [])
        });
      } else {
        console.error('No notification in response:', data);
        // Set a fallback insight
        setInsight({
          title: '💡 Wallet Insights',
          message: 'Keep contributing regularly to build your savings and improve your trust score!',
          trend: determineTrend(contributions || [])
        });
      }
    } catch (error) {
      console.error('Error generating wallet insight:', error);
      // Set a fallback insight on error
      setInsight({
        title: '💡 Wallet Insights',
        message: 'Keep contributing regularly to build your savings and improve your trust score!',
        trend: 'stable'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const determineTrend = (contributions: any[]): 'up' | 'down' | 'stable' => {
    if (contributions.length < 2) return 'stable';
    
    const recent = contributions.slice(0, 3);
    const older = contributions.slice(3, 6);
    
    const recentAvg = recent.reduce((sum, c) => sum + c.amount, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, c) => sum + c.amount, 0) / older.length : recentAvg;
    
    if (recentAvg > olderAvg * 1.1) return 'up';
    if (recentAvg < olderAvg * 0.9) return 'down';
    return 'stable';
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Analyzing your wallet...</span>
          </div>
        </div>
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No insights available yet. Keep saving to see personalized insights!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Your Wallet Insights</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={generateInsight}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp 
            className={`h-4 w-4 ${
              insight.trend === 'up' ? 'text-success' : 
              insight.trend === 'down' ? 'text-destructive' : 
              'text-muted-foreground'
            }`} 
          />
          <h4 className="font-medium text-sm">{insight.title}</h4>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {insight.message}
        </p>
      </div>
    </div>
  );
};