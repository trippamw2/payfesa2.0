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
  RESERVE_GUARANTEE: 0.01,   // 1% - Goes to reserve wallet
  PLATFORM_FEES: 0.07,       // 7% - Combined service & processing fees
} as const;

/**
 * Calculate fee breakdown for a payout amount
 */
export function calculatePayoutFees(grossAmount: number): FeeBreakdown {
  const payoutSafetyFee = Math.round(grossAmount * FEE_RATES.RESERVE_GUARANTEE);
  const serviceFee = 0; // No longer shown separately
  const governmentFee = Math.round(grossAmount * FEE_RATES.PLATFORM_FEES);
  const totalFees = payoutSafetyFee + governmentFee;
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
  const totalFeeRate = FEE_RATES.RESERVE_GUARANTEE + FEE_RATES.PLATFORM_FEES;
  const grossAmount = Math.round(netAmount / (1 - totalFeeRate));
  
  return calculatePayoutFees(grossAmount);
}

/**
 * Get total fee percentage
 */
export function getTotalFeePercentage(): number {
  return (FEE_RATES.RESERVE_GUARANTEE + FEE_RATES.PLATFORM_FEES) * 100;
}
