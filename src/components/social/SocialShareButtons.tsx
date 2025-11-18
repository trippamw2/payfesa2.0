import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { ShareDialog } from './ShareDialog';
import { ContributionBadge } from './ContributionBadge';
import { TrustedUserBadge } from './TrustedUserBadge';
import { PayoutComingCard } from './PayoutComingCard';
import { GroupInviteCard } from './GroupInviteCard';

interface ShareButtonProps {
  type: 'contribution' | 'trusted' | 'payout' | 'invite';
  data: any;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const SocialShareButton = ({ 
  type, 
  data, 
  label = 'Share', 
  variant = 'default',
  size = 'default'
}: ShareButtonProps) => {
  const [isShareOpen, setIsShareOpen] = useState(false);

  const getShareContent = () => {
    switch (type) {
      case 'contribution':
        return {
          title: 'My PayFesa Contribution',
          text: `I just made a contribution of MWK ${data.amount.toLocaleString()} to ${data.groupName}! Join me on PayFesa and start saving together! 💰`,
          component: <ContributionBadge {...data} />
        };
      
      case 'trusted':
        return {
          title: 'My PayFesa Trust Score',
          text: `I'm a trusted member on PayFesa with a ${data.trustScore} trust score! Join the most reliable savings community in Malawi! 🏆`,
          component: <TrustedUserBadge {...data} />
        };
      
      case 'payout':
        return {
          title: 'My PayFesa Payout',
          text: `My payout of MWK ${data.payoutAmount.toLocaleString()} is coming soon! Saving has never been easier with PayFesa! 🎉`,
          component: <PayoutComingCard {...data} />
        };
      
      case 'invite':
        return {
          title: `Join ${data.groupName} on PayFesa`,
          text: `${data.inviterName} invited you to join ${data.groupName}! Use code ${data.groupCode} to join. Start saving together today! 🤝`,
          component: <GroupInviteCard {...data} />
        };
    }
  };

  const content = getShareContent();

  return (
    <>
      <Button
        onClick={() => setIsShareOpen(true)}
        variant={variant}
        size={size}
      >
        <Share2 className="h-4 w-4 mr-2" />
        {label}
      </Button>

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        title={content.title}
        shareText={content.text}
      >
        {content.component}
      </ShareDialog>
    </>
  );
};
