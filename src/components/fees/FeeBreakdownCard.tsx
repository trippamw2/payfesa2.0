import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Info } from 'lucide-react';
import { FeeBreakdown, formatMWK } from '@/utils/feeCalculations';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
  fees: FeeBreakdown;
  variant?: 'compact' | 'detailed';
}

export function FeeBreakdownCard({ fees, variant = 'detailed' }: Props) {
  if (variant === 'compact') {
    return (
      <Card className="p-3 bg-muted/50 border-border/50">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between font-semibold">
            <span>Gross Amount</span>
            <span>{formatMWK(fees.grossAmount)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Platform Fee (8%)</span>
            <span>-{formatMWK(fees.totalFees)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>You Receive</span>
            <span className="text-primary">{formatMWK(fees.netAmount)}</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b">
          <h3 className="font-semibold">Fee Summary</h3>
          <Badge variant="outline">8% Total</Badge>
        </div>

        <div className="space-y-3">
          {/* Gross Amount */}
          <div className="flex justify-between items-center">
            <span className="font-medium">Gross Amount</span>
            <span className="font-bold text-lg">{formatMWK(fees.grossAmount)}</span>
          </div>

          {/* Platform Fee */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <Shield className="h-4 w-4 mt-0.5 text-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">Platform Fee (8%)</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold mb-1">Fair & Transparent Pricing</p>
                        <p className="text-xs mb-1">Includes 1% reserve guarantee to protect your payout</p>
                        <p className="text-xs text-muted-foreground">Plus platform operations, fraud detection, mobile money, and telecom fees</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground">Includes 1% reserve guarantee for payout protection</p>
              </div>
            </div>
            <span className="text-sm font-medium text-destructive">-{formatMWK(fees.totalFees)}</span>
          </div>
        </div>

        <div className="border-t pt-3 mt-3">
          <div className="flex justify-between items-center font-bold text-lg">
            <span>You Receive</span>
            <span className="text-primary">{formatMWK(fees.netAmount)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
