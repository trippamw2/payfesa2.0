import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, Building2, Info } from 'lucide-react';
import { FeeBreakdown, formatMWK, FEE_EXPLANATIONS } from '@/utils/feeCalculations';
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
            <span>Total Fees (12%)</span>
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
          <h3 className="font-semibold">Fee Breakdown</h3>
          <Badge variant="outline">Transparent</Badge>
        </div>

        <div className="space-y-3">
          {/* Gross Amount */}
          <div className="flex justify-between items-center">
            <span className="font-medium">Gross Amount</span>
            <span className="font-bold text-lg">{formatMWK(fees.grossAmount)}</span>
          </div>

          {/* Payout Safety Fee */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <Shield className="h-4 w-4 mt-0.5 text-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{FEE_EXPLANATIONS.payoutSafety.title}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold mb-1">{FEE_EXPLANATIONS.payoutSafety.problem}</p>
                        <p className="text-xs mb-1">{FEE_EXPLANATIONS.payoutSafety.result}</p>
                        <p className="text-xs text-muted-foreground">{FEE_EXPLANATIONS.payoutSafety.solution}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground">{FEE_EXPLANATIONS.payoutSafety.result}</p>
              </div>
            </div>
            <span className="text-sm font-medium">-{formatMWK(fees.payoutSafetyFee)}</span>
          </div>

          {/* Service Fee */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <Zap className="h-4 w-4 mt-0.5 text-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{FEE_EXPLANATIONS.service.title}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold mb-1">{FEE_EXPLANATIONS.service.problem}</p>
                        <p className="text-xs mb-1">{FEE_EXPLANATIONS.service.result}</p>
                        <p className="text-xs text-muted-foreground">{FEE_EXPLANATIONS.service.solution}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground">{FEE_EXPLANATIONS.service.result}</p>
              </div>
            </div>
            <span className="text-sm font-medium">-{formatMWK(fees.serviceFee)}</span>
          </div>

          {/* Government Fee */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              <Building2 className="h-4 w-4 mt-0.5 text-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{FEE_EXPLANATIONS.government.title}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold mb-1">{FEE_EXPLANATIONS.government.problem}</p>
                        <p className="text-xs mb-1">{FEE_EXPLANATIONS.government.result}</p>
                        <p className="text-xs text-muted-foreground">{FEE_EXPLANATIONS.government.solution}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground">Charged by telecoms, not PayFesa</p>
              </div>
            </div>
            <span className="text-sm font-medium">-{formatMWK(fees.governmentFee)}</span>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-3 border-t">
            <span className="font-bold">You Receive</span>
            <span className="font-bold text-xl text-primary">{formatMWK(fees.netAmount)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
