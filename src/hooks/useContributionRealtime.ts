import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface ContributionUpdate {
  id: string;
  status: string;
  amount: number;
  user_id: string;
  group_id: string;
  completed_at?: string;
}

export const useContributionRealtime = (
  groupId: string,
  onContributionUpdate: (contribution: ContributionUpdate) => void
) => {
  useEffect(() => {
    let channel: RealtimeChannel;

    const setupRealtimeSubscription = () => {
      channel = supabase
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
            console.log('Contribution realtime update:', payload);
            
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              onContributionUpdate(payload.new as ContributionUpdate);
            }
          }
        )
        .subscribe((status) => {
          console.log('Contribution realtime status:', status);
        });
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [groupId, onContributionUpdate]);
};
