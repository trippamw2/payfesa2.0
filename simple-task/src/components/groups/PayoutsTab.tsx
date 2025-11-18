import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, TrendingDown, Zap, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';
import { celebratePayoutBurst } from '@/lib/confetti';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Payout {
  id: string;
  amount: number;
  status: string;
  payout_date: string;
  cycle_number: number;
  recipient_id: string;
  profiles: {
    full_name: string;
  };
}

interface Props {
  groupId: string;
  currentUserId: string;
}

const PayoutsTab = ({ groupId, currentUserId }: Props) => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [hasPendingPayout, setHasPendingPayout] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);

  useEffect(() => {
    fetchPayouts();
    
    // Subscribe to realtime payout updates
    const channel = supabase
      .channel(`payouts-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payouts',
          filter: `group_id=eq.${groupId}`,
        },
        () => fetchPayouts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const fetchPayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('group_id', groupId)
        .order('cycle_number', { ascending: false });

      if (error) throw error;

      if (!data) {
        setPayouts([]);
        setLoading(false);
        return;
      }

      // Fetch users separately
      const recipientIds = data.map(p => p.recipient_id);
      const { data: profilesData } = await supabase
        .from('users')
        .select('id, name')
        .in('id', recipientIds);

      // Merge profiles with payouts
      const payoutsWithProfiles = data.map(payout => ({
        ...payout,
        profiles: profilesData?.find(p => p.id === payout.recipient_id) || { name: 'Unknown' }
      }));

      setPayouts(payoutsWithProfiles as any);
      
      // Check if user has pending payout
      const pending = data.some(p => p.recipient_id === currentUserId && p.status === 'pending');
      setHasPendingPayout(pending);

      // Check if user just received a completed payout and celebrate
      const userCompletedPayouts = data.filter(p => 
        p.recipient_id === currentUserId && 
        p.status === 'completed'
      );
      
      if (userCompletedPayouts.length > 0) {
        const latestPayout = userCompletedPayouts[0];
        const payoutDate = new Date(latestPayout.payout_date);
        const now = new Date();
        const hoursSincePayout = (now.getTime() - payoutDate.getTime()) / (1000 * 60 * 60);
        
        // If payout was completed in last 24 hours, celebrate
        if (hoursSincePayout < 24) {
          const hasSeenCelebration = sessionStorage.getItem(`payout-celebrated-${latestPayout.id}`);
          if (!hasSeenCelebration) {
            setTimeout(() => {
              celebratePayoutBurst();
            }, 500);
            sessionStorage.setItem(`payout-celebrated-${latestPayout.id}`, 'true');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching payouts:', error);
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const handleInstantPayoutClick = () => {
    setShowPinDialog(true);
    setPin('');
  };

  const verifyPinAndRequestPayout = async () => {
    if (pin.length !== 4) {
      toast.error('Please enter a 4-digit PIN');
      return;
    }

    setVerifyingPin(true);
    setRequesting(true);
    try {
      // Get pending payout
      const pendingPayout = payouts.find(
        p => p.recipient_id === currentUserId && p.status === 'pending'
      );

      if (!pendingPayout) {
        toast.error('No pending payout found for your account');
        setShowPinDialog(false);
        return;
      }

      console.log('Processing instant payout:', pendingPayout.id);

      // Call instant payout edge function
      const { data, error } = await supabase.functions.invoke('process-instant-payout', {
        body: {
          payoutId: pendingPayout.id,
          pin: pin
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to process instant payout');
      }

      if (!data || data.error) {
        throw new Error(data?.error || 'Failed to process instant payout');
      }

      toast.success('Instant payout processed successfully! Amount will be transferred shortly.');
      celebratePayoutBurst();
      setShowPinDialog(false);
      setPin('');
      
      // Refresh payouts after a short delay to allow backend processing
      setTimeout(() => {
        fetchPayouts();
      }, 1000);
      
    } catch (error: any) {
      console.error('Error processing instant payout:', error);
      toast.error(error.message || 'Failed to process instant payout. Please try again.');
    } finally {
      setVerifyingPin(false);
      setRequesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 text-[10px]"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      {/* Instant Payout Option */}
      {hasPendingPayout && (
        <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Zap className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base">⚡ Instant Payout Available</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Get your payout immediately! Service fee: <span className="font-semibold text-amber-700">MWK 1,500</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your payout will be sent to your registered mobile money or bank account within minutes.
                </p>
              </div>
            </div>
            <Button
              onClick={handleInstantPayoutClick}
              disabled={requesting || verifyingPin}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-md"
              size="default"
            >
              <Zap className="h-4 w-4 mr-2" />
              {requesting || verifyingPin ? 'Processing...' : 'Request Instant Payout Now'}
            </Button>
          </div>
        </Card>
      )}

      {/* Payouts List */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold px-1">Payout History</h3>
        {payouts.length === 0 ? (
          <Card className="p-6 text-center border border-border/50">
            <TrendingDown className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No payouts yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {payouts.map((payout) => (
              <Card 
                key={payout.id} 
                className={`p-3 border transition-all ${
                  payout.recipient_id === currentUserId && payout.status === 'completed'
                    ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 animate-fade-in'
                    : 'border-border/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">
                        {(payout.profiles as any)?.full_name || 'Unknown'}
                      </p>
                      {payout.recipient_id === currentUserId && payout.status === 'completed' && (
                        <Badge variant="default" className="bg-green-500 text-white text-[10px]">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cycle #{payout.cycle_number}
                    </p>
                  </div>
                  {getStatusBadge(payout.status)}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(payout.payout_date).toLocaleDateString()}</span>
                  </div>
                  <p className={`text-sm font-bold ${
                    payout.recipient_id === currentUserId && payout.status === 'completed'
                      ? 'text-green-600'
                      : 'text-secondary'
                  }`}>
                    MWK {payout.amount.toLocaleString()}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* PIN Verification Dialog */}
      <Dialog open={showPinDialog} onOpenChange={(open) => {
        if (!verifyingPin && !requesting) {
          setShowPinDialog(open);
          if (!open) setPin('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Verify Instant Payout
            </DialogTitle>
            <DialogDescription>
              Enter your 4-digit PIN to process instant payout
              <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                <p className="text-xs text-amber-800">
                  <strong>Service Fee:</strong> MWK 1,500 will be deducted from your payout
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Security PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pin.length === 4 && !verifyingPin && !requesting) {
                    verifyPinAndRequestPayout();
                  }
                }}
                className="text-2xl text-center tracking-widest font-bold"
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 4-digit PIN you created during registration
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPinDialog(false);
                  setPin('');
                }}
                disabled={verifyingPin || requesting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={verifyPinAndRequestPayout}
                disabled={verifyingPin || requesting || pin.length !== 4}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500"
              >
                {verifyingPin || requesting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Confirm
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayoutsTab;
