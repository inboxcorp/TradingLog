import {
  validateCashAdjustmentAmount,
  validateWithdrawal,
  processCashAdjustment
} from '@trading-log/shared';

describe('Cash Adjustment Validations', () => {
  describe('validateCashAdjustmentAmount', () => {
    it('should accept valid positive amounts', () => {
      expect(validateCashAdjustmentAmount(100)).toBe(true);
      expect(validateCashAdjustmentAmount(1000.50)).toBe(true);
      expect(validateCashAdjustmentAmount(9999999)).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(validateCashAdjustmentAmount(0)).toBe(false);
      expect(validateCashAdjustmentAmount(-100)).toBe(false);
      expect(validateCashAdjustmentAmount(10000001)).toBe(false); // Above $10M limit
      expect(validateCashAdjustmentAmount(NaN)).toBe(false);
      expect(validateCashAdjustmentAmount(Infinity)).toBe(false);
      expect(validateCashAdjustmentAmount(-Infinity)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateCashAdjustmentAmount(0.01)).toBe(true); // Minimum valid amount
      expect(validateCashAdjustmentAmount(10000000)).toBe(true); // Maximum valid amount
      expect(validateCashAdjustmentAmount(10000000.01)).toBe(false); // Just over limit
    });
  });

  describe('validateWithdrawal', () => {
    it('should allow valid withdrawals', () => {
      expect(validateWithdrawal(10000, 5000)).toBe(true);
      expect(validateWithdrawal(10000, 10000)).toBe(true); // Full withdrawal
      expect(validateWithdrawal(1000.50, 500.25)).toBe(true);
    });

    it('should reject withdrawals that exceed available funds', () => {
      expect(validateWithdrawal(10000, 10000.01)).toBe(false);
      expect(validateWithdrawal(5000, 5001)).toBe(false);
      expect(validateWithdrawal(0, 1)).toBe(false);
    });

    it('should handle decimal precision correctly', () => {
      expect(validateWithdrawal(100.50, 100.50)).toBe(true);
      expect(validateWithdrawal(100.50, 100.51)).toBe(false);
      expect(validateWithdrawal(1234.56, 234.56)).toBe(true);
    });
  });

  describe('processCashAdjustment', () => {
    describe('Deposits', () => {
      it('should process valid deposits correctly', () => {
        expect(processCashAdjustment(10000, 'DEPOSIT', 5000)).toBe(15000);
        expect(processCashAdjustment(0, 'DEPOSIT', 1000)).toBe(1000);
        expect(processCashAdjustment(1234.56, 'DEPOSIT', 765.44)).toBe(2000);
      });

      it('should handle decimal precision in deposits', () => {
        const result = processCashAdjustment(10000.50, 'DEPOSIT', 1000.25);
        expect(result).toBeCloseTo(11000.75, 2);
      });

      it('should reject invalid deposit amounts', () => {
        expect(() => processCashAdjustment(10000, 'DEPOSIT', 0))
          .toThrow('Invalid adjustment amount');
        expect(() => processCashAdjustment(10000, 'DEPOSIT', -500))
          .toThrow('Invalid adjustment amount');
        expect(() => processCashAdjustment(10000, 'DEPOSIT', 10000001))
          .toThrow('Invalid adjustment amount');
      });
    });

    describe('Withdrawals', () => {
      it('should process valid withdrawals correctly', () => {
        expect(processCashAdjustment(10000, 'WITHDRAWAL', 5000)).toBe(5000);
        expect(processCashAdjustment(10000, 'WITHDRAWAL', 10000)).toBe(0);
        expect(processCashAdjustment(1234.56, 'WITHDRAWAL', 234.56)).toBe(1000);
      });

      it('should handle decimal precision in withdrawals', () => {
        const result = processCashAdjustment(10000.75, 'WITHDRAWAL', 1000.25);
        expect(result).toBeCloseTo(9000.50, 2);
      });

      it('should reject insufficient funds withdrawals', () => {
        expect(() => processCashAdjustment(10000, 'WITHDRAWAL', 10001))
          .toThrow('Insufficient funds for withdrawal');
        expect(() => processCashAdjustment(5000, 'WITHDRAWAL', 5000.01))
          .toThrow('Insufficient funds for withdrawal');
        expect(() => processCashAdjustment(0, 'WITHDRAWAL', 1))
          .toThrow('Insufficient funds for withdrawal');
      });

      it('should reject invalid withdrawal amounts', () => {
        expect(() => processCashAdjustment(10000, 'WITHDRAWAL', 0))
          .toThrow('Invalid adjustment amount');
        expect(() => processCashAdjustment(10000, 'WITHDRAWAL', -500))
          .toThrow('Invalid adjustment amount');
        expect(() => processCashAdjustment(10000, 'WITHDRAWAL', 10000001))
          .toThrow('Invalid adjustment amount');
      });
    });

    describe('Edge cases and precision', () => {
      it('should handle very small amounts', () => {
        expect(processCashAdjustment(100, 'DEPOSIT', 0.01)).toBeCloseTo(100.01, 2);
        expect(processCashAdjustment(100, 'WITHDRAWAL', 0.01)).toBeCloseTo(99.99, 2);
      });

      it('should handle large amounts within limits', () => {
        const largeAmount = 9999999; // Just under $10M limit
        expect(processCashAdjustment(1000000, 'DEPOSIT', largeAmount)).toBe(10999999);
        expect(processCashAdjustment(10000000, 'WITHDRAWAL', largeAmount)).toBe(1);
      });

      it('should prevent floating point errors', () => {
        // Test case that commonly causes floating point issues
        const result = processCashAdjustment(0.1, 'DEPOSIT', 0.2);
        expect(result).toBeCloseTo(0.3, 10);
        
        const result2 = processCashAdjustment(10.1, 'WITHDRAWAL', 0.1);
        expect(result2).toBeCloseTo(10.0, 10);
      });
    });
  });
});

describe('Cash Adjustment Integration with Risk Calculations', () => {
  it('should work with risk calculation functions', async () => {
    // Import risk calculation functions
    const { calculateDetailedPortfolioRisk } = await import('@trading-log/shared');
    
    // Test that cash adjustments work with risk calculations
    const newEquity = processCashAdjustment(10000, 'DEPOSIT', 5000); // Should be 15000
    
    const mockActiveTrades = [
      { id: '1', symbol: 'AAPL', riskAmount: 200 },
      { id: '2', symbol: 'GOOGL', riskAmount: 300 }
    ];
    
    const portfolioRisk = calculateDetailedPortfolioRisk(mockActiveTrades, newEquity);
    
    expect(portfolioRisk.totalRiskAmount).toBe(500);
    expect(portfolioRisk.totalRiskPercentage).toBeCloseTo(3.33, 2); // 500/15000 * 100
    expect(portfolioRisk.riskLevel).toBe('SAFE'); // Under 4.5%
    
    // Verify individual trade risk percentages are recalculated with new equity
    expect(portfolioRisk.activeTrades[0].riskPercentage).toBeCloseTo(1.33, 2); // 200/15000 * 100
    expect(portfolioRisk.activeTrades[1].riskPercentage).toBeCloseTo(2.00, 2); // 300/15000 * 100
  });
});