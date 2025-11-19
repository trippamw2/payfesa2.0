import { describe, it, expect } from 'vitest';
import { calculatePayoutFees } from '@/utils/feeCalculations';

describe('Fee Calculations', () => {
  describe('calculatePayoutFees', () => {
    it('should calculate correct fees for payout', () => {
      const result = calculatePayoutFees(100000);
      
      expect(result.grossAmount).toBe(100000);
      expect(result.payoutSafetyFee).toBe(1000); // 1% reserve guarantee
      expect(result.governmentFee).toBe(7000); // 7% platform fees
      expect(result.totalFees).toBe(8000); // 8% total
      expect(result.netAmount).toBe(92000); // 92% payout
    });

    it('should handle zero amount', () => {
      const result = calculatePayoutFees(0);
      expect(result.netAmount).toBe(0);
      expect(result.totalFees).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const result = calculatePayoutFees(100.555);
      expect(result.netAmount).toBeCloseTo(92.51, 2);
    });
  });

});
