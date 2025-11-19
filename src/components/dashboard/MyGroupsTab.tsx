import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Users as UsersIcon, TrendingUp, Calendar, Award, UserPlus, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';
import JoinByCodeDialog from '@/components/groups/JoinByCodeDialog';
import UpcomingWidget from '@/components/dashboard/UpcomingWidget';
import { TrustScoreWidget } from '@/components/dashboard/TrustScoreWidget';
import { BonusesWidget } from '@/components/dashboard/BonusesWidget';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { DevelopmentModeBanner } from '@/components/dev/DevelopmentModeBanner';
import { User, Profile } from '@/types';

interface Group {
  id: string;
  name: string;
  contribution_amount: number;
  current_members: number;
  max_members: number;
  frequency: string;
  escrow_balance: number;
  start_date: string;
  status: string;
}

interface Props {
  user: User;
  profile: Profile;
}

const MyGroupsTab = ({ user, profile }: Props) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [trustScores, setTrustScores] = useState<Record<string, number>>({});
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  useEffect(() => {
    fetchGroups();
    subscribeToGroupUpdates();
  }, [user.id]);

  const subscribeToGroupUpdates = () => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedFetch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchGroups();
      }, 300); // Debounce for 300ms
    };

    const channel = supabase
      .channel(`groups-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rosca_groups',
        },
        debouncedFetch
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `user_id=eq.${user.id}`,
        },
        debouncedFetch
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const { data: memberGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      const groupIds = memberGroups?.map(m => m.group_id) || [];

      if (groupIds.length > 0) {
        const { data: groupsData } = await supabase
          .from('rosca_groups')
          .select('*')
          .in('id', groupIds);

        setGroups((groupsData || []) as any);

        // Fetch trust scores
        const { data: scores } = await supabase
          .from('trust_scores')
          .select('group_id, score')
          .eq('user_id', user.id)
          .in('group_id', groupIds);

        const scoresMap: Record<string, number> = {};
        scores?.forEach(s => {
          scoresMap[s.group_id] = s.score;
        });
        setTrustScores(scoresMap);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const getTrustScoreBadge = (score: number) => {
    if (score >= 90) return { text: 'Excellent', color: 'text-success bg-success/10' };
    if (score >= 70) return { text: 'Good', color: 'text-info bg-info/10' };
    if (score >= 50) return { text: 'Fair', color: 'text-warning bg-warning/10' };
    return { text: 'Low', color: 'text-destructive bg-destructive/10' };
  };

  return (
    <div className="p-2 space-y-2 max-w-6xl mx-auto">
      {/* Development Mode Banner */}
      <DevelopmentModeBanner />
      
      {/* Onboarding Checklist */}
      <OnboardingChecklist userId={user.id} />

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-1.5">
        <Card className="p-1.5 border border-border/50">
          <UsersIcon className="h-3 w-3 text-primary mb-0.5" />
          <p className="text-lg font-bold">{groups.length}</p>
          <p className="text-[9px] text-muted-foreground">Groups</p>
        </Card>

        <Card className="p-1.5 border border-border/50">
          <TrendingUp className="h-3 w-3 text-primary mb-0.5" />
          <p className="text-lg font-bold">{profile.trust_score || 50}</p>
          <p className="text-[9px] text-muted-foreground">Score</p>
        </Card>

        <Card className="p-1.5 border border-border/50">
          <Award className="h-3 w-3 text-primary mb-0.5" />
          <p className="text-sm font-bold">Active</p>
          <p className="text-[9px] text-muted-foreground">Rank</p>
        </Card>
      </div>

      {/* Create New Group & Join Group Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button 
          onClick={() => navigate('/groups')}
          className="bg-gradient-to-r from-primary to-secondary text-white h-8 text-[11px]"
        >
          <Plus className="h-3 w-3 mr-1" />
          {t('createGroup')}
        </Button>
        
        <Button 
          onClick={() => setShowJoinDialog(true)}
          variant="outline"
          className="h-8 text-[11px]"
        >
          <UserPlus className="h-3 w-3 mr-1" />
          {t('joinGroup')}
        </Button>
      </div>

      {/* Trust Score & Bonuses Widgets */}
      <div className="grid md:grid-cols-2 gap-2">
        <TrustScoreWidget />
        <BonusesWidget userId={user.id} />
      </div>

      {/* Upcoming Widget */}
      <UpcomingWidget userId={user.id} />

      {/* Groups List */}
      <div className="space-y-2">
        {loading ? (
          <Card className="p-3 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          </Card>
        ) : groups.length === 0 ? (
          <Card className="p-3 text-center">
            <UsersIcon className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-[10px] text-muted-foreground">
              {language === 'en' ? 'No groups yet' : 'Palibe magulu'}
            </p>
          </Card>
        ) : (
          groups.map((group) => {
            const trustScore = trustScores[group.id] || 100;
            const badge = getTrustScoreBadge(trustScore);
            
            return (
              <Card 
                key={group.id}
                className="p-2 hover:shadow-md transition-shadow cursor-pointer border border-border/50"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{group.name}</h3>
                    <p className="text-[10px] text-muted-foreground">
                      {group.current_members}/{group.max_members}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                      {group.frequency}
                    </Badge>
                    <div className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${badge.color}`}>
                      {trustScore}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1 text-[10px]">
                    <TrendingUp className="h-3 w-3 text-primary" />
                    <span className="font-medium">{group.contribution_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <UsersIcon className="h-3 w-3 text-primary" />
                    <span>{group.current_members}/{group.max_members}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <Calendar className="h-3 w-3 text-primary" />
                    <span>{new Date(group.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                  {group.status === 'active' ? (
                    <Badge className="bg-success/10 text-success text-[9px] px-1.5 py-0">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-info/10 text-info text-[9px] px-1.5 py-0">
                      <Clock className="h-2.5 w-2.5 mr-0.5" />
                      {group.status}
                    </Badge>
                  )}
                  <Button 
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/groups/${group.id}`);
                    }}
                  >
                    Manage
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <JoinByCodeDialog 
        open={showJoinDialog} 
        onOpenChange={setShowJoinDialog}
        onSuccess={() => {
          setShowJoinDialog(false);
          fetchGroups();
        }}
      />
    </div>
  );
};

export default MyGroupsTab;
