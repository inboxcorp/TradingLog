import { 
  calculateTradeRisk, 
  calculatePortfolioRisk,
  exceedsIndividualRiskLimit,
  exceedsPortfolioRiskLimit,
  calculateRealizedPnL
} from '@trading-log/shared';

describe('Risk Calculations', () => {
  describe('calculateTradeRisk', () => {
    it('should calculate risk for LONG position correctly', () => {
      const risk = calculateTradeRisk(100, 95, 100);
      expect(risk).toBe(500); // (100 - 95) * 100 = 500
    });

    it('should calculate risk for SHORT position correctly', () => {
      const risk = calculateTradeRisk(95, 100, 100);
      expect(risk).toBe(500); // |95 - 100| * 100 = 500
    });

    it('should handle decimal precision correctly', () => {
      const risk = calculateTradeRisk(100.123, 99.987, 333);
      expect(risk).toBeCloseTo(45.288, 3); // (100.123 - 99.987) * 333
    });

    it('should handle zero position size', () => {
      const risk = calculateTradeRisk(100, 95, 0);
      expect(risk).toBe(0);
    });

    it('should handle same entry and stop prices', () => {
      const risk = calculateTradeRisk(100, 100, 100);
      expect(risk).toBe(0);
    });

    it('should handle very small price differences', () => {
      const risk = calculateTradeRisk(100.001, 100.000, 1000);
      expect(risk).toBeCloseTo(1, 3);
    });

    it('should handle large numbers correctly', () => {
      const risk = calculateTradeRisk(1000, 950, 10000);
      expect(risk).toBe(500000); // (1000 - 950) * 10000
    });
  });

  describe('calculatePortfolioRisk', () => {
    it('should calculate total portfolio risk for active trades', () => {
      const trades = [
        { status: 'ACTIVE', riskAmount: 500 },
        { status: 'ACTIVE', riskAmount: 1000 },
        { status: 'CLOSED', riskAmount: 750 }, // Should be excluded
      ];

      const portfolioRisk = calculatePortfolioRisk(trades);
      expect(portfolioRisk).toBe(1500); // 500 + 1000
    });

    it('should return 0 for empty trade list', () => {
      const portfolioRisk = calculatePortfolioRisk([]);
      expect(portfolioRisk).toBe(0);
    });

    it('should return 0 when no active trades', () => {
      const trades = [
        { status: 'CLOSED', riskAmount: 500 },
        { status: 'CLOSED', riskAmount: 1000 },
      ];

      const portfolioRisk = calculatePortfolioRisk(trades);
      expect(portfolioRisk).toBe(0);
    });

    it('should handle decimal precision in portfolio risk', () => {
      const trades = [
        { status: 'ACTIVE', riskAmount: 123.456 },
        { status: 'ACTIVE', riskAmount: 456.789 },
      ];

      const portfolioRisk = calculatePortfolioRisk(trades);
      expect(portfolioRisk).toBeCloseTo(580.245, 3);
    });
  });

  describe('exceedsIndividualRiskLimit', () => {
    it('should return true when risk exceeds 2% limit', () => {
      const totalEquity = 100000;
      const riskAmount = 2500; // 2.5% > 2%
      
      expect(exceedsIndividualRiskLimit(riskAmount, totalEquity)).toBe(true);
    });

    it('should return false when risk is within 2% limit', () => {
      const totalEquity = 100000;
      const riskAmount = 1500; // 1.5% < 2%
      
      expect(exceedsIndividualRiskLimit(riskAmount, totalEquity)).toBe(false);
    });

    it('should return false when risk equals exactly 2%', () => {
      const totalEquity = 100000;
      const riskAmount = 2000; // Exactly 2%
      
      expect(exceedsIndividualRiskLimit(riskAmount, totalEquity)).toBe(false);
    });

    it('should handle decimal equity values', () => {
      const totalEquity = 123456.78;
      const maxRisk = totalEquity * 0.02; // 2469.1356
      
      expect(exceedsIndividualRiskLimit(maxRisk - 0.01, totalEquity)).toBe(false);
      expect(exceedsIndividualRiskLimit(maxRisk + 0.01, totalEquity)).toBe(true);
    });
  });

  describe('exceedsPortfolioRiskLimit', () => {
    it('should return true when portfolio risk exceeds 6% limit', () => {
      const totalEquity = 100000;
      const portfolioRisk = 7000; // 7% > 6%
      
      expect(exceedsPortfolioRiskLimit(portfolioRisk, totalEquity)).toBe(true);
    });

    it('should return false when portfolio risk is within 6% limit', () => {
      const totalEquity = 100000;
      const portfolioRisk = 5000; // 5% < 6%
      
      expect(exceedsPortfolioRiskLimit(portfolioRisk, totalEquity)).toBe(false);
    });

    it('should return false when portfolio risk equals exactly 6%', () => {
      const totalEquity = 100000;
      const portfolioRisk = 6000; // Exactly 6%
      
      expect(exceedsPortfolioRiskLimit(portfolioRisk, totalEquity)).toBe(false);
    });
  });

  describe('calculateRealizedPnL', () => {
    it('should calculate profit for successful LONG trade', () => {
      const pnl = calculateRealizedPnL(100, 110, 100, 'LONG');
      expect(pnl).toBe(1000); // (110 - 100) * 100
    });

    it('should calculate loss for unsuccessful LONG trade', () => {
      const pnl = calculateRealizedPnL(100, 90, 100, 'LONG');
      expect(pnl).toBe(-1000); // (90 - 100) * 100
    });

    it('should calculate profit for successful SHORT trade', () => {
      const pnl = calculateRealizedPnL(100, 90, 100, 'SHORT');
      expect(pnl).toBe(1000); // (100 - 90) * 100
    });

    it('should calculate loss for unsuccessful SHORT trade', () => {
      const pnl = calculateRealizedPnL(100, 110, 100, 'SHORT');
      expect(pnl).toBe(-1000); // (100 - 110) * 100
    });

    it('should handle decimal precision in P&L calculation', () => {
      const pnl = calculateRealizedPnL(100.123, 101.456, 333, 'LONG');
      expect(pnl).toBeCloseTo(443.889, 3); // (101.456 - 100.123) * 333
    });

    it('should return zero for break-even trade', () => {
      const pnl = calculateRealizedPnL(100, 100, 100, 'LONG');
      expect(pnl).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle negative position sizes gracefully', () => {
      // While this shouldn't happen in normal usage, test defensive behavior
      const risk = calculateTradeRisk(100, 95, -100);
      expect(risk).toBe(500); // Should take absolute value
    });

    it('should handle very large numbers without overflow', () => {
      const risk = calculateTradeRisk(999999, 999998, 1000000);
      expect(risk).toBe(1000000);
    });

    it('should handle very small equity values', () => {
      const totalEquity = 0.01;
      const riskAmount = 0.001;
      
      expect(exceedsIndividualRiskLimit(riskAmount, totalEquity)).toBe(true);
      expect(exceedsPortfolioRiskLimit(riskAmount, totalEquity)).toBe(true);
    });
  });
});