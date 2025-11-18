/**
 * Unified Stat Card Component
 * Consistent stat display across dashboard and admin panel
 */

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  valueClassName?: string;
}

const StatCard = ({
  title,
  value,
  description,
  icon,
  trend,
  trendValue,
  loading = false,
  onClick,
  className,
  valueClassName
}: StatCardProps) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend) {
      case 'up':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      case 'neutral':
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card
      className={cn(
        'p-6 transition-all hover:shadow-md',
        onClick && 'cursor-pointer hover:border-primary/50',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          ) : (
            <p className={cn('text-3xl font-bold', valueClassName)}>{value}</p>
          )}
        </div>
        {icon && (
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
      
      {(description || (trend && trendValue)) && (
        <div className="flex items-center gap-2 text-sm">
          {trend && trendValue && (
            <div className={cn('flex items-center gap-1', getTrendColor())}>
              {getTrendIcon()}
              <span className="font-medium">{trendValue}</span>
            </div>
          )}
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      )}
    </Card>
  );
};

export default StatCard;
