import { describe, it, expect } from '@jest/globals';
import { updateEquity, validateEquityValue, formatCurrency, calculateRealizedPnL } from '@trading-log/shared';
import Decimal from 'decimal.js';

describe('Financial Calculations', () => {
  describe('updateEquity', () => {
    it('should add positive changes correctly', () => {
      const result = updateEquity(10000, 500);
      expect(result).toBe(10500);
    });

    it('should subtract negative changes correctly', () => {
      const result = updateEquity(10000, -500);
      expect(result).toBe(9500);
    });

    it('should handle decimal precision correctly', () => {
      const result = updateEquity(10000.55, 100.33);
      expect(result).toBe(10100.88);
    });

    it('should handle very small amounts with precision', () => {
      const result = updateEquity(0.01, 0.02);
      expect(result).toBe(0.03);
    });

    it('should handle large numbers', () => {
      const result = updateEquity(999999999, 1);
      expect(result).toBe(1000000000);
    });

    it('should maintain precision with floating point edge cases', () => {
      // This tests the infamous 0.1 + 0.2 !== 0.3 problem
      const result = updateEquity(0.1, 0.2);
      expect(result).toBe(0.3);
    });
  });

  describe('validateEquityValue', () => {
    it('should accept positive values', () => {
      expect(validateEquityValue(100)).toBe(true);
      expect(validateEquityValue(10000)).toBe(true);
      expect(validateEquityValue(0.01)).toBe(true);
    });

    it('should accept zero', () => {
      expect(validateEquityValue(0)).toBe(true);
    });

    it('should reject negative values', () => {
      expect(validateEquityValue(-1)).toBe(false);
      expect(validateEquityValue(-0.01)).toBe(false);
    });

    it('should reject extremely large values', () => {
      expect(validateEquityValue(1000000001)).toBe(false);
      expect(validateEquityValue(Number.MAX_VALUE)).toBe(false);
    });

    it('should reject infinite values', () => {
      expect(validateEquityValue(Infinity)).toBe(false);
      expect(validateEquityValue(-Infinity)).toBe(false);
    });

    it('should reject NaN', () => {
      expect(validateEquityValue(NaN)).toBe(false);
    });

    it('should accept reasonable maximum value', () => {
      expect(validateEquityValue(1000000000)).toBe(true);
    });
  });

  describe('formatCurrency', () => {
    it('should format standard amounts correctly', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00');
      expect(formatCurrency(10000.50)).toBe('$10,000.50');
    });

    it('should format small amounts correctly', () => {
      expect(formatCurrency(0.01)).toBe('$0.01');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('should format large amounts correctly', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle negative amounts', () => {
      expect(formatCurrency(-100)).toBe('-$100.00');
    });
  });

  describe('calculateRealizedPnL', () => {
    describe('LONG trades', () => {
      it('should calculate profit correctly for LONG trades', () => {
        const pnl = calculateRealizedPnL(100, 110, 10, 'LONG');
        expect(pnl).toBe(100); // (110 - 100) * 10 = 100
      });

      it('should calculate loss correctly for LONG trades', () => {
        const pnl = calculateRealizedPnL(100, 90, 10, 'LONG');
        expect(pnl).toBe(-100); // (90 - 100) * 10 = -100
      });

      it('should calculate zero P/L for break-even LONG trades', () => {
        const pnl = calculateRealizedPnL(100, 100, 10, 'LONG');
        expect(pnl).toBe(0); // (100 - 100) * 10 = 0
      });
    });

    describe('SHORT trades', () => {
      it('should calculate profit correctly for SHORT trades', () => {
        const pnl = calculateRealizedPnL(100, 90, 10, 'SHORT');
        expect(pnl).toBe(100); // (100 - 90) * 10 = 100
      });

      it('should calculate loss correctly for SHORT trades', () => {
        const pnl = calculateRealizedPnL(100, 110, 10, 'SHORT');
        expect(pnl).toBe(-100); // (100 - 110) * 10 = -100
      });

      it('should calculate zero P/L for break-even SHORT trades', () => {
        const pnl = calculateRealizedPnL(100, 100, 10, 'SHORT');
        expect(pnl).toBe(0); // (100 - 100) * 10 = 0
      });
    });

    describe('decimal precision', () => {
      it('should handle decimal prices with precision for LONG trades', () => {
        const pnl = calculateRealizedPnL(100.50, 101.75, 100, 'LONG');
        expect(pnl).toBe(125); // (101.75 - 100.50) * 100 = 125
      });

      it('should handle decimal prices with precision for SHORT trades', () => {
        const pnl = calculateRealizedPnL(100.50, 99.25, 100, 'SHORT');
        expect(pnl).toBe(125); // (100.50 - 99.25) * 100 = 125
      });

      it('should handle small decimal differences', () => {
        const pnl = calculateRealizedPnL(10.01, 10.03, 1000, 'LONG');
        expect(pnl).toBe(20); // (10.03 - 10.01) * 1000 = 20
      });
    });

    describe('edge cases', () => {
      it('should handle fractional shares', () => {
        const pnl = calculateRealizedPnL(100, 110, 1.5, 'LONG');
        expect(pnl).toBe(15); // (110 - 100) * 1.5 = 15
      });

      it('should handle large position sizes', () => {
        const pnl = calculateRealizedPnL(100, 101, 10000, 'LONG');
        expect(pnl).toBe(10000); // (101 - 100) * 10000 = 10000
      });

      it('should handle very small price differences', () => {
        const pnl = calculateRealizedPnL(100.0001, 100.0002, 1000000, 'LONG');
        expect(pnl).toBe(100); // (100.0002 - 100.0001) * 1000000 = 100
      });
    });
  });
});