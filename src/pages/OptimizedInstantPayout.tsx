import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Zap, 
  Wallet,
  Smartphone,
  CreditCard,
  Loader2,
  AlertCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';
import { calculatePayoutFees, formatMWK, FEE_EXPLANATIONS } from '@/utils/feeCalculations';
import { PaymentStatusTracker } from '@/components/payment/PaymentStatusTracker';
import { CrashProofWrapper } from '@/components/payment/CrashProofWrapper';
import { PaymentFallbackUI } from '@/components/payment/PaymentFallbackUI';
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
import { Alert, AlertDescription } from '@/components/ui/alert';

const INSTANT_PAYOUT_FEE = 1500;

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
  gross_amount: number;
  group_id: string;
  payout_date: string;
  rosca_groups?: {
    name: string;
  };
}

const OptimizedInstantPayout = () => {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState({ wallet_balance: 0, escrow_balance: 0 });
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [selectedPayout, setSelectedPayout] = useState<string>('');
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setFetchError(false);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch all data in parallel with optional chaining
      const [userData, payoutData, mobileData, bankData] = await Promise.all([
        supabase.from('users').select('wallet_balance, escrow_balance').eq('id', user.id).single(),
        supabase.from('payouts').select(`
          id, amount, gross_amount, group_id, payout_date,
          rosca_groups ( name )
        `).eq('recipient_id', user.id).eq('status', 'pending').order('payout_date', { ascending: true }),
        supabase.from('mobile_money_accounts').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('bank_accounts').select('*').eq('user_id', user.id)
      ]);

      // Check for errors
      if (userData?.error) throw userData.error;
      if (payoutData?.error) throw payoutData.error;
      if (mobileData?.error) throw mobileData.error;
      if (bankData?.error) throw bankData.error;

      setBalance({
        wallet_balance: userData?.data?.wallet_balance ?? 0,
        escrow_balance: userData?.data?.escrow_balance ?? 0
      });

      const formattedPayouts: PendingPayout[] = (payoutData?.data || []).map((p: any) => ({
        id: p.id,
        amount: p.amount,
        gross_amount: p.gross_amount,
        group_id: p.group_id,
        payout_date: p.payout_date,
        rosca_groups: p.rosca_groups
      }));

      setPendingPayouts(formattedPayouts);
      if (formattedPayouts.length > 0 && !selectedPayout) {
        setSelectedPayout(formattedPayouts[0].id);
      }

      const formattedAccounts: PaymentAccount[] = [
        ...(mobileData?.data || []).map((acc: any) => ({
          id: acc.id,
          type: 'mobile' as const,
          provider: acc.provider,
          phone_number: acc.phone_number,
          account_name: acc.account_name,
          is_primary: acc.is_primary
        })),
        ...(bankData?.data || []).map((acc: any) => ({
          id: acc.id,
          type: 'bank' as const,
          bank_name: acc.bank_name,
          account_number: acc.account_number,
          account_name: acc.account_name,
          is_primary: acc.is_primary
        }))
      ];

      setAccounts(formattedAccounts);
      const primaryAccount = formattedAccounts.find(acc => acc.is_primary);
      if (primaryAccount) {
        setSelectedAccount(primaryAccount.id);
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setFetchError(true);
      toast.error(error?.message || 'Failed to load payout information');
      setLoading(false);
    }
  };

  const handleInstantPayout = async () => {
    if (!selectedPayout || !selectedAccount) {
      toast.error('Please select a payout and payment method');
      return;
    }

    if (!pin || pin.length !== 4) {
      toast.error('Please enter your 4-digit PIN');
      return;
    }

    try {
      setRequesting(true);
      setStatus('processing');
      setStatusMessage('Verifying PIN and processing payout...');

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');

      // Verify PIN with optional chaining
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('security_pin_hash')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      if (!userData?.security_pin_hash) {
        throw new Error('Security PIN not set. Please set up your PIN first.');
      }

      const pinValid = await bcrypt.compare(pin, userData.security_pin_hash);
      if (!pinValid) {
        throw new Error('Invalid PIN. Please try again.');
      }

      // Get session for authorization
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('Session expired. Please login again.');

      // Process instant payout with proper error handling
      const { data, error } = await supabase.functions.invoke('process-instant-payout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          payout_id: selectedPayout,
          account_id: selectedAccount,
          pin: pin
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error?.message || 'Failed to connect to payment service');
      }

      if (data?.success) {
        setStatus('completed');
        setStatusMessage(data?.message || 'Payout completed successfully!');
        setTransactionId(data?.transaction_id || data?.transactionId || data?.payout?.payment_reference || 'N/A');
        toast.success('Payout processed! Money sent to your account.');
        
        // Refresh data
        setTimeout(() => {
          fetchData();
          setShowPinDialog(false);
          setPin('');
          setSelectedPayout('');
          setSelectedAccount('');
          setStatus('idle');
        }, 2000);
      } else {
        throw new Error(data?.error || 'Payout processing failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Payout error:', error);
      setStatus('failed');
      setStatusMessage(error?.message || 'Failed to process payout. Please try again.');
      toast.error(error?.message || 'Failed to process payout');
    } finally {
      setRequesting(false);
    }
  };

  const selectedPayoutData = pendingPayouts.find(p => p.id === selectedPayout);
  const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);
  const fees = selectedPayoutData ? calculatePayoutFees(selectedPayoutData.gross_amount) : null;
  const totalFees = fees ? fees.totalFees + INSTANT_PAYOUT_FEE : 0;
  const netAmount = selectedPayoutData ? selectedPayoutData.gross_amount - totalFees : 0;

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-6 text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading payout information...</p>
        </Card>
      </div>
    );
  }

  // Error State
  if (fetchError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <PaymentFallbackUI 
          message="Failed to load payout information. Please check your connection and try again."
          onRetry={fetchData}
          showSupport={true}
        />
      </div>
    );
  }

  return (
    <CrashProofWrapper
      fallbackMessage="Something went wrong with the payout page. Your funds are safe."
      onRetry={fetchData}
    >
      <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Instant Payout</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <PaymentStatusTracker 
          status={status}
          message={statusMessage}
          transactionId={transactionId}
        />

        {/* Balance Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Your Balance</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Escrow Balance</p>
              <p className="text-2xl font-bold">{formatMWK(balance.escrow_balance)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Wallet Balance</p>
              <p className="text-2xl font-bold">{formatMWK(balance.wallet_balance)}</p>
            </div>
          </div>
        </Card>

        {/* No Payouts Available */}
        {pendingPayouts.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              You don't have any pending payouts available for instant withdrawal.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Select Payout */}
            <Card className="p-6 space-y-4">
              <div>
                <Label>Select Payout</Label>
                <Select value={selectedPayout} onValueChange={setSelectedPayout} disabled={requesting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a payout" />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingPayouts.map((payout) => (
                      <SelectItem key={payout.id} value={payout.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{payout.rosca_groups?.name || 'Group'}</span>
                          <Badge variant="outline">{formatMWK(payout.gross_amount)}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPayoutData && (
                <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gross Amount</span>
                    <span className="font-semibold">{formatMWK(selectedPayoutData.gross_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">PayFesa Fees (12%)</span>
                    <span className="font-semibold text-destructive">
                      -{formatMWK(calculatePayoutFees(selectedPayoutData.gross_amount).totalFees)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Instant Fee</span>
                    <span className="font-semibold text-destructive">-{formatMWK(INSTANT_PAYOUT_FEE)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-bold">You Receive</span>
                    <span className="font-bold text-primary text-lg">{formatMWK(netAmount)}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Select Payment Method */}
            <Card className="p-6 space-y-4">
              <div>
                <Label>Payment Method</Label>
                {accounts.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No payment methods found. 
                      <Button variant="link" className="px-1" onClick={() => navigate('/payment-accounts')}>
                        Add one here
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select value={selectedAccount} onValueChange={setSelectedAccount} disabled={requesting}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select where to receive money" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            {account.type === 'mobile' ? (
                              <Smartphone className="h-4 w-4" />
                            ) : (
                              <CreditCard className="h-4 w-4" />
                            )}
                            <span>
                              {account.type === 'mobile' 
                                ? `${account.provider} - ${account.phone_number}`
                                : `${account.bank_name} - ${account.account_number}`}
                            </span>
                            {account.is_primary && <Badge variant="secondary" className="ml-2">Primary</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </Card>

            {/* Fee Breakdown Info */}
            <Card className="p-6 bg-muted/30">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Fee Breakdown
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{FEE_EXPLANATIONS.payoutSafety.title}</span>
                  <span>1%</span>
                </div>
                <div className="flex justify-between">
                  <span>{FEE_EXPLANATIONS.service.title}</span>
                  <span>5%</span>
                </div>
                <div className="flex justify-between">
                  <span>{FEE_EXPLANATIONS.government.title}</span>
                  <span>6%</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Instant Payout Fee</span>
                  <span>{formatMWK(INSTANT_PAYOUT_FEE)}</span>
                </div>
              </div>
            </Card>

            {/* Request Button */}
            <Button
              size="lg"
              className="w-full"
              onClick={() => setShowPinDialog(true)}
              disabled={!selectedPayout || !selectedAccount || requesting || status === 'completed'}
            >
              {requesting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" />
                  Request Instant Payout
                </>
              )}
            </Button>
          </>
        )}

        {/* PIN Dialog */}
        <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Instant Payout</DialogTitle>
              <DialogDescription>
                Enter your 4-digit PIN to authorize this payout
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedPayoutData && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Group</span>
                    <span className="font-semibold">{selectedPayoutData.rosca_groups?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Gross Amount</span>
                    <span className="font-semibold">{formatMWK(selectedPayoutData.gross_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Fees</span>
                    <span className="font-semibold text-destructive">-{formatMWK(totalFees)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="font-bold">You Receive</span>
                    <span className="font-bold text-primary text-lg">{formatMWK(netAmount)}</span>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="pin">Security PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  maxLength={4}
                  disabled={requesting}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPinDialog(false)} disabled={requesting}>
                Cancel
              </Button>
              <Button onClick={handleInstantPayout} disabled={!pin || requesting}>
                {requesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing
                  </>
                ) : (
                  'Confirm Payout'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </div>
    </CrashProofWrapper>
  );
};

export default OptimizedInstantPayout;
