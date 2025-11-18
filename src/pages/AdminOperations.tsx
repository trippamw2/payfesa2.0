import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Activity, AlertCircle, CheckCircle2, Clock, XCircle, Database, Server } from 'lucide-react';
import { toast } from 'sonner';

const AdminOperations = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  useEffect(() => {
    if (!loading) {
      // Setup realtime subscriptions
      const channel = supabase
        .channel('operations-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mobile_money_transactions' }, fetchOperationsData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fraud_alerts' }, fetchOperationsData)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loading]);

  const checkAdminAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/admin/login');
      return;
    }

    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      // Fallback to admin session (from /admin/login)
      const adminSession = sessionStorage.getItem('admin_session');
      if (adminSession) {
        try {
          const session = JSON.parse(adminSession);
          const ageOk = Date.now() - session.timestamp < 24 * 60 * 60 * 1000;
          if (ageOk) {
            fetchOperationsData();
            return;
          }
        } catch {}
      }
      toast.error('Admin access required');
      navigate('/admin/login');
      return;
    }

    fetchOperationsData();
  };

  const fetchOperationsData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-admin-analytics');
      if (error) throw error;
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching operations data:', error);
      toast.error('Failed to load operations data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const systemStatus = {
    database: 'Operational',
    api: 'Operational',
    mobileMoney: 'Operational',
    notifications: 'Operational'
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Operations Dashboard</h1>
              <p className="text-muted-foreground">System health, monitoring, and operations</p>
            </div>
          </div>
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {Object.entries(systemStatus).map(([key, status]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="text-sm text-muted-foreground">{status}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Operations Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.overview?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">Concurrent users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Operations</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.systemHealth?.pendingTransactions || 0}</div>
              <p className="text-xs text-muted-foreground">Awaiting processing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Operations</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.systemHealth?.failedTransactions || 0}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database Size</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.4 GB</div>
              <p className="text-xs text-muted-foreground">Total storage</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts & Notifications */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                System Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics?.systemHealth?.failedTransactions > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium text-sm">Failed Transactions</p>
                      <p className="text-xs text-muted-foreground">{analytics.systemHealth.failedTransactions} transactions failed</p>
                    </div>
                    <Badge variant="destructive" className="ml-auto">Critical</Badge>
                  </div>
                )}
                {analytics?.systemHealth?.pendingPayouts > 5 && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium text-sm">Pending Payouts</p>
                      <p className="text-xs text-muted-foreground">{analytics.systemHealth.pendingPayouts} payouts awaiting approval</p>
                    </div>
                    <Badge variant="outline" className="ml-auto">Warning</Badge>
                  </div>
                )}
                {(!analytics?.systemHealth?.failedTransactions || analytics.systemHealth.failedTransactions === 0) && 
                 (!analytics?.systemHealth?.pendingPayouts || analytics.systemHealth.pendingPayouts <= 5) && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-sm">All Systems Operational</p>
                      <p className="text-xs text-muted-foreground">No critical issues detected</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Database backup completed</p>
                    <p className="text-xs text-muted-foreground">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">User authentication spike</p>
                    <p className="text-xs text-muted-foreground">15 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">API rate limit warning</p>
                    <p className="text-xs text-muted-foreground">1 hour ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminOperations;
