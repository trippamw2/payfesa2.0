import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, TrendingUp, TrendingDown, Award, Target, Calendar, Share2, Download } from 'lucide-react';
import { toast } from 'sonner';
import TrustScoreCard from '@/components/groups/TrustScoreCard';
import { ShareDialog } from '@/components/social/ShareDialog';
import { TrustedUserBadge } from '@/components/social/TrustedUserBadge';
import { EliteBadge } from '@/components/profile/EliteBadge';

interface TrustScoreData {
  group_id: string;
  group_name: string;
  score: number;
  on_time_contributions: number;
  late_contributions: number;
  missed_contributions: number;
  updated_at: string;
}

const TrustScoreHistory = () => {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const [loading, setLoading] = useState(true);
  const [trustScores, setTrustScores] = useState<TrustScoreData[]>([]);
  const [overallScore, setOverallScore] = useState(100);
  const [userName, setUserName] = useState('User');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [userStats, setUserStats] = useState({
    totalContributions: 0,
    groupsCompleted: 0,
    onTimePercentage: 100
  });
  const [totalStats, setTotalStats] = useState({
    onTime: 0,
    late: 0,
    missed: 0,
    totalGroups: 0
  });

  useEffect(() => {
    fetchTrustScoreData();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('trust-scores-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trust_scores'
        },
        () => {
          fetchTrustScoreData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTrustScoreData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get overall score and user info from user profile
      const { data: profile } = await supabase
        .from('users')
        .select('trust_score, name, completed_cycles')
        .eq('id', user.id)
        .single();

      setOverallScore(profile?.trust_score || 100);
      setUserName(profile?.name || 'User');

      // Get contribution stats
      const { data: contributions } = await supabase
        .from('contributions')
        .select('status')
        .eq('user_id', user.id);

      const totalContributions = contributions?.length || 0;
      const completedContributions = contributions?.filter(c => c.status === 'completed').length || 0;
      const onTimePercentage = totalContributions > 0 ? Math.round((completedContributions / totalContributions) * 100) : 100;

      setUserStats({
        totalContributions,
        groupsCompleted: profile?.completed_cycles || 0,
        onTimePercentage
      });

      // Get trust scores from all groups
      const { data: scores, error } = await supabase
        .from('trust_scores')
        .select('*')
        .eq('user_id', user.id)
        .order('score', { ascending: false });

      if (error) throw error;

      if (!scores || scores.length === 0) {
        setTrustScores([]);
        setLoading(false);
        return;
      }

      // Fetch group names separately
      const groupIds = scores.map(s => s.group_id).filter(Boolean);
      const { data: groupsData } = await supabase
        .from('rosca_groups')
        .select('id, name')
        .in('id', groupIds);

      const formattedScores: TrustScoreData[] = scores?.map(score => ({
        group_id: score.group_id,
        group_name: groupsData?.find(g => g.id === score.group_id)?.name || 'Unknown Group',
        score: score.score,
        on_time_contributions: score.contributions_on_time || 0,
        late_contributions: 0,
        missed_contributions: score.missed_contributions || 0,
        updated_at: score.last_update || new Date().toISOString()
      })) || [];

      setTrustScores(formattedScores);

      // Calculate totals
      const stats = formattedScores.reduce((acc, score) => ({
        onTime: acc.onTime + score.on_time_contributions,
        late: acc.late + score.late_contributions,
        missed: acc.missed + score.missed_contributions,
        totalGroups: acc.totalGroups + 1
      }), { onTime: 0, late: 0, missed: 0, totalGroups: 0 });

      setTotalStats(stats);
    } catch (error) {
      console.error('Error fetching trust score history:', error);
      toast.error('Failed to load trust score history');
    } finally {
      setLoading(false);
    }
  };

  const getScoreChange = (score: number) => {
    if (score >= 100) return { trend: 'neutral', text: 'Perfect', color: 'text-green-600' };
    if (score >= 90) return { trend: 'up', text: 'Excellent', color: 'text-green-600' };
    if (score >= 70) return { trend: 'neutral', text: 'Good', color: 'text-blue-600' };
    if (score >= 50) return { trend: 'down', text: 'Fair', color: 'text-yellow-600' };
    return { trend: 'down', text: 'Needs Improvement', color: 'text-red-600' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-full mb-6" />
        <Skeleton className="h-40 w-full mb-4" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

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
          <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-full">
            <Award className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Trust Score History</h1>
        </div>
        <p className="text-muted-foreground">
          Track your trust score across all groups
        </p>
      </div>

      {/* Overall Trust Score */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold">Overall Trust Score</h2>
          </div>
          
          <div className="text-6xl font-bold text-primary">
            {overallScore}
          </div>
          
          <div className="flex items-center justify-center gap-2">
            {getScoreChange(overallScore).trend === 'up' && (
              <TrendingUp className={`h-5 w-5 ${getScoreChange(overallScore).color}`} />
            )}
            {getScoreChange(overallScore).trend === 'down' && (
              <TrendingDown className={`h-5 w-5 ${getScoreChange(overallScore).color}`} />
            )}
            <span className={`font-medium ${getScoreChange(overallScore).color}`}>
              {getScoreChange(overallScore).text}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{totalStats.onTime}</p>
              <p className="text-xs text-muted-foreground">On-Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{totalStats.late}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{totalStats.missed}</p>
              <p className="text-xs text-muted-foreground">Missed</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Total Summary */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" />
            Summary
          </h3>
          <Badge variant="secondary">{totalStats.totalGroups} Groups</Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Total Contributions</p>
            <p className="text-xl font-bold">
              {totalStats.onTime + totalStats.late + totalStats.missed}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Success Rate</p>
            <p className="text-xl font-bold text-green-600">
              {totalStats.onTime + totalStats.late + totalStats.missed > 0
                ? Math.round((totalStats.onTime / (totalStats.onTime + totalStats.late + totalStats.missed)) * 100)
                : 0}%
            </p>
          </div>
        </div>
      </Card>

      {/* Group-by-Group Breakdown */}
      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          By Group
        </h3>

        {trustScores.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            <p>No trust score data available yet.</p>
            <p className="text-sm mt-2">Join a group and make contributions to build your trust score!</p>
          </Card>
        ) : (
          trustScores.map((score) => (
            <Card 
              key={score.group_id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/groups/${score.group_id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold">{score.group_name}</h4>
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(score.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge 
                  className={`text-lg font-bold ${
                    score.score >= 90 ? 'bg-green-100 text-green-700' :
                    score.score >= 70 ? 'bg-blue-100 text-blue-700' :
                    score.score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}
                >
                  {score.score}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="p-2 bg-green-50 rounded">
                  <p className="text-xs text-muted-foreground mb-1">On-Time</p>
                  <p className="font-bold text-green-600">{score.on_time_contributions}</p>
                </div>
                <div className="p-2 bg-yellow-50 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Late</p>
                  <p className="font-bold text-yellow-600">{score.late_contributions}</p>
                </div>
                <div className="p-2 bg-red-50 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Missed</p>
                  <p className="font-bold text-red-600">{score.missed_contributions}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Tips Card */}
      <Card className="p-4 mt-6 bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Pro Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Make contributions on time to increase your score</li>
          <li>• Higher scores mean earlier payouts in the cycle</li>
          <li>• Maintain 90%+ on-time rate for bonus points</li>
          <li>• Missed contributions severely impact your score</li>
        </ul>
      </Card>
    </div>
  );
};

export default TrustScoreHistory;
