import { Award, Crown, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  trustScore: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const EliteBadge = ({ trustScore, className, showLabel = true, size = 'md' }: Props) => {
  const isElite = trustScore > 90;

  if (!isElite) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  return (
    <Badge 
      className={cn(
        'bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 text-white font-bold border-0 animate-pulse',
        sizeClasses[size],
        className
      )}
    >
      <Crown className="mr-1" size={iconSizes[size]} />
      {showLabel && 'ELITE'}
      <Sparkles className="ml-1" size={iconSizes[size]} />
    </Badge>
  );
};
