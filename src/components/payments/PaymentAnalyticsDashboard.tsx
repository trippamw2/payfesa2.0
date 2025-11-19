import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, DollarSign, Activity, CreditCard, AlertCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface PaymentStats {
  totalTransactions: number;
  totalAmount: number;
  successRate: number;
  averageAmount: number;
  trend: 'up' | 'down';
  trendPercentage: number;
}

interface ChartData {
  date: string;
  amount: number;
  count: number;
}

export function PaymentAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const days = parseInt(timeframe.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch transactions
      const { data: transactions, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Calculate stats
      const total = transactions?.length || 0;
      const totalAmount = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const successful = transactions?.filter(t => t.status === 'completed').length || 0;
      const successRate = total > 0 ? (successful / total) * 100 : 0;

      // Calculate trend (compare with previous period)
      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - days);

      const { data: previousTransactions } = await supabase
        .from('payment_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      const previousTotal = previousTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const trendPercentage = previousTotal > 0 ? ((totalAmount - previousTotal) / previousTotal) * 100 : 0;

      setStats({
        totalTransactions: total,
        totalAmount,
        successRate,
        averageAmount: total > 0 ? totalAmount / total : 0,
        trend: trendPercentage >= 0 ? 'up' : 'down',
        trendPercentage: Math.abs(trendPercentage),
      });

      // Process chart data (group by date)
      const grouped = transactions?.reduce((acc: any, t) => {
        const date = new Date(t.created_at).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = { date, amount: 0, count: 0 };
        }
        acc[date].amount += Number(t.amount);
        acc[date].count += 1;
        return acc;
      }, {});

      setChartData(Object.values(grouped || {}));

      // Type distribution
      const typeGroups = transactions?.reduce((acc: any, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      }, {});

      setTypeDistribution(
        Object.entries(typeGroups || {}).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
        }))
      );
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Analytics</h2>
          <p className="text-muted-foreground">Track your payment performance</p>
        </div>
        <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
          <TabsList>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">MWK {stats?.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {stats?.trend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span className={stats?.trend === 'up' ? 'text-success' : 'text-destructive'}>
                {stats?.trendPercentage.toFixed(1)}%
              </span>
              vs previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTransactions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: MWK {stats?.averageAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalTransactions} total attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">MWK {stats?.averageAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Volume</CardTitle>
            <CardDescription>Daily transaction amounts over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} name="Amount (MWK)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Count</CardTitle>
            <CardDescription>Number of transactions per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" name="Transactions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Transaction Type Distribution</CardTitle>
            <CardDescription>Breakdown by transaction type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
