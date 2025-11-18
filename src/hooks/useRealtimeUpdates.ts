import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Optimized real-time hook with debouncing to prevent excessive updates
 */
export function useRealtimeUpdates(
  table: string,
  filter: string,
  onUpdate: () => void,
  debounceMs: number = 300
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const channelRef = useRef<RealtimeChannel>();

  useEffect(() => {
    const debouncedUpdate = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(onUpdate, debounceMs);
    };

    channelRef.current = supabase
      .channel(`realtime-${table}-${filter}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        } as any,
        debouncedUpdate
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, filter, onUpdate, debounceMs]);
}
