/**
 * PayFesa Fee Structure
 * Clear, transparent fees that protect members and keep the platform running
 */

export interface FeeBreakdown {
  grossAmount: number;
  payoutSafetyFee: number;      // 1% - Protects your payout if someone pays late
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
 * Format amount as MWK currency
 */
export function formatMWK(amount: number): string {
  return `MWK ${amount.toLocaleString()}`;
}

/**
 * Get fee explanations for UI display
 */
export const FEE_EXPLANATIONS = {
  payoutSafety: {
    title: "1% Payout Safety",
    problem: "What if someone in your group pays late?",
    result: "Your payout is still protected",
    solution: "This small fee ensures you get your money on time, every time"
  },
  service: {
    title: "5% Service & Protection",
    problem: "Running a secure savings platform isn't free",
    result: "24/7 fraud detection, instant notifications, expert support",
    solution: "This covers platform operations and keeps your money safe"
  },
  government: {
    title: "6% Government & Telecom Fees",
    problem: "Mobile money and bank transfers have costs",
    result: "We pay mobile networks, banks, and government fees",
    solution: "These fees are charged by telecoms, not by PayFesa"
  }
} as const;
