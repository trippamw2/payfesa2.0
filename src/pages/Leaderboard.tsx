import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Trophy, TrendingUp, Target, Award, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  trust_score: number;
  total_contributions: number;
  on_time_contributions: number;
  total_groups: number;
  badges: Array<{
    id: string;
    name: string;
    icon: string;
    tier: string;
  }>;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeFilter, setTimeFilter] = useState<'all' | 'month'>('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
    getCurrentUser();
    
    // Setup realtime subscriptions
    const channel = supabase
      .channel('leaderboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchLeaderboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trust_scores' }, () => fetchLeaderboard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contributions' }, () => fetchLeaderboard())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeFilter]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);

      // Get all users with trust scores
      const { data: profiles, error: profilesError } = await supabase
        .from('users')
        .select('id, name, trust_score')
        .order('trust_score', { ascending: false })
        .limit(50);

      if (profilesError) throw profilesError;

      // Get aggregated stats for each user
      const leaderboardData: LeaderboardEntry[] = [];

      for (const profile of profiles || []) {
        // Get trust score stats
        const { data: trustScores } = await supabase
          .from('trust_scores')
          .select('on_time_contributions')
          .eq('user_id', profile.id);

        const totalOnTime = trustScores?.reduce((sum, ts) => sum + (ts.on_time_contributions || 0), 0) || 0;

        // Get total contributions
        let contributionsQuery = supabase
          .from('contributions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('status', 'completed');

        // Filter by month if needed
        if (timeFilter === 'month') {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          contributionsQuery = contributionsQuery.gte('created_at', monthAgo.toISOString());
        }

        const { count: totalContributions } = await contributionsQuery;

        // Get groups count
        const { count: totalGroups } = await supabase
          .from('group_members')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('status', 'active');

        // Get user achievements
        const { data: userAchievements } = await supabase
          .from('user_achievements')
          .select(`
            achievement_id,
            achievements (
              id,
              name,
              icon,
              tier
            )
          `)
          .eq('user_id', profile.id)
          .limit(3);

        const badges = userAchievements?.map(ua => {
          const ach = ua.achievements as any;
          return {
            id: ach?.id || '',
            name: ach?.name || '',
            icon: ach?.icon || '',
            tier: ach?.tier || ''
          };
        }) || [];

        leaderboardData.push({
          user_id: profile.id,
          full_name: profile.name,
          trust_score: profile.trust_score || 100,
          total_contributions: totalContributions || 0,
          on_time_contributions: totalOnTime,
          total_groups: totalGroups || 0,
          badges,
        });
      }

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-500 to-yellow-600';
    if (rank === 2) return 'from-gray-400 to-gray-500';
    if (rank === 3) return 'from-orange-600 to-orange-700';
    return 'from-primary to-primary/80';
  };

  const getRankIcon = (rank: number) => {
    if (rank <= 3) return <Trophy className="h-5 w-5" />;
    return <Award className="h-4 w-4" />;
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'from-orange-600 to-orange-700';
      case 'silver': return 'from-gray-400 to-gray-500';
      case 'gold': return 'from-yellow-500 to-yellow-600';
      case 'platinum': return 'from-blue-400 to-blue-500';
      default: return 'from-primary to-primary/80';
    }
  };

  const handleShare = async (entry: LeaderboardEntry, rank: number, metric: string) => {
    const metricValue = 
      metric === 'trust' ? entry.trust_score :
      metric === 'contributions' ? entry.total_contributions :
      entry.on_time_contributions;

    const metricLabel = 
      metric === 'trust' ? 'Trust Score' :
      metric === 'contributions' ? 'Contributions' :
      'On-Time Payments';

    const shareText = `🏆 I'm ranked #${rank} on PayFesa's ${metricLabel} leaderboard!\n\n` +
      `📊 ${metricLabel}: ${metricValue}\n` +
      `${entry.badges.length > 0 ? `🎖️ Badges: ${entry.badges.map(b => b.icon).join(' ')}\n` : ''}` +
      `\nJoin PayFesa and start your savings journey! 💰`;

    const shareUrl = window.location.origin;

    // Try native share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My PayFesa Achievement',
          text: shareText,
          url: shareUrl,
        });
        toast.success('Shared successfully!');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback to copying to clipboard
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success('Copied to clipboard!');
    }
  };

  const handleWhatsAppShare = (entry: LeaderboardEntry, rank: number, metric: string) => {
    const metricValue = 
      metric === 'trust' ? entry.trust_score :
      metric === 'contributions' ? entry.total_contributions :
      entry.on_time_contributions;

    const metricLabel = 
      metric === 'trust' ? 'Trust Score' :
      metric === 'contributions' ? 'Contributions' :
      'On-Time Payments';

    const shareText = `🏆 I'm ranked #${rank} on PayFesa's ${metricLabel} leaderboard!\n\n` +
      `📊 ${metricLabel}: ${metricValue}\n` +
      `${entry.badges.length > 0 ? `🎖️ Badges: ${entry.badges.map(b => b.icon).join(' ')}\n` : ''}` +
      `\nJoin PayFesa and start your savings journey! 💰\n${window.location.origin}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const renderLeaderboardByMetric = (metric: 'trust' | 'contributions' | 'streak') => {
    let sortedData = [...leaderboard];

    switch (metric) {
      case 'trust':
        sortedData.sort((a, b) => b.trust_score - a.trust_score);
        break;
      case 'contributions':
        sortedData.sort((a, b) => b.total_contributions - a.total_contributions);
        break;
      case 'streak':
        sortedData.sort((a, b) => b.on_time_contributions - a.on_time_contributions);
        break;
    }

    const currentUserRank = sortedData.findIndex(entry => entry.user_id === currentUserId) + 1;

    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {currentUserRank > 0 && currentUserRank <= 50 && (
          <Card className="p-4 bg-primary/5 border-primary">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Your Ranking</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleWhatsAppShare(sortedData[currentUserRank - 1], currentUserRank, metric)}
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleShare(sortedData[currentUserRank - 1], currentUserRank, metric)}
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  Share
                </Button>
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">#{currentUserRank}</p>
          </Card>
        )}

        {sortedData.map((entry, index) => {
          const rank = index + 1;
          const isCurrentUser = entry.user_id === currentUserId;
          const metricValue = 
            metric === 'trust' ? entry.trust_score :
            metric === 'contributions' ? entry.total_contributions :
            entry.on_time_contributions;

          return (
            <Card key={entry.user_id} className={`p-4 ${rank <= 3 ? 'border-2' : ''} ${isCurrentUser ? 'bg-primary/5 border-primary' : ''}`}>
              <div className="flex items-center gap-4 mb-3">
                {/* Rank Badge */}
                <div className={`flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${getRankColor(rank)} text-white font-bold flex-shrink-0`}>
                  {rank <= 3 ? getRankIcon(rank) : rank}
                </div>

                {/* Avatar */}
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {entry.full_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{entry.full_name}</h3>
                    {rank === 1 && (
                      <Badge variant="secondary" className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                        Champion
                      </Badge>
                    )}
                  </div>
                  
                  {/* Badges */}
                  {entry.badges.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {entry.badges.map((badge) => (
                        <Badge 
                          key={badge.id} 
                          variant="outline" 
                          className={`text-[10px] px-1.5 py-0.5 bg-gradient-to-r ${getTierColor(badge.tier)} text-white border-0`}
                        >
                          {badge.icon} {badge.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Metric Display */}
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-bold text-primary">
                    {metricValue}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {metric === 'trust' && 'Trust Score'}
                    {metric === 'contributions' && 'Total Contributions'}
                    {metric === 'streak' && 'On-Time Payments'}
                  </div>
                </div>

                {/* Share Button for Current User */}
                {isCurrentUser && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleShare(entry, rank, metric)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Additional Stats */}
              <div className="flex gap-4 mt-3 pt-3 border-t text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Trophy className="h-3 w-3" />
                  <span>{entry.trust_score} Trust</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  <span>{entry.total_contributions} Contributions</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>{entry.on_time_contributions} On-Time</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={goBack}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Leaderboard</h1>
        </div>
        <p className="text-muted-foreground mb-2">
          Top performers in the PayFesa community
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 rounded-lg p-2 border border-primary/10">
          <TrendingUp className="w-3 h-3" />
          <span>Auto-updated daily • Higher scores = Earlier payouts • Achievements & bonuses auto-awarded</span>
        </div>
      </div>

      {/* Time Filter */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={timeFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setTimeFilter('all')}
          size="sm"
        >
          All Time
        </Button>
        <Button
          variant={timeFilter === 'month' ? 'default' : 'outline'}
          onClick={() => setTimeFilter('month')}
          size="sm"
        >
          This Month
        </Button>
      </div>

      {/* Leaderboard Tabs */}
      <Tabs defaultValue="trust" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="trust" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Trust Score
          </TabsTrigger>
          <TabsTrigger value="contributions" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Contributions
          </TabsTrigger>
          <TabsTrigger value="streak" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            On-Time Streak
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trust">
          {renderLeaderboardByMetric('trust')}
        </TabsContent>

        <TabsContent value="contributions">
          {renderLeaderboardByMetric('contributions')}
        </TabsContent>

        <TabsContent value="streak">
          {renderLeaderboardByMetric('streak')}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboard;
