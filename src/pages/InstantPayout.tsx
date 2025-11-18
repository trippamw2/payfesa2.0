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
  Smartphone
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-3 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Instant Payout
            </h1>
            <p className="text-xs text-muted-foreground">Get your payout immediately</p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="p-3 mb-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-medium text-yellow-900 mb-1">Instant Payout Fee: MWK {INSTANT_PAYOUT_FEE.toLocaleString()}</p>
              <p className="text-yellow-700">
                Skip the waiting period and get your payout immediately. A processing fee of MWK {INSTANT_PAYOUT_FEE.toLocaleString()} will be deducted from your payout amount.
              </p>
            </div>
          </div>
        </Card>

        {/* Current Balance */}
        <Card className="p-4 mb-4">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Your Balances
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Wallet Balance</p>
              <p className="text-lg font-bold text-primary">MWK {balance.wallet_balance.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-secondary/10 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Escrow Balance</p>
              <p className="text-lg font-bold text-secondary">MWK {balance.escrow_balance.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        {/* Pending Payouts Selection */}
        {pendingPayouts.length > 0 ? (
          <>
            <Card className="p-4 mb-4">
              <h2 className="text-base font-semibold mb-3">Select Payout</h2>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="payout" className="text-xs">Pending Payout</Label>
                  <Select value={selectedPayout} onValueChange={setSelectedPayout}>
                    <SelectTrigger id="payout" className="h-9 text-sm">
                      <SelectValue placeholder="Select a payout" />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingPayouts.map((payout) => (
                        <SelectItem key={payout.id} value={payout.id} className="text-sm">
                          {payout.rosca_groups?.name} - MWK {payout.amount.toLocaleString()} (Due: {new Date(payout.scheduled_date).toLocaleDateString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPayoutDetails && (
                  <div className="p-3 bg-muted rounded-lg space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Original Amount:</span>
                      <span className="font-medium">MWK {selectedPayoutDetails.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Instant Fee:</span>
                      <span className="font-medium text-red-600">- MWK {INSTANT_PAYOUT_FEE.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold pt-1.5 border-t">
                      <span>You'll Receive:</span>
                      <span className="text-green-600">MWK {netAmount.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Payment Account Selection */}
            {accounts.length > 0 ? (
              <Card className="p-4 mb-4">
                <h2 className="text-base font-semibold mb-3">Payout Destination</h2>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="account" className="text-xs">Payment Account</Label>
                    <Select 
                      value={selectedAccount} 
                      onValueChange={(value) => {
                        setSelectedAccount(value);
                      }}
                    >
                      <SelectTrigger id="account" className="h-9">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => {
                          const isMobile = account.type === 'mobile';
                          const isComplete = isMobile 
                            ? !!(account.phone_number?.trim() && account.provider?.trim())
                            : !!(account.bank_name?.trim() && account.account_number?.trim() && account.account_name?.trim());
                          
                          const missingFields = [];
                          if (!isComplete) {
                            if (isMobile) {
                              if (!account.phone_number?.trim()) missingFields.push('phone');
                              if (!account.provider?.trim()) missingFields.push('provider');
                            } else {
                              if (!account.bank_name?.trim()) missingFields.push('bank name');
                              if (!account.account_number?.trim()) missingFields.push('account number');
                              if (!account.account_name?.trim()) missingFields.push('account name');
                            }
                          }

                          return (
                            <SelectItem key={account.id} value={account.id} className="text-sm">
                              <div className="flex items-center gap-2 w-full">
                                {isMobile ? (
                                  <>
                                    <Smartphone className="h-3.5 w-3.5" />
                                    <span>{account.provider === 'airtel' ? 'Airtel Money' : 'TNM Mpamba'}</span>
                                    <span className="text-muted-foreground">- {account.phone_number}</span>
                                  </>
                                ) : (
                                  <>
                                    <Wallet className="h-3.5 w-3.5" />
                                    <span>{account.bank_name}</span>
                                    <span className="text-muted-foreground">- {account.account_number}</span>
                                  </>
                                )}
                                {!isComplete && (
                                  <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0">
                                    Incomplete
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Show missing fields warning if incomplete account is selected */}
                  {selectedAccount && (() => {
                    const account = accounts.find(a => a.id === selectedAccount);
                    if (!account) return null;
                    
                    const isMobile = account.type === 'mobile';
                    const missingFields = [];
                    
                    if (isMobile) {
                      if (!account.phone_number?.trim()) missingFields.push('Phone number');
                      if (!account.provider?.trim()) missingFields.push('Provider');
                    } else {
                      if (!account.bank_name?.trim()) missingFields.push('Bank name');
                      if (!account.account_number?.trim()) missingFields.push('Account number');
                      if (!account.account_name?.trim()) missingFields.push('Account name');
                    }
                    
                    if (missingFields.length === 0) return null;
                    
                    return (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-xs text-destructive mb-1">Incomplete Account Details</p>
                            <p className="text-xs text-destructive/80">
                              Missing fields: {missingFields.join(', ')}. Please update this account before requesting a payout.
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="mt-2 h-7 text-xs"
                              onClick={() => navigate('/settings/payment')}
                            >
                              Update Account
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Helper text when no account is selected */}
                  {!selectedAccount && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium text-xs mb-2">Required Fields by Payment Method:</p>
                      <div className="space-y-2 text-xs">
                        <div>
                          <p className="font-medium flex items-center gap-1.5">
                            <Smartphone className="h-3.5 w-3.5" />
                            Payment Account
                          </p>
                          <ul className="ml-5 mt-0.5 text-muted-foreground list-disc">
                            <li>Phone number (9 digits)</li>
                            <li>Provider (Airtel or TNM Mpamba)</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium flex items-center gap-1.5">
                            <Wallet className="h-3.5 w-3.5" />
                            Bank Account
                          </p>
                          <ul className="ml-5 mt-0.5 text-muted-foreground list-disc">
                            <li>Bank name</li>
                            <li>Account number</li>
                            <li>Account name (full name as registered)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="p-4 mb-4">
                <div className="text-center py-6">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No payment accounts found. Add a mobile money account or bank account to receive payouts.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => navigate('/settings/payment')}>
                    Add Payment Method
                  </Button>
                </div>
              </Card>
            )}

            {/* Action Button */}
            {accounts.length > 0 && (
              <Button
                onClick={handleRequestInstantPayout}
                disabled={!selectedAccount || !selectedPayout || requesting}
                className="w-full gap-2 h-9"
              >
                <Zap className="h-4 w-4" />
                Request Instant Payout
              </Button>
            )}
          </>
        ) : (
          <Card className="p-8 text-center">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold mb-2">No Pending Payouts</h3>
            <p className="text-sm text-muted-foreground mb-3">
              You don't have any pending payouts at the moment.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/groups')}>
              View My Groups
            </Button>
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
