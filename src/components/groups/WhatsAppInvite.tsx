import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import ShareGroupDialog from './ShareGroupDialog';

interface Props {
  groupCode: string;
  groupName: string;
  inviterName: string;
}

const WhatsAppInvite = ({ groupCode, groupName, inviterName }: Props) => {
  const [showShareDialog, setShowShareDialog] = useState(false);

  return (
    <>
      <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Share2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Invite Members</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Share your group via WhatsApp, Facebook, SMS, and more
              </p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-green-200">
            <p className="text-xs text-muted-foreground mb-1">Group Code</p>
            <p className="text-2xl font-bold text-green-600 tracking-wider text-center">
              {groupCode}
            </p>
          </div>

          <Button
            onClick={() => setShowShareDialog(true)}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Group
          </Button>
        </div>
      </Card>

      <ShareGroupDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        groupCode={groupCode}
        groupName={groupName}
        inviterName={inviterName}
      />
    </>
  );
};

export default WhatsAppInvite;