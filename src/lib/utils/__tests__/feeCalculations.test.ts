import { describe, it, expect } from 'vitest';
import { calculatePayoutFees } from '@/utils/feeCalculations';

describe('Fee Calculations', () => {
  describe('calculatePayoutFees', () => {
    it('should calculate correct fees for payout', () => {
      const result = calculatePayoutFees(100000);
      
      expect(result.grossAmount).toBe(100000);
      expect(result.payoutSafetyFee).toBe(1000); // 1%
      expect(result.serviceFee).toBe(5000); // 5%
      expect(result.governmentFee).toBe(6000); // 6%
      expect(result.totalFees).toBe(12000);
      expect(result.netAmount).toBe(88000);
    });

    it('should handle zero amount', () => {
      const result = calculatePayoutFees(0);
      expect(result.netAmount).toBe(0);
      expect(result.totalFees).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const result = calculatePayoutFees(100.555);
      expect(result.netAmount).toBeCloseTo(88.49, 2);
    });
  });

});
