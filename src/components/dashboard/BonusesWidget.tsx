import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Gift, TrendingUp, Zap, Award, Target, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Bonus {
  id: string;
  bonus_type_code: string;
  amount: number;
  reason: string;
  awarded_at: string;
  metadata: any;
}

interface BonusType {
  code: string;
  name: string;
  description: string;
  bonus_amount: number;
}

export const BonusesWidget = ({ userId }: { userId: string }) => {
  const [recentBonuses, setRecentBonuses] = useState<Bonus[]>([]);
  const [availableBonuses, setAvailableBonuses] = useState<BonusType[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBonuses();
    fetchAvailableBonuses();
    setupRealtimeSubscription();
  }, [userId]);

  const fetchBonuses = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('bonus_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('awarded_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setRecentBonuses(data || []);
      
      // Calculate total
      const total = data?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;
      setTotalEarned(total);
    } catch (error) {
      console.error('Error fetching bonuses:', error);
      setError('Failed to load bonuses');
      toast.error('Failed to load bonuses');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBonuses = async () => {
    try {
      const { data, error } = await supabase
        .from('bonus_types')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setAvailableBonuses(data || []);
    } catch (error) {
      console.error('Error fetching bonus types:', error);
      toast.error('Failed to load available bonuses');
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`bonuses-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bonus_transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newBonus = payload.new as Bonus;
          setRecentBonuses((prev) => [newBonus, ...prev.slice(0, 4)]);
          setTotalEarned((prev) => prev + Number(newBonus.amount));
          toast.success(`🎁 Bonus Earned: MWK ${Number(newBonus.amount).toLocaleString()}`, {
            description: newBonus.reason,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getBonusIcon = (code: string) => {
    switch (code) {
      case 'CONSISTENCY_3':
        return <TrendingUp className="h-4 w-4" />;
      case 'EARLY_BIRD':
        return <Zap className="h-4 w-4" />;
      case 'TRUST_90':
      case 'PERFECT_SCORE':
        return <Award className="h-4 w-4" />;
      case 'NO_MISS':
        return <Target className="h-4 w-4" />;
      default:
        return <Gift className="h-4 w-4" />;
    }
  };

  const getBonusName = (code: string) => {
    const bonus = availableBonuses.find(b => b.code === code);
    return bonus?.name || code;
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            Bonuses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card/50 backdrop-blur border-destructive/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Gift className="h-4 w-4 text-destructive" />
            Bonuses
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-4">
          <p className="text-xs text-muted-foreground mb-2">{error}</p>
          <Button onClick={fetchBonuses} variant="outline" size="sm">
            <RefreshCw className="h-3 w-3 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 backdrop-blur border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[10px] font-semibold flex items-center gap-1">
            <Gift className="h-3 w-3 text-primary" />
            Bonuses
          </CardTitle>
          {recentBonuses.length > 0 && (
            <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4 font-mono">
              Latest: +{Number(recentBonuses[0].amount).toLocaleString()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-0">
        <div className="text-center py-1">
          <div className="text-2xl font-bold">
            MWK {totalEarned.toLocaleString()}
          </div>
          <p className="text-[9px] text-muted-foreground">Total Earned</p>
        </div>
      </CardContent>
    </Card>
  );
};
