import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Gift, TrendingUp, Zap, Award, Target } from 'lucide-react';
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

  useEffect(() => {
    fetchBonuses();
    fetchAvailableBonuses();
    setupRealtimeSubscription();
  }, [userId]);

  const fetchBonuses = async () => {
    try {
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
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 backdrop-blur border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            Bonuses
          </div>
          <Badge variant="secondary" className="font-mono">
            MWK {totalEarned.toLocaleString()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recent Bonuses */}
        {recentBonuses.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Recent Bonuses</p>
            {recentBonuses.map((bonus) => (
              <div
                key={bonus.id}
                className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/50"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                    {getBonusIcon(bonus.bonus_type_code)}
                  </div>
                  <div>
                    <p className="text-xs font-medium">
                      {getBonusName(bonus.bonus_type_code)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(bonus.awarded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                  +MWK {Number(bonus.amount).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <Gift className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">No bonuses yet</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Keep up good payment habits to earn bonuses!
            </p>
          </div>
        )}

        {/* Available Bonuses */}
        {availableBonuses.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Available Bonuses</p>
            <div className="space-y-1.5">
              {availableBonuses.slice(0, 3).map((bonus) => (
                <div
                  key={bonus.code}
                  className="flex items-center justify-between p-2 rounded bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-full bg-primary/5 text-primary">
                      {getBonusIcon(bonus.code)}
                    </div>
                    <div>
                      <p className="text-[10px] font-medium">{bonus.name}</p>
                      <p className="text-[9px] text-muted-foreground">
                        {bonus.description}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] font-semibold text-primary">
                    MWK {Number(bonus.bonus_amount).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
