import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useReserveWalletRealtime = (onUpdate: () => void) => {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        onUpdate();
      }, 300);
    };

    const channel = supabase
      .channel('reserve-wallet-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reserve_wallet',
        } as any,
        debouncedUpdate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reserve_transactions',
        } as any,
        debouncedUpdate
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
};
