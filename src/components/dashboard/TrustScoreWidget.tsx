import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Award, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TrustScoreData {
  trust_score: number;
  is_kyc_verified: boolean;
  total_messages_sent: number;
  created_at: string;
}

interface TrustScoreHistory {
  change_amount: number;
  created_at: string;
}

export const TrustScoreWidget = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trustData, setTrustData] = useState<TrustScoreData | null>(null);
  const [recentChange, setRecentChange] = useState<TrustScoreHistory | null>(null);

  useEffect(() => {
    fetchTrustScore();
  }, []);

  const fetchTrustScore = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user trust score
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('trust_score, is_kyc_verified, total_messages_sent, created_at')
        .eq('id', user.id)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user data:', userError);
        return;
      }
      
      if (!userData) {
        console.error('User data not found');
        return;
      }
      
      setTrustData(userData);

      // Fetch most recent change
      const { data: history, error: historyError } = await supabase
        .from('trust_score_history')
        .select('change_amount, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (historyError) throw historyError;
      setRecentChange(history);
    } catch (error) {
      console.error('Error fetching trust score:', error);
      toast.error('Failed to load trust score');
    } finally {
      setLoading(false);
    }
  };

  const getTrustLevel = (score: number) => {
    if (score >= 95) return { label: 'Diamond Trust', color: 'bg-gradient-to-r from-primary to-accent', icon: '💎' };
    if (score >= 85) return { label: 'Highly Trusted', color: 'bg-gradient-to-r from-warning to-accent', icon: '⭐' };
    if (score >= 75) return { label: 'Trusted Member', color: 'bg-gradient-to-r from-success to-info', icon: '🌟' };
    if (score >= 60) return { label: 'Good Standing', color: 'bg-gradient-to-r from-info to-primary', icon: '✓' };
    if (score >= 40) return { label: 'Fair Standing', color: 'bg-muted', icon: '○' };
    return { label: 'Needs Improvement', color: 'bg-gradient-to-r from-warning to-destructive', icon: '⚠' };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-muted rounded w-16"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-1.5 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!trustData) return null;

  const score = trustData.trust_score || 50;
  const level = getTrustLevel(score);

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 opacity-10 ${level.color}`}></div>
      
      <CardHeader className="relative p-2 pb-1.5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[10px] font-semibold flex items-center gap-1">
            🎯 Trust Score
          </CardTitle>
          {recentChange && recentChange.change_amount !== 0 && (
            <Badge variant={recentChange.change_amount > 0 ? 'default' : 'destructive'} className="gap-0.5 text-[8px] px-1 py-0 h-3.5">
              {recentChange.change_amount > 0 ? (
                <TrendingUp className="h-2 w-2" />
              ) : (
                <TrendingDown className="h-2 w-2" />
              )}
              {recentChange.change_amount > 0 ? '+' : ''}{recentChange.change_amount}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative p-2 pt-0">
        <div className="text-center py-0.5">
          <div className="text-xl font-bold">
            {level.icon} {score}
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
          <Badge className={level.color + ' text-primary-foreground border-0 text-[8px] px-1.5 py-0 h-4'}>
            {level.label}
          </Badge>
        </div>
        <Button
          variant="ghost"
          className="w-full h-6 text-[9px] mt-0.5"
          onClick={() => navigate('/trust-score-history')}
        >
          View History
        </Button>
      </CardContent>
    </Card>
  );
};
