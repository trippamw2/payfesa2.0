import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Copy, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/lib/i18n';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateGroupDialog = ({ open, onOpenChange, onSuccess }: CreateGroupDialogProps) => {
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [loading, setLoading] = useState(false);
  const [createdGroupCode, setCreatedGroupCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contribution_amount: '',
    frequency: 'weekly',
    max_members: '10',
    start_date: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.contribution_amount || !formData.start_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create group
      const { data: group, error: groupError } = await supabase
        .from('rosca_groups')
        .insert({
          contribution_amount: parseFloat(formData.contribution_amount),
          description: formData.description,
          frequency: formData.frequency,
          max_members: parseInt(formData.max_members),
          start_date: formData.start_date,
          created_by: user.id,
          current_members: 1
        } as any)
        .select()
        .single();

      if (groupError) throw groupError;

      // Get creator's trust score
      const { data: userData } = await supabase
        .from('users')
        .select('trust_score')
        .eq('id', user.id)
        .single();

      const trustScore = userData?.trust_score || 50;

      // Add creator as first member with initial payout position
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          position_in_cycle: 1,
          payout_position: 1 // Creator gets first position initially
        });

      if (memberError) throw memberError;

      toast.success('Group created successfully!');
      setCreatedGroupCode(group.group_code);
      setFormData({
        name: '',
        description: '',
        contribution_amount: '',
        frequency: 'weekly',
        max_members: '10',
        start_date: ''
      });
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast.error(error.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (createdGroupCode) {
      navigator.clipboard.writeText(createdGroupCode);
      setCopied(true);
      toast.success(t('codeCopied'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setCreatedGroupCode(null);
    setCopied(false);
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base">
            {createdGroupCode ? 'Group Created!' : t('createGroup') || 'Create New Group'}
          </DialogTitle>
        </DialogHeader>

        {createdGroupCode ? (
          <div className="space-y-3 py-2">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center w-full">
                <p className="text-sm font-semibold mb-2">{t('shareGroupCode') || 'Your Group Code'}</p>
                <div className="relative">
                  <code className="text-xl font-mono bg-muted px-4 py-2 rounded-lg block">
                    {createdGroupCode}
                  </code>
                  <Button
                    onClick={handleCopyCode}
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Share this code to invite others
                </p>
              </div>
              <Button onClick={handleClose} className="w-full h-8 text-xs">
                {t('continue') || 'Done'}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">{t('groupName') || 'Group Name'} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter group name"
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs">{t('description') || 'Description'}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What's this group for?"
                className="text-xs min-h-[60px]"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="contribution_amount" className="text-xs">{t('contributionAmount') || 'Amount (MWK)'} *</Label>
                <Input
                  id="contribution_amount"
                  type="number"
                  value={formData.contribution_amount}
                  onChange={(e) => setFormData({ ...formData, contribution_amount: e.target.value })}
                  placeholder="10000"
                  className="h-8 text-xs"
                  required
                  min="100"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="frequency" className="text-xs">{t('frequency') || 'Frequency'} *</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger id="frequency" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily" className="text-xs">Daily</SelectItem>
                    <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                    <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="max_members" className="text-xs">{t('maxMembers') || 'Max Members'} *</Label>
                <Input
                  id="max_members"
                  type="number"
                  value={formData.max_members}
                  onChange={(e) => setFormData({ ...formData, max_members: e.target.value })}
                  placeholder="10"
                  className="h-8 text-xs"
                  required
                  min="2"
                  max="100"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="start_date" className="text-xs">{t('startDate') || 'Start Date'} *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="h-8 text-xs"
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-8 text-xs"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-8 text-xs"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  t('createGroup') || 'Create Group'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
