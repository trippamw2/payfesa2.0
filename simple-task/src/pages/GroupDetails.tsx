import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Info, Users, Calendar, Coins, MessageCircle, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';
import MembersTab from '@/components/groups/MembersTab';
import PayoutsTab from '@/components/groups/PayoutsTab';
import ContributeTab from '@/components/groups/ContributeTab';
import ChatTab from '@/components/groups/ChatTab';
import AdminTab from '@/components/groups/AdminTab';
import EditGroupDialog from '@/components/groups/EditGroupDialog';

const GroupDetails = () => {
  const { id: groupId } = useParams();
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [searchParams, setSearchParams] = useSearchParams();
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  }, []);

  const fetchGroupDetails = useCallback(async () => {
    if (!groupId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rosca_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      setGroup(data);
    } catch (error) {
      console.error('Error fetching group:', error);
      toast.error('Failed to load group details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [groupId, navigate]);

  useEffect(() => {
    fetchGroupDetails();
    
    // Set up single realtime subscription for group updates
    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rosca_groups',
          filter: `id=eq.${groupId}`,
        } as any,
        (payload) => {
          setGroup(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchGroupDetails]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  }, [setSearchParams]);

  if (loading || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white px-2 py-2 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              className="text-white hover:bg-white/10 h-7 w-7"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-sm font-medium">{group.name}</h1>
              <p className="text-[10px] text-white/70">{group.current_members}/{group.max_members} members</p>
            </div>
            {currentUser?.id === group.creator_id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditDialog(true)}
                className="text-white hover:bg-white/10 h-7 text-[10px]"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <EditGroupDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        group={group}
        onSuccess={fetchGroupDetails}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-6 h-12 rounded-none border-b bg-background w-full">
          <TabsTrigger value="overview" className="flex-col gap-0 py-1 text-[9px] data-[state=active]:text-primary">
            <Info className="h-3.5 w-3.5" />
            <span>Info</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="flex-col gap-0 py-1 text-[9px] data-[state=active]:text-primary">
            <Users className="h-3.5 w-3.5" />
            <span>Members</span>
          </TabsTrigger>
          <TabsTrigger value="payouts" className="flex-col gap-0 py-1 text-[9px] data-[state=active]:text-primary">
            <Calendar className="h-3.5 w-3.5" />
            <span>Payouts</span>
          </TabsTrigger>
          <TabsTrigger value="contribute" className="flex-col gap-0 py-1 text-[9px] data-[state=active]:text-primary">
            <Coins className="h-3.5 w-3.5" />
            <span>Pay</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex-col gap-0 py-1 text-[9px] data-[state=active]:text-primary">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Chat</span>
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex-col gap-0 py-1 text-[9px] data-[state=active]:text-primary">
            <Settings className="h-3.5 w-3.5" />
            <span>Admin</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="overview" className="mt-0 p-2 space-y-2">
            <Card className="p-2 bg-gradient-to-br from-primary/5 to-secondary/5 border-border/50">
              <div className="space-y-1">
                <h3 className="text-[10px] font-semibold">Group Balance</h3>
                <p className="text-2xl font-bold text-secondary">
                  MWK {group.escrow_balance?.toLocaleString() || 0}
                </p>
                <p className="text-[9px] text-muted-foreground">Available in escrow</p>
              </div>
            </Card>

            <Card className="p-2 border-border/50">
              <h3 className="text-[10px] font-semibold mb-2">Contribution Details</h3>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <p className="text-[9px] text-muted-foreground">Amount</p>
                  <p className="font-semibold">MWK {group.contribution_amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Frequency</p>
                  <p className="font-semibold capitalize">{group.frequency}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Platform Fee</p>
                  <p className="font-semibold">11%</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Start Date</p>
                  <p className="font-semibold">{new Date(group.start_date).toLocaleDateString()}</p>
                </div>
              </div>
            </Card>

            {group.description && (
              <Card className="p-2 border-border/50">
                <h3 className="text-[10px] font-semibold mb-1">Description</h3>
                <p className="text-[10px] text-muted-foreground">{group.description}</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="members" className="mt-0">
            {currentUser && (
              <MembersTab 
                groupId={groupId!} 
                currentUserId={currentUser.id}
                groupCode={group.group_code}
                groupName={group.name}
                inviterName={currentUser.email || 'User'}
              />
            )}
          </TabsContent>

          <TabsContent value="payouts" className="mt-0">
            {currentUser && <PayoutsTab groupId={groupId!} currentUserId={currentUser.id} />}
          </TabsContent>

          <TabsContent value="contribute" className="mt-0">
            {currentUser && (
              <ContributeTab 
                groupId={groupId!} 
                contributionAmount={group.contribution_amount}
                groupName={group.name}
                currentUserId={currentUser.id}
              />
            )}
          </TabsContent>

          <TabsContent value="chat" className="mt-0">
            {currentUser && <ChatTab groupId={groupId!} currentUserId={currentUser.id} />}
          </TabsContent>

          <TabsContent value="admin" className="mt-0">
            {currentUser && (
              <AdminTab 
                groupId={groupId!}
                groupData={group}
                currentUserId={currentUser.id}
                isCreator={group.created_by === currentUser.id}
              />
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default GroupDetails;
