import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useContributionsRealtime = (
  groupId: string,
  onContributionUpdate: (contribution: any) => void
) => {
  useEffect(() => {
    const channel = supabase
      .channel(`contributions-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contributions',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          onContributionUpdate(payload.new || payload.old);
        }
      )
      // Also listen to mobile money transactions for this group
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mobilemoney_transactions',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          onContributionUpdate(payload.new || payload.old);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, onContributionUpdate]);
};
