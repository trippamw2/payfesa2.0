import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface PayoutSuccessReceiptProps {
  amount: number;
  netAmount: number;
  feeAmount: number;
  transactionId: string;
  paymentMethod: string;
  groupName: string;
  timestamp: string;
}

export const PayoutSuccessReceipt = ({
  amount,
  netAmount,
  feeAmount,
  transactionId,
  paymentMethod,
  groupName,
  timestamp
}: PayoutSuccessReceiptProps) => {
  
  const handleDownloadReceipt = () => {
    const receiptData = `
PAYOUT RECEIPT
═══════════════════════════════════

Transaction ID: ${transactionId}
Date: ${new Date(timestamp).toLocaleString()}

Group: ${groupName}
Payment Method: ${paymentMethod}

AMOUNT BREAKDOWN:
──────────────────────────────────
Gross Amount:     MWK ${amount.toLocaleString()}
Processing Fee:   MWK ${feeAmount.toLocaleString()}
Net Amount:       MWK ${netAmount.toLocaleString()}

Status: COMPLETED ✓

Thank you for using our service!
═══════════════════════════════════
    `;

    const blob = new Blob([receiptData], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout-receipt-${transactionId}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-2xl text-green-600">Payout Successful!</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your money has been sent successfully
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-primary/5 p-4 rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-1">Amount Received</p>
          <p className="text-3xl font-bold text-primary">
            MWK {netAmount.toLocaleString()}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Transaction ID:</span>
            <span className="font-mono text-xs">{transactionId}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Date & Time:</span>
            <span>{new Date(timestamp).toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Group:</span>
            <span className="font-medium">{groupName}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payment Method:</span>
            <span className="capitalize">{paymentMethod}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gross Amount:</span>
            <span>MWK {amount.toLocaleString()}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Processing Fee (11%):</span>
            <span className="text-destructive">- MWK {feeAmount.toLocaleString()}</span>
          </div>

          <Separator />

          <div className="flex justify-between font-semibold">
            <span>Net Amount:</span>
            <span className="text-green-600">MWK {netAmount.toLocaleString()}</span>
          </div>
        </div>

        <Button 
          onClick={handleDownloadReceipt}
          variant="outline" 
          className="w-full"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Receipt
        </Button>

        <div className="text-center text-xs text-muted-foreground mt-4">
          <p>This is an automated receipt.</p>
          <p>Keep this for your records.</p>
        </div>
      </CardContent>
    </Card>
  );
};
