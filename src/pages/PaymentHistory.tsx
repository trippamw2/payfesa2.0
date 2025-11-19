import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TransactionFilters, TransactionFilterOptions } from '@/components/payments/TransactionFilters';
import { TransactionReceipt } from '@/components/payments/TransactionReceipt';
import CreateDisputeDialog from '@/components/payments/CreateDisputeDialog';
import { RefundRequestDialog } from '@/components/payments/RefundRequestDialog';
import { PaymentRetryDialog } from '@/components/payments/PaymentRetryDialog';
import { supabase } from '@/integrations/supabase/client';
import { Download, Receipt, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PaymentHistory() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TransactionFilterOptions>({});
  
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [retryOpen, setRetryOpen] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, transactions]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (filters.type) {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    if (filters.minAmount) {
      filtered = filtered.filter(t => t.amount >= filters.minAmount!);
    }

    if (filters.maxAmount) {
      filtered = filtered.filter(t => t.amount <= filters.maxAmount!);
    }

    if (filters.startDate) {
      filtered = filtered.filter(t => new Date(t.created_at) >= filters.startDate!);
    }

    if (filters.endDate) {
      filtered = filtered.filter(t => new Date(t.created_at) <= filters.endDate!);
    }

    setFilteredTransactions(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Amount', 'Status', 'Method', 'Reference'];
    const rows = filteredTransactions.map(t => [
      format(new Date(t.created_at), 'yyyy-MM-dd HH:mm:ss'),
      t.type,
      t.amount,
      t.status,
      t.method || 'N/A',
      t.reference || 'N/A',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Transaction history exported');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <PageLayout title="Payment History">
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Payment History"
      subtitle="View and manage all your payment transactions"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Transactions</CardTitle>
            <div className="flex gap-2">
              <TransactionFilters
                filters={filters}
                onFiltersChange={setFilters}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters(!showFilters)}
              />
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transactions found</p>
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge>{transaction.type}</Badge>
                      <Badge variant={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                    {transaction.reference && (
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        Ref: {transaction.reference}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right mr-4">
                    <p className="font-bold text-lg">
                      MWK {transaction.amount.toLocaleString()}
                    </p>
                    {transaction.fee_amount && (
                      <p className="text-xs text-muted-foreground">
                        Fee: MWK {transaction.fee_amount.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedTransaction(transaction);
                        setReceiptOpen(true);
                      }}
                    >
                      <Receipt className="h-4 w-4" />
                    </Button>
                    
                    {transaction.status === 'completed' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setDisputeOpen(true);
                          }}
                          title="Dispute transaction"
                        >
                          <AlertCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setRefundOpen(true);
                          }}
                          title="Request refund"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {transaction.status === 'failed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setRetryOpen(true);
                        }}
                        title="Retry payment"
                      >
                        <RefreshCw className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedTransaction && (
        <>
          <TransactionReceipt
            open={receiptOpen}
            onOpenChange={setReceiptOpen}
            transaction={selectedTransaction}
          />
          <CreateDisputeDialog
            open={disputeOpen}
            onOpenChange={setDisputeOpen}
            transaction={selectedTransaction}
            onSuccess={fetchTransactions}
          />
          <RefundRequestDialog
            open={refundOpen}
            onOpenChange={setRefundOpen}
            transaction={selectedTransaction}
            onSuccess={fetchTransactions}
          />
          <PaymentRetryDialog
            open={retryOpen}
            onOpenChange={setRetryOpen}
            transaction={selectedTransaction}
            onSuccess={fetchTransactions}
          />
        </>
      )}
    </PageLayout>
  );
}
