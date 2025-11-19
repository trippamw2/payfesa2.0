import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';

interface AutoExplainerProps {
  userId: string;
  event: 'trust_score_change' | 'payout_delay' | 'contribution_rejected' | 'low_balance';
  context?: Record<string, any>;
}

export const AutoExplainer = ({ userId, event, context }: AutoExplainerProps) => {
  const [explanation, setExplanation] = useState<string>('');
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateExplanation();
  }, [event, userId]);

  const generateExplanation = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-smart-notification', {
        body: {
          userId,
          notificationType: 'trust',
          context: {
            event,
            ...context
          }
        }
      });

      if (error) throw error;

      if (data?.notification?.message) {
        setExplanation(data.notification.message);
      }
    } catch (error) {
      console.error('Error generating explanation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible || !explanation) return null;

  return (
    <Card className="p-4 bg-info/10 border-info mb-4">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold mb-1">Explanation</h4>
          <p className="text-sm text-muted-foreground">{explanation}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsVisible(false)}
          className="flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};