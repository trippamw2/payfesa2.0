import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Check, Trash2, Edit, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import AddBankAccountDialog from '@/components/banking/AddBankAccountDialog';
import EditBankAccountDialog from '@/components/banking/EditBankAccountDialog';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_verified: boolean;
  is_primary: boolean;
}

const BankAccountManagement = () => {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  useEffect(() => {
    fetchAccounts();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('bankaccounts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts'
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
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts((data || []) as BankAccount[]);
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

      await supabase
        .from('bank_accounts')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_primary: true })
        .eq('id', accountId);

      if (error) throw error;

      toast.success('Primary account updated');
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

    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast.success('Account deleted');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
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
            <h1 className="text-lg font-bold">Bank Accounts</h1>
            <p className="text-[10px] text-muted-foreground">Manage bank accounts</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} size="sm" className="h-7">
            <Plus className="mr-1.5 h-3 w-3" />
            <span className="text-xs">Add</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <p className="text-[10px] text-muted-foreground">Loading...</p>
        </div>
      ) : accounts.length === 0 ? (
        <Card className="p-6 text-center">
          <Building2 className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-sm font-semibold mb-1.5">No bank accounts</h3>
          <p className="text-[10px] text-muted-foreground mb-3">Add your first account</p>
          <Button onClick={() => setShowAddDialog(true)} size="sm" className="h-7">
            <Plus className="mr-1.5 h-3 w-3" />
            <span className="text-xs">Add</span>
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <Card key={account.id} className="p-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-primary/10 rounded">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="font-semibold text-xs">{account.bank_name}</h3>
                    {account.is_primary && (
                      <Badge variant="default" className="text-[8px] h-4 px-1">Primary</Badge>
                    )}
                    {account.is_verified && (
                      <Badge variant="secondary" className="text-[8px] h-4 px-1 bg-green-100 text-green-700">
                        <Check className="h-2.5 w-2.5 mr-0.5" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{account.account_name}</p>
                  <p className="text-[9px] font-mono">{account.account_number}</p>
                </div>
                <div className="flex gap-1">
                  {!account.is_primary && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[9px] px-2"
                      onClick={() => handleSetPrimary(account.id)}
                    >
                      Set Primary
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setEditingAccount(account)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(account.id, account.is_primary)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddBankAccountDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchAccounts}
      />

      {editingAccount && (
        <EditBankAccountDialog
          open={!!editingAccount}
          onOpenChange={(open) => !open && setEditingAccount(null)}
          account={editingAccount}
          onSuccess={fetchAccounts}
        />
      )}
    </div>
  );
};

export default BankAccountManagement;
