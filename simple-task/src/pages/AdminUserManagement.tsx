import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, Search, Shield, Lock, UserX, UserCheck, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { exportUserList } from '@/lib/exportUtils';

interface UserProfile {
  id: string;
  name: string;
  phone_number: string;
  trust_score: number;
  created_at: string;
  language: string;
  roles?: string[];
  banned?: boolean;
}

const AdminUserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: string; title: string; description: string }>({ open: false, action: '', title: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      
      // Setup realtime subscription
      const channel = supabase
        .channel('admin-users-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUsers)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, fetchUsers)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, roleFilter, users]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasAdminRole = roles?.some(r => r.role === 'admin');
    if (!hasAdminRole) {
      // Fallback to admin session (from /admin/login)
      const adminSession = sessionStorage.getItem('admin_session');
      if (adminSession) {
        try {
          const session = JSON.parse(adminSession);
          const ageOk = Date.now() - session.timestamp < 24 * 60 * 60 * 1000;
          if (ageOk) {
            setIsAdmin(true);
            return;
          }
        } catch {}
      }
      toast.error('Admin access required');
      navigate('/admin/login');
      return;
    }

    setIsAdmin(true);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all users
      const { data: profiles, error: profilesError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for all users
      const { data: allRoles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Fetch auth users to check ban status
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();

      // Combine profiles with roles and ban status
      const usersWithRoles = profiles?.map(profile => {
        const authUser = authUsers?.find((u: any) => u.id === profile.id);
        // Check if user has a ban_duration set (banned)
        const isBanned = authUser ? (authUser as any).banned_until !== undefined && (authUser as any).banned_until !== null : false;
        
        return {
          ...profile,
          roles: allRoles?.filter(r => r.user_id === profile.id).map(r => r.role) || [],
          banned: isBanned
        };
      });

      setUsers(usersWithRoles || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone_number.includes(searchQuery)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      if (roleFilter === 'banned') {
        filtered = filtered.filter(user => user.banned);
      } else {
        filtered = filtered.filter(user => user.roles?.includes(roleFilter));
      }
    }

    setFilteredUsers(filtered);
  };

  const handleAction = async (action: string) => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: { action, user_id: selectedUser.id, data: {} }
      });

      if (error) throw error;

      toast.success(data.message);
      fetchUsers();
    } catch (error: any) {
      console.error(`Error performing ${action}:`, error);
      toast.error(error.message || `Failed to ${action.replace('_', ' ')}`);
    } finally {
      setLoading(false);
      setActionDialog({ open: false, action: '', title: '', description: '' });
      setSelectedUser(null);
    }
  };

  const handleRoleChange = async (userId: string, role: string, remove: boolean) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: { 
          action: 'update_role', 
          user_id: userId, 
          data: { role, remove } 
        }
      });

      if (error) throw error;

      toast.success(data.message);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const openActionDialog = (user: UserProfile, action: string, title: string, description: string) => {
    setSelectedUser(user);
    setActionDialog({ open: true, action, title, description });
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    try {
      exportUserList(filteredUsers, format);
      toast.success(`User list exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export user list');
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-muted-foreground">Manage users, roles, and permissions</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Users
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="moderator">Moderators</SelectItem>
                  <SelectItem value="user">Regular Users</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <div className="grid gap-4">
          {loading && filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading users...</p>
              </CardContent>
            </Card>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No users found</p>
              </CardContent>
            </Card>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {user.name}
                        {user.banned && <Badge variant="destructive">Banned</Badge>}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{user.phone_number}</p>
                        <p>Trust Score: {user.trust_score}/100</p>
                        <p>Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {user.roles?.map(role => (
                          <Badge key={role} variant={role === 'admin' ? 'default' : 'secondary'}>
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {user.banned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog(user, 'unsuspend_user', 'Unsuspend User', `Are you sure you want to unsuspend ${user.name}?`)}
                          disabled={loading}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Unsuspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openActionDialog(user, 'suspend_user', 'Suspend User', `Are you sure you want to suspend ${user.name}? They will not be able to access their account.`)}
                          disabled={loading}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Suspend
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openActionDialog(user, 'reset_pin', 'Reset PIN', `Reset PIN for ${user.name} to 1234?`)}
                        disabled={loading}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Reset PIN
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRoleChange(user.id, 'admin', user.roles?.includes('admin') || false)}
                          disabled={loading}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          {user.roles?.includes('admin') ? 'Remove' : 'Make'} Admin
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        {/* Action Confirmation Dialog */}
        <AlertDialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{actionDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{actionDialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleAction(actionDialog.action)} disabled={loading}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AdminUserManagement;
