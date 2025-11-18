import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Lock, Sparkles, TrendingUp, Users, Award } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';

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
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
    const channel = supabase
      .channel('achievements-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'achievements' }, () => fetchAchievements())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAchievements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }

      const { data: allData } = await supabase.from('achievements').select('*').is('user_id', null).order('tier');
      setAllAchievements((allData || []) as any);

      const { data: userData } = await supabase.from('achievements').select('*').eq('user_id', user.id).order('earned_at', { ascending: false });
      setUserAchievements((userData || []).map((ach: any) => ({ id: ach.id, achievement_id: ach.id, earned_at: ach.earned_at || new Date().toISOString(), progress: 100, achievements: ach })));
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const hasAchievement = (id: string) => userAchievements.some(ua => ua.achievement_id === id);
  const getTierColor = (tier: string) => ({ bronze: 'from-accent to-accent/80', silver: 'from-muted to-muted-foreground/20', gold: 'from-gold to-gold/80', platinum: 'from-primary to-primary/80' }[tier] || 'from-primary to-secondary');
  const getTierBadge = (tier: string) => ({ bronze: 'bg-accent/10 text-accent-foreground', silver: 'bg-muted text-muted-foreground', gold: 'bg-gold/10', platinum: 'bg-primary/10 text-primary' }[tier] || 'bg-primary/10 text-primary');
  const getCategoryIcon = (cat: string) => ({ contribution: <TrendingUp className="h-4 w-4" />, trust_score: <Award className="h-4 w-4" />, milestone: <Trophy className="h-4 w-4" /> }[cat] || <Users className="h-4 w-4" />);

  const renderCard = (ach: Achievement) => {
    const earned = hasAchievement(ach.id);
    return (
      <Card key={ach.id} className={`transition-all ${earned ? 'border-2 bg-gradient-to-br from-primary/5 to-secondary/5' : 'opacity-60 grayscale'}`}>
        <CardHeader className="pb-2 p-2.5">
          <div className="flex items-start justify-between">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getTierColor(ach.tier)} flex items-center justify-center text-xl ${!earned && 'grayscale opacity-50'}`}>
              {earned ? ach.icon : '🔒'}
            </div>
            <Badge className={`${getTierBadge(ach.tier)} text-[10px]`}>{ach.tier}</Badge>
          </div>
          <CardTitle className="text-xs flex items-center gap-1.5 mt-2">
            {ach.name}
            {earned && <Sparkles className="h-3 w-3 text-gold" />}
          </CardTitle>
          <CardDescription className="text-[10px]">{ach.description}</CardDescription>
        </CardHeader>
        <CardContent className="p-2.5 pt-0">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1 text-muted-foreground">{getCategoryIcon(ach.category)}<span className="capitalize">{ach.category.replace('_', ' ')}</span></div>
            {ach.bonus_percentage > 0 && <Badge variant="outline" className="text-primary text-[9px] px-1">+{ach.bonus_percentage}%</Badge>}
          </div>
          {!earned && <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1"><Lock className="h-3 w-3" /><span>{ach.requirement_value} {ach.requirement_type.replace('_', ' ')}</span></div>}
        </CardContent>
      </Card>
    );
  };

  const filterByCategory = (cat: string) => allAchievements.filter(a => a.category === cat);
  const earnedCount = userAchievements.length;
  const totalCount = allAchievements.length;
  const progress = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  return (
    <PageLayout title="Achievements" subtitle={`${earnedCount} / ${totalCount} Unlocked`} icon={<Trophy className="h-4 w-4" />}>
      {loading ? <LoadingSkeleton variant="card" count={6} /> : (
        <div className="space-y-2">
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div><h3 className="text-sm font-semibold">Overall Progress</h3><p className="text-[10px] text-muted-foreground">{earnedCount} of {totalCount} earned</p></div>
              <div className="text-xl font-bold text-primary">{Math.round(progress)}%</div>
            </div>
            <Progress value={progress} className="h-2" />
          </Card>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-8">
              <TabsTrigger value="all" className="text-[10px]">All</TabsTrigger>
              <TabsTrigger value="contribution" className="text-[10px]">Contributions</TabsTrigger>
              <TabsTrigger value="trust_score" className="text-[10px]">Trust</TabsTrigger>
              <TabsTrigger value="milestone" className="text-[10px]">Milestones</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-2"><div className="grid grid-cols-2 gap-2">{allAchievements.map(renderCard)}</div></TabsContent>
            <TabsContent value="contribution" className="mt-2"><div className="grid grid-cols-2 gap-2">{filterByCategory('contribution').map(renderCard)}</div></TabsContent>
            <TabsContent value="trust_score" className="mt-2"><div className="grid grid-cols-2 gap-2">{filterByCategory('trust_score').map(renderCard)}</div></TabsContent>
            <TabsContent value="milestone" className="mt-2"><div className="grid grid-cols-2 gap-2">{filterByCategory('milestone').map(renderCard)}</div></TabsContent>
          </Tabs>
        </div>
      )}
    </PageLayout>
  );
}
