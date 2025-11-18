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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{t('createGroup') || 'Create New Group'}</DialogTitle>
        </DialogHeader>
        
        {createdGroupCode ? (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-4">
              <div className="text-sm text-muted-foreground">
                {t('shareGroupCode')}
              </div>
              <div className="flex items-center gap-2 bg-muted p-4 rounded-lg">
                <code className="text-2xl font-bold tracking-wider flex-1 text-center">
                  {createdGroupCode}
                </code>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleCopyCode}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button
              onClick={handleClose}
              className="w-full bg-primary text-white"
            >
              {t('continue')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm">{t('groupName') || 'Group Name'} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter group name"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm">{t('description') || 'Description'}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter group description"
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contribution" className="text-sm">{t('contributionAmount') || 'Contribution Amount (MWK)'} *</Label>
            <Input
              id="contribution"
              type="number"
              min="100"
              step="100"
              value={formData.contribution_amount}
              onChange={(e) => setFormData({ ...formData, contribution_amount: e.target.value })}
              placeholder="5000"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="frequency" className="text-sm">{t('frequency') || 'Contribution Frequency'} *</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData({ ...formData, frequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maxMembers" className="text-sm">{t('maxMembers') || 'Maximum Members'} *</Label>
            <Input
              id="maxMembers"
              type="number"
              min="2"
              max="50"
              value={formData.max_members}
              onChange={(e) => setFormData({ ...formData, max_members: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="startDate" className="text-sm">{t('startDate') || 'Start Date'} *</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="flex gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-9 text-sm"
              disabled={loading}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1 h-9 text-sm bg-primary text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  {t('creating')}
                </>
              ) : (
                t('createGroupBtn')
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
