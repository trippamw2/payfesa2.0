import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, Users, Briefcase, TrendingUp, DollarSign, 
  Award, AlertCircle, CheckCircle2, Clock, XCircle,
  Activity, MessageSquare, Wallet, BarChart3, Download, FileText, Calendar, Key, Shield, AlertTriangle, Bot
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
  const { goBack } = useBackNavigation();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      // Setup realtime subscriptions for live updates
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
      
      // Check if user is logged in and has admin role
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
      
      // If not authenticated via regular auth, check for admin session
      // This allows admins who logged in via /admin/login to access the dashboard
      const adminSessionCheck = sessionStorage.getItem('admin_session');
      if (adminSessionCheck) {
        try {
          const adminData = JSON.parse(adminSessionCheck);
          // Verify the admin session is recent (within last 24 hours)
          const sessionAge = Date.now() - adminData.timestamp;
          if (sessionAge < 24 * 60 * 60 * 1000) {
            setIsAdmin(true);
            fetchAnalytics();
            return;
          }
        } catch (e) {
          console.error('Invalid admin session data');
        }
      }
      
      // No valid admin access found
      toast.error('Admin access required');
      navigate('/admin/login');
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/admin/login');
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-admin-analytics', {
        body: {}
      });

      if (error) throw error;
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: string, format: 'csv' | 'pdf') => {
    try {
      toast.loading('Generating export...');
      
      switch (type) {
        case 'analytics':
          if (analytics) {
            exportAnalyticsReport(analytics, format);
          }
          break;
        case 'contributions':
          await exportContributionHistory(supabase, format);
          break;
        case 'payouts':
          await exportPayoutRecords(supabase, format);
          break;
        case 'trust-scores':
          await exportTrustScores(supabase, format);
          break;
      }
      
      toast.dismiss();
      toast.success(`${type} exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.dismiss();
      toast.error('Failed to export data');
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  const trustScoreData = [
    { name: 'Excellent (90+)', value: analytics.trustScoreDistribution.excellent, color: '#10b981' },
    { name: 'Good (70-89)', value: analytics.trustScoreDistribution.good, color: '#3b82f6' },
    { name: 'Fair (50-69)', value: analytics.trustScoreDistribution.fair, color: '#f59e0b' },
    { name: 'Poor (<50)', value: analytics.trustScoreDistribution.poor, color: '#ef4444' },
  ];

  const contributionStatusData = [
    { name: 'Completed', value: analytics.contributions.completed, color: '#10b981' },
    { name: 'Pending', value: analytics.contributions.pending, color: '#f59e0b' },
    { name: 'Failed', value: analytics.contributions.failed, color: '#ef4444' },
  ];

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={goBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-destructive hover:text-destructive"
            >
              Logout
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Analytics Report</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport('analytics', 'csv')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('analytics', 'pdf')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Contribution History</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport('contributions', 'csv')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('contributions', 'pdf')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Payout Records</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport('payouts', 'csv')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('payouts', 'pdf')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Trust Scores</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport('trust-scores', 'csv')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('trust-scores', 'pdf')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/scheduled-payouts')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Scheduled Payouts
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/users')}
            >
              <Users className="mr-2 h-4 w-4" />
              User Management
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/paychangu-settings')}
            >
              <Key className="mr-2 h-4 w-4" />
              PayChangu Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/disputes')}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Payment Disputes
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/reserve')}
            >
              <Shield className="mr-2 h-4 w-4" />
              Reserve Wallet
            </Button>
            <Button
              variant="default"
              onClick={() => navigate('/admin/ai-automation')}
            >
              <Bot className="mr-2 h-4 w-4" />
              AI Automation
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">System analytics and insights</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-7 mb-6">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-border/50"
          onClick={() => navigate('/admin/marketing')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-semibold">Marketing</h3>
              <p className="text-sm text-muted-foreground">User acquisition</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-border/50"
          onClick={() => navigate('/admin/finance')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <DollarSign className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-semibold">Finance</h3>
              <p className="text-sm text-muted-foreground">Revenue & payouts</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-border/50"
          onClick={() => navigate('/admin/reserve')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-semibold">Reserve Wallet</h3>
              <p className="text-sm text-muted-foreground">Payout guarantee</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-border/50"
          onClick={() => navigate('/admin/operations')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <Activity className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-semibold">Operations</h3>
              <p className="text-sm text-muted-foreground">System health</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-border/50"
          onClick={() => navigate('/admin/scheduled-payouts')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-semibold">Payouts</h3>
              <p className="text-sm text-muted-foreground">Payout schedule</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-border/50"
          onClick={() => navigate('/admin/users')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-semibold">Users</h3>
              <p className="text-sm text-muted-foreground">User management</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-primary/20 bg-primary/5"
          onClick={() => navigate('/admin/ai-automation')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <Bot className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-semibold">AI Automation</h3>
              <p className="text-sm text-muted-foreground">Fraud & decisions</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-border/50"
          onClick={() => navigate('/admin/paychangu-settings')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <Key className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm font-medium">Payment Gateway</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-border/50"
          onClick={() => navigate('/admin/disputes')}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-sm font-medium">Disputes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Users */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <Badge variant="secondary">{analytics.overview.totalUsers}</Badge>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">Total Users</h3>
          <p className="text-2xl font-bold">{analytics.overview.totalUsers.toLocaleString()}</p>
        </Card>

        {/* Active Groups */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Briefcase className="h-5 w-5 text-green-600" />
            <Badge variant="secondary">{analytics.overview.activeGroups}/{analytics.overview.totalGroups}</Badge>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">Active Groups</h3>
          <p className="text-2xl font-bold">{analytics.overview.activeGroups.toLocaleString()}</p>
        </Card>

        {/* Contribution Rate */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <Badge className="bg-purple-100 text-purple-700">{analytics.overview.contributionRate}%</Badge>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">Success Rate</h3>
          <p className="text-2xl font-bold">{analytics.overview.contributionRate}%</p>
        </Card>

        {/* Fees Revenue */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
...
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">Fees Revenue</h3>
          <p className="text-2xl font-bold">MWK {analytics.overview.totalFeesRevenue.toLocaleString()}</p>
        </Card>
      </div>

      {/* Financial Overview */}
      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Financial Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Contributions</p>
            <p className="text-2xl font-bold text-green-700">
              MWK {analytics.overview.totalContributionAmount.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.overview.completedContributions} completed
            </p>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Total Payouts</p>
            <p className="text-2xl font-bold text-blue-700">
              MWK {analytics.overview.totalPayoutAmount.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.overview.completedPayouts} completed
            </p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Escrow Balance</p>
            <p className="text-2xl font-bold text-purple-700">
              MWK {analytics.overview.totalEscrowBalance.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Held in groups
            </p>
          </div>
        </div>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Contribution Trend */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Contribution Trend (30 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={analytics.contributionTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number) => [value, 'Contributions']}
              />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} name="Contributions" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Trust Score Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Trust Score Distribution</h3>
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
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Contribution Status & Late Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Contribution Status */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Contribution Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">Completed</span>
              </div>
              <span className="font-bold text-green-700">{analytics.contributions.completed}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="font-medium">Pending</span>
              </div>
              <span className="font-bold text-yellow-700">{analytics.contributions.pending}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium">Failed</span>
              </div>
              <span className="font-bold text-red-700">{analytics.contributions.failed}</span>
            </div>
          </div>
        </Card>

        {/* Late Payment Statistics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Payment Issues</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <span className="font-medium">Late Contributions</span>
              </div>
              <span className="font-bold text-orange-700">{analytics.contributions.late}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium">Missed Contributions</span>
              </div>
              <span className="font-bold text-red-700">{analytics.contributions.missed}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Avg Trust Score</span>
              </div>
              <span className="font-bold text-blue-700">{analytics.overview.averageTrustScore}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* System Health */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Health (Last 24h)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Messages Sent</p>
              <p className="text-2xl font-bold text-blue-700">{analytics.systemHealth.messagesLast24h}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <Briefcase className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Active Groups</p>
              <p className="text-2xl font-bold text-green-700">{analytics.systemHealth.activeGroups}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-sm text-muted-foreground">Pending Payouts</p>
              <p className="text-2xl font-bold text-yellow-700">{analytics.systemHealth.pendingPayouts}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
