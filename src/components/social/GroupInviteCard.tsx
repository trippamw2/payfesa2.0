import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, Calendar, QrCode, ArrowRight } from 'lucide-react';

interface Props {
  groupName: string;
  groupCode: string;
  contributionAmount: number;
  frequency: string;
  currentMembers: number;
  maxMembers: number;
  inviterName: string;
}

export const GroupInviteCard = ({ 
  groupName, 
  groupCode, 
  contributionAmount, 
  frequency, 
  currentMembers, 
  maxMembers,
  inviterName 
}: Props) => {
  const spotsLeft = maxMembers - currentMembers;

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 text-white p-6 w-full max-w-md">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" />

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            {inviterName} invited you!
          </Badge>
          <h2 className="text-2xl font-bold">{groupName}</h2>
        </div>

        {/* Group details */}
        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <span className="text-sm">Contribution</span>
            </div>
            <span className="font-bold">MWK {contributionAmount.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <span className="text-sm">Frequency</span>
            </div>
            <span className="font-bold capitalize">{frequency}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="text-sm">Members</span>
            </div>
            <span className="font-bold">{currentMembers}/{maxMembers}</span>
          </div>
        </div>

        {/* Urgency indicator */}
        {spotsLeft <= 3 && spotsLeft > 0 && (
          <div className="bg-yellow-400/20 border border-yellow-400/30 rounded-lg p-3 text-center">
            <p className="text-sm font-semibold">⚠️ Only {spotsLeft} spot{spotsLeft > 1 ? 's' : ''} left!</p>
          </div>
        )}

        {/* Join code */}
        <div className="bg-white text-primary rounded-lg p-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <QrCode className="h-5 w-5" />
            <span className="text-sm font-medium">Join Code</span>
          </div>
          <p className="text-3xl font-bold tracking-wider">{groupCode}</p>
        </div>

        {/* CTA */}
        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Join PayFesa Today!</p>
              <p className="text-xs opacity-90">Start saving together</p>
            </div>
            <ArrowRight className="h-6 w-6" />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs opacity-75">
          Trusted community savings platform
        </div>
      </div>
    </Card>
  );
};
