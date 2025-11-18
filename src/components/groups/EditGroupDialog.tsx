import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: {
    id: string;
    name: string;
    description?: string;
    frequency: string;
    status: string;
    current_members: number;
    max_members: number;
  };
  onSuccess?: () => void;
}

export default function EditGroupDialog({ open, onOpenChange, group, onSuccess }: EditGroupDialogProps) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [frequency, setFrequency] = useState(group.frequency);
  const [updating, setUpdating] = useState(false);

  const canChangeFrequency = group.status !== 'active' && group.current_members < group.max_members;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Group name is required');
      return;
    }

    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('edit-group', {
        body: {
          group_id: group.id,
          name: name.trim(),
          description: description.trim() || undefined,
          frequency: frequency !== group.frequency ? frequency : undefined,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Group updated successfully');
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error(data.error || 'Failed to update group');
      }
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update group');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Group Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
              disabled={updating}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter group description"
              disabled={updating}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Contribution Frequency</Label>
            <Select
              value={frequency}
              onValueChange={setFrequency}
              disabled={updating || !canChangeFrequency}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {!canChangeFrequency && (
              <p className="text-sm text-muted-foreground">
                Frequency cannot be changed for active groups
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updating}>
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
