import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const DevelopmentModeBanner = () => {
  const [isDevMode, setIsDevMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPaymentConfig();
  }, []);

  const checkPaymentConfig = async () => {
    try {
      const { data: config } = await supabase
        .from('api_configurations')
        .select('api_secret, enabled')
        .eq('provider', 'paychangu')
        .single();

      setIsDevMode(!config?.api_secret);
    } catch (error) {
      console.error('Error checking config:', error);
      setIsDevMode(true); // Assume dev mode on error
    } finally {
      setLoading(false);
    }
  };

  if (loading || !isDevMode) return null;

  return (
    <Alert className="mb-4 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-sm text-orange-800 dark:text-orange-200">
        <strong>Development Mode:</strong> Payments are simulated. Configure PayChangu in database to enable real transactions.
      </AlertDescription>
    </Alert>
  );
};
