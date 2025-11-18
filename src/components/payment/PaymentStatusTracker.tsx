import { CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface PaymentStatusTrackerProps {
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  transactionId?: string;
}

export const PaymentStatusTracker = ({ 
  status, 
  message, 
  transactionId 
}: PaymentStatusTrackerProps) => {
  if (status === 'idle') return null;

  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20',
      iconColor: 'text-yellow-600',
      title: 'Payment Pending'
    },
    processing: {
      icon: Loader2,
      color: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20',
      iconColor: 'text-blue-600 animate-spin',
      title: 'Processing Payment'
    },
    completed: {
      icon: CheckCircle2,
      color: 'bg-green-50 border-green-200 dark:bg-green-950/20',
      iconColor: 'text-green-600',
      title: 'Payment Successful'
    },
    failed: {
      icon: XCircle,
      color: 'bg-red-50 border-red-200 dark:bg-red-950/20',
      iconColor: 'text-red-600',
      title: 'Payment Failed'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Alert className={`${config.color} border-2`}>
      <Icon className={`h-5 w-5 ${config.iconColor}`} />
      <AlertDescription className="ml-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{config.title}</p>
            {message && <p className="text-sm mt-1">{message}</p>}
            {transactionId && (
              <p className="text-xs text-muted-foreground mt-2">
                Transaction ID: {transactionId}
              </p>
            )}
          </div>
          <Badge variant={status === 'completed' ? 'default' : status === 'failed' ? 'destructive' : 'outline'}>
            {status.toUpperCase()}
          </Badge>
        </div>
      </AlertDescription>
    </Alert>
  );
};
