import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePaychanguConfigRealtime = (onUpdate: () => void) => {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        onUpdate();
      }, 300);
    };

    const channel = supabase
      .channel('paychangu-config-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'api_configurations',
          filter: 'provider=eq.paychangu',
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
