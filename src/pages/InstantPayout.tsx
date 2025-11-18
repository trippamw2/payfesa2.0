import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Zap, 
  Wallet,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Clock,
  Smartphone,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const INSTANT_PAYOUT_FEE = 1500;

interface WalletBalance {
  wallet_balance: number;
  escrow_balance: number;
}

interface PaymentAccount {
  id: string;
  type: 'mobile' | 'bank';
  provider?: string;
  phone_number?: string;
  account_name?: string;
  bank_name?: string;
  account_number?: string;
  is_primary: boolean;
}

interface PendingPayout {
  id: string;
  amount: number;
  group_id: string;
  scheduled_date: string;
  rosca_groups: {
    name: string;
  };
}

const InstantPayout = () => {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<WalletBalance>({ wallet_balance: 0, escrow_balance: 0 });
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [selectedPayout, setSelectedPayout] = useState<string>('');
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    fetchData();

    // Setup realtime subscriptions
    const payoutsChannel = supabase
      .channel('instant-payouts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payout_schedule' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mobile_money_accounts' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(payoutsChannel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch wallet balance
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('wallet_balance, escrow_balance')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;
      setBalance(userData);

      // Fetch payment accounts (only mobile money for now)
      const { data: mobileData, error: mobileError } = await supabase
        .from('mobile_money_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });

      if (mobileError) throw mobileError;

      const allAccounts: PaymentAccount[] = [
        ...(mobileData || []).map(acc => ({
          id: acc.id,
          type: 'mobile' as const,
          provider: acc.provider,
          phone_number: acc.phone_number,
          account_name: acc.account_name,
          is_primary: acc.is_primary
        }))
      ];

      setAccounts(allAccounts);
      
      // Set primary account as default
      const primaryAccount = allAccounts.find(acc => acc.is_primary);
      if (primaryAccount) {
        setSelectedAccount(primaryAccount.id);
      } else if (allAccounts.length > 0) {
        setSelectedAccount(allAccounts[0].id);
      }

      // Fetch pending payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payout_schedule')
        .select(`
          *,
          rosca_groups(name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('scheduled_date', { ascending: true });

      if (payoutsError) throw payoutsError;
      setPendingPayouts(payoutsData as any || []);
      
      if (payoutsData && payoutsData.length > 0) {
        setSelectedPayout(payoutsData[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      const errorMessage = error?.message || 'Failed to load data';
      toast.error(errorMessage);
      // Set empty data on error instead of leaving in loading state
      setBalance({ wallet_balance: 0, escrow_balance: 0 });
      setAccounts([]);
      setPendingPayouts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestInstantPayout = () => {
    if (!selectedAccount || !selectedPayout) {
      toast.error('Please select both a payout and payment account');
      return;
    }

    if (netAmount <= 0) {
      toast.error('Payout amount after fees must be greater than zero');
      return;
    }

    // Validate bank account details if bank account is selected
    const selectedAccountData = accounts.find(a => a.id === selectedAccount);
    if (selectedAccountData?.type === 'bank') {
      if (!selectedAccountData.account_name?.trim()) {
        toast.error('Bank account name is missing. Please update your bank account details.');
        return;
      }
      if (!selectedAccountData.bank_name?.trim()) {
        toast.error('Bank name is missing. Please update your bank account details.');
        return;
      }
      if (!selectedAccountData.account_number?.trim()) {
        toast.error('Bank account number is missing. Please update your bank account details.');
        return;
      }
    }

    // Validate mobile money details if mobile money is selected
    if (selectedAccountData?.type === 'mobile') {
      if (!selectedAccountData.phone_number?.trim()) {
        toast.error('Phone number is missing. Please update your payment account details.');
        return;
      }
      if (!selectedAccountData.provider?.trim()) {
        toast.error('Provider is missing. Please update your payment account details.');
        return;
      }
    }

    setShowPinDialog(true);
  };

  const verifyPinAndRequest = async () => {
    try {
      setRequesting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify PIN
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('pin_hash')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      const pinValid = await bcrypt.compare(pin, userData.pin_hash);
      if (!pinValid) {
        toast.error('Invalid PIN');
        return;
      }

      // Get selected payout details
      const payout = pendingPayouts.find(p => p.id === selectedPayout);
      if (!payout) throw new Error('Payout not found');

      // Request instant payout
      const { data, error } = await supabase.functions.invoke('request-instant-payout', {
        body: {
          payoutId: selectedPayout,
          accountId: selectedAccount,
          amount: payout.amount,
          fee: INSTANT_PAYOUT_FEE
        }
      });

      if (error) throw error;

      toast.success('Instant payout requested successfully!');
      setShowPinDialog(false);
      setPin('');
      
      // Refresh data
      await fetchData();
      
      // Navigate to wallet or show success
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error requesting instant payout:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to request instant payout');
    } finally {
      setRequesting(false);
    }
  };

  const selectedPayoutDetails = pendingPayouts.find(p => p.id === selectedPayout);
  const netAmount = selectedPayoutDetails ? selectedPayoutDetails.amount - INSTANT_PAYOUT_FEE : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white px-2 py-2 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              className="text-white hover:bg-white/10 h-7 w-7"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <div>
              <h1 className="text-sm font-semibold">Instant Payout</h1>
              <p className="text-[10px] text-white/70">Get your money instantly</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-2 space-y-2">
        {/* Balance Overview */}
        <Card className="p-2 bg-gradient-to-br from-primary/5 to-secondary/5 border-border/50">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-full bg-primary/10">
                <Wallet className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Total Balance</p>
                <p className="text-lg font-bold">
                  MWK {(balance.wallet_balance + balance.escrow_balance).toLocaleString()}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Available</Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-border/50">
            <div>
              <p className="text-[9px] text-muted-foreground">Wallet</p>
              <p className="text-xs font-semibold">MWK {balance.wallet_balance.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground">Escrow</p>
              <p className="text-xs font-semibold">MWK {balance.escrow_balance.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-1.5">
          <Card className="p-1.5 border-border/50">
            <Zap className="h-3 w-3 text-primary mb-0.5" />
            <p className="text-sm font-bold">{pendingPayouts.length}</p>
            <p className="text-[9px] text-muted-foreground">Pending</p>
          </Card>
          <Card className="p-1.5 border-border/50">
            <Clock className="h-3 w-3 text-blue-500 mb-0.5" />
            <p className="text-sm font-bold">Instant</p>
            <p className="text-[9px] text-muted-foreground">Speed</p>
          </Card>
          <Card className="p-1.5 border-border/50">
            <DollarSign className="h-3 w-3 text-green-500 mb-0.5" />
            <p className="text-sm font-bold">{INSTANT_PAYOUT_FEE.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">Fee (MWK)</p>
          </Card>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-2">
          <Card className="p-2 border-border/50">
            <div className="flex items-start gap-1.5">
              <div className="p-1 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-[10px] font-semibold mb-0.5">Instant Transfer</h3>
                <p className="text-[9px] text-muted-foreground">
                  Receive money within minutes to your mobile money account
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-2 border-border/50">
            <div className="flex items-start gap-1.5">
              <div className="p-1 rounded-full bg-blue-500/10">
                <Smartphone className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-[10px] font-semibold mb-0.5">Mobile Money</h3>
                <p className="text-[9px] text-muted-foreground">
                  Direct transfer to your registered mobile money account
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Pending Payouts Selection */}
        {pendingPayouts.length > 0 ? (
          <>
            <Card className="p-2 border-border/50">
              <h2 className="text-[10px] font-semibold mb-1.5 flex items-center gap-1">
                <Zap className="h-3 w-3 text-primary" />
                Select Payout to Cash Out
              </h2>
              <div className="space-y-1.5">
                {pendingPayouts.map((payout) => (
                  <div
                    key={payout.id}
                    onClick={() => setSelectedPayout(payout.id)}
                    className={`p-1.5 rounded-lg border cursor-pointer transition-all ${
                      selectedPayout === payout.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-[10px] font-semibold">{payout.rosca_groups.name}</p>
                        <p className="text-[9px] text-muted-foreground">
                          Due: {new Date(payout.scheduled_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-primary">MWK {payout.amount.toLocaleString()}</p>
                        <p className="text-[9px] text-muted-foreground">-{INSTANT_PAYOUT_FEE.toLocaleString()} fee</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Payment Account Selection */}
            <Card className="p-2 border-border/50">
              <h2 className="text-[10px] font-semibold mb-1.5 flex items-center gap-1">
                <Wallet className="h-3 w-3 text-primary" />
                Select Payment Account
              </h2>
              {accounts.length === 0 ? (
                <div className="text-center py-3">
                  <AlertCircle className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-[10px] text-muted-foreground mb-1.5">No payment account linked</p>
                  <Button onClick={() => navigate('/wallet')} variant="outline" size="sm" className="h-7 text-[10px]">
                    Add Payment Account
                  </Button>
                </div>
              ) : (
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id} className="text-xs">
                        {account.type === 'mobile' ? `${account.provider} • ${account.phone_number}` : `${account.bank_name} • ${account.account_number}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Card>

            {selectedPayout && (
              <Card className="p-2 bg-muted/30 border-border/50">
                <h3 className="text-[10px] font-semibold mb-1.5">Fee Breakdown</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px]">
                    <span className="text-muted-foreground">Payout Amount</span>
                    <span className="font-semibold">MWK {pendingPayouts.find(p => p.id === selectedPayout)?.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[9px]">
                    <span className="text-muted-foreground">Instant Fee</span>
                    <span className="text-red-600">-MWK {INSTANT_PAYOUT_FEE.toLocaleString()}</span>
                  </div>
                  <div className="pt-1 border-t border-border/50">
                    <div className="flex justify-between">
                      <span className="text-[10px] font-semibold">You'll Receive</span>
                      <span className="text-xs font-bold text-primary">MWK {((pendingPayouts.find(p => p.id === selectedPayout)?.amount || 0) - INSTANT_PAYOUT_FEE).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Button onClick={() => setShowPinDialog(true)} disabled={!selectedPayout || !selectedAccount || requesting} className="w-full h-8 text-xs">
              {requesting ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Processing...</> : <><Zap className="mr-1 h-3.5 w-3.5" />Request Instant Payout</>}
            </Button>
          </>
        ) : (
          <Card className="p-3 text-center border-border/50">
            <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground mb-1.5" />
            <p className="text-xs text-muted-foreground mb-1">No Pending Payouts</p>
            <p className="text-[10px] text-muted-foreground">You don't have any pending payouts at the moment</p>
          </Card>
        )}

        {/* PIN Verification Dialog */}
        <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verify Your PIN</DialogTitle>
              <DialogDescription>
                Enter your 4-digit PIN to confirm the instant payout request.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-3">
              <div>
                <Label htmlFor="pin" className="text-xs">PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter your 4-digit PIN"
                  className="h-9 text-sm"
                />
              </div>
              {selectedPayoutDetails && (
                <div className="p-2.5 bg-muted rounded-lg text-xs">
                  <p className="text-muted-foreground mb-1">Amount to receive:</p>
                  <p className="text-lg font-bold text-green-600">MWK {netAmount.toLocaleString()}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPinDialog(false);
                  setPin('');
                }}
                disabled={requesting}
              >
                Cancel
              </Button>
              <Button
                onClick={verifyPinAndRequest}
                disabled={pin.length !== 4 || requesting}
              >
                {requesting ? 'Processing...' : 'Confirm Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default InstantPayout;
