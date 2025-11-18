import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Payout {
  id: string;
  amount: number;
  gross_amount: number;
  fee_amount: number;
  status: string;
  payout_date: string;
  cycle_number: number;
  recipient_id: string;
  group_id: string;
  profiles: {
    full_name: string;
    phone_number: string;
  };
  rosca_groups: {
    name: string;
  };
  mobile_money_accounts: Array<{
    provider: string;
    phone_number: string;
    account_name: string;
  }>;
}

const AdminPayouts = () => {
  const navigate = useNavigate();
  const { goBack } = useBackNavigation();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject'>('approve');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkAdminAndFetchPayouts();
  }, []);

  const checkAdminAndFetchPayouts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user is admin
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!role) {
        // Fallback to admin session (from /admin/login)
        const adminSession = sessionStorage.getItem('admin_session');
        if (adminSession) {
          try {
            const session = JSON.parse(adminSession);
            const ageOk = Date.now() - session.timestamp < 24 * 60 * 60 * 1000;
            if (ageOk) {
              setIsAdmin(true);
              fetchPayouts();
              return;
            }
          } catch {}
        }
        toast.error('Admin access required');
        navigate('/admin/login');
        return;
      }

      setIsAdmin(true);
      fetchPayouts();
    } catch (error) {
      console.error('Error checking admin:', error);
      toast.error('Failed to verify permissions');
      navigate('/dashboard');
    }
  };

  const fetchPayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('payouts')
        .select(`
          *,
          profiles!payouts_recipient_id_fkey (full_name, phone_number),
          rosca_groups (name)
        `)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch mobile money accounts for each recipient
      const payoutsWithAccounts = await Promise.all(
        (data || []).map(async (payout) => {
          const { data: accounts } = await supabase
            .from('mobile_money_accounts')
            .select('*')
            .eq('user_id', payout.recipient_id)
            .eq('is_primary', true);

          return {
            ...payout,
            mobile_money_accounts: accounts || []
          };
        })
      );

      setPayouts(payoutsWithAccounts as any);
    } catch (error) {
      console.error('Error fetching payouts:', error);
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (payout: Payout, action: 'approve' | 'reject') => {
    setSelectedPayout(payout);
    setDialogAction(action);
    setShowDialog(true);
  };

  const confirmAction = async () => {
    if (!selectedPayout) return;

    setProcessing(true);
    try {
      // Get admin session
      const adminSession = sessionStorage.getItem('admin_session');
      let adminId = null;
      
      if (adminSession) {
        try {
          const session = JSON.parse(adminSession);
          adminId = session.adminId;
        } catch {}
      }

      const { data, error } = await supabase.functions.invoke('admin-manual-payout', {
        body: {
          payoutId: selectedPayout.id,
          adminId
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Payout processed successfully');
        setShowDialog(false);
        setSelectedPayout(null);
        fetchPayouts();
      } else {
        throw new Error(data?.error || 'Failed to process payout');
      }
    } catch (error: any) {
      console.error('Error processing payout action:', error);
      toast.error(error.message || 'Failed to process payout');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={goBack}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin: Payout Approvals</h1>
            <p className="text-muted-foreground">Review and approve pending payouts</p>
          </div>
        </div>
      </div>

      {/* Pending Count */}
      <Card className="p-4 mb-6 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium mb-1">Pending Approvals</p>
            <p className="text-3xl font-bold text-amber-600">{payouts.length}</p>
          </div>
          <Clock className="h-10 w-10 text-amber-600" />
        </div>
      </Card>

      {/* Payouts List */}
      <div className="space-y-4">
        {payouts.length === 0 ? (
          <Card className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
            <p className="text-muted-foreground">
              No pending payouts require approval
            </p>
          </Card>
        ) : (
          payouts.map((payout) => (
            <Card key={payout.id} className="p-4 border-2">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-lg">
                        {(payout.profiles as any)?.full_name || 'Unknown'}
                      </p>
                      <Badge className="bg-amber-100 text-amber-700">
                        <Clock className="h-3 w-3 mr-1" />
                        {payout.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {(payout.rosca_groups as any)?.name} • Cycle #{payout.cycle_number}
                    </p>
                  </div>
                </div>

                {/* Recipient Info */}
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium">{(payout.profiles as any)?.phone_number}</span>
                  </div>
                  {payout.mobile_money_accounts.length > 0 && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Payment Account:</span>
                        <span className="font-medium">
                          {payout.mobile_money_accounts[0].provider === 'airtel' ? 'Airtel Money' : 'TNM Mpamba'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Account:</span>
                        <span className="font-medium font-mono text-xs">
                          {payout.mobile_money_accounts[0].phone_number}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Amount Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Gross Amount:</span>
                    <span className="font-medium">MWK {payout.gross_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Platform Fee (11%):</span>
                    <span className="font-medium text-red-600">
                      -MWK {payout.fee_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-semibold">Net Payout:</span>
                    <span className="text-xl font-bold text-green-600">
                      MWK {payout.amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => handleAction(payout, 'approve')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve & Disburse
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleAction(payout, 'reject')}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'approve' ? 'Approve Payout?' : 'Reject Payout?'}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === 'approve' 
                ? `This will disburse MWK ${selectedPayout?.amount.toLocaleString()} to ${(selectedPayout?.profiles as any)?.full_name}'s mobile money or bank account.`
                : `This will reject the payout and return funds to the group escrow.`
              }
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && dialogAction === 'approve' && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="font-medium">Disbursement Details:</span>
              </div>
              <div className="text-sm space-y-1 pl-6">
                <p>Amount: <span className="font-bold">MWK {selectedPayout.amount.toLocaleString()}</span></p>
                {selectedPayout.mobile_money_accounts.length > 0 && (
                  <p>To: <span className="font-mono text-xs">{selectedPayout.mobile_money_accounts[0].phone_number}</span></p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={processing}
              className={dialogAction === 'approve' ? 'bg-green-500 hover:bg-green-600' : ''}
              variant={dialogAction === 'reject' ? 'destructive' : 'default'}
            >
              {processing ? 'Processing...' : `Confirm ${dialogAction === 'approve' ? 'Approval' : 'Rejection'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayouts;
