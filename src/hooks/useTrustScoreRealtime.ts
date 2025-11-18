import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTrustScoreRealtime = (
  userId: string,
  onUpdate: () => void
) => {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        onUpdate();
      }, 300);
    };

    const channel = supabase
      .channel(`trust-score-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trust_scores',
          filter: `user_id=eq.${userId}`,
        } as any,
        debouncedUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trust_score_history',
          filter: `user_id=eq.${userId}`,
        } as any,
        debouncedUpdate
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [userId, onUpdate]);
};
