import { describe, it, expect } from '@jest/globals';
import { updateEquity, validateEquityValue, formatCurrency } from '@trading-log/shared';
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
});