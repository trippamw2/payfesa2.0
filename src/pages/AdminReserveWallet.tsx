import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shield, TrendingUp, TrendingDown, AlertTriangle, Plus, Minus, Download, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useReserveWalletRealtime } from '@/hooks/useReserveWalletRealtime';
import { AdminHeader } from '@/components/admin/AdminHeader';

interface ReserveWallet {
  id: string;
  total_amount: number;
  updated_at: string;
}

interface ReserveTransaction {
  id: string;
  type: string;
  amount: number;
  group_id: string | null;
  user_id: string | null;
  reason: string | null;
  timestamp: string;
}

interface GroupUsage {
  group_id: string;
  group_name: string;
  total_covered: number;
  coverage_count: number;
}

const AdminReserveWallet = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reserveWallet, setReserveWallet] = useState<ReserveWallet | null>(null);
  const [transactions, setTransactions] = useState<ReserveTransaction[]>([]);
  const [groupUsage, setGroupUsage] = useState<GroupUsage[]>([]);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'credit' | 'debit'>('credit');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  // Realtime subscription using custom hook
  useReserveWalletRealtime(() => {
    if (!loading) {
      fetchReserveData();
    }
  });

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
      const adminSession = sessionStorage.getItem('admin_session');
      if (adminSession) {
        try {
          const session = JSON.parse(adminSession);
          const ageOk = Date.now() - session.timestamp < 24 * 60 * 60 * 1000;
          if (ageOk) {
            fetchReserveData();
            return;
          }
        } catch {}
      }
      toast.error('Admin access required');
      navigate('/admin/login');
      return;
    }

    fetchReserveData();
  };

  const fetchReserveData = async () => {
    try {
      // Fetch reserve wallet
      const { data: wallet, error: walletError } = await supabase
        .from('reserve_wallet')
        .select('*')
        .maybeSingle();

      if (walletError) {
        console.error('Error fetching reserve wallet:', walletError);
        toast.error('Failed to load reserve wallet');
        return;
      }
      
      if (!wallet) {
        // No reserve wallet exists yet - this is okay, show empty state
        setReserveWallet(null);
      } else {
        setReserveWallet(wallet);
      }

      // Fetch transactions (last 100)
      const { data: txns, error: txnsError } = await supabase
        .from('reserve_transactions')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (txnsError) throw txnsError;
      setTransactions(txns || []);

      // Calculate group-level usage
      const { data: coverages, error: coverageError } = await supabase
        .from('reserve_transactions')
        .select('group_id, amount, rosca_groups(name)')
        .eq('type', 'reserve_out')
        .not('group_id', 'is', null);

      if (coverageError) throw coverageError;

      // Aggregate by group
      const groupMap = new Map<string, GroupUsage>();
      coverages?.forEach((c: any) => {
        const gid = c.group_id;
        if (!gid) return;
        if (!groupMap.has(gid)) {
          groupMap.set(gid, {
            group_id: gid,
            group_name: c.rosca_groups?.name || 'Unknown Group',
            total_covered: 0,
            coverage_count: 0,
          });
        }
        const g = groupMap.get(gid)!;
        g.total_covered += c.amount;
        g.coverage_count += 1;
      });

      setGroupUsage(Array.from(groupMap.values()).sort((a, b) => b.total_covered - a.total_covered));
    } catch (error) {
      console.error('Error fetching reserve data:', error);
      toast.error('Failed to load reserve data');
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdjustment = async () => {
    if (!adjustmentAmount || parseFloat(adjustmentAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!adjustmentReason.trim()) {
      toast.error('Please provide a reason for adjustment');
      return;
    }

    setSubmitting(true);
    try {
      const amount = parseFloat(adjustmentAmount);
      const finalAmount = adjustmentType === 'credit' ? amount : -amount;

      const { error } = await supabase.rpc('add_to_reserve_wallet', {
        p_amount: finalAmount,
        p_group_id: null,
        p_user_id: null,
        p_reason: `Manual ${adjustmentType}: ${adjustmentReason}`,
      });

      if (error) throw error;

      toast.success(`Reserve ${adjustmentType === 'credit' ? 'credited' : 'debited'} successfully`);
      setAdjustmentOpen(false);
      setAdjustmentAmount('');
      setAdjustmentReason('');
      fetchReserveData();
    } catch (error) {
      console.error('Error adjusting reserve:', error);
      toast.error('Failed to adjust reserve');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateThresholdPercentage = () => {
    if (!reserveWallet) return 100;
    // Assuming safety threshold based on recent outflows
    const recentOutflows = transactions
      .filter(t => t.type === 'reserve_out')
      .slice(0, 10)
      .reduce((sum, t) => sum + t.amount, 0);
    const avgOutflow = recentOutflows / 10 || 1000;
    const safetyLevel = avgOutflow * 5; // 5x average outflow
    return (reserveWallet.total_amount / safetyLevel) * 100;
  };

  const thresholdPct = calculateThresholdPercentage();
  const isLowReserve = thresholdPct < 20;

  // Chart data
  const activityData = transactions.slice(0, 30).reverse().map(t => ({
    date: new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    reserve_in: t.type === 'reserve_in' ? t.amount : 0,
    reserve_out: t.type === 'reserve_out' ? t.amount : 0,
  }));

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
          title="Reserve Wallet"
          description="Manage reserve funds and monitor usage"
          icon={<Shield className="h-5 w-5 text-primary" />}
          actions={
            <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Manual Adjustment
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manual Reserve Adjustment</DialogTitle>
                <DialogDescription>
                  Credit or debit the reserve wallet manually. This will be logged in the transaction history.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Adjustment Type</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={adjustmentType === 'credit' ? 'default' : 'outline'}
                      onClick={() => setAdjustmentType('credit')}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Credit
                    </Button>
                    <Button
                      variant={adjustmentType === 'debit' ? 'default' : 'outline'}
                      onClick={() => setAdjustmentType('debit')}
                      className="flex-1"
                    >
                      <Minus className="h-4 w-4 mr-2" />
                      Debit
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (MWK)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Explain why this adjustment is being made..."
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAdjustmentOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleManualAdjustment} disabled={submitting}>
                  {submitting ? 'Processing...' : 'Apply Adjustment'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          }
        />

        {/* Threshold Alert */}
        {isLowReserve && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Reserve Below Safety Level</p>
                <p className="text-sm text-muted-foreground">
                  Reserve is at {thresholdPct.toFixed(1)}% of safety threshold. Consider adding funds.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Reserve Available</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                MWK {reserveWallet?.total_amount.toLocaleString() || 0}
              </div>
              <Badge variant={isLowReserve ? 'destructive' : 'default'} className="mt-2">
                {thresholdPct.toFixed(1)}% Safety Level
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Reserve In</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                MWK {transactions
                  .filter(t => t.type === 'reserve_in')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                From {transactions.filter(t => t.type === 'reserve_in').length} contributions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Reserve Out</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                MWK {transactions
                  .filter(t => t.type === 'reserve_out')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Covered {transactions.filter(t => t.type === 'reserve_out').length} shortfalls
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Reserve Activity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--foreground))" />
                <YAxis stroke="hsl(var(--foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="reserve_in" fill="hsl(var(--primary))" name="Reserve In" />
                <Bar dataKey="reserve_out" fill="hsl(var(--destructive))" name="Reserve Out" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Group-Level Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Group-Level Reserve Usage</CardTitle>
            <Badge variant="secondary">{groupUsage.length} Groups</Badge>
          </CardHeader>
          <CardContent>
            {groupUsage.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No groups have used reserve coverage yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group Name</TableHead>
                    <TableHead className="text-right">Total Covered</TableHead>
                    <TableHead className="text-right">Coverage Count</TableHead>
                    <TableHead className="text-right">Avg Coverage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupUsage.map((g) => (
                    <TableRow key={g.group_id}>
                      <TableCell className="font-medium">{g.group_name}</TableCell>
                      <TableCell className="text-right">
                        MWK {g.total_covered.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{g.coverage_count}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        MWK {(g.total_covered / g.coverage_count).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transaction History</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 20).map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>
                      {new Date(txn.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={txn.type === 'reserve_in' ? 'default' : 'destructive'}>
                        {txn.type === 'reserve_in' ? 'In' : 'Out'}
                      </Badge>
                    </TableCell>
                    <TableCell className={txn.type === 'reserve_in' ? 'text-success' : 'text-destructive'}>
                      {txn.type === 'reserve_in' ? '+' : '-'}MWK {txn.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {txn.reason || 'No reason provided'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminReserveWallet;
