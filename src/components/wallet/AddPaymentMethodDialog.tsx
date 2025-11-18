import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smartphone, Building2 } from 'lucide-react';
import AddMobileMoneyDialog from '@/components/mobilemoney/AddMobileMoneyDialog';
import AddBankAccountDialog from '@/components/banking/AddBankAccountDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddPaymentMethodDialog = ({ open, onOpenChange, onSuccess }: Props) => {
  const [showMobileDialog, setShowMobileDialog] = useState(false);
  const [showBankDialog, setShowBankDialog] = useState(false);

  const handleMobileClick = () => {
    onOpenChange(false);
    setShowMobileDialog(true);
  };

  const handleBankClick = () => {
    onOpenChange(false);
    setShowBankDialog(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-4">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Payment Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <Button
              onClick={handleMobileClick}
              variant="outline"
              className="w-full h-auto py-3 flex items-center justify-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold">Mobile Money</p>
                <p className="text-[10px] text-muted-foreground">Add Airtel or TNM account</p>
              </div>
            </Button>

            <Button
              onClick={handleBankClick}
              variant="outline"
              className="w-full h-auto py-3 flex items-center justify-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold">Bank Account</p>
                <p className="text-[10px] text-muted-foreground">Add bank account</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddMobileMoneyDialog
        open={showMobileDialog}
        onOpenChange={setShowMobileDialog}
        onSuccess={onSuccess}
      />

      <AddBankAccountDialog
        open={showBankDialog}
        onOpenChange={setShowBankDialog}
        onSuccess={onSuccess}
      />
    </>
  );
};

export default AddPaymentMethodDialog;
