import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePayoutPositionRealtime = (
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
      .channel(`payout-position-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_members',
          filter: `user_id=eq.${userId}`,
        } as any,
        (payload) => {
          // Check if payout_position changed
          const oldPos = (payload.old as any)?.payout_position;
          const newPos = (payload.new as any)?.payout_position;
          
          if (oldPos !== newPos) {
            console.log(`Payout position changed: ${oldPos} -> ${newPos}`);
            debouncedUpdate();
          }
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [userId, onUpdate]);
};
