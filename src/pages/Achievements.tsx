import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trophy, Lock, Sparkles, TrendingUp, Users, Award } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: string;
  requirement_type: string;
  requirement_value: number;
  bonus_percentage: number;
}

interface UserAchievement {
  id: string;
  achievement_id: string;
  earned_at: string;
  progress: number;
  achievements: Achievement;
}

export default function Achievements() {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('achievements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'achievements'
        },
        () => {
          fetchAchievements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAchievements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch all available achievement types (without user_id filter)
      const { data: allAchievementsData, error: allError } = await supabase
        .from('achievements')
        .select('*')
        .is('user_id', null)
        .order('tier', { ascending: true });

      if (allError) throw allError;
      setAllAchievements((allAchievementsData || []) as any);

      // Fetch user's earned achievements
      const { data: userAchievementsData, error: userError } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (userError) throw userError;
      
      // Map to UserAchievement format
      const mappedUserAchievements: UserAchievement[] = (userAchievementsData || []).map(ach => ({
        id: ach.id,
        achievement_id: ach.id,
        earned_at: ach.earned_at || new Date().toISOString(),
        progress: 100,
        achievements: ach
      }));
      
      setUserAchievements(mappedUserAchievements);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      toast.error('Failed to load achievements');
      // Set empty arrays on error
      setAllAchievements([]);
      setUserAchievements([]);
    } finally {
      setLoading(false);
    }
  };

  const hasAchievement = (achievementId: string) => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
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

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return 'bg-orange-100 text-orange-700';
      case 'silver':
        return 'bg-gray-100 text-gray-700';
      case 'gold':
        return 'bg-yellow-100 text-yellow-700';
      case 'platinum':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-primary/10 text-primary';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'contribution':
        return <TrendingUp className="h-4 w-4" />;
      case 'trust_score':
        return <Award className="h-4 w-4" />;
      case 'milestone':
        return <Trophy className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const renderAchievementCard = (achievement: Achievement) => {
    const earned = hasAchievement(achievement.id);
    const tierColor = getTierColor(achievement.tier);
    const tierBadgeColor = getTierBadgeColor(achievement.tier);

    return (
      <Card
        key={achievement.id}
        className={`transition-all ${
          earned
            ? 'border-2 bg-gradient-to-br from-primary/5 to-secondary/5'
            : 'opacity-60 grayscale'
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div
              className={`w-12 h-12 rounded-full bg-gradient-to-br ${tierColor} flex items-center justify-center text-2xl ${
                !earned && 'grayscale opacity-50'
              }`}
            >
              {earned ? achievement.icon : '🔒'}
            </div>
            <Badge className={tierBadgeColor}>{achievement.tier}</Badge>
          </div>
          <CardTitle className="text-base flex items-center gap-2">
            {achievement.name}
            {earned && <Sparkles className="h-4 w-4 text-yellow-500" />}
          </CardTitle>
          <CardDescription className="text-xs">{achievement.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                {getCategoryIcon(achievement.category)}
                <span className="capitalize">{achievement.category.replace('_', ' ')}</span>
              </div>
              {achievement.bonus_percentage > 0 && (
                <Badge variant="outline" className="text-green-600 text-[10px]">
                  +{achievement.bonus_percentage}% bonus
                </Badge>
              )}
            </div>
            {!earned && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>
                  Requirement: {achievement.requirement_value}{' '}
                  {achievement.requirement_type.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const filterByCategory = (category: string) => {
    return allAchievements.filter(a => a.category === category);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const earnedCount = userAchievements.length;
  const totalCount = allAchievements.length;
  const progress = (earnedCount / totalCount) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Achievements</h1>
        </div>

        {/* Progress Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Your Progress
                </CardTitle>
                <CardDescription>
                  {earnedCount} of {totalCount} achievements unlocked
                </CardDescription>
              </div>
              <div className="text-3xl font-bold text-primary">{Math.round(progress)}%</div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Achievements Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="contribution">Contribution</TabsTrigger>
            <TabsTrigger value="trust_score">Trust</TabsTrigger>
            <TabsTrigger value="milestone">Milestone</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {allAchievements.map(renderAchievementCard)}
            </div>
          </TabsContent>

          <TabsContent value="contribution" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filterByCategory('contribution').map(renderAchievementCard)}
            </div>
          </TabsContent>

          <TabsContent value="trust_score" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filterByCategory('trust_score').map(renderAchievementCard)}
            </div>
          </TabsContent>

          <TabsContent value="milestone" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {filterByCategory('milestone').map(renderAchievementCard)}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
