import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Clock, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import CreateDisputeDialog from '@/components/payments/CreateDisputeDialog';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSkeleton } from '@/components/loading/LoadingSkeleton';
import { StatCard } from '@/components/layout/StatCard';

interface Dispute {
  id: string;
  transaction_id: string;
  dispute_type: string;
  reason: string;
  amount: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
  admin_notes: string | null;
  transactions: {
    type: string;
    amount: number;
    created_at: string;
  };
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
}

const DisputeManagement = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchData();
    
    // Realtime subscription
    const channel = supabase
      .channel('user-disputes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_disputes' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's disputes
      const { data: disputesData, error: disputesError } = await supabase
        .from('payment_disputes')
        .select(`
          *,
          transactions (type, amount, created_at)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (disputesError) throw disputesError;

      // Fetch user's transactions for creating new disputes
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionsError) throw transactionsError;

      setDisputes(disputesData || []);
      setTransactions(transactionsData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load disputes');
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: 'outline', icon: Clock, label: 'Under Review' },
      approved: { variant: 'default', icon: CheckCircle2, label: 'Approved' },
      rejected: { variant: 'destructive', icon: XCircle, label: 'Rejected' },
    };

    const { variant, icon: Icon, label } = config[status] || config.pending;

    return (
      <Badge variant={variant as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const handleCreateDispute = (transaction: Transaction) => {
    // Check if transaction already has a pending dispute
    const existingDispute = disputes.find(
      d => d.transaction_id === transaction.id && d.status === 'pending'
    );

    if (existingDispute) {
      toast.error('This transaction already has a pending dispute');
      return;
    }

    setSelectedTransaction(transaction);
    setShowCreateDialog(true);
  };

  if (loading) {
    return (
      <PageLayout
        title="Payment Disputes"
        subtitle="Manage your transaction disputes"
        icon={<AlertTriangle className="h-5 w-5" />}
        showBackButton={true}
      >
        <LoadingSkeleton variant="list" count={3} />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout
        title="Payment Disputes"
        subtitle="Manage your transaction disputes"
        icon={<AlertTriangle className="h-5 w-5" />}
        showBackButton={true}
      >
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Payment Disputes"
      subtitle="Manage your transaction disputes"
      icon={<AlertTriangle className="h-5 w-5" />}
      showBackButton={true}
    >

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          value={disputes.length}
          label="Total Disputes"
          icon={AlertTriangle}
          iconColor="text-warning"
        />
        <StatCard
          value={disputes.filter(d => d.status === 'pending').length}
          label="Pending"
          icon={Clock}
          iconColor="text-warning"
        />
        <StatCard
          value={disputes.filter(d => d.status === 'approved').length}
          label="Resolved"
          icon={CheckCircle2}
          iconColor="text-success"
        />
      </div>

      <Tabs defaultValue="disputes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="disputes">My Disputes</TabsTrigger>
          <TabsTrigger value="create">Create Dispute</TabsTrigger>
        </TabsList>

        <TabsContent value="disputes" className="space-y-3">
          {disputes.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No disputes found</p>
                <p className="text-sm mt-2">Create a dispute if you have issues with a transaction</p>
              </div>
            </Card>
          ) : (
            disputes.map((dispute) => (
              <Card key={dispute.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{dispute.dispute_type}</Badge>
                          {getStatusBadge(dispute.status)}
                        </div>
                        <p className="text-sm font-medium">
                          {dispute.transactions?.type || 'Transaction'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          MWK {dispute.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-3 rounded text-xs">
                      <p className="font-medium mb-1">Your Reason:</p>
                      <p className="text-muted-foreground">{dispute.reason}</p>
                    </div>

                    {dispute.admin_notes && (
                      <div className="bg-primary/5 p-3 rounded text-xs border border-primary/20">
                        <p className="font-medium mb-1 text-primary">Admin Response:</p>
                        <p className="text-muted-foreground">{dispute.admin_notes}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span>Filed: {new Date(dispute.created_at).toLocaleDateString()}</span>
                      {dispute.resolved_at && (
                        <span>Resolved: {new Date(dispute.resolved_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-3">
          <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
            <div className="flex gap-2">
              <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">Before Creating a Dispute</p>
                <ul className="list-disc list-inside text-blue-700 space-y-1">
                  <li>Select the transaction you want to dispute</li>
                  <li>Provide detailed information about the issue</li>
                  <li>Our admin team will review within 24-48 hours</li>
                  <li>Approved disputes will be refunded to your wallet</li>
                </ul>
              </div>
            </div>
          </Card>

          {transactions.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                <p>No transactions found</p>
              </div>
            </Card>
          ) : (
            transactions.map((transaction) => {
              const hasDispute = disputes.some(d => d.transaction_id === transaction.id);
              
              return (
                <Card key={transaction.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{transaction.type}</Badge>
                          <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                          {hasDispute && (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              Has Dispute
                            </Badge>
                          )}
                        </div>
                        <p className="text-lg font-bold">MWK {transaction.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={hasDispute ? "outline" : "default"}
                        onClick={() => handleCreateDispute(transaction)}
                        disabled={hasDispute}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {hasDispute ? 'Disputed' : 'Dispute'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dispute Dialog */}
      {selectedTransaction && (
        <CreateDisputeDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          transaction={selectedTransaction}
          onSuccess={() => {
            fetchData();
            setShowCreateDialog(false);
            setSelectedTransaction(null);
          }}
        />
      )}
    </PageLayout>
  );
};

export default DisputeManagement;
