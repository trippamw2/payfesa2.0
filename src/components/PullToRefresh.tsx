import { ReactNode } from 'react';
import PullToRefreshComponent from 'react-simple-pull-to-refresh';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

/**
 * Pull-to-refresh wrapper component for mobile devices.
 * Provides native-like pull-to-refresh functionality.
 */
const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  return (
    <PullToRefreshComponent
      onRefresh={onRefresh}
      pullingContent={
        <div className="flex justify-center items-center py-4">
          <div className="text-primary text-sm font-medium">Pull down to refresh</div>
        </div>
      }
      refreshingContent={
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
          <span className="text-primary text-sm font-medium">Refreshing...</span>
        </div>
      }
      pullDownThreshold={80}
      maxPullDownDistance={120}
      resistance={2}
    >
      <div>{children}</div>
    </PullToRefreshComponent>
  );
};

export default PullToRefresh;
