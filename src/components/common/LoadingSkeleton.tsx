/**
 * Loading Skeleton Component
 * Provides consistent loading states
 */

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'stat' | 'full';
  count?: number;
  className?: string;
}

export const LoadingSkeleton = ({
  variant = 'card',
  count = 3,
  className
}: LoadingSkeletonProps) => {
  if (variant === 'full') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (variant === 'stat') {
    return (
      <div className={cn("grid grid-cols-3 gap-2", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-2">
            <Skeleton className="h-4 w-4 mx-auto mb-2" />
            <Skeleton className="h-5 w-12 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </Card>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="p-2.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2 w-1/2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-3">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2 mb-3" />
          <Skeleton className="h-8 w-full" />
        </Card>
      ))}
    </div>
  );
};
