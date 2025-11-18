import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp, Users, Calendar, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  userId: string;
}

interface NextPayout {
  groupId: string;
  groupName: string;
  recipientName: string;
  amount: number;
  daysUntilPayout: number;
}

interface UpcomingContribution {
  groupId: string;
  groupName: string;
  amount: number;
  daysUntilDue: number;
  frequency: string;
}

const UpcomingWidget = ({ userId }: Props) => {
  const navigate = useNavigate();
  const [nextPayout, setNextPayout] = useState<NextPayout | null>(null);
  const [upcomingContributions, setUpcomingContributions] = useState<UpcomingContribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingData();
    const interval = setInterval(() => {
      fetchUpcomingData();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [userId]);

  const fetchUpcomingData = async () => {
    try {
      // Get user's groups
      const { data: memberGroups } = await supabase
        .from('group_members')
        .select('group_id, position_in_cycle')
        .eq('user_id', userId);

      const groupIds = memberGroups?.map(m => m.group_id) || [];

      if (groupIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get groups data
      const { data: groups } = await supabase
        .from('rosca_groups')
        .select('*')
        .in('id', groupIds);

      if (!groups || groups.length === 0) {
        setLoading(false);
        return;
      }

      // Calculate upcoming contributions
      const contributions: UpcomingContribution[] = [];
      for (const group of groups) {
        const startDate = new Date(group.start_date);
        const today = new Date();
        
        let daysUntilNext = 0;
        if (group.frequency === 'weekly') {
          const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const weeksElapsed = Math.floor(daysSinceStart / 7);
          const nextContributionDate = new Date(startDate);
          nextContributionDate.setDate(startDate.getDate() + (weeksElapsed + 1) * 7);
          daysUntilNext = Math.ceil((nextContributionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        } else if (group.frequency === 'monthly') {
          const monthsSinceStart = (today.getFullYear() - startDate.getFullYear()) * 12 + today.getMonth() - startDate.getMonth();
          const nextContributionDate = new Date(startDate);
          nextContributionDate.setMonth(startDate.getMonth() + monthsSinceStart + 1);
          daysUntilNext = Math.ceil((nextContributionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        if (daysUntilNext > 0 && daysUntilNext <= 30) {
          contributions.push({
            groupId: group.id,
            groupName: group.name,
            amount: group.contribution_amount,
            daysUntilDue: daysUntilNext,
            frequency: group.frequency
          });
        }
      }

      contributions.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
      setUpcomingContributions(contributions);

      // Find next payout recipient
      for (const group of groups) {
        const { data: nextMember } = await supabase
          .from('group_members')
          .select('user_id, position_in_cycle')
          .eq('group_id', group.id)
          .order('position_in_cycle', { ascending: true })
          .limit(1)
          .single();

        if (nextMember) {
          const { data: recipientProfile } = await supabase
            .from('users')
            .select('name')
            .eq('id', nextMember.user_id)
            .single();

          // Calculate days until payout based on frequency
          const startDate = new Date(group.start_date);
          const today = new Date();
          let daysUntilNext = 0;

          if (group.frequency === 'weekly') {
            const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const weeksElapsed = Math.floor(daysSinceStart / 7);
            const nextPayoutDate = new Date(startDate);
            nextPayoutDate.setDate(startDate.getDate() + (weeksElapsed + 1) * 7);
            daysUntilNext = Math.ceil((nextPayoutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          } else if (group.frequency === 'monthly') {
            const monthsSinceStart = (today.getFullYear() - startDate.getFullYear()) * 12 + today.getMonth() - startDate.getMonth();
            const nextPayoutDate = new Date(startDate);
            nextPayoutDate.setMonth(startDate.getMonth() + monthsSinceStart + 1);
            daysUntilNext = Math.ceil((nextPayoutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          }

          setNextPayout({
            groupId: group.id,
            groupName: group.name,
            recipientName: recipientProfile?.name || 'Unknown',
            amount: group.contribution_amount * group.max_members,
            daysUntilPayout: Math.max(0, daysUntilNext)
          });
          break;
        }
      }
    } catch (error) {
      console.error('Error fetching upcoming data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `${days} days`;
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''}`;
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 1) return 'text-red-600 bg-red-50 border-red-200';
    if (days <= 3) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (days <= 7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  if (loading) {
    return (
      <Card className="p-4 border border-border/50">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-12 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (!nextPayout && upcomingContributions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Next Payout Widget */}
      {nextPayout && (
        <Card 
          className="p-4 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => navigate(`/groups/${nextPayout.groupId}?tab=payouts`)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Trophy className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Next Payout</p>
                <p className="text-sm font-semibold text-foreground">{nextPayout.groupName}</p>
              </div>
            </div>
            <Badge variant="default" className="bg-primary">
              <Clock className="h-3 w-3 mr-1" />
              {formatTimeRemaining(nextPayout.daysUntilPayout)}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Recipient:</span>
                <span className="font-medium">{nextPayout.recipientName}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Payout Amount</span>
              <span className="text-base font-bold text-primary">MWK {nextPayout.amount.toLocaleString()}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Upcoming Contributions */}
      {upcomingContributions.length > 0 && (
        <Card className="p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-secondary" />
            <h3 className="text-sm font-semibold">Upcoming Contributions</h3>
          </div>
          
          <div className="space-y-2">
            {upcomingContributions.slice(0, 3).map((contrib) => (
              <div
                key={contrib.groupId}
                className={`p-3 rounded-lg border ${getUrgencyColor(contrib.daysUntilDue)} cursor-pointer hover:shadow-sm transition-all`}
                onClick={() => navigate(`/groups/${contrib.groupId}`)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{contrib.groupName}</span>
                  <Badge variant="outline" className="text-[10px] border-current">
                    <Clock className="h-2.5 w-2.5 mr-1" />
                    {formatTimeRemaining(contrib.daysUntilDue)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-75">{contrib.frequency}</span>
                  <span className="text-sm font-bold">MWK {contrib.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default UpcomingWidget;
