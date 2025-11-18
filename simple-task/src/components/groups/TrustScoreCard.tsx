import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, TrendingUp, TrendingDown, XCircle, CheckCircle2, Info, Crown, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EliteBadge } from '@/components/profile/EliteBadge';

interface Props {
  score: number;
  onTimeContributions: number;
  lateContributions: number;
  missedContributions: number;
  streak?: number;
  fastContributions?: number;
}

const TrustScoreCard = ({ score, onTimeContributions, lateContributions, missedContributions, streak = 0, fastContributions = 0 }: Props) => {
  const isElite = score > 90;
  
  const getScoreColor = (score: number) => {
    if (score > 90) return 'text-yellow-600 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-400';
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreLabel = (score: number) => {
    if (score > 90) return 'ELITE';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Low';
  };

  const totalContributions = onTimeContributions + lateContributions + missedContributions;

  return (
    <Card className={`p-4 border-2 ${getScoreColor(score)}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isElite ? <Crown className="h-5 w-5 text-yellow-600" /> : <Award className="h-5 w-5" />}
            <h3 className="font-semibold">Your Trust Score</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    {isElite ? (
                      <><strong>ELITE STATUS</strong> - You&apos;re in the top 5-10%! Enjoy exclusive bonuses, priority payouts, and reduced penalties.</>
                    ) : (
                      <>Trust scores determine your position in the payout cycle. Elite status (&gt;90) requires: 20+ streak, no missed payments, 1 active referral, 5+ messages/cycle, 1 completed cycle.</>
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            {isElite && <EliteBadge trustScore={score} size="sm" />}
            <Badge className={`text-lg font-bold px-3 py-1 ${getScoreColor(score)}`}>
              {score}
            </Badge>
          </div>
        </div>

        {/* Score Label with Elite indicator */}
        <div className="text-center">
          <p className={`text-sm font-medium ${isElite ? 'text-yellow-600 flex items-center justify-center gap-1' : ''}`}>
            {isElite && <Crown size={16} />}
            {getScoreLabel(score)} Trust Rating
            {isElite && <Sparkles size={16} />}
          </p>
          {isElite && (
            <p className="text-xs text-muted-foreground mt-1">
              🎉 You qualify for exclusive Elite bonuses!
            </p>
          )}
        </div>

        {/* Elite Stats */}
        {isElite && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 border border-yellow-200">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-xs text-yellow-700 font-medium mb-1">Streak</p>
                <p className="text-2xl font-bold text-yellow-600">🔥 {streak}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-orange-700 font-medium mb-1">Fast</p>
                <p className="text-2xl font-bold text-orange-600">⚡ {fastContributions}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <p className="text-xs text-muted-foreground">On-Time</p>
            </div>
            <p className="text-lg font-bold text-green-600">{onTimeContributions}</p>
          </div>

          <div className="text-center border-x border-border/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="h-3 w-3 text-yellow-600" />
              <p className="text-xs text-muted-foreground">Late</p>
            </div>
            <p className="text-lg font-bold text-yellow-600">{lateContributions}</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <XCircle className="h-3 w-3 text-red-600" />
              <p className="text-xs text-muted-foreground">Missed</p>
            </div>
            <p className="text-lg font-bold text-red-600">{missedContributions}</p>
          </div>
        </div>

        {/* Performance Indicator */}
        {totalContributions > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Payment Rate</span>
              <span className="font-semibold">
                {Math.round((onTimeContributions / totalContributions) * 100)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full transition-all"
                style={{ width: `${(onTimeContributions / totalContributions) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Impact Info - Elite Requirements */}
        <div className={`text-xs p-3 rounded ${isElite ? 'bg-yellow-50 border border-yellow-200' : 'bg-background/50'}`}>
          <p className="font-medium mb-1.5 flex items-center gap-1">
            {isElite ? <Crown size={14} className="text-yellow-600" /> : null}
            {isElite ? 'Maintaining Elite Status:' : 'How to reach Elite (>90):'}
          </p>
          <ul className="space-y-1 text-[11px]">
            <li className={streak >= 20 ? 'text-green-600' : ''}>
              • {streak >= 20 ? '✅' : '❌'} Perfect 20+ contribution streak (current: {streak})
            </li>
            <li className={missedContributions === 0 ? 'text-green-600' : 'text-red-600'}>
              • {missedContributions === 0 ? '✅' : '❌'} Zero missed payments (missed: {missedContributions})
            </li>
            <li className={fastContributions >= 20 ? 'text-green-600' : ''}>
              • {fastContributions >= 20 ? '✅' : '⏱️'} Fast contributions within 3 hours ({fastContributions})
            </li>
            <li>• 🤝 At least 1 active referral (5+ contributions)</li>
            <li>• 💬 5+ chat messages per cycle</li>
            <li>• 🎯 Complete at least 1 full cycle</li>
          </ul>
          {isElite && (
            <p className="mt-2 text-yellow-700 font-medium text-xs">
              ⚠️ One missed payment = instant Elite status loss
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TrustScoreCard;
