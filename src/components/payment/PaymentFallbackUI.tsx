/**
 * Fallback UI for Payment Failures
 * Shows when payment API is unavailable
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, RefreshCw, Phone } from 'lucide-react';

interface PaymentFallbackUIProps {
  message?: string;
  onRetry?: () => void;
  showSupport?: boolean;
}

export const PaymentFallbackUI = ({ 
  message, 
  onRetry,
  showSupport = true 
}: PaymentFallbackUIProps) => {
  return (
    <Card className="p-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-muted">
            <WifiOff className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
        
        <div>
          <h3 className="text-base font-semibold mb-2">Payment Service Unavailable</h3>
          <p className="text-sm text-muted-foreground">
            {message || "We're having trouble connecting to the payment service. Your funds are safe."}
          </p>
        </div>

        <Alert className="text-left">
          <AlertDescription className="text-xs space-y-2">
            <p><strong>What to do:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your internet connection</li>
              <li>Try again in a few moments</li>
              {showSupport && <li>Contact support if the problem persists</li>}
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          {onRetry && (
            <Button onClick={onRetry} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          {showSupport && (
            <Button variant="outline" className="flex-1" asChild>
              <a href="tel:+265999123456">
                <Phone className="mr-2 h-4 w-4" />
                Call Support
              </a>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
