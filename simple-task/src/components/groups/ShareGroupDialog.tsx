import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Share2, 
  Copy, 
  Check, 
  MessageCircle,
  Facebook,
  Instagram,
  Send,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { SocialShareButton } from '@/components/social/SocialShareButtons';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupCode: string;
  groupName: string;
  inviterName: string;
  contributionAmount?: number;
  frequency?: string;
  currentMembers?: number;
  maxMembers?: number;
}

const ShareGroupDialog = ({ open, onOpenChange, groupCode, groupName, inviterName, contributionAmount, frequency, currentMembers, maxMembers }: Props) => {
  const [copied, setCopied] = useState(false);

  const inviteMessage = `🎉 Join our Chipereganyu group on PayFesa!\n` +
    `Group: ${groupName} | Code: ${groupCode}\n` +
    `Invited by: ${inviterName}\n\n` +
    `💡 Save together, grow your money, and help each other succeed!\n` +
    `Visit: https://payfesa.com or get the app on the App Store.\n\n` +
    `💰 Save, contribute, and get a lump sum payout on your turn!`;

  const shareUrl = `${window.location.origin}/groups/join/${groupCode}`;

  const shareViaWhatsApp = () => {
    const encodedMessage = encodeURIComponent(inviteMessage);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(inviteMessage)}`;
    window.open(facebookUrl, '_blank');
  };

  const shareViaSMS = () => {
    const smsUrl = `sms:?&body=${encodeURIComponent(inviteMessage)}`;
    window.location.href = smsUrl;
  };

  const shareViaTelegram = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(inviteMessage)}`;
    window.open(telegramUrl, '_blank');
  };

  const shareViaGeneric = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName} on PayFesa`,
          text: inviteMessage,
          url: shareUrl,
        });
        toast.success('Shared successfully!');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${inviteMessage}\n${shareUrl}`);
      setCopied(true);
      toast.success('Invitation copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Group</DialogTitle>
          <DialogDescription>
            Invite others to join {groupName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Group Code Display */}
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-4 rounded-lg border">
            <p className="text-xs text-muted-foreground mb-1 text-center">Group Code</p>
            <p className="text-3xl font-bold text-primary tracking-wider text-center">
              {groupCode}
            </p>
          </div>

          {/* Share Options Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={shareViaWhatsApp}
              className="bg-green-500 hover:bg-green-600 text-white"
              size="lg"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              WhatsApp
            </Button>
            
            <Button
              onClick={shareViaFacebook}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              <Facebook className="h-5 w-5 mr-2" />
              Facebook
            </Button>

            <Button
              onClick={shareViaTelegram}
              className="bg-sky-500 hover:bg-sky-600 text-white"
              size="lg"
            >
              <Send className="h-5 w-5 mr-2" />
              Telegram
            </Button>

            <Button
              onClick={shareViaSMS}
              variant="outline"
              size="lg"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              SMS
            </Button>
          </div>

          {/* Copy and Share More Options */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="w-full"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>

            <Button
              onClick={shareViaGeneric}
              variant="outline"
              className="w-full"
            >
              <Share2 className="h-4 w-4 mr-2" />
              More Options
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareGroupDialog;
