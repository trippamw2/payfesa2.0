import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Check, Trash2, Smartphone, Building2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';
import AddMobileMoneyDialog from '@/components/mobilemoney/AddMobileMoneyDialog';
import EditMobileMoneyDialog from '@/components/mobilemoney/EditMobileMoneyDialog';
import AddBankAccountDialog from '@/components/banking/AddBankAccountDialog';
import EditBankAccountDialog from '@/components/banking/EditBankAccountDialog';
import airtelLogo from '@/assets/airtel-money-logo.png';
import tnmLogo from '@/assets/tnm-mpamba-logo.jpg';

interface MobileMoneyAccount {
  id: string;
  provider: 'airtel' | 'tnm';
  phone_number: string;
  account_name: string;
  is_verified: boolean;
  is_primary: boolean;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_verified: boolean;
  is_primary: boolean;
}

const PaymentAccounts = () => {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [mobileAccounts, setMobileAccounts] = useState<MobileMoneyAccount[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMobileDialog, setShowAddMobileDialog] = useState(false);
  const [showAddBankDialog, setShowAddBankDialog] = useState(false);
  const [editingMobileAccount, setEditingMobileAccount] = useState<MobileMoneyAccount | null>(null);
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccount | null>(null);

  useEffect(() => {
    fetchAccounts();
    
    const mobileChannel = supabase
      .channel('payment_accounts_mobile')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mobile_money_accounts' }, fetchAccounts)
      .subscribe();

    const bankChannel = supabase
      .channel('payment_accounts_bank')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, fetchAccounts)
      .subscribe();

    return () => {
      supabase.removeChannel(mobileChannel);
      supabase.removeChannel(bankChannel);
    };
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [mobileData, bankData] = await Promise.all([
        supabase
          .from('mobile_money_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('bank_accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: false })
      ]);

      if (mobileData.error) throw mobileData.error;
      if (bankData.error) throw bankData.error;

      setMobileAccounts((mobileData.data || []) as MobileMoneyAccount[]);
      setBankAccounts((bankData.data || []) as BankAccount[]);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load payment accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (accountId: string, type: 'mobile' | 'bank') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Clear all primary flags
      await Promise.all([
        supabase.from('mobile_money_accounts').update({ is_primary: false }).eq('user_id', user.id),
        supabase.from('bank_accounts').update({ is_primary: false }).eq('user_id', user.id)
      ]);

      // Set new primary
      const table = type === 'mobile' ? 'mobile_money_accounts' : 'bank_accounts';
      const { error } = await supabase.from(table).update({ is_primary: true }).eq('id', accountId);

      if (error) throw error;

      toast.success('Primary account updated');
      fetchAccounts();
    } catch (error) {
      console.error('Error setting primary:', error);
      toast.error('Failed to update primary account');
    }
  };

  const handleDelete = async (accountId: string, isPrimary: boolean, type: 'mobile' | 'bank') => {
    const totalAccounts = mobileAccounts.length + bankAccounts.length;
    
    if (isPrimary && totalAccounts > 1) {
      toast.error('Cannot delete primary account. Set another account as primary first.');
      return;
    }

    if (totalAccounts === 1) {
      toast.error('You must have at least one payment account');
      return;
    }

    try {
      const table = type === 'mobile' ? 'mobile_money_accounts' : 'bank_accounts';
      const { error } = await supabase.from(table).delete().eq('id', accountId);

      if (error) throw error;

      toast.success('Account deleted successfully');
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  const getProviderLogo = (provider: string) => {
    return provider.toLowerCase() === 'airtel' ? airtelLogo : tnmLogo;
  };

  const getProviderName = (provider: string) => {
    return provider.toLowerCase() === 'airtel' ? 'Airtel Money' : 'TNM Mpamba';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-3">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-[10px] text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 pb-20">
      {/* Header */}
      <div className="mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="mb-2 h-7"
        >
          <ArrowLeft className="mr-1.5 h-3 w-3" />
          <span className="text-xs">Back</span>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Payment Accounts</h1>
            <p className="text-[10px] text-muted-foreground">
              {(mobileAccounts.length + bankAccounts.length) === 0 
                ? 'Add your first payment account' 
                : `${mobileAccounts.length + bankAccounts.length} account${(mobileAccounts.length + bankAccounts.length) !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Add Account Buttons */}
      <div className="flex gap-2 mb-3">
        <Button onClick={() => setShowAddMobileDialog(true)} size="sm" className="h-7 text-xs flex-1">
          <Smartphone className="mr-1.5 h-3 w-3" />
          Mobile Money
        </Button>
        <Button onClick={() => setShowAddBankDialog(true)} size="sm" variant="outline" className="h-7 text-xs flex-1">
          <Building2 className="mr-1.5 h-3 w-3" />
          Bank Account
        </Button>
      </div>

      {/* Empty State or Accounts List */}
      {(mobileAccounts.length + bankAccounts.length) === 0 ? (
        <Card className="p-6 text-center">
          <Smartphone className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-sm font-semibold mb-1.5">No payment accounts</h3>
          <p className="text-[10px] text-muted-foreground mb-3">
            Add accounts to receive payouts and make contributions
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Mobile Money Accounts */}
          {mobileAccounts.map((account) => (
            <Card key={account.id} className="p-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border">
                  <img
                    src={getProviderLogo(account.provider)}
                    alt={account.provider}
                    className="w-6 h-6 object-contain"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="font-semibold text-xs truncate">{account.account_name}</p>
                    {account.is_primary && (
                      <Badge variant="default" className="text-[8px] h-4 px-1">
                        <Check className="h-2.5 w-2.5 mr-0.5" />
                        Primary
                      </Badge>
                    )}
                    {account.is_verified && (
                      <Badge variant="outline" className="text-[8px] h-4 px-1">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{getProviderName(account.provider)}</p>
                  <p className="text-[9px] text-muted-foreground font-mono">{account.phone_number}</p>
                </div>

                <div className="flex gap-1">
                  {!account.is_primary && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[9px] px-2"
                      onClick={() => handleSetPrimary(account.id, 'mobile')}
                    >
                      Set Primary
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setEditingMobileAccount(account)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(account.id, account.is_primary, 'mobile')}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {/* Bank Accounts */}
          {bankAccounts.map((account) => (
            <Card key={account.id} className="p-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-primary/10 rounded">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="font-semibold text-xs truncate">{account.account_name}</p>
                    {account.is_primary && (
                      <Badge variant="default" className="text-[8px] h-4 px-1">
                        <Check className="h-2.5 w-2.5 mr-0.5" />
                        Primary
                      </Badge>
                    )}
                    {account.is_verified && (
                      <Badge variant="outline" className="text-[8px] h-4 px-1">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{account.bank_name}</p>
                  <p className="text-[9px] text-muted-foreground font-mono">{account.account_number}</p>
                </div>

                <div className="flex gap-1">
                  {!account.is_primary && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[9px] px-2"
                      onClick={() => handleSetPrimary(account.id, 'bank')}
                    >
                      Set Primary
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setEditingBankAccount(account)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(account.id, account.is_primary, 'bank')}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="p-3 mt-3 bg-primary/5 border-primary/20">
        <div className="flex gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-xs mb-1">About Payment Accounts</h4>
            <p className="text-[10px] text-muted-foreground">
              Your primary account is used for automatic payouts. You can add both mobile money and bank accounts. All accounts must be registered in your name.
            </p>
          </div>
        </div>
      </Card>

      {/* Dialogs */}
      <AddMobileMoneyDialog
        open={showAddMobileDialog}
        onOpenChange={setShowAddMobileDialog}
        onSuccess={fetchAccounts}
      />

      <AddBankAccountDialog
        open={showAddBankDialog}
        onOpenChange={setShowAddBankDialog}
        onSuccess={fetchAccounts}
      />

      {editingMobileAccount && (
        <EditMobileMoneyDialog
          account={editingMobileAccount}
          open={!!editingMobileAccount}
          onOpenChange={(open) => !open && setEditingMobileAccount(null)}
          onSuccess={fetchAccounts}
        />
      )}

      {editingBankAccount && (
        <EditBankAccountDialog
          account={editingBankAccount}
          open={!!editingBankAccount}
          onOpenChange={(open) => !open && setEditingBankAccount(null)}
          onSuccess={fetchAccounts}
        />
      )}
    </div>
  );
};

export default PaymentAccounts;
