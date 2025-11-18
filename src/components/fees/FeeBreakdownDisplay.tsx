import { Card } from '@/components/ui/card';
import { Shield, Building2, Zap } from 'lucide-react';
import { calculatePayoutFees } from '@/utils/feeCalculations';

interface Props {
  amount: number;
  compact?: boolean;
}

const FeeBreakdownDisplay = ({ amount, compact = false }: Props) => {
  const { payoutSafetyFee, serviceFee, governmentFee, totalFees, netAmount } = calculatePayoutFees(amount);

  if (compact) {
    return (
      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Gross Amount</span>
          <span className="font-medium">MWK {amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Total Fees (12%)</span>
          <span>-MWK {totalFees.toLocaleString()}</span>
        </div>
        <div className="h-px bg-border my-2" />
        <div className="flex justify-between items-center font-semibold text-sm">
          <span>Net Amount</span>
          <span className="text-primary">MWK {netAmount.toLocaleString()}</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <h4 className="font-semibold text-sm mb-3">Fee Breakdown</h4>
      
      <div className="space-y-2">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-2 flex-1">
            <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium">Payout Safety (1%)</p>
              <p className="text-[10px] text-muted-foreground">Protects your payout if someone pays late</p>
            </div>
          </div>
          <span className="text-xs font-medium">MWK {payoutSafetyFee.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-2 flex-1">
            <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium">Service & Protection (5%)</p>
              <p className="text-[10px] text-muted-foreground">Platform, fraud detection, notifications, support</p>
            </div>
          </div>
          <span className="text-xs font-medium">MWK {serviceFee.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-2 flex-1">
            <Building2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium">Government Fees (6%)</p>
              <p className="text-[10px] text-muted-foreground">Mobile money, bank, telecom fees</p>
            </div>
          </div>
          <span className="text-xs font-medium">MWK {governmentFee.toLocaleString()}</span>
        </div>
      </div>

      <div className="h-px bg-border" />

      <div className="flex justify-between items-center pt-2">
        <span className="text-xs text-muted-foreground">Gross Amount</span>
        <span className="text-sm font-medium">MWK {amount.toLocaleString()}</span>
      </div>

      <div className="flex justify-between items-center text-xs text-destructive">
        <span>Total Fees (12%)</span>
        <span>-MWK {totalFees.toLocaleString()}</span>
      </div>

      <div className="h-px bg-border" />

      <div className="flex justify-between items-center pt-2">
        <span className="font-semibold">You Receive</span>
        <span className="text-lg font-bold text-primary">MWK {netAmount.toLocaleString()}</span>
      </div>
    </Card>
  );
};

export default FeeBreakdownDisplay;

  if (compact) {
    return (
      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Gross Amount</span>
          <span className="font-medium">MWK {amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Total Fees (12%)</span>
          <span>-MWK {totalFees.toLocaleString()}</span>
        </div>
        <div className="h-px bg-border my-2" />
        <div className="flex justify-between items-center font-semibold text-sm">
          <span>Net Amount</span>
          <span className="text-primary">MWK {netAmount.toLocaleString()}</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <h4 className="font-semibold text-sm mb-3">Fee Breakdown</h4>
      
      <div className="space-y-2">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-2 flex-1">
            <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium">Payout Safety (1%)</p>
              <p className="text-[10px] text-muted-foreground">Protects your payout if someone pays late</p>
            </div>
          </div>
          <span className="text-xs font-medium">MWK {payoutSafety.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-2 flex-1">
            <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium">Service & Protection (5%)</p>
              <p className="text-[10px] text-muted-foreground">Platform, fraud detection, notifications, support</p>
            </div>
          </div>
          <span className="text-xs font-medium">MWK {serviceProtection.toLocaleString()}</span>
        </div>

        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-2 flex-1">
            <Building2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium">Government Fees (6%)</p>
              <p className="text-[10px] text-muted-foreground">Mobile money, bank, telecom fees</p>
            </div>
          </div>
          <span className="text-xs font-medium">MWK {governmentFees.toLocaleString()}</span>
        </div>
      </div>

      <div className="h-px bg-border" />

      <div className="flex justify-between items-center pt-2">
        <span className="text-xs text-muted-foreground">Gross Amount</span>
        <span className="text-sm font-medium">MWK {amount.toLocaleString()}</span>
      </div>

      <div className="flex justify-between items-center text-xs text-destructive">
        <span>Total Fees (12%)</span>
        <span>-MWK {totalFees.toLocaleString()}</span>
      </div>

      <div className="h-px bg-border" />

      <div className="flex justify-between items-center pt-2">
        <span className="font-semibold">You Receive</span>
        <span className="text-lg font-bold text-primary">MWK {netAmount.toLocaleString()}</span>
      </div>
    </Card>
  );
};

export default FeeBreakdownDisplay;
