import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';

interface JoinByCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const JoinByCodeDialog = ({ open, onOpenChange, onSuccess }: JoinByCodeDialogProps) => {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(false);
  const [groupCode, setGroupCode] = useState('');
  const [inviterName, setInviterName] = useState('');

  const recalculatePayoutPositions = async (groupId: string) => {
    try {
      // Get all members with their trust scores
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select(`
          user_id,
          users!inner(trust_score)
        `)
        .eq('group_id', groupId);

      if (membersError) throw membersError;
      if (!members) return;

      // Sort members by trust score (highest first)
      const sortedMembers = members
        .map(m => ({
          user_id: m.user_id,
          trust_score: (m.users as any).trust_score || 50
        }))
        .sort((a, b) => b.trust_score - a.trust_score);

      // Update payout positions
      for (let i = 0; i < sortedMembers.length; i++) {
        await supabase
          .from('group_members')
          .update({ payout_position: i + 1 })
          .eq('group_id', groupId)
          .eq('user_id', sortedMembers[i].user_id);
      }

      console.log('Payout positions recalculated based on trust scores');
    } catch (error) {
      console.error('Error recalculating payout positions:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupCode || !inviterName) {
      toast.error(t('required'));
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Find group by code
      const { data: group, error: groupError } = await supabase
        .from('rosca_groups')
        .select('*')
        .eq('group_code', groupCode.toUpperCase())
        .eq('status', 'active')
        .maybeSingle();

      if (groupError) throw groupError;

      if (!group) {
        toast.error(t('groupNotFound'));
        return;
      }

      // Get creator info to verify inviter name
      const { data: creatorData } = await supabase
        .from('users')
        .select('name')
        .eq('id', group.created_by)
        .single();

      // Check if inviter name matches (case insensitive)
      if (!creatorData || creatorData.name?.toLowerCase() !== inviterName.toLowerCase()) {
        toast.error('Inviter name does not match. Please check and try again.');
        return;
      }

      // Check if group is full
      if (group.current_members >= group.max_members) {
        toast.error(t('groupFull'));
        return;
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMember) {
        toast.error(t('alreadyInGroup'));
        return;
      }

      // Get user's trust score for initial position assignment
      const { data: userData } = await supabase
        .from('users')
        .select('trust_score')
        .eq('id', user.id)
        .single();

      const trustScore = userData?.trust_score || 50;

      // Add user to group
      const position = group.current_members + 1;
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          position_in_cycle: position,
          payout_position: position // Temporary, will be recalculated below
        });

      if (memberError) throw memberError;

      // Update group member count
      const { error: updateError } = await supabase
        .from('rosca_groups')
        .update({ current_members: group.current_members + 1 })
        .eq('id', group.id);

      if (updateError) throw updateError;

      // Recalculate payout positions based on trust scores
      await recalculatePayoutPositions(group.id);

      toast.success(t('groupJoinedSuccess'));
      setGroupCode('');
      setInviterName('');
      onSuccess();
    } catch (error: any) {
      console.error('Error joining group:', error);
      toast.error(error.message || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('joinByCode')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupCode">{t('groupCode')} *</Label>
            <Input
              id="groupCode"
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
              placeholder={t('enterGroupCode')}
              maxLength={6}
              className="uppercase"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inviterName">{t('inviterName')} *</Label>
            <Input
              id="inviterName"
              value={inviterName}
              onChange={(e) => setInviterName(e.target.value)}
              placeholder={t('enterInviterName')}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('joinGroup')}...
                </>
              ) : (
                t('joinGroup')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JoinByCodeDialog;
