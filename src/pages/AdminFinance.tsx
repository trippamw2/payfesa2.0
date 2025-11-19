import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Wallet, CreditCard, Download } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AdminHeader } from '@/components/admin/AdminHeader';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const AdminFinance = () => {
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
        .channel('finance-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payouts' }, fetchFinancialData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'revenue_transactions' }, fetchFinancialData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchFinancialData)
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
            fetchFinancialData();
            return;
          }
        } catch {}
      }
      toast.error('Admin access required');
      navigate('/admin/login');
      return;
    }

    fetchFinancialData();
  };

  const fetchFinancialData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-admin-analytics');
      if (error) throw error;
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast.error('Failed to load financial analytics');
    } finally {
      setLoading(false);
    }
  };

  const revenueBreakdown = [
    { name: 'Fees', value: analytics?.financial?.totalRevenue || 0 },
    { name: 'Mobile Money Fees', value: (analytics?.financial?.totalPayouts || 0) * 0.022 },
    { name: 'Instant Payout Fees', value: analytics?.overview?.pendingPayouts * 1500 || 0 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        <AdminHeader
          title="Finance Dashboard"
          description="Revenue, payouts, and financial analytics"
          icon={<DollarSign className="h-5 w-5 text-primary" />}
          actions={
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          }
        />

        {/* Financial Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">MWK {(analytics?.financial?.totalRevenue || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Fees earnings</p>
            </CardContent>
          </Card>

          <Card className="border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Payouts</CardTitle>
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <TrendingUp className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">MWK {(analytics?.financial?.totalPayouts || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">To users</p>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Escrow Balance</CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Wallet className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">MWK {(analytics?.financial?.escrowBalance || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Held in escrow</p>
            </CardContent>
          </Card>

          <Card className="border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CreditCard className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">MWK {(analytics?.financial?.netProfit || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">After expenses</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenueBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: MWK ${entry.value.toLocaleString()}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction Volume Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics?.contributionTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" name="Amount (MWK)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Financial Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Payment Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics?.overview?.contributionRate?.toFixed(1) || 0}%</div>
              <p className="text-sm text-muted-foreground mt-2">
                {analytics?.overview?.completedContributions || 0} of {analytics?.overview?.totalContributions || 0} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Transaction Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                MWK {(analytics?.overview?.totalContributionAmount / (analytics?.overview?.totalContributions || 1)).toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Per contribution</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mobile Money Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">MWK {(analytics?.overview?.mobileMoneyVolume || 0).toLocaleString()}</div>
              <p className="text-sm text-muted-foreground mt-2">Total processed</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminFinance;
