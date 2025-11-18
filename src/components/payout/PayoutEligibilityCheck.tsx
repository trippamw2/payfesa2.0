import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EligibilityCheckProps {
  groupId: string;
  userId: string;
  onEligibilityChange?: (eligible: boolean) => void;
}

export const PayoutEligibilityCheck = ({ groupId, userId, onEligibilityChange }: EligibilityCheckProps) => {
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [checks, setChecks] = useState({
    isNextRecipient: false,
    hasContributed: false,
    hasPaymentMethod: false,
    groupIsActive: false,
    sufficientBalance: false
  });
  const [nextPayoutDate, setNextPayoutDate] = useState<string | null>(null);

  useEffect(() => {
    checkEligibility();
  }, [groupId, userId]);

  const checkEligibility = async () => {
    try {
      setLoading(true);

      // Check if user is a member and get their status
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('has_contributed, payout_position')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      if (memberError) throw memberError;

      // Check group status and escrow balance
      const { data: groupData, error: groupError } = await supabase
        .from('rosca_groups')
        .select('status, amount, current_round, max_rounds')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      // Check escrow balance
      const { data: escrowData, error: escrowError } = await supabase
        .from('group_escrows')
        .select('total_balance, next_payout_date')
        .eq('group_id', groupId)
        .single();

      if (escrowError) throw escrowError;

      // Check if user has payment method
      const [mobileData, bankData] = await Promise.all([
        supabase
          .from('mobile_money_accounts')
          .select('id, is_verified')
          .eq('user_id', userId)
          .eq('is_active', true)
          .eq('is_primary', true)
          .maybeSingle(),
        supabase
          .from('bank_accounts')
          .select('id, is_verified')
          .eq('user_id', userId)
          .eq('is_primary', true)
          .maybeSingle()
      ]);

      const hasPaymentMethod = !!(mobileData.data || bankData.data);

      // Get all members ordered by payout position to determine next recipient
      const { data: allMembers, error: membersError } = await supabase
        .from('group_members')
        .select('user_id, payout_position, last_payout_at')
        .eq('group_id', groupId)
        .order('payout_position', { ascending: true });

      if (membersError) throw membersError;

      // Find next recipient (first member who hasn't received payout in current round)
      const nextRecipient = allMembers?.find(m => !m.last_payout_at || 
        (groupData.current_round && m.last_payout_at < groupData.current_round)
      );

      const isNextRecipient = nextRecipient?.user_id === userId;
      const sufficientBalance = (escrowData?.total_balance || 0) >= (groupData?.amount || 0);

      const eligibilityChecks = {
        isNextRecipient,
        hasContributed: memberData?.has_contributed || false,
        hasPaymentMethod,
        groupIsActive: groupData?.status === 'active',
        sufficientBalance
      };

      setChecks(eligibilityChecks);
      setNextPayoutDate(escrowData?.next_payout_date || null);
      
      const isEligible = Object.values(eligibilityChecks).every(v => v === true);
      setEligible(isEligible);
      onEligibilityChange?.(isEligible);

    } catch (error) {
      console.error('Error checking eligibility:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout Eligibility</CardTitle>
        <CardDescription>Check your eligibility for instant payout</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <EligibilityItem 
          label="You are the next recipient" 
          status={checks.isNextRecipient}
        />
        <EligibilityItem 
          label="You have contributed this round" 
          status={checks.hasContributed}
        />
        <EligibilityItem 
          label="Payment method is set up" 
          status={checks.hasPaymentMethod}
        />
        <EligibilityItem 
          label="Group is active" 
          status={checks.groupIsActive}
        />
        <EligibilityItem 
          label="Sufficient group balance" 
          status={checks.sufficientBalance}
        />

        {nextPayoutDate && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Next scheduled payout: {new Date(nextPayoutDate).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        )}

        {!eligible && (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              You are not currently eligible for payout. Please ensure all requirements are met.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

const EligibilityItem = ({ label, status }: { label: string; status: boolean }) => {
  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
      <span className="text-sm">{label}</span>
      {status ? (
        <CheckCircle2 className="h-5 w-5 text-green-500" />
      ) : (
        <XCircle className="h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );
};
