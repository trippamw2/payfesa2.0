import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Award, Crown, Clock, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import WhatsAppInvite from './WhatsAppInvite';
import TrustScoreCard from './TrustScoreCard';

interface Member {
  id: string;
  user_id: string;
  position_in_cycle: number;
  has_received_payout: boolean;
  status: string;
  profiles: {
    full_name: string;
    phone_number: string;
    trust_score: number;
  };
}

interface Props {
  groupId: string;
  currentUserId: string;
  groupCode: string;
  groupName: string;
  inviterName: string;
}

const MembersTab = ({ groupId, currentUserId, groupCode, groupName, inviterName }: Props) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextPayoutMember, setNextPayoutMember] = useState<Member | null>(null);
  const [contributionStatus, setContributionStatus] = useState<Record<string, boolean>>({});
  const [userTrustScore, setUserTrustScore] = useState({ score: 50, on_time_contributions: 0, late_contributions: 0, missed_contributions: 0 });

  useEffect(() => {
    fetchMembers();
    fetchContributionStatus();
    fetchUserTrustScore();
    
    let timeoutId: NodeJS.Timeout;
    const debouncedFetch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchMembers();
      }, 300);
    };
    
    // Set up realtime subscription with debouncing
    const channel = supabase
      .channel(`members-${groupId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
        debouncedFetch
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contributions', filter: `group_id=eq.${groupId}` },
        () => {
          fetchContributionStatus();
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users' },
        () => {
          fetchUserTrustScore();
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('position_in_cycle');

      if (error) throw error;

      if (!data || data.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Fetch users with their trust scores
      const userIds = data.map(m => m.user_id);
      const { data: profilesData } = await supabase
        .from('users')
        .select('id, name, phone_number, trust_score')
        .in('id', userIds);

      // Merge profiles with members (trust_score now comes from users table)
      const membersWithProfiles = data.map(member => ({
        ...member,
        profiles: profilesData?.find(p => p.id === member.user_id) || { full_name: 'Unknown', phone_number: '', trust_score: 50 },
      }));

      setMembers(membersWithProfiles as any);
      
      // Find next payout member (first one without last_payout_at)
      const next = membersWithProfiles.find(m => !m.last_payout_at);
      setNextPayoutMember(next as any || null);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const fetchContributionStatus = async () => {
    try {
      // Get current cycle contributions
      const { data } = await supabase
        .from('contributions')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('status', 'completed');

      const status: Record<string, boolean> = {};
      data?.forEach(contrib => {
        status[contrib.user_id] = true;
      });
      setContributionStatus(status);
    } catch (error) {
      console.error('Error fetching contribution status:', error);
    }
  };

  const fetchUserTrustScore = async () => {
    try {
      // Get user's trust score from users table
      const { data: userData } = await supabase
        .from('users')
        .select('trust_score')
        .eq('id', currentUserId)
        .single();

      // Get contribution stats from contributions table
      const { data: contributions } = await supabase
        .from('contributions')
        .select('status')
        .eq('user_id', currentUserId)
        .eq('group_id', groupId);

      const onTime = contributions?.filter(c => c.status === 'completed').length || 0;
      const late = contributions?.filter(c => c.status === 'late').length || 0;
      const missed = contributions?.filter(c => c.status === 'missed').length || 0;

      setUserTrustScore({
        score: userData?.trust_score || 50,
        on_time_contributions: onTime,
        late_contributions: late,
        missed_contributions: missed
      });
    } catch (error) {
      console.error('Error fetching user trust score:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTrustScoreBadge = (score: number) => {
    if (score >= 90) return { text: 'Excellent', color: 'bg-green-100 text-green-700' };
    if (score >= 70) return { text: 'Good', color: 'bg-blue-100 text-blue-700' };
    if (score >= 50) return { text: 'Fair', color: 'bg-yellow-100 text-yellow-700' };
    return { text: 'Low', color: 'bg-red-100 text-red-700' };
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 max-w-6xl mx-auto">
      {/* Trust Score Card */}
      <TrustScoreCard 
        score={userTrustScore.score}
        onTimeContributions={userTrustScore.on_time_contributions}
        lateContributions={userTrustScore.late_contributions}
        missedContributions={userTrustScore.missed_contributions}
      />

      {/* WhatsApp Invite */}
      <WhatsAppInvite 
        groupCode={groupCode}
        groupName={groupName}
        inviterName={inviterName}
      />

      {/* Next Payout Member Highlight */}
      {nextPayoutMember && (
        <Card className="p-4 bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 border-2 border-yellow-300 shadow-md animate-fade-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <Avatar className="h-12 w-12 border-2 border-yellow-400">
                <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold text-base">
                  {getInitials((nextPayoutMember.profiles as any)?.full_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1 shadow-sm">
                <Crown className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-4 w-4 text-yellow-600" />
                <p className="text-xs font-medium text-yellow-800">Next Payout Recipient</p>
              </div>
              <p className="font-bold text-base text-yellow-900">
                {(nextPayoutMember.profiles as any)?.full_name}
              </p>
              <p className="text-xs text-yellow-700">
                Position #{nextPayoutMember.position_in_cycle} in cycle
              </p>
            </div>
            <Badge className="bg-yellow-500 text-white shadow-sm">
              <TrendingUp className="h-3 w-3 mr-1" />
              Next
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-100/50 rounded-lg p-2">
            <Clock className="w-3 h-3" />
            <span>Auto-scheduled daily at 17:00 CAT • Position updates based on trust score</span>
          </div>
        </Card>
      )}

      {/* Members List */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold px-1">All Members</h3>
        {members.map((member) => {
          const profile = member.profiles as any;
          const trustScore = profile.trust_score || 50; // Use trust_score from users table
          const badge = getTrustScoreBadge(trustScore);
          const isCurrentUser = member.user_id === currentUserId;
          const isNextPayout = nextPayoutMember?.id === member.id;

          return (
            <Card 
              key={member.id}
              className={`p-3 transition-all ${
                isNextPayout 
                  ? 'border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 shadow-md' 
                  : 'border-border/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className={`h-10 w-10 ${isNextPayout ? 'border-2 border-yellow-400' : ''}`}>
                    <AvatarFallback className={`font-semibold ${
                      isNextPayout 
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' 
                        : 'bg-primary/20 text-primary'
                    }`}>
                      {getInitials(profile?.full_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  {isNextPayout && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5">
                      <Crown className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">
                      {profile?.full_name}
                      {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(You)</span>}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {profile?.phone_number}
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    #{member.position_in_cycle}
                  </Badge>
                  <div className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.color}`}>
                    {trustScore}
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {member.has_received_payout ? (
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <Award className="h-3 w-3" />
                      <span>Payout Received</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Clock className="h-3 w-3" />
                      <span>Awaiting Payout</span>
                    </div>
                  )}
                  <Badge 
                    variant={member.status === 'active' ? 'default' : 'secondary'}
                    className="text-[10px]"
                  >
                    {member.status}
                  </Badge>
                </div>
                
                {/* Contribution Status */}
                <div className="flex items-center gap-1">
                  {contributionStatus[member.user_id] ? (
                    <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px]">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Paid
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700 border-red-300 text-[10px]">
                      <XCircle className="h-3 w-3 mr-1" />
                      Unpaid
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default MembersTab;
