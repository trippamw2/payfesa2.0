import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Lock,
  Unlock,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

interface WalletBalances {
  wallet_balance: number;
  escrow_balance: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  group_name: string;
}

const WalletManagement = () => {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<WalletBalances>({ wallet_balance: 0, escrow_balance: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferPin, setTransferPin] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    fetchWalletData();

    // Setup realtime subscriptions
    const channel = supabase
      .channel('wallet-management-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchWalletData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payouts' }, fetchWalletData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contributions' }, fetchWalletData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch wallet balances
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('wallet_balance, escrow_balance')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;
      setBalances(userData);

      // Fetch recent transactions via edge function
      const { data: statsData, error: statsError } = await supabase.functions.invoke('calculate-wallet-stats');

      if (statsError) throw statsError;
      setTransactions(statsData.transactions || []);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!transferPin) {
      toast.error('Please enter your PIN');
      return;
    }

    setTransferring(true);
    try {
      const { data, error } = await supabase.functions.invoke('transfer-escrow-to-wallet', {
        body: {
          amount: parseFloat(transferAmount),
          pin: transferPin
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`MWK ${parseFloat(transferAmount).toLocaleString()} transferred to wallet successfully`);
        setShowTransferDialog(false);
        setTransferAmount('');
        setTransferPin('');
        fetchWalletData();
      } else {
        throw new Error(data.error || 'Transfer failed');
      }
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error(error.message || 'Failed to transfer funds');
    } finally {
      setTransferring(false);
    }
  };

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
        <Button variant="ghost" onClick={goBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-full">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Wallet Management</h1>
            <p className="text-muted-foreground">Manage your wallet and escrow balances</p>
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5 text-primary" />
              Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary mb-2">
              MWK {balances.wallet_balance.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Ready to withdraw</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 via-secondary/5 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-secondary" />
              Escrow Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-secondary mb-2">
              MWK {balances.escrow_balance.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Locked until payout</p>
            {balances.escrow_balance > 0 && (
              <Button 
                onClick={() => setShowTransferDialog(true)}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                <ArrowDownLeft className="mr-2 h-4 w-4" />
                Transfer to Wallet
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Button onClick={() => navigate('/instant-payout')} variant="default">
            <Zap className="mr-2 h-4 w-4" />
            Instant Payout
          </Button>
          <Button onClick={() => navigate('/payout-management')} variant="outline">
            <Clock className="mr-2 h-4 w-4" />
            Payout History
          </Button>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchWalletData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="payout">Payouts</TabsTrigger>
              <TabsTrigger value="contribution">Contributions</TabsTrigger>
            </TabsList>
            
            {['all', 'payout', 'contribution'].map(tab => (
              <TabsContent key={tab} value={tab} className="space-y-4">
                {transactions
                  .filter(t => tab === 'all' || t.type === tab)
                  .map(transaction => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          transaction.type === 'payout' 
                            ? 'bg-green-100 dark:bg-green-900/20' 
                            : 'bg-red-100 dark:bg-red-900/20'
                        }`}>
                          {transaction.type === 'payout' ? (
                            <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{transaction.type}</p>
                          <p className="text-sm text-muted-foreground">{transaction.group_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          transaction.type === 'payout' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'payout' ? '+' : '-'}MWK {transaction.amount.toLocaleString()}
                        </p>
                        <Badge variant={
                          transaction.status === 'completed' ? 'default' :
                          transaction.status === 'pending' ? 'secondary' : 'destructive'
                        }>
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                
                {transactions.filter(t => tab === 'all' || t.type === tab).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No {tab !== 'all' ? tab : ''} transactions yet
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Escrow to Wallet</DialogTitle>
            <DialogDescription>
              Transfer funds from your locked escrow balance to your wallet for withdrawal
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-amount">Amount (MWK)</Label>
              <Input
                id="transfer-amount"
                type="number"
                placeholder="Enter amount"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                max={balances.escrow_balance}
              />
              <p className="text-sm text-muted-foreground">
                Available: MWK {balances.escrow_balance.toLocaleString()}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="transfer-pin">PIN</Label>
              <Input
                id="transfer-pin"
                type="password"
                placeholder="Enter your PIN"
                value={transferPin}
                onChange={(e) => setTransferPin(e.target.value)}
                maxLength={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={transferring}>
              {transferring ? 'Transferring...' : 'Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletManagement;
