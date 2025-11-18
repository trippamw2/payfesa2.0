import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShareDialog } from '@/components/social/ShareDialog';
import { ContributionBadge } from '@/components/social/ContributionBadge';
import { PayoutComingCard } from '@/components/social/PayoutComingCard';

export const ShareListener = () => {
  const [shareData, setShareData] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const handleShare = async (event: CustomEvent) => {
      const data = event.detail;
      setShareData(data);
      
      if (data.type === 'contribution' && data.data.currentUserId) {
        const { data: user } = await supabase
          .from('users')
          .select('name, trust_score')
          .eq('id', data.data.currentUserId)
          .single();
        setUserData(user);
      }
      
      setShowDialog(true);
    };

    window.addEventListener('show-share-dialog', handleShare as EventListener);
    return () => {
      window.removeEventListener('show-share-dialog', handleShare as EventListener);
    };
  }, []);

  const handleClose = () => {
    setShowDialog(false);
    setShareData(null);
    setUserData(null);
  };

  if (!showDialog || !shareData) return null;

  const renderShareContent = () => {
    switch (shareData.type) {
      case 'contribution':
        if (!userData) return null;
        return (
          <ContributionBadge
            userName={userData.name || 'User'}
            groupName={shareData.data.groupName}
            amount={shareData.data.amount}
            streakCount={3}
            trustScore={userData.trust_score || 50}
          />
        );
      
      case 'payout_coming':
        return (
          <PayoutComingCard
            userName={shareData.data.userName}
            groupName={shareData.data.groupName}
            payoutAmount={shareData.data.amount}
            payoutDate={shareData.data.payoutDate}
            position={shareData.data.position}
            totalMembers={shareData.data.totalMembers}
          />
        );
      
      default:
        return null;
    }
  };

  const shareText = shareData?.type === 'contribution' 
    ? `I just contributed MWK ${shareData.data.amount?.toLocaleString()} to my ${shareData.data.groupName} chipereganyu group! Join us on PayFesa!`
    : `My payout is coming soon on PayFesa! Join us to save together!`;

  return (
    <ShareDialog 
      isOpen={showDialog} 
      onClose={handleClose}
      title={shareData.type === 'contribution' ? 'Share Your Contribution' : 'Share Your Upcoming Payout'}
      shareText={shareText}
    >
      {renderShareContent()}
    </ShareDialog>
  );
};
