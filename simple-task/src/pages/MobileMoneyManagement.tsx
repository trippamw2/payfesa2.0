import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Check, Trash2, Edit, Smartphone } from 'lucide-react';
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

const MobileMoneyManagement = () => {
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
    
    // Setup realtime subscription
    const channel = supabase
      .channel('mobilemoney_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mobile_money_accounts'
        },
        () => {
          fetchAccounts();
        }
      )
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
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts((data || []) as MobileMoneyAccount[]);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (accountId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Set all accounts to non-primary
      await supabase
        .from('mobile_money_accounts')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      // Set selected account as primary
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
      toast.error('You must have at least one payment account (mobile money or bank account)');
      return;
    }

    try {
      const { error } = await supabase
        .from('mobile_money_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast.success('Account deleted');
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  const getProviderLogo = (provider: string) => {
    return provider === 'airtel' ? airtelLogo : tnmLogo;
  };

  const getProviderName = (provider: string) => {
    return provider === 'airtel' ? 'Airtel Money' : 'TNM Mpamba';
  };

  return (
    <div className="min-h-screen bg-background p-3 pb-20">
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="mb-3 h-7"
        >
          <ArrowLeft className="mr-1.5 h-3 w-3" />
          <span className="text-xs">Back</span>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Payment Accounts</h1>
            <p className="text-[10px] text-muted-foreground">Manage payment accounts</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} size="sm" className="h-7">
            <Plus className="mr-1.5 h-3 w-3" />
            <span className="text-xs">Add</span>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <Card className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Loading...</p>
          </Card>
        ) : accounts.length === 0 ? (
          <Card className="p-6 text-center">
            <Smartphone className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-sm font-semibold mb-1.5">No accounts yet</h3>
            <p className="text-[10px] text-muted-foreground mb-3">Add your first payment account</p>
            <Button onClick={() => setShowAddDialog(true)} size="sm" className="h-7">
              <Plus className="mr-1.5 h-3 w-3" />
              <span className="text-xs">Add</span>
            </Button>
          </Card>
        ) : (
          accounts.map((account) => (
            <Card key={account.id} className={`p-2.5 ${account.is_primary ? 'border border-primary' : ''}`}>
              <div className="flex items-center gap-2.5">
                <img
                  src={getProviderLogo(account.provider)}
                  alt={getProviderName(account.provider)}
                  className="w-8 h-8 object-contain"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="font-semibold text-xs">{account.account_name}</h3>
                    {account.is_primary && (
                      <Badge variant="default" className="text-[8px] h-4 px-1">
                        <Check className="h-2.5 w-2.5 mr-0.5" />
                        Primary
                      </Badge>
                    )}
                    {account.is_verified && (
                      <Badge variant="secondary" className="text-[8px] h-4 px-1 bg-green-500 text-white">
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{getProviderName(account.provider)}</p>
                  <p className="text-[9px] font-mono">{account.phone_number}</p>
                </div>
                <div className="flex gap-1">
                  {!account.is_primary && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[9px] px-2"
                      onClick={() => handleSetPrimary(account.id)}
                    >
                      Set Primary
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setEditingAccount(account)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(account.id, account.is_primary)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Account Dialog */}
      <AddMobileMoneyDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchAccounts}
      />

      {/* Edit Account Dialog */}
      {editingAccount && (
        <EditMobileMoneyDialog
          open={!!editingAccount}
          onOpenChange={(open) => !open && setEditingAccount(null)}
          account={editingAccount}
          onSuccess={fetchAccounts}
        />
      )}
    </div>
  );
};

export default MobileMoneyManagement;
