import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, ArrowLeft, MessageCircle, Key, DollarSign, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import CreateGroupDialog from '@/components/groups/CreateGroupDialog';
import JoinByCodeDialog from '@/components/groups/JoinByCodeDialog';
import GroupCard from '@/components/groups/GroupCard';
import GroupChat from '@/components/groups/GroupChat';
import { User, Group as GroupType } from '@/types';

interface Group {
  id: string;
  name: string;
  description: string;
  contribution_amount: number;
  frequency: string;
  max_members: number;
  current_members: number;
  status: string;
  created_by: string;
  start_date: string;
}

const Groups = () => {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [user, setUser] = useState<User | null>(null);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinByCodeDialog, setShowJoinByCodeDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;
    const debouncedFetch = async () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const { data: memberGroups } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);

        const memberGroupIds = memberGroups?.map(m => m.group_id) || [];

        const { data: allGroups } = await supabase
          .from('rosca_groups')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (allGroups) {
          setMyGroups(allGroups.filter(g => memberGroupIds.includes(g.id)));
          setAvailableGroups(allGroups.filter(g => !memberGroupIds.includes(g.id) && g.current_members < g.max_members));
        }
      }, 500);
    };

    // Setup realtime subscription with debouncing
    const groupsChannel = supabase
      .channel(`groups-realtime-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rosca_groups' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `user_id=eq.${user.id}` }, debouncedFetch)
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(groupsChannel);
    };
  }, [user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setUser(user);
    fetchGroups(user.id);
  };

  const fetchGroups = async (userId: string) => {
    setLoading(true);
    try {
      // Fetch groups user is member of
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

      if (memberError) throw memberError;

      const memberGroupIds = memberGroups?.map(m => m.group_id) || [];

      // Fetch all group details
      const { data: allGroups, error: groupsError } = await supabase
        .from('rosca_groups')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      setMyGroups(allGroups?.filter(g => memberGroupIds.includes(g.id)) || []);
      setAvailableGroups(allGroups?.filter(g => !memberGroupIds.includes(g.id) && g.current_members < g.max_members) || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const recalculatePayoutPositions = async (groupId: string) => {
    try {
      // Get all members with their trust scores
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select(`
          user_id,
          users!inner(trust_score)
        `)
        .eq('group_id', groupId);

      if (membersError) throw membersError;
      if (!members) return;

      // Sort members by trust score (highest first)
      const sortedMembers = members
        .map(m => ({
          user_id: m.user_id,
          trust_score: (m.users as any).trust_score || 50
        }))
        .sort((a, b) => b.trust_score - a.trust_score);

      // Update payout positions
      for (let i = 0; i < sortedMembers.length; i++) {
        await supabase
          .from('group_members')
          .update({ payout_position: i + 1 })
          .eq('group_id', groupId)
          .eq('user_id', sortedMembers[i].user_id);
      }

      console.log('Payout positions recalculated based on trust scores');
    } catch (error) {
      console.error('Error recalculating payout positions:', error);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;

    try {
      // Check if already a member
      const { data: existingMembership } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMembership) {
        toast.error('You are already a member of this group');
        return;
      }

      // Get current group data
      const { data: group, error: groupError } = await supabase
        .from('rosca_groups')
        .select('current_members, max_members, status')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      // Validate group status
      if (group.status !== 'active') {
        toast.error('This group is not accepting new members');
        return;
      }

      // Validate member limit
      if (group.current_members >= group.max_members) {
        toast.error('Group is full');
        return;
      }

      // Get user trust score
      const { data: userData } = await supabase
        .from('users')
        .select('trust_score')
        .eq('id', user.id)
        .single();

      // Determine position in cycle based on trust score
      const position = group.current_members + 1;

      // Add user to group - payout position will be recalculated
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          position_in_cycle: position,
          payout_position: position, // Temporary, will be recalculated below
          has_contributed: false
        });

      if (memberError) throw memberError;

      // Update group member count
      const { error: updateError } = await supabase
        .from('rosca_groups')
        .update({ current_members: group.current_members + 1 })
        .eq('id', groupId);

      if (updateError) throw updateError;

      // Recalculate payout positions based on trust scores
      await recalculatePayoutPositions(groupId);

      toast.success('Successfully joined group!');
      fetchGroups(user.id);
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Failed to join group');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-6xl mx-auto">
        {/* Compact Header */}
        <div className="flex items-center justify-between p-2 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-bold">{t('groups') || 'Groups'}</h1>
          <div className="flex gap-1">
            <Button
              onClick={() => setShowJoinByCodeDialog(true)}
              variant="outline"
              size="icon"
              className="h-8 w-8"
            >
              <Key className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="h-8 text-xs px-2"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create
            </Button>
          </div>
        </div>

        <div className="p-2 space-y-3">
          {/* My Groups */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5 px-1">
              <Users className="h-3.5 w-3.5 text-primary" />
              {t('myGroups') || 'My Groups'}
            </h2>
            {loading ? (
              <Card className="p-3 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              </Card>
            ) : myGroups.length === 0 ? (
              <Card className="p-3 text-center">
                <Users className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                <p className="text-[10px] text-muted-foreground">
                  {t('noGroupsYet') || 'You haven\'t joined any groups yet'}
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {myGroups.map((group) => (
                  <Card 
                    key={group.id}
                    className="p-2 hover:shadow-md transition-shadow cursor-pointer border border-border/50"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{group.name}</h3>
                        {group.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                            {group.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-2">
                        {group.frequency}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-1.5">
                      <div className="flex items-center gap-1 text-[10px]">
                        <DollarSign className="h-3 w-3 text-primary" />
                        <span className="font-medium">MK {group.contribution_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px]">
                        <Users className="h-3 w-3 text-primary" />
                        <span>{group.current_members}/{group.max_members}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px]">
                        <Calendar className="h-3 w-3 text-primary" />
                        <span>{new Date(group.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/groups/${group.id}`);
                      }}
                      className="w-full h-7 text-[11px]"
                      size="sm"
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Manage
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Available Groups */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold px-1">{t('availableGroups') || 'Available Groups'}</h2>
            {availableGroups.length === 0 ? (
              <Card className="p-3 text-center">
                <Users className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                <p className="text-[10px] text-muted-foreground">
                  {t('noAvailableGroups') || 'No available groups to join'}
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {availableGroups.map((group) => (
                  <Card 
                    key={group.id}
                    className="p-2 hover:shadow-md transition-shadow border border-border/50"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{group.name}</h3>
                        {group.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                            {group.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-2">
                        {group.frequency}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-1.5">
                      <div className="flex items-center gap-1 text-[10px]">
                        <DollarSign className="h-3 w-3 text-primary" />
                        <span className="font-medium">MK {group.contribution_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px]">
                        <Users className="h-3 w-3 text-primary" />
                        <span>{group.current_members}/{group.max_members}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px]">
                        <Calendar className="h-3 w-3 text-primary" />
                        <span>{new Date(group.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleJoinGroup(group.id)}
                      className="w-full h-7 text-[11px]"
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Join
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <CreateGroupDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            setShowCreateDialog(false);
            if (user) fetchGroups(user.id);
          }}
        />

        <JoinByCodeDialog
          open={showJoinByCodeDialog}
          onOpenChange={setShowJoinByCodeDialog}
          onSuccess={() => {
            setShowJoinByCodeDialog(false);
            if (user) fetchGroups(user.id);
          }}
        />
      </div>
    </div>
  );
};

export default Groups;
