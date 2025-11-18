import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, CheckCircle2 } from 'lucide-react';

interface TransactionReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    type: string;
    amount: number;
    status: string;
    created_at: string;
    payment_method?: string;
    fee_amount?: number;
    net_amount?: number;
    group_name?: string;
    reference?: string;
  };
}

export function TransactionReceipt({ open, onOpenChange, transaction }: TransactionReceiptProps) {
  const handleDownload = () => {
    const receiptText = `
PAYFESA TRANSACTION RECEIPT
═══════════════════════════════════

Transaction ID: ${transaction.id}
Reference: ${transaction.reference || 'N/A'}
Date: ${new Date(transaction.created_at).toLocaleString()}

TRANSACTION DETAILS:
──────────────────────────────────
Type: ${transaction.type.toUpperCase()}
${transaction.group_name ? `Group: ${transaction.group_name}` : ''}
Payment Method: ${transaction.payment_method || 'N/A'}

AMOUNT BREAKDOWN:
──────────────────────────────────
Gross Amount:     MWK ${transaction.amount.toLocaleString()}
${transaction.fee_amount ? `Processing Fee:   MWK ${transaction.fee_amount.toLocaleString()}` : ''}
${transaction.net_amount ? `Net Amount:       MWK ${transaction.net_amount.toLocaleString()}` : ''}

Status: ${transaction.status.toUpperCase()} ✓

Thank you for using PayFesa!
═══════════════════════════════════
    `.trim();

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payfesa-receipt-${transaction.id}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-success/10 p-3">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
          </div>
          <DialogTitle className="text-2xl">Transaction Receipt</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {new Date(transaction.created_at).toLocaleString()}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-primary/5 p-4 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Amount</p>
            <p className="text-3xl font-bold text-primary">
              MWK {(transaction.net_amount || transaction.amount).toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Transaction ID:</span>
              <span className="font-mono text-xs">{transaction.id.slice(0, 8)}...</span>
            </div>
            
            {transaction.reference && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-medium">{transaction.reference}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium capitalize">{transaction.type}</span>
            </div>

            {transaction.group_name && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Group:</span>
                <span className="font-medium">{transaction.group_name}</span>
              </div>
            )}

            {transaction.payment_method && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="capitalize">{transaction.payment_method}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium capitalize text-success">{transaction.status}</span>
            </div>
          </div>

          {transaction.fee_amount && (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross Amount:</span>
                  <span>MWK {transaction.amount.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing Fee:</span>
                  <span className="text-destructive">- MWK {transaction.fee_amount.toLocaleString()}</span>
                </div>

                <Separator />

                <div className="flex justify-between font-semibold">
                  <span>Net Amount:</span>
                  <span className="text-success">MWK {transaction.net_amount?.toLocaleString()}</span>
                </div>
              </div>
            </>
          )}

          <Button onClick={handleDownload} variant="outline" className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download Receipt
          </Button>

          <div className="text-center text-xs text-muted-foreground mt-4">
            <p>This is an automated receipt.</p>
            <p>Keep this for your records.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
