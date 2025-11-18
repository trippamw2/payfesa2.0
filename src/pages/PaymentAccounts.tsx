import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Check, Trash2, Smartphone, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';
import AddMobileMoneyDialog from '@/components/mobilemoney/AddMobileMoneyDialog';
import EditMobileMoneyDialog from '@/components/mobilemoney/EditMobileMoneyDialog';
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

const PaymentAccounts = () => {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [accounts, setAccounts] = useState<MobileMoneyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<MobileMoneyAccount | null>(null);

  useEffect(() => {
    fetchAccounts();
    
    const channel = supabase
      .channel('payment_accounts_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mobile_money_accounts' }, fetchAccounts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('mobile_money_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts((data || []) as MobileMoneyAccount[]);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load payment accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (accountId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('mobile_money_accounts')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('mobile_money_accounts')
        .update({ is_primary: true })
        .eq('id', accountId);

      if (error) throw error;

      toast.success('Primary account updated');
      fetchAccounts();
    } catch (error) {
      console.error('Error setting primary:', error);
      toast.error('Failed to update primary account');
    }
  };

  const handleDelete = async (accountId: string, isPrimary: boolean) => {
    if (isPrimary && accounts.length > 1) {
      toast.error('Cannot delete primary account. Set another account as primary first.');
      return;
    }

    if (accounts.length === 1) {
      toast.error('You must have at least one payment account');
      return;
    }

    try {
      const { error } = await supabase
        .from('mobile_money_accounts')
        .delete()
        .eq('id', accountId);

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
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">Payment Accounts</h1>
              <p className="text-xs text-muted-foreground">Manage your mobile money accounts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 pb-20">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {accounts.length === 0 ? 'Add your first mobile money account' : `${accounts.length} account${accounts.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </div>

          {accounts.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">No payment accounts</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add a mobile money account to receive payouts and make contributions
              </p>
              <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Mobile Money Account
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <Card key={account.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center border-2">
                      <img
                        src={getProviderLogo(account.provider)}
                        alt={account.provider}
                        className="w-8 h-8 object-contain"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{account.account_name}</p>
                        {account.is_primary && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">
                            <Check className="h-3 w-3 mr-1" />
                            Primary
                          </Badge>
                        )}
                        {account.is_verified && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{getProviderName(account.provider)}</p>
                      <p className="text-xs text-muted-foreground font-mono">{account.phone_number}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!account.is_primary && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetPrimary(account.id)}
                          className="text-xs"
                        >
                          Set Primary
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(account.id, account.is_primary)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">About Payment Accounts</h4>
                <p className="text-xs text-muted-foreground">
                  Your primary account is used for automatic payouts. You can switch between accounts anytime. All mobile money accounts must be registered in your name.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <AddMobileMoneyDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchAccounts}
      />

      {editingAccount && (
        <EditMobileMoneyDialog
          account={editingAccount}
          open={!!editingAccount}
          onOpenChange={(open) => !open && setEditingAccount(null)}
          onSuccess={fetchAccounts}
        />
      )}
    </div>
  );
};

export default PaymentAccounts;
