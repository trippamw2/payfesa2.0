import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface RealtimeSubscriptionOptions {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: RealtimePostgresChangesPayload<any>) => void;
}

export const useRealtimeSubscription = ({
  table,
  event,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: RealtimeSubscriptionOptions) => {
  useEffect(() => {
    const channelName = `${table}-${filter || 'all'}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    channel.on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table,
        filter,
      } as any,
      (payload: RealtimePostgresChangesPayload<any>) => {
        if (payload.eventType === 'INSERT' && onInsert) {
          onInsert(payload.new);
        } else if (payload.eventType === 'UPDATE' && onUpdate) {
          onUpdate(payload.new);
        } else if (payload.eventType === 'DELETE' && onDelete) {
          onDelete(payload.old);
        }
        if (onChange) {
          onChange(payload);
        }
      }
    ).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, filter]);
};

