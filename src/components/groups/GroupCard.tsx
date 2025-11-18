import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, DollarSign } from 'lucide-react';

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    description: string;
    contribution_amount: number;
    frequency: string;
    max_members: number;
    current_members: number;
    start_date: string;
  };
  onAction: () => void;
  actionLabel: string;
  actionIcon?: React.ReactNode;
}

const GroupCard = ({ group, onAction, actionLabel, actionIcon }: GroupCardProps) => {
  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{group.name}</h3>
          {group.description && (
            <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
          )}
        </div>
        <Badge variant="secondary" className="ml-2">
          {group.frequency}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-primary" />
          <span className="font-medium">MK {group.contribution_amount.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-primary" />
          <span>{group.current_members}/{group.max_members}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{new Date(group.start_date).toLocaleDateString()}</span>
        </div>
      </div>

      <Button
        onClick={onAction}
        className="w-full bg-primary text-white"
      >
        {actionIcon && <span className="mr-2">{actionIcon}</span>}
        {actionLabel}
      </Button>
    </Card>
  );
};

export default GroupCard;
