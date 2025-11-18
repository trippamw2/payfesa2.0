import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Calendar, TrendingUp, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  userName: string;
  groupName: string;
  payoutAmount: number;
  payoutDate: string;
  position: number;
  totalMembers: number;
}

export const PayoutComingCard = ({ userName, groupName, payoutAmount, payoutDate, position, totalMembers }: Props) => {
  const daysUntil = formatDistanceToNow(new Date(payoutDate), { addSuffix: true });

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 text-white p-6 w-full max-w-md">
      {/* Animated sparkles background */}
      <div className="absolute inset-0 opacity-20">
        <Sparkles className="absolute top-4 right-8 h-8 w-8 animate-pulse" />
        <Sparkles className="absolute top-12 right-4 h-6 w-6 animate-pulse delay-100" />
        <Sparkles className="absolute bottom-8 left-8 h-10 w-10 animate-pulse delay-200" />
        <Sparkles className="absolute bottom-4 left-16 h-5 w-5 animate-pulse delay-300" />
      </div>

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-8 w-8" />
            <span className="text-lg font-bold">Payout Coming! 🎉</span>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            #{position}/{totalMembers}
          </Badge>
        </div>

        {/* Main content */}
        <div className="space-y-3">
          <div>
            <p className="text-sm opacity-90">{userName} is receiving</p>
            <p className="text-4xl font-bold">MWK {payoutAmount.toLocaleString()}</p>
          </div>
          
          <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-sm opacity-90">from {groupName}</p>
          </div>
        </div>

        {/* Date info */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          <span>Payout {daysUntil}</span>
        </div>

        {/* Excitement message */}
        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
          <p className="text-center font-semibold">
            {position === 1 ? "First in line! 🏆" : position <= 3 ? "Almost there! 🎯" : "Great progress! 💪"}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/20">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Saving with PayFesa</span>
          </div>
          <span className="text-xs opacity-75">Join us today!</span>
        </div>
      </div>
    </Card>
  );
};
