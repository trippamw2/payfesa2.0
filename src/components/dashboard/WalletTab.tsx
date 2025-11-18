import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown, Clock, ArrowUpRight, ArrowDownLeft, CreditCard, Settings, Zap, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { celebrateSmall } from '@/lib/confetti';
import airtelLogo from '@/assets/airtel-money-logo.png';
import tnmLogo from '@/assets/tnm-mpamba-logo.jpg';
import AddPaymentMethodDialog from '@/components/wallet/AddPaymentMethodDialog';
import { getBankLogo } from '@/utils/bankLogos';

interface Props {
  user: any;
}

interface WalletStats {
  total_received: number;
  total_contributed: number;
  expected_income: number;
  ready_to_withdraw: number;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    created_at: string;
    status: string;
    group_name: string;
  }>;
}

interface PaymentMethod {
  id: string;
  type: 'mobile' | 'bank';
  provider?: 'airtel' | 'tnm';
  phone_number?: string;
  account_name: string;
  bank_name?: string;
  account_number?: string;
  is_verified: boolean;
  is_primary: boolean;
}

const WalletTab = ({ user }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [primaryMethod, setPrimaryMethod] = useState<PaymentMethod | null>(null);
  const [stats, setStats] = useState<WalletStats>({
    total_received: 0,
    total_contributed: 0,
    expected_income: 0,
    ready_to_withdraw: 0,
    transactions: []
  });

  useEffect(() => {
    fetchWalletStats();
    fetchPrimaryAccount();

    let walletTimeout: NodeJS.Timeout;
    let payoutTimeout: NodeJS.Timeout;
    let contributionTimeout: NodeJS.Timeout;

    const debouncedWalletFetch = () => {
      clearTimeout(walletTimeout);
      walletTimeout = setTimeout(() => {
        fetchWalletStats();
      }, 500);
    };

    const debouncedAccountFetch = () => {
      clearTimeout(payoutTimeout);
      payoutTimeout = setTimeout(() => {
        fetchPrimaryAccount();
      }, 500);
    };

    // Set up realtime subscriptions with debouncing
    const walletChannel = supabase
      .channel(`wallet-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        } as any,
        debouncedWalletFetch
      )
      .subscribe();

    const payoutChannel = supabase
      .channel(`wallet-payouts-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payouts',
          filter: `recipient_id=eq.${user.id}`,
        } as any,
        debouncedWalletFetch
      )
      .subscribe();

    const contributionChannel = supabase
      .channel(`wallet-contributions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contributions',
          filter: `user_id=eq.${user.id}`,
        } as any,
        debouncedWalletFetch
      )
      .subscribe();

    const accountChannel = supabase
      .channel(`wallet-accounts-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mobile_money_accounts',
          filter: `user_id=eq.${user.id}`,
        } as any,
        debouncedAccountFetch
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts',
          filter: `user_id=eq.${user.id}`,
        } as any,
        debouncedAccountFetch
      )
      .subscribe();

    return () => {
      clearTimeout(walletTimeout);
      clearTimeout(payoutTimeout);
      clearTimeout(contributionTimeout);
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(payoutChannel);
      supabase.removeChannel(contributionChannel);
      supabase.removeChannel(accountChannel);
    };
  }, [user.id]);

  const fetchPrimaryAccount = async () => {
    try {
      // Fetch primary mobile money account
      const { data: mobileData, error: mobileError } = await supabase
        .from('mobile_money_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();

      if (mobileError && mobileError.code !== 'PGRST116') throw mobileError;

      if (mobileData) {
        setPrimaryMethod({
          id: mobileData.id,
          type: 'mobile',
          provider: (mobileData.provider || 'airtel') as 'airtel' | 'tnm',
          phone_number: mobileData.phone_number,
          account_name: mobileData.account_name || 'Mobile Money',
          is_verified: mobileData.is_verified || false,
          is_primary: true
        });
        return;
      }

      // If no mobile money, check bank accounts
      const { data: bankData, error: bankError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();

      if (bankError && bankError.code !== 'PGRST116') throw bankError;

      if (bankData) {
        setPrimaryMethod({
          id: bankData.id,
          type: 'bank',
          account_name: bankData.account_name,
          bank_name: bankData.bank_name,
          account_number: bankData.account_number,
          is_verified: bankData.is_verified || false,
          is_primary: true
        });
      } else {
        setPrimaryMethod(null);
      }
    } catch (error) {
      console.error('Error fetching primary account:', error);
      toast.error('Failed to load payment accounts');
    }
  };

  const fetchWalletStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('calculate-wallet-stats', {
        body: {}
      });

      if (error) throw error;

      setStats(data);

      // Check for recent completed payouts and celebrate
      if (data?.transactions?.length > 0) {
        const recentPayouts = data.transactions.filter((t: { type: string; status: string; created_at: string }) => 
          t.type === 'payout' && 
          t.status === 'completed'
        );
        
        if (recentPayouts.length > 0) {
          const latestPayout = recentPayouts[0];
          const payoutDate = new Date(latestPayout.created_at);
          const now = new Date();
          const hoursSincePayout = (now.getTime() - payoutDate.getTime()) / (1000 * 60 * 60);
          
          // If payout was completed in last 12 hours, celebrate
          if (hoursSincePayout < 12) {
            const hasSeenCelebration = sessionStorage.getItem(`wallet-celebrated-${latestPayout.id}`);
            if (!hasSeenCelebration) {
              setTimeout(() => {
                celebrateSmall();
              }, 300);
              sessionStorage.setItem(`wallet-celebrated-${latestPayout.id}`, 'true');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching wallet stats:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-3 flex justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-4">
      {/* Balance Card */}
      <Card className="mx-3 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              <span className="text-[10px] opacity-90">Balance</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => navigate('/payment-accounts')}
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold">MWK {stats.ready_to_withdraw.toLocaleString()}</h3>
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" />
                <span>+{stats.total_received.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <TrendingDown className="h-3 w-3" />
                <span>-{stats.total_contributed.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="px-3">
      <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="flex-col h-auto py-2 gap-1"
            onClick={() => navigate('/instant-payout')}
          >
            <Zap className="h-3.5 w-3.5" />
            <span className="text-[9px]">Instant</span>
          </Button>
          <Button
            variant="outline"
            className="flex-col h-auto py-2 gap-1"
            onClick={() => navigate('/payment-accounts')}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span className="text-[9px]">Methods</span>
          </Button>
        </div>
      </div>

      {/* Payment Method */}
      <Card className="mx-3">
        {primaryMethod ? (
          <div className="p-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold">Primary</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => navigate('/payment-accounts')}
              >
                Change
              </Button>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              {primaryMethod.type === 'mobile' && primaryMethod.provider && (
                <img
                  src={primaryMethod.provider === 'airtel' ? airtelLogo : tnmLogo}
                  alt={primaryMethod.provider}
                  className="h-6 w-6 rounded"
                />
              )}
              {primaryMethod.type === 'bank' && primaryMethod.bank_name ? (
                getBankLogo(primaryMethod.bank_name) ? (
                  <img
                    src={getBankLogo(primaryMethod.bank_name)}
                    alt={primaryMethod.bank_name}
                    className="h-6 w-6 object-contain rounded"
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                )
              ) : null}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[10px] truncate">
                  {primaryMethod.account_name}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {primaryMethod.type === 'mobile'
                    ? primaryMethod.phone_number
                    : `${primaryMethod.bank_name}`}
                </p>
              </div>
              {primaryMethod.is_verified && (
                <Badge variant="default" className="text-[8px] h-4">✓</Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-2">No payment method added</p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowAddPaymentDialog(true)}
            >
              Add Payment Method
            </Button>
          </div>
        )}
      </Card>

      {/* Recent Transactions */}
      <Card className="mx-3">
        <div className="p-2">
          <h3 className="text-xs font-semibold mb-2">Recent</h3>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse flex gap-2">
                  <div className="h-8 w-8 bg-muted rounded-full" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-2 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats.transactions.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-4">
              No transactions
            </p>
          ) : (
            <div className="space-y-1.5">
              {stats.transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded transition-colors">
                  <div className={`p-1 rounded-full ${
                    tx.type === 'payout' ? 'bg-success/10' : 'bg-info/10'
                  }`}>
                    {tx.type === 'payout' ? (
                      <ArrowUpRight className="h-3 w-3 text-success" />
                    ) : (
                      <ArrowDownLeft className="h-3 w-3 text-info" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[10px] truncate">{tx.group_name}</p>
                    <p className="text-[8px] text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-[10px] ${
                      tx.type === 'payout' ? 'text-success' : 'text-info'
                    }`}>
                      {tx.type === 'payout' ? '+' : '-'}{tx.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <AddPaymentMethodDialog
        open={showAddPaymentDialog}
        onOpenChange={setShowAddPaymentDialog}
        onSuccess={() => {
          fetchPrimaryAccount();
          fetchWalletStats();
        }}
      />
    </div>
  );
};

export default WalletTab;
