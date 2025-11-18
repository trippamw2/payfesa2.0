import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  RefreshCw,
  Calendar,
  CheckCircle2, 
  Clock, 
  XCircle,
  AlertCircle,
  Play,
  DollarSign,
  Users,
  TrendingUp,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface ScheduledPayout {
  id: string;
  user_id: string;
  group_id: string;
  amount: number;
  scheduled_date: string;
  payout_time: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_at: string | null;
  created_at: string;
  users: {
    name: string;
    phone_number: string;
  };
  groups: {
    name: string;
  };
}

interface PayoutStats {
  total_scheduled: number;
  total_pending: number;
  total_completed: number;
  total_failed: number;
  total_amount_pending: number;
  total_amount_completed: number;
}

const AdminScheduledPayouts = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [payouts, setPayouts] = useState<ScheduledPayout[]>([]);
  const [stats, setStats] = useState<PayoutStats>({
    total_scheduled: 0,
    total_pending: 0,
    total_completed: 0,
    total_failed: 0,
    total_amount_pending: 0,
    total_amount_completed: 0,
  });
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      // Setup realtime subscriptions
      const channel = supabase
        .channel('admin-payouts-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payout_schedule' }, fetchPayouts)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payouts' }, fetchPayouts)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const checkAdminAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user is admin
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!role) {
        // Fallback to admin session (from /admin/login)
        const adminSession = sessionStorage.getItem('admin_session');
        if (adminSession) {
          try {
            const session = JSON.parse(adminSession);
            const ageOk = Date.now() - session.timestamp < 24 * 60 * 60 * 1000;
            if (ageOk) {
              setIsAdmin(true);
              await fetchPayouts();
              return;
            }
          } catch {}
        }
        toast.error('Admin access required');
        navigate('/admin/login');
        return;
      }

      setIsAdmin(true);
      await fetchPayouts();
    } catch (error) {
      console.error('Error checking admin:', error);
      toast.error('Failed to verify permissions');
      navigate('/dashboard');
    }
  };

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('payout_schedule')
        .select(`
          *,
          users!payout_schedule_user_id_fkey(name, phone_number),
          rosca_groups!payout_schedule_group_id_fkey(name)
        `)
        .order('scheduled_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPayouts = data as any[];
      setPayouts(formattedPayouts);

      // Calculate stats
      const pending = formattedPayouts.filter(p => p.status === 'pending');
      const completed = formattedPayouts.filter(p => p.status === 'completed');
      const failed = formattedPayouts.filter(p => p.status === 'failed');

      setStats({
        total_scheduled: formattedPayouts.length,
        total_pending: pending.length,
        total_completed: completed.length,
        total_failed: failed.length,
        total_amount_pending: pending.reduce((sum, p) => sum + Number(p.amount), 0),
        total_amount_completed: completed.reduce((sum, p) => sum + Number(p.amount), 0),
      });
    } catch (error) {
      console.error('Error fetching scheduled payouts:', error);
      toast.error('Failed to load scheduled payouts');
    } finally {
      setLoading(false);
    }
  };

  const triggerManualPayout = async () => {
    try {
      setProcessing(true);
      toast.loading('Triggering payout processing...');

      const { data, error } = await supabase.functions.invoke('process-scheduled-payouts', {
        body: { manual_trigger: true }
      });

      if (error) throw error;

      toast.dismiss();
      toast.success(`Batch payout completed! Processed: ${data?.processed || 0}, Failed: ${data?.failed || 0}`);
      await fetchPayouts();
    } catch (error) {
      console.error('Error triggering manual payout:', error);
      toast.dismiss();
      toast.error('Failed to trigger payout processing');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-700"><RefreshCw className="h-3 w-3 mr-1" />Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredPayouts = payouts.filter(payout => {
    if (filter !== 'all' && payout.status !== filter) return false;
    
    if (dateFilter !== 'all') {
      const payoutDate = new Date(payout.scheduled_date);
      const today = new Date();
      
      switch (dateFilter) {
        case 'today':
          return payoutDate.toDateString() === today.toDateString();
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return payoutDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return payoutDate >= monthAgo;
        default:
          return true;
      }
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-7xl">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Scheduled Payouts</h1>
              <p className="text-sm text-muted-foreground">Monitor and manage automated payout processing</p>
            </div>
          </div>
          <Button
            onClick={triggerManualPayout}
            disabled={processing}
            className="gap-2"
          >
            {processing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Trigger Manual Processing
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Scheduled</p>
                <p className="text-2xl font-bold">{stats.total_scheduled}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.total_pending}</p>
                <p className="text-xs text-muted-foreground">MWK {stats.total_amount_pending.toLocaleString()}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.total_completed}</p>
                <p className="text-xs text-muted-foreground">MWK {stats.total_amount_completed.toLocaleString()}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.total_failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Status Filter</label>
              <Tabs value={filter} onValueChange={(v: any) => setFilter(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="failed">Failed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Date Filter</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={fetchPayouts} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </Card>

        {/* Payouts List */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            Scheduled Payouts ({filteredPayouts.length})
          </h2>
          
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No scheduled payouts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayouts.map((payout) => (
                <Card key={payout.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{payout.users?.name || 'Unknown User'}</p>
                          <p className="text-xs text-muted-foreground">{payout.users?.phone_number}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>{payout.groups?.name || 'Unknown Group'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(payout.scheduled_date).toLocaleDateString()} at {payout.payout_time}</span>
                        </div>
                      </div>

                      {payout.processed_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Processed: {new Date(payout.processed_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary mb-2">
                        MWK {payout.amount.toLocaleString()}
                      </p>
                      {getStatusBadge(payout.status)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* Info Card */}
        <Card className="mt-6 p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-blue-900 mb-1">Automated Processing</p>
              <p className="text-blue-700">
                Payouts are automatically processed daily at 17:00 CAT (15:00 UTC). Use the manual trigger button above to process payouts immediately for testing or emergency situations.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminScheduledPayouts;
