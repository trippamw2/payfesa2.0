import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Wallet, Smartphone, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  groupId: string;
  contributionAmount: number;
  groupName: string;
  currentUserId: string;
}

const ContributeTab = ({ groupId, contributionAmount, groupName, currentUserId }: Props) => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState(contributionAmount.toString());
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [contributions, setContributions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [mobileMoneyAccounts, setMobileMoneyAccounts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    fetchContributionHistory();
    fetchPaymentAccounts();
    subscribeToContributions();
    subscribeToPaymentAccounts();
  }, [groupId, currentUserId]);

  const subscribeToPaymentAccounts = () => {
    let mobileTimeout: NodeJS.Timeout;
    let bankTimeout: NodeJS.Timeout;

    const debouncedMobileFetch = () => {
      clearTimeout(mobileTimeout);
      mobileTimeout = setTimeout(() => {
        fetchPaymentAccounts();
      }, 300);
    };

    const debouncedBankFetch = () => {
      clearTimeout(bankTimeout);
      bankTimeout = setTimeout(() => {
        fetchPaymentAccounts();
      }, 300);
    };

    const mobileChannel = supabase
      .channel(`mobile-accounts-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mobile_money_accounts',
          filter: `user_id=eq.${currentUserId}`,
        } as any,
        debouncedMobileFetch
      )
      .subscribe();

    const bankChannel = supabase
      .channel(`bank-accounts-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts',
          filter: `user_id=eq.${currentUserId}`,
        } as any,
        debouncedBankFetch
      )
      .subscribe();

    return () => {
      clearTimeout(mobileTimeout);
      clearTimeout(bankTimeout);
      supabase.removeChannel(mobileChannel);
      supabase.removeChannel(bankChannel);
    };
  };

  const subscribeToContributions = () => {
    let timeoutId: NodeJS.Timeout;
    const debouncedFetch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchContributionHistory();
      }, 300);
    };

    const channel = supabase
      .channel(`contributions-${groupId}-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contributions',
          filter: `group_id=eq.${groupId}`,
        } as any,
        debouncedFetch
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mobile_money_transactions',
          filter: `group_id=eq.${groupId}`,
        } as any,
        debouncedFetch
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  };

  const fetchPaymentAccounts = async () => {
    try {
      const [mobileData, bankData] = await Promise.all([
        supabase
          .from('mobile_money_accounts')
          .select('*')
          .eq('user_id', currentUserId)
          .eq('is_active', true)
          .order('is_primary', { ascending: false }),
        supabase
          .from('bank_accounts')
          .select('*')
          .eq('user_id', currentUserId)
          .order('is_primary', { ascending: false })
      ]);

      if (mobileData.error) throw mobileData.error;
      if (bankData.error) throw bankData.error;
      
      setMobileMoneyAccounts(mobileData.data || []);
      setBankAccounts(bankData.data || []);
      
      // Only show primary account
      const primaryMobile = mobileData.data?.find(acc => acc.is_primary);
      const primaryBank = bankData.data?.find(acc => acc.is_primary);
      
      // Keep only the primary payment method
      if (primaryMobile) {
        setMobileMoneyAccounts([primaryMobile]);
        setBankAccounts([]);
        setSelectedAccountId(primaryMobile.id);
      } else if (primaryBank) {
        setBankAccounts([primaryBank]);
        setMobileMoneyAccounts([]);
        setSelectedAccountId(primaryBank.id);
      } else if (mobileData.data && mobileData.data.length > 0) {
        // Fallback to first mobile account if no primary set
        setMobileMoneyAccounts([mobileData.data[0]]);
        setBankAccounts([]);
        setSelectedAccountId(mobileData.data[0].id);
      } else if (bankData.data && bankData.data.length > 0) {
        // Fallback to first bank account if no primary set
        setBankAccounts([bankData.data[0]]);
        setMobileMoneyAccounts([]);
        setSelectedAccountId(bankData.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching payment accounts:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const fetchContributionHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('contributions')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContributions(data || []);
    } catch (error) {
      console.error('Error fetching contribution history:', error);
      toast.error('Failed to load contribution history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAccountId) {
      toast.error('Please select a payment method');
      return;
    }

    if (!pin || pin.length !== 4) {
      const isMobileAccount = mobileMoneyAccounts.some(acc => acc.id === selectedAccountId);
      toast.error(isMobileAccount ? 'Please enter your 4-digit mobile money PIN' : 'Please enter your 4-digit security PIN');
      return;
    }

    if (parseFloat(amount) < contributionAmount) {
      toast.error(`Minimum contribution is MWK ${contributionAmount.toLocaleString()}`);
      return;
    }

    setSubmitting(true);
    try {
      let paymentMethod, phoneNumber, accountNumber, bankName;

      // Determine if selected account is mobile money or bank
      const isMobileAccount = mobileMoneyAccounts.some(acc => acc.id === selectedAccountId);
      
      if (isMobileAccount) {
        const selectedAccount = mobileMoneyAccounts.find(acc => acc.id === selectedAccountId);
        if (!selectedAccount) {
          toast.error('Please select a mobile money account');
          return;
        }
        paymentMethod = selectedAccount.provider;
        phoneNumber = selectedAccount.phone_number;
      } else {
        const selectedAccount = bankAccounts.find(acc => acc.id === selectedAccountId);
        if (!selectedAccount) {
          toast.error('Please select a bank account');
          return;
        }
        paymentMethod = 'bank';
        accountNumber = selectedAccount.account_number;
        bankName = selectedAccount.bank_name;
      }
      
      // Get the current session to pass auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to make a contribution');
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('process-contribution', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          groupId: groupId,
          amount: parseFloat(amount),
          paymentMethod,
          phoneNumber,
          accountNumber,
          bankName,
          pin: pin,
          accountId: selectedAccountId
        }
      });

      if (error) throw error;
      
      if (data?.payment_account_details) {
        // Bank transfer - show account details
        const accountDetails = data.payment_account_details;
        toast.success(
          `Payment initiated! Transfer ${amount} MWK to:\n` +
          `Bank: ${accountDetails.bank_name}\n` +
          `Account: ${accountDetails.account_number}\n` +
          `Name: ${accountDetails.account_name}`,
          { duration: 10000 }
        );
      } else if (data?.status === 'pending') {
        toast.success('Please approve the payment on your mobile money');
      } else {
        toast.success(data?.message || 'Contribution processed successfully');
      }

      toast.success('Payment successful!', {
        description: 'Downloading receipt...'
      });

      // Generate and download PDF receipt
      await generateReceipt(data.contribution);

      // Reset form
      setPin('');
      
      // Refresh contribution history
      fetchContributionHistory();
    } catch (error: any) {
      console.error('Error submitting contribution:', error);
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setSubmitting(false);
    }
  };

  const generateReceipt = async (contribution: any) => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Add PayFesa logo using an image
      try {
        const logo = new Image();
        logo.src = '/src/assets/payfesa-logo-full.jpg';
        await new Promise((resolve, reject) => {
          logo.onload = resolve;
          logo.onerror = reject;
          setTimeout(reject, 2000); // Timeout after 2s
        });
        doc.addImage(logo, 'JPEG', 15, 10, 40, 15);
      } catch {
        // Fallback to text if image fails
        doc.setFontSize(24);
        doc.setTextColor(0, 102, 204);
        doc.text('PAYFESA', 105, 20, { align: 'center' });
      }

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Digital Financial Services', 105, 28, { align: 'center' });

      // Receipt title
      doc.setFontSize(18);
      doc.setTextColor(0);
      doc.text('Contribution Receipt', 105, 45, { align: 'center' });

      // Receipt details
      doc.setFontSize(11);
      const startY = 60;
      const lineHeight = 10;

      doc.text(`Transaction ID: ${contribution.id}`, 20, startY);
      doc.text(`Date: ${new Date(contribution.created_at).toLocaleString()}`, 20, startY + lineHeight);
      doc.text(`Group: ${groupName}`, 20, startY + lineHeight * 2);
      doc.text(`Amount: MWK ${parseFloat(contribution.amount).toLocaleString()}`, 20, startY + lineHeight * 3);
      doc.text(`Payment Method: ${contribution.payment_method.toUpperCase()}`, 20, startY + lineHeight * 4);
      doc.text(`Status: ${contribution.status.toUpperCase()}`, 20, startY + lineHeight * 5);

      // Footer
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text('Thank you for using PayFesa', 105, 150, { align: 'center' });
      doc.text('For support, contact: support@payfesa.com', 105, 160, { align: 'center' });

      // Download
      doc.save(`payfesa-receipt-${contribution.id}.pdf`);
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('Receipt generated but download failed');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 text-[10px]">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 text-[10px]">Failed</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Group Info Card */}
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contributing to</p>
              <p className="font-semibold">{groupName}</p>
            </div>
          </div>
        </Card>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">Contribution Amount (MWK)</Label>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Minimum: ${contributionAmount}`}
            min={contributionAmount}
            step="100"
            required
            className="text-lg font-semibold"
          />
          <p className="text-xs text-muted-foreground">
            Required: MWK {contributionAmount.toLocaleString()}
          </p>
        </div>

        {/* Payment Form */}
        {loadingAccounts ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : mobileMoneyAccounts.length === 0 && bankAccounts.length === 0 ? (
          <Card className="p-6 text-center border-border/50">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No payment methods found. Please add a payment method first.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.href = '/mobile-money'} variant="outline" size="sm">
                Add Payment Account
              </Button>
              <Button onClick={() => window.location.href = '/bank-accounts'} variant="outline" size="sm">
                Add Bank Account
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Default Payment Method Display */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              {/* Mobile Money Account */}
              {mobileMoneyAccounts.map((account) => (
                <Card key={account.id} className="p-3 border-primary border-2 bg-primary/5">
                  <div className="flex items-center gap-3">
                    <Smartphone className={`h-5 w-5 ${account.provider === 'airtel' ? 'text-red-500' : 'text-blue-500'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{account.provider === 'airtel' ? 'Airtel Money' : 'TNM Mpamba'}</span>
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{account.phone_number}</p>
                    </div>
                  </div>
                </Card>
              ))}
              
              {/* Bank Account */}
              {bankAccounts.map((account) => (
                <Card key={account.id} className="p-3 border-primary border-2 bg-primary/5">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{account.bank_name}</span>
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{account.account_number}</p>
                    </div>
                  </div>
                </Card>
              ))}
              
              <p className="text-xs text-muted-foreground">
                Change default in <Link to="/settings/payment" className="text-primary underline hover:text-primary/80">Payment Settings</Link>
              </p>
            </div>

            {/* Amount Summary */}
            <Card className="p-3 bg-muted/50 border-border/50">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold">MWK {parseFloat(amount).toLocaleString()}</span>
              </div>
            </Card>

            {/* PIN Entry - Only for Mobile Money */}
            {mobileMoneyAccounts.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="pin">Mobile Money PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter your 4-digit PIN"
                  required
                  className="text-center text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Enter your mobile money PIN to confirm payment
                </p>
              </div>
            )}
            
            {/* Security PIN - Only for Bank Accounts */}
            {bankAccounts.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="pin">Security PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter your 4-digit security PIN"
                  required
                  className="text-center text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Enter your security PIN to confirm transaction
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white font-medium h-11"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {submitting ? 'Processing Payment...' : `Confirm & Pay MWK ${parseFloat(amount).toLocaleString()}`}
            </Button>

            {/* Fees Info */}
            <Card className="p-3 bg-primary/5 border-primary/20">
              <p className="text-xs text-foreground">
                <strong>Note:</strong> When you receive your payout, 12% in fees will be deducted: <strong>1% Payout Safety</strong> (protects you if someone pays late), <strong>5% Service & Protection</strong> (fraud detection, support), and <strong>6% Government Fees</strong> (mobile money/bank charges, not charged by PayFesa).
              </p>
            </Card>
          </>
        )}
      </form>

      {/* Contribution History */}
      {!loadingHistory && contributions.length > 0 && (
        <div className="space-y-2 mt-6">
          <h3 className="text-sm font-semibold px-1">Your Contribution History</h3>
          <div className="space-y-2">
            {contributions.map((contribution) => (
              <Card 
                key={contribution.id} 
                className={`p-3 border ${
                  contribution.status === 'completed' 
                    ? 'border-green-200 bg-green-50/30' 
                    : contribution.status === 'pending'
                    ? 'border-yellow-200 bg-yellow-50/30'
                    : 'border-red-200 bg-red-50/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getStatusIcon(contribution.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">
                          MWK {contribution.amount.toLocaleString()}
                        </p>
                        {getStatusBadge(contribution.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Cycle #{contribution.cycle_number} • {new Date(contribution.created_at).toLocaleDateString()}
                      </p>
                      {contribution.mobile_money_reference && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ref: {contribution.mobile_money_reference}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {contribution.payment_method}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContributeTab;
