import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Calendar,
  Wallet,
  Download,
  AlertCircle,
  FileDown,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import CreateDisputeDialog from '@/components/payments/CreateDisputeDialog';

interface Payout {
  id: string;
  amount: number;
  gross_amount: number;
  fee_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payout_date: string;
  cycle_number: number;
  mobile_money_reference: string | null;
  rosca_groups: {
    name: string;
  };
}

interface PayoutStats {
  total_received: number;
  total_pending: number;
  total_fees: number;
  completed_count: number;
}

const PayoutManagement = () => {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<PayoutStats>({
    total_received: 0,
    total_pending: 0,
    total_fees: 0,
    completed_count: 0
  });
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [disputeTransaction, setDisputeTransaction] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchPayouts();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('payouts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payouts'
        },
        () => {
          fetchPayouts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPayouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch payouts with group info
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select(`
          *,
          rosca_groups (
            name
          )
        `)
        .eq('recipient_id', user.id)
        .order('payout_date', { ascending: false });

      if (payoutsError) throw payoutsError;

      setPayouts(payoutsData as any || []);

      // Calculate stats
      const completed = payoutsData?.filter(p => p.status === 'completed') || [];
      const pending = payoutsData?.filter(p => p.status === 'pending') || [];
      
      setStats({
        total_received: completed.reduce((sum, p) => sum + Number(p.amount), 0),
        total_pending: pending.reduce((sum, p) => sum + Number(p.amount), 0),
        total_fees: payoutsData?.reduce((sum, p) => sum + Number(p.fee_amount || 0), 0) || 0,
        completed_count: completed.length
      });
    } catch (error) {
      console.error('Error fetching payouts:', error);
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv' = 'csv') => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-transactions', {
        body: { format }
      });

      if (error) throw error;

      // Create download
      const blob = new Blob([format === 'csv' ? data.csv : JSON.stringify(data.transactions, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Transactions exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export transactions');
    } finally {
      setExporting(false);
    }
  };

  const handleRetryPayment = async (transactionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('retry-failed-payment', {
        body: { transaction_id: transactionId }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to retry payment');
      }

      toast.success('Payment retry initiated');
      fetchPayouts();
    } catch (error) {
      console.error('Retry error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to retry payment');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'processing':
        return <Download className="h-4 w-4 text-blue-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClass = "text-xs";
    switch (status) {
      case 'completed':
        return <Badge className={`${baseClass} bg-green-100 text-green-700`}>Completed</Badge>;
      case 'pending':
        return <Badge className={`${baseClass} bg-yellow-100 text-yellow-700`}>Pending</Badge>;
      case 'processing':
        return <Badge className={`${baseClass} bg-blue-100 text-blue-700`}>Processing</Badge>;
      case 'failed':
        return <Badge className={`${baseClass} bg-red-100 text-red-700`}>Failed</Badge>;
      default:
        return <Badge variant="secondary" className={baseClass}>{status}</Badge>;
    }
  };

  const filteredPayouts = payouts.filter(payout => {
    if (filter === 'all') return true;
    return payout.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={goBack}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full">
            <TrendingDown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Payout Management</h1>
            <p className="text-muted-foreground">Track your earnings and payouts</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Received</p>
            <p className="text-2xl font-bold text-green-600">
              MWK {stats.total_received.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.completed_count} payouts
            </p>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              MWK {stats.total_pending.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              In processing
            </p>
          </div>
        </Card>
      </div>

      {/* Fees Card */}
      <Card className="p-4 mb-6 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium mb-1">Total Fees Paid</p>
            <p className="text-2xl font-bold text-blue-600">
              MWK {stats.total_fees.toLocaleString()}
            </p>
          </div>
          <Wallet className="h-8 w-8 text-blue-600" />
        </div>
      </Card>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Payouts List */}
      <div className="space-y-3">
        {filteredPayouts.length === 0 ? (
          <Card className="p-8 text-center">
            <TrendingDown className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Payouts Yet</h3>
            <p className="text-muted-foreground">
              {filter === 'all' 
                ? 'Your completed payouts will appear here'
                : `No ${filter} payouts found`}
            </p>
          </Card>
        ) : (
          filteredPayouts.map((payout) => (
            <Card key={payout.id} className={`p-4 ${
              payout.status === 'completed' 
                ? 'border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/50' 
                : payout.status === 'failed'
                ? 'border-red-200 bg-gradient-to-br from-red-50/50 to-rose-50/50'
                : ''
            }`}>
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(payout.status)}
                      <p className="font-semibold">
                        {(payout.rosca_groups as any)?.name || 'Unknown Group'}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cycle #{payout.cycle_number}
                    </p>
                  </div>
                  {getStatusBadge(payout.status)}
                </div>

                {/* Amount Details */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Gross Amount:</span>
                    <span className="font-medium">MWK {payout.gross_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Fees (12%):</span>
                    <span className="font-medium text-red-600">
                      -MWK {payout.fee_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-semibold">Net Amount:</span>
                    <span className="text-lg font-bold text-green-600">
                      MWK {payout.amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(payout.payout_date).toLocaleDateString()}</span>
                    </div>
                    {payout.mobile_money_reference && (
                      <span className="font-mono text-[10px]">
                        {payout.mobile_money_reference}
                      </span>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  {payout.status === 'failed' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetryPayment(payout.mobile_money_reference || payout.id)}
                        className="flex-1"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDisputeTransaction(payout.id)}
                        className="flex-1"
                      >
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Dispute
                      </Button>
                    </div>
                  )}
                  
                  {/* View Disputes Link for all payouts */}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => navigate('/disputes')}
                    className="w-full text-xs"
                  >
                    View All Disputes
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
      
      {/* Dispute Dialog */}
      {disputeTransaction && (
        <CreateDisputeDialog
          open={!!disputeTransaction}
          onOpenChange={(open) => !open && setDisputeTransaction(null)}
          transaction={{
            id: disputeTransaction,
            type: 'payout',
            amount: filteredPayouts.find(p => p.id === disputeTransaction)?.amount || 0,
            created_at: filteredPayouts.find(p => p.id === disputeTransaction)?.payout_date || new Date().toISOString()
          }}
          onSuccess={fetchPayouts}
        />
      )}
    </div>
  );
};

export default PayoutManagement;
