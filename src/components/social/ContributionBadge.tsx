import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, TrendingUp } from 'lucide-react';

interface Props {
  userName: string;
  groupName: string;
  amount: number;
  streakCount: number;
  trustScore: number;
}

export const ContributionBadge = ({ userName, groupName, amount, streakCount, trustScore }: Props) => {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground p-6 w-full max-w-md">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
      
      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-8 w-8" />
            <span className="text-lg font-bold">Contribution Made!</span>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            🔥 {streakCount} streak
          </Badge>
        </div>

        {/* Main content */}
        <div className="space-y-2">
          <p className="text-2xl font-bold">MWK {amount.toLocaleString()}</p>
          <p className="text-sm opacity-90">{userName} contributed to</p>
          <p className="text-lg font-semibold">{groupName}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 pt-4 border-t border-white/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Trust Score: {trustScore}</span>
          </div>
          <div className="flex-1 text-right text-xs opacity-75">
            Powered by PayFesa
          </div>
        </div>
      </div>
    </Card>
  );
};
