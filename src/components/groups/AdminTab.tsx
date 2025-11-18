import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, UserX, Trash2, DollarSign, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  groupId: string;
  groupData: any;
  currentUserId: string;
  isCreator: boolean;
}

const AdminTab = ({ groupId, groupData, currentUserId, isCreator }: Props) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isCreator) {
      fetchMembers();
      
      let timeoutId: NodeJS.Timeout;
      const debouncedFetch = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          fetchMembers();
        }, 300);
      };
      
      // Subscribe to realtime changes with debouncing
      const channel = supabase
        .channel(`admin-members-${groupId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` },
          debouncedFetch
        )
        .subscribe();

      return () => {
        clearTimeout(timeoutId);
        supabase.removeChannel(channel);
      };
    }
  }, [groupId, isCreator]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId);

      if (error) throw error;

      if (!data) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Fetch users separately
      const userIds = data.map(m => m.user_id);
      const { data: profilesData } = await supabase
        .from('users')
        .select('id, name, phone_number')
        .in('id', userIds);

      // Merge profiles with members
      const membersWithProfiles = data.map(member => ({
        ...member,
        profiles: profilesData?.find(p => p.id === member.user_id) || { name: 'Unknown', phone_number: '' }
      }));

      setMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('user_id', memberId)
        .eq('group_id', groupId);

      if (error) throw error;

      toast.success(`${userName} removed from group`);
      fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const deleteGroup = async () => {
    try {
      const { error } = await supabase
        .from('rosca_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast.success('Group deleted successfully');
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  if (!isCreator) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <Card className="p-6 text-center border border-border/50">
          <Shield className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Only group creators can access admin controls
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      {/* Group Info */}
      <Card className="p-4 border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Group Management</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Group Code:</span>
            <Badge variant="outline">{groupData?.group_code || 'N/A'}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Escrow Balance:</span>
            <span className="font-semibold">MWK {(groupData?.escrow_balance || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <Badge>{groupData?.status || 'unknown'}</Badge>
          </div>
        </div>
      </Card>

      {/* Member Management */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold px-1">Manage Members</h3>
        {members.map((member) => {
          const profile = member.profiles as any;
          const isCurrentUserMember = member.user_id === currentUserId;

          return (
            <Card key={member.user_id} className="p-3 border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">
                    {profile?.name}
                    {isCurrentUserMember && <span className="text-xs text-muted-foreground ml-1">(You)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{profile?.phone_number}</p>
                </div>

                {!isCurrentUserMember && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <UserX className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Member</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove {profile?.name} from this group? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeMember(member.id, profile?.name)}>
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Danger Zone */}
      <Card className="p-4 border-destructive/20 bg-destructive/5">
        <div className="flex items-center gap-2 mb-3">
          <Trash2 className="h-4 w-4 text-destructive" />
          <h3 className="font-semibold text-sm text-destructive">Danger Zone</h3>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Group
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Group</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this group? All data including members, contributions, and messages will be permanently removed. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteGroup} className="bg-destructive text-destructive-foreground">
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
};

export default AdminTab;
