import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GroupUpdate {
  id: string;
  current_members?: number;
  status?: string;
  [key: string]: any;
}

export const useGroupRealtime = (groupId: string, onUpdate: (data: GroupUpdate) => void) => {
  useEffect(() => {
    // Subscribe to group updates
    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rosca_groups',
          filter: `id=eq.${groupId}`,
        },
        (payload) => {
          onUpdate(payload.new as GroupUpdate);
        }
      )
      // Subscribe to new contributions for this group
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contributions',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          // Trigger a refetch or update when new contribution comes in
          onUpdate({ id: groupId, ...payload.new });
        }
      )
      // Subscribe to group member changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          onUpdate({ id: groupId, ...payload.new });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, onUpdate]);
};
