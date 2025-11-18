import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Star, Award } from 'lucide-react';

interface Props {
  userName: string;
  trustScore: number;
  totalContributions: number;
  groupsCompleted: number;
  onTimePayments: number;
}

export const TrustedUserBadge = ({ userName, trustScore, totalContributions, groupsCompleted, onTimePayments }: Props) => {
  const getTrustLevel = (score: number) => {
    if (score >= 90) return { label: 'Elite', color: 'from-yellow-500 via-yellow-400 to-amber-500', icon: '👑' };
    if (score >= 75) return { label: 'Trusted', color: 'from-blue-500 via-blue-400 to-cyan-500', icon: '⭐' };
    if (score >= 60) return { label: 'Reliable', color: 'from-green-500 via-green-400 to-emerald-500', icon: '✓' };
    return { label: 'Building', color: 'from-gray-500 via-gray-400 to-slate-500', icon: '🌱' };
  };

  const level = getTrustLevel(trustScore);

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${level.color} text-white p-6 w-full max-w-md`}>
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 right-4 text-6xl">{level.icon}</div>
        <div className="absolute bottom-4 left-4 text-4xl opacity-50">{level.icon}</div>
      </div>

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8" />
            <span className="text-lg font-bold">{level.label} Member</span>
          </div>
          <div className="text-3xl">{level.icon}</div>
        </div>

        {/* User info */}
        <div className="space-y-2">
          <p className="text-2xl font-bold">{userName}</p>
          <div className="flex items-center gap-2">
            <div className="text-4xl font-bold">{trustScore}</div>
            <div className="text-sm opacity-90">
              <div>Trust Score</div>
              <div className="font-semibold">Top {Math.max(1, 100 - trustScore)}%</div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/20">
          <div className="text-center">
            <div className="text-xl font-bold">{totalContributions}</div>
            <div className="text-xs opacity-75">Contributions</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{groupsCompleted}</div>
            <div className="text-xs opacity-75">Groups</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{onTimePayments}%</div>
            <div className="text-xs opacity-75">On Time</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/20">
          <div className="flex items-center gap-1">
            <Award className="h-4 w-4" />
            <span className="text-xs">Verified by PayFesa</span>
          </div>
          <span className="text-xs opacity-75">Join PayFesa Today!</span>
        </div>
      </div>
    </Card>
  );
};
