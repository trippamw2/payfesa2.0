/**
 * PayFesa Fee Structure
 * Server-side fee calculations for contributions and payouts
 */

export interface FeeBreakdown {
  grossAmount: number;
  payoutSafetyFee: number;      // 1% - Protects payout if someone pays late
  serviceFee: number;            // 5% - Platform operations, fraud detection, support
  governmentFee: number;         // 6% - Mobile money, bank, telecom fees
  totalFees: number;
  netAmount: number;
}

export const FEE_RATES = {
  PAYOUT_SAFETY: 0.01,   // 1%
  SERVICE: 0.05,         // 5%
  GOVERNMENT: 0.06,      // 6%
} as const;

/**
 * Calculate fee breakdown for a payout amount
 */
export function calculatePayoutFees(grossAmount: number): FeeBreakdown {
  const payoutSafetyFee = Math.round(grossAmount * FEE_RATES.PAYOUT_SAFETY);
  const serviceFee = Math.round(grossAmount * FEE_RATES.SERVICE);
  const governmentFee = Math.round(grossAmount * FEE_RATES.GOVERNMENT);
  const totalFees = payoutSafetyFee + serviceFee + governmentFee;
  const netAmount = grossAmount - totalFees;

  return {
    grossAmount,
    payoutSafetyFee,
    serviceFee,
    governmentFee,
    totalFees,
    netAmount,
  };
}

/**
 * Calculate gross amount needed to receive a specific net amount
 */
export function calculateGrossFromNet(netAmount: number): FeeBreakdown {
  const totalFeeRate = FEE_RATES.PAYOUT_SAFETY + FEE_RATES.SERVICE + FEE_RATES.GOVERNMENT;
  const grossAmount = Math.round(netAmount / (1 - totalFeeRate));
  
  return calculatePayoutFees(grossAmount);
}

/**
 * Get total fee percentage
 */
export function getTotalFeePercentage(): number {
  return (FEE_RATES.PAYOUT_SAFETY + FEE_RATES.SERVICE + FEE_RATES.GOVERNMENT) * 100;
}
