import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Trophy, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  userId: string;
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
  tier: string;
  earned_at: string;
}

const AchievementsBadge = ({ userId }: Props) => {
  const navigate = useNavigate();
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentAchievements();

    // Setup realtime subscription
    const channel = supabase
      .channel('achievements-badge-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'achievements',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchRecentAchievements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchRecentAchievements = async () => {
    try {
      // Get achievements directly from achievements table filtered by user_id
      const { data, error, count } = await supabase
        .from('achievements')
        .select('id, name, icon, tier, earned_at', { count: 'exact' })
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      
      setTotalCount(count || 0);
      setRecentAchievements(data || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      // Don't show error toast, just fail silently for badge
      setTotalCount(0);
      setRecentAchievements([]);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return 'from-orange-400 to-orange-600';
      case 'silver':
        return 'from-gray-300 to-gray-500';
      case 'gold':
        return 'from-yellow-400 to-yellow-600';
      case 'platinum':
        return 'from-purple-400 to-purple-600';
      default:
        return 'from-primary to-secondary';
    }
  };

  if (loading || totalCount === 0) {
    return null;
  }

  return (
    <Card 
      className="p-4 border border-border/50 cursor-pointer hover:shadow-md transition-all"
      onClick={() => navigate('/achievements')}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <div>
            <p className="text-sm font-semibold">Achievements</p>
            <p className="text-xs text-muted-foreground">{totalCount} unlocked</p>
          </div>
        </div>
        <Sparkles className="h-4 w-4 text-yellow-500" />
      </div>

      <div className="flex gap-2">
        {recentAchievements.map((achievement, index) => (
          <div
            key={achievement.id}
            className={`w-12 h-12 rounded-full bg-gradient-to-br ${getTierColor(
              achievement.tier
            )} flex items-center justify-center text-2xl animate-scale-in shadow-md`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {achievement.icon}
          </div>
        ))}
        {totalCount > 3 && (
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
            +{totalCount - 3}
          </div>
        )}
      </div>
    </Card>
  );
};

export default AchievementsBadge;
