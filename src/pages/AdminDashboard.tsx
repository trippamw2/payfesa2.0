import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, TrendingUp, DollarSign, Shield, AlertTriangle, Bot,
  Activity, BarChart3, Settings, LogOut, Download, FileText,
  Calendar, Key, Briefcase, PieChart as PieChartIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  exportAnalyticsReport,
  exportContributionHistory,
  exportPayoutRecords,
  exportTrustScores,
} from '@/lib/exportUtils';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalGroups: number;
    activeGroups: number;
    totalContributions: number;
    completedContributions: number;
    contributionRate: number;
    totalContributionAmount: number;
    totalPayouts: number;
    completedPayouts: number;
    pendingPayouts: number;
    totalFeesRevenue: number;
    totalPayoutAmount: number;
    averageTrustScore: number;
    totalEscrowBalance: number;
  };
  contributions: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    late: number;
    missed: number;
  };
  trustScoreDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  contributionTrend: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
  systemHealth: {
    messagesLast24h: number;
    activeGroups: number;
    pendingPayouts: number;
  };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      const channel = supabase
        .channel('admin-dashboard-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchAnalytics)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contributions' }, fetchAnalytics)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payouts' }, fetchAnalytics)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rosca_groups' }, fetchAnalytics)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (adminRole) {
          setIsAdmin(true);
          fetchAnalytics();
          return;
        }
      }
      
      const adminSessionToken = sessionStorage.getItem('admin_session');
      if (adminSessionToken) {
        setIsAdmin(true);
        fetchAnalytics();
        return;
      }
      
      toast.error('Unauthorized access');
      navigate('/admin/login');
    } catch (error) {
      console.error('Admin access check failed:', error);
      navigate('/admin/login');
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-admin-analytics');
      
      if (error) throw error;
      if (data) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: string, format: string) => {
    try {
      toast.loading(`Generating ${type} ${format.toUpperCase()}...`);
      
      if (!analytics) return;

      switch (type) {
        case 'analytics':
          if (format === 'csv') exportAnalyticsReport(analytics.overview, 'csv');
          else exportAnalyticsReport(analytics.overview, 'pdf');
          break;
        case 'contributions':
          const { data: contributions } = await supabase
            .from('contributions')
            .select('*');
          if (contributions) {
            if (format === 'csv') exportContributionHistory(contributions, 'csv');
            else exportContributionHistory(contributions, 'pdf');
          }
          break;
        case 'payouts':
          const { data: payouts } = await supabase.from('payouts').select('*');
          if (payouts) {
            if (format === 'csv') exportPayoutRecords(payouts, 'csv');
            else exportPayoutRecords(payouts, 'pdf');
          }
          break;
        case 'trust-scores':
          const { data: scores } = await supabase.from('credit_scores').select('*');
          if (scores) {
            if (format === 'csv') exportTrustScores(scores, 'csv');
            else exportTrustScores(scores, 'pdf');
          }
          break;
      }

      toast.dismiss();
      toast.success(`${type} exported successfully`);
    } catch (error) {
      toast.dismiss();
      toast.error('Export failed');
      console.error('Export error:', error);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_session');
    toast.success('Logged out successfully');
    navigate('/admin/login');
  };

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-full mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const COLORS = ['hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

  const trustScoreData = [
    { name: 'Excellent', value: analytics.trustScoreDistribution.excellent, color: 'hsl(var(--success))' },
    { name: 'Good', value: analytics.trustScoreDistribution.good, color: 'hsl(var(--info))' },
    { name: 'Fair', value: analytics.trustScoreDistribution.fair, color: 'hsl(var(--warning))' },
    { name: 'Poor', value: analytics.trustScoreDistribution.poor, color: 'hsl(var(--destructive))' },
  ];

  const contributionStatusData = [
    { name: 'Completed', value: analytics.contributions.completed, color: 'hsl(var(--success))' },
    { name: 'Pending', value: analytics.contributions.pending, color: 'hsl(var(--warning))' },
    { name: 'Failed', value: analytics.contributions.failed, color: 'hsl(var(--destructive))' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-lg">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">🛡️ Admin Panel</h1>
                <p className="text-xs text-muted-foreground">System Control</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Reports</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleExport('analytics', 'csv')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Analytics CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('analytics', 'pdf')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Analytics PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('contributions', 'csv')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Contributions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('payouts', 'csv')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Payouts
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('trust-scores', 'csv')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Trust Scores
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-success" />
                <span className="text-xs font-medium">Total Users</span>
              </div>
              <p className="text-2xl font-bold">{analytics.overview.totalUsers.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="h-4 w-4 text-info" />
                <span className="text-xs font-medium">Active Groups</span>
              </div>
              <p className="text-2xl font-bold">{analytics.overview.activeGroups}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-warning" />
                <span className="text-xs font-medium">Contributions</span>
              </div>
              <p className="text-2xl font-bold">MK {(analytics.overview.totalContributionAmount / 1000).toFixed(1)}K</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Revenue</span>
              </div>
              <p className="text-2xl font-bold">MK {(analytics.overview.totalFeesRevenue / 1000).toFixed(1)}K</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="finance">
              <DollarSign className="h-4 w-4 mr-2" />
              Finance
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="operations">
              <Activity className="h-4 w-4 mr-2" />
              Operations
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Bot className="h-4 w-4 mr-2" />
              AI
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">📊 Trust Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={trustScoreData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {trustScoreData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">📈 Contribution Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={contributionStatusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Navigation Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/marketing')}>
                <CardContent className="p-4">
                  <TrendingUp className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold text-sm">📢 Marketing</h3>
                  <p className="text-xs text-muted-foreground">Campaigns</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/finance')}>
                <CardContent className="p-4">
                  <DollarSign className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold text-sm">💰 Finance</h3>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/operations')}>
                <CardContent className="p-4">
                  <Activity className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold text-sm">⚙️ Operations</h3>
                  <p className="text-xs text-muted-foreground">System</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/ai-automation')}>
                <CardContent className="p-4">
                  <Bot className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold text-sm">🤖 AI Automation</h3>
                  <p className="text-xs text-muted-foreground">Smart Tools</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/users')}>
                <CardContent className="p-4">
                  <Users className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold text-sm">👥 Users</h3>
                  <p className="text-xs text-muted-foreground">Management</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/payouts')}>
                <CardContent className="p-4">
                  <DollarSign className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold text-sm">💸 Payouts</h3>
                  <p className="text-xs text-muted-foreground">Approvals</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/disputes')}>
                <CardContent className="p-4">
                  <AlertTriangle className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold text-sm">⚠️ Disputes</h3>
                  <p className="text-xs text-muted-foreground">Resolution</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/reserve')}>
                <CardContent className="p-4">
                  <Shield className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold text-sm">🛡️ Reserve</h3>
                  <p className="text-xs text-muted-foreground">Wallet</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Finance Tab */}
          <TabsContent value="finance" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Revenue Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                    <span className="font-semibold">MK {analytics.overview.totalFeesRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Payouts</span>
                    <span className="font-semibold">MK {analytics.overview.totalPayoutAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Escrow Balance</span>
                    <span className="font-semibold">MK {analytics.overview.totalEscrowBalance.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Payout Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <Badge variant="default">{analytics.overview.completedPayouts}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <Badge variant="secondary">{analytics.overview.pendingPayouts}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <Badge variant="outline">{analytics.overview.totalPayouts}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Button onClick={() => navigate('/admin/finance')} className="w-full">
              View Full Finance Dashboard
            </Button>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">User Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Users</span>
                  <span className="font-semibold">{analytics.overview.totalUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Trust Score</span>
                  <span className="font-semibold">{analytics.overview.averageTrustScore.toFixed(0)}</span>
                </div>
              </CardContent>
            </Card>
            <Button onClick={() => navigate('/admin/users')} className="w-full">
              Manage Users
            </Button>
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">System Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Groups</span>
                  <Badge variant="default">{analytics.systemHealth.activeGroups}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Messages (24h)</span>
                  <Badge variant="secondary">{analytics.systemHealth.messagesLast24h}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pending Payouts</span>
                  <Badge variant="outline">{analytics.systemHealth.pendingPayouts}</Badge>
                </div>
              </CardContent>
            </Card>
            <Button onClick={() => navigate('/admin/operations')} className="w-full">
              View Operations
            </Button>
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="space-y-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  AI Automation Center
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage AI-powered fraud detection, risk scoring, and automated decisions
                </p>
                <Button onClick={() => navigate('/admin/ai-automation')} className="w-full">
                  Access AI Tools
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/paychangu-settings')}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Key className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold text-sm">🔑 PayChangu</h3>
                    <p className="text-xs text-muted-foreground">API Configuration</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/scheduled-payouts')}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Calendar className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold text-sm">📅 Schedules</h3>
                    <p className="text-xs text-muted-foreground">Payout Schedule</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
