import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { AdminHeader } from '@/components/admin/AdminHeader';

interface Dispute {
  id: string;
  user_id: string;
  transaction_id: string;
  dispute_type: string;
  reason: string;
  amount: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  admin_notes: string | null;
  evidence: any;
  users: {
    name: string;
    phone_number: string;
  };
  transactions: {
    type: string;
    status: string;
  };
}

const AdminDisputes = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [resolution, setResolution] = useState<'approved' | 'rejected'>('approved');
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  useEffect(() => {
    // Realtime updates for disputes
    const channel = supabase
      .channel('admin-disputes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_disputes' }, () => {
        fetchDisputes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAdminAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/admin/login');
      return;
    }

    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      const adminSession = sessionStorage.getItem('admin_session');
      if (adminSession) {
        try {
          const session = JSON.parse(adminSession);
          const ageOk = Date.now() - session.timestamp < 24 * 60 * 60 * 1000;
          if (ageOk) {
            fetchDisputes();
            return;
          }
        } catch {}
      }
      toast.error('Admin access required');
      navigate('/admin/login');
      return;
    }

    fetchDisputes();
  };

  const fetchDisputes = async () => {
    try {
      let query = supabase
        .from('payment_disputes')
        .select(`
          *,
          users!payment_disputes_user_id_fkey (name, phone_number),
          transactions!payment_disputes_transaction_id_fkey (type, status)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDisputes(data || []);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute || !adminNotes.trim()) {
      toast.error('Please provide resolution notes');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('payment_disputes')
        .update({
          status: resolution,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id || null,
          admin_notes: adminNotes,
        })
        .eq('id', selectedDispute.id);

      if (error) throw error;

      // If approved, we might need to refund or adjust the transaction
      if (resolution === 'approved') {
        // Add refund logic here via edge function
        await supabase.functions.invoke('process-dispute-refund', {
          body: {
            disputeId: selectedDispute.id,
            userId: selectedDispute.user_id,
            amount: selectedDispute.amount,
          }
        });
      }

      toast.success(`Dispute ${resolution}`);
      setDialogOpen(false);
      setSelectedDispute(null);
      setAdminNotes('');
      fetchDisputes();
    } catch (error: any) {
      console.error('Error resolving dispute:', error);
      toast.error(error.message || 'Failed to resolve dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      pending: { variant: 'outline', icon: Clock },
      approved: { variant: 'default', icon: CheckCircle2 },
      rejected: { variant: 'destructive', icon: XCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const filteredDisputes = disputes;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        <AdminHeader
          title="Payment Disputes"
          description="Manage and resolve user payment disputes"
          icon={<AlertTriangle className="h-5 w-5 text-primary" />}
          actions={
            <Select value={filterStatus} onValueChange={(value) => {
              setFilterStatus(value);
              fetchDisputes();
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Disputes</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Dispute Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading disputes...</div>
            ) : filteredDisputes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No disputes found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDisputes.map((dispute) => (
                    <TableRow key={dispute.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{dispute.users?.name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">
                            {dispute.users?.phone_number || 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{dispute.dispute_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">MWK {dispute.amount.toLocaleString()}</TableCell>
                      <TableCell className="max-w-xs truncate">{dispute.reason}</TableCell>
                      <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(dispute.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedDispute(dispute);
                            setAdminNotes(dispute.admin_notes || '');
                            setDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Dispute</DialogTitle>
            <DialogDescription>
              Review and resolve this payment dispute
            </DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>User</Label>
                  <div className="font-medium">{selectedDispute.users?.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedDispute.users?.phone_number}</div>
                </div>
                <div>
                  <Label>Amount</Label>
                  <div className="font-mono text-lg">MWK {selectedDispute.amount.toLocaleString()}</div>
                </div>
              </div>

              <div>
                <Label>Dispute Type</Label>
                <div className="mt-1">
                  <Badge>{selectedDispute.dispute_type}</Badge>
                </div>
              </div>

              <div>
                <Label>User's Reason</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">{selectedDispute.reason}</div>
              </div>

              {selectedDispute.evidence && Object.keys(selectedDispute.evidence).length > 0 && (
                <div>
                  <Label>Evidence</Label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-auto">
                    {JSON.stringify(selectedDispute.evidence, null, 2)}
                  </pre>
                </div>
              )}

              {selectedDispute.status === 'pending' && (
                <>
                  <div>
                    <Label>Resolution</Label>
                    <Select value={resolution} onValueChange={(value: any) => setResolution(value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Approve & Refund</SelectItem>
                        <SelectItem value="rejected">Reject Dispute</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Admin Notes (Required)</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Explain your decision..."
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              {selectedDispute.status !== 'pending' && (
                <div>
                  <Label>Admin Notes</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md">{selectedDispute.admin_notes || 'No notes'}</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Resolved on {new Date(selectedDispute.resolved_at!).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
            {selectedDispute?.status === 'pending' && (
              <Button onClick={handleResolve} disabled={submitting || !adminNotes.trim()}>
                {submitting ? 'Processing...' : `${resolution === 'approved' ? 'Approve' : 'Reject'} Dispute`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDisputes;
