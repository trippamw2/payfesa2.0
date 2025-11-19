import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AIInsight {
  type: 'prediction' | 'recommendation' | 'warning' | 'celebration';
  title: string;
  message: string;
  confidence?: number;
}

export const useAIInsights = (userId: string) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchInsights();
    }
  }, [userId]);

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      // Fetch user's recent AI-generated notifications
      const { data: notifications } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .not('metadata->>ai_generated', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (notifications) {
        const parsedInsights: AIInsight[] = notifications.map(n => ({
          type: mapNotificationTypeToInsightType(n.type),
          title: n.title,
          message: n.message,
          confidence: 0.85 // Default confidence for AI insights
        }));
        setInsights(parsedInsights);
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewInsight = async (type: string, context?: Record<string, any>) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-smart-notification', {
        body: {
          userId,
          notificationType: type,
          context
        }
      });

      if (error) throw error;

      // Refresh insights after generating new one
      await fetchInsights();
      
      return data;
    } catch (error) {
      console.error('Error generating insight:', error);
      return null;
    }
  };

  return {
    insights,
    isLoading,
    refreshInsights: fetchInsights,
    generateNewInsight
  };
};

const mapNotificationTypeToInsightType = (type: string): AIInsight['type'] => {
  switch (type) {
    case 'milestone':
    case 'celebration':
      return 'celebration';
    case 'warning':
    case 'trust':
      return 'warning';
    case 'insight':
    case 'education':
      return 'recommendation';
    case 'reminder':
      return 'prediction';
    default:
      return 'recommendation';
  }
};