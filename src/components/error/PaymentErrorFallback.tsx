import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  error?: Error;
  resetError?: () => void;
  message?: string;
}

export const PaymentErrorFallback = ({ error, resetError, message }: Props) => {
  const navigate = useNavigate();

  const defaultMessage = message || error?.message || 'Something went wrong with your payment';

  const handleRetry = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  const isNetworkError = defaultMessage.toLowerCase().includes('network') || 
                         defaultMessage.toLowerCase().includes('fetch');
  const isConfigError = defaultMessage.toLowerCase().includes('not configured') ||
                        defaultMessage.toLowerCase().includes('service unavailable');

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Payment Error</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {defaultMessage}
            </p>

            {isNetworkError && (
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md mb-4">
                <p className="font-medium mb-1">Network Issue Detected</p>
                <p>Please check your internet connection and try again.</p>
              </div>
            )}

            {isConfigError && (
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md mb-4">
                <p className="font-medium mb-1">Service Configuration Issue</p>
                <p>Payment services are being set up. Please try again shortly or contact support.</p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/dashboard')}
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
            <Button
              className="flex-1"
              onClick={handleRetry}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>

          <Button
            variant="link"
            size="sm"
            className="text-xs"
            onClick={() => navigate('/help')}
          >
            <HelpCircle className="h-3 w-3 mr-1" />
            Need Help?
          </Button>
        </div>
      </Card>
    </div>
  );
};
