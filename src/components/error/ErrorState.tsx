/**
 * Error State Component
 * Reusable error display for components
 */

import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  error?: Error | string | null;
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  icon?: ReactNode;
}

export function ErrorState({
  error,
  title = 'Something went wrong',
  message,
  onRetry,
  className,
  icon,
}: ErrorStateProps) {
  const errorMessage = 
    message || 
    (typeof error === 'string' ? error : error?.message) || 
    'An unexpected error occurred';

  return (
    <Card className={cn('p-6 text-center', className)}>
      <div className="flex flex-col items-center space-y-4">
        <div className="p-3 rounded-full bg-destructive/10">
          {icon || <AlertTriangle className="h-6 w-6 text-destructive" />}
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>

        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </Card>
  );
}
