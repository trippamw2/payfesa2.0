import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePayoutsRealtime = (
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
      .channel(`payouts-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payouts',
          filter: `recipient_id=eq.${userId}`,
        } as any,
        debouncedUpdate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payout_schedule',
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
