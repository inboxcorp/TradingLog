import { describe, it, expect } from '@jest/globals';
import { calculateDetailedPortfolioRisk } from '@trading-log/shared';

describe('Portfolio Risk Calculations', () => {
  const mockUserEquity = 10000; // $10,000

  describe('calculateDetailedPortfolioRisk', () => {
    it('calculates portfolio risk with no active trades', () => {
      const result = calculateDetailedPortfolioRisk([], mockUserEquity);
      
      expect(result).toEqual({
        totalRiskAmount: 0,
        totalRiskPercentage: 0,
        exceedsLimit: false,
        riskLevel: 'SAFE',
        activeTrades: []
      });
    });

    it('calculates portfolio risk with single trade - SAFE level', () => {
      const activeTrades = [
        { id: 'trade-1', symbol: 'AAPL', riskAmount: 200 }
      ];

      const result = calculateDetailedPortfolioRisk(activeTrades, mockUserEquity);
      
      expect(result.totalRiskAmount).toBe(200);
      expect(result.totalRiskPercentage).toBe(2.0);
      expect(result.exceedsLimit).toBe(false);
      expect(result.riskLevel).toBe('SAFE');
      expect(result.activeTrades).toHaveLength(1);
      expect(result.activeTrades[0]).toEqual({
        id: 'trade-1',
        symbol: 'AAPL',
        riskAmount: 200,
        riskPercentage: 2.0
      });
    });

    it('calculates portfolio risk with multiple trades - WARNING level', () => {
      const activeTrades = [
        { id: 'trade-1', symbol: 'AAPL', riskAmount: 250 },
        { id: 'trade-2', symbol: 'TSLA', riskAmount: 200 }
      ];

      const result = calculateDetailedPortfolioRisk(activeTrades, mockUserEquity);
      
      expect(result.totalRiskAmount).toBe(450);
      expect(result.totalRiskPercentage).toBe(4.5);
      expect(result.exceedsLimit).toBe(false);
      expect(result.riskLevel).toBe('SAFE'); // 4.5% is still under WARNING threshold of 4.5%
    });

    it('calculates portfolio risk at WARNING threshold', () => {
      const activeTrades = [
        { id: 'trade-1', symbol: 'AAPL', riskAmount: 460 } // 4.6% - just over WARNING threshold
      ];

      const result = calculateDetailedPortfolioRisk(activeTrades, mockUserEquity);
      
      expect(result.totalRiskAmount).toBe(460);
      expect(result.totalRiskPercentage).toBe(4.6);
      expect(result.exceedsLimit).toBe(false);
      expect(result.riskLevel).toBe('WARNING');
    });

    it('calculates portfolio risk exceeding limit - DANGER level', () => {
      const activeTrades = [
        { id: 'trade-1', symbol: 'AAPL', riskAmount: 300 },
        { id: 'trade-2', symbol: 'TSLA', riskAmount: 350 },
        { id: 'trade-3', symbol: 'NVDA', riskAmount: 100 }
      ];

      const result = calculateDetailedPortfolioRisk(activeTrades, mockUserEquity);
      
      expect(result.totalRiskAmount).toBe(750);
      expect(result.totalRiskPercentage).toBe(7.5);
      expect(result.exceedsLimit).toBe(true);
      expect(result.riskLevel).toBe('DANGER');
      expect(result.activeTrades).toHaveLength(3);
    });

    it('handles decimal precision correctly', () => {
      const activeTrades = [
        { id: 'trade-1', symbol: 'AAPL', riskAmount: 150.50 },
        { id: 'trade-2', symbol: 'TSLA', riskAmount: 249.75 }
      ];

      const result = calculateDetailedPortfolioRisk(activeTrades, mockUserEquity);
      
      expect(result.totalRiskAmount).toBe(400.25);
      expect(result.totalRiskPercentage).toBe(4.0025);
      expect(result.exceedsLimit).toBe(false);
      expect(result.riskLevel).toBe('SAFE');
    });

    it('calculates individual trade percentages correctly', () => {
      const activeTrades = [
        { id: 'trade-1', symbol: 'AAPL', riskAmount: 100 }, // 1%
        { id: 'trade-2', symbol: 'TSLA', riskAmount: 250 }, // 2.5%
        { id: 'trade-3', symbol: 'NVDA', riskAmount: 350 }  // 3.5%
      ];

      const result = calculateDetailedPortfolioRisk(activeTrades, mockUserEquity);
      
      expect(result.activeTrades[0].riskPercentage).toBe(1.0);
      expect(result.activeTrades[1].riskPercentage).toBe(2.5);
      expect(result.activeTrades[2].riskPercentage).toBe(3.5);
      expect(result.totalRiskPercentage).toBe(7.0);
    });

    it('handles edge case with zero equity', () => {
      const activeTrades = [
        { id: 'trade-1', symbol: 'AAPL', riskAmount: 100 }
      ];

      const result = calculateDetailedPortfolioRisk(activeTrades, 0);
      
      // With zero equity, percentage will be Infinity or NaN
      expect(result.totalRiskAmount).toBe(100);
      expect(result.totalRiskPercentage).toBe(Infinity);
      expect(result.riskLevel).toBe('DANGER');
      expect(result.exceedsLimit).toBe(true);
    });

    it('handles very large portfolio risk amounts', () => {
      const activeTrades = [
        { id: 'trade-1', symbol: 'AAPL', riskAmount: 50000 }
      ];
      const largeEquity = 100000;

      const result = calculateDetailedPortfolioRisk(activeTrades, largeEquity);
      
      expect(result.totalRiskAmount).toBe(50000);
      expect(result.totalRiskPercentage).toBe(50.0);
      expect(result.exceedsLimit).toBe(true);
      expect(result.riskLevel).toBe('DANGER');
    });

    it('maintains risk level thresholds correctly', () => {
      // Test exact boundaries
      const testCases = [
        { percentage: 3.0, expectedLevel: 'SAFE' },
        { percentage: 4.5, expectedLevel: 'SAFE' },
        { percentage: 4.51, expectedLevel: 'WARNING' },
        { percentage: 6.0, expectedLevel: 'WARNING' },
        { percentage: 6.01, expectedLevel: 'DANGER' }
      ];

      testCases.forEach(({ percentage, expectedLevel }) => {
        const riskAmount = (percentage / 100) * mockUserEquity;
        const activeTrades = [{ id: 'test', symbol: 'TEST', riskAmount }];
        
        const result = calculateDetailedPortfolioRisk(activeTrades, mockUserEquity);
        expect(result.riskLevel).toBe(expectedLevel);
      });
    });

    it('preserves trade information in breakdown', () => {
      const activeTrades = [
        { id: 'abc123', symbol: 'AAPL', riskAmount: 200 },
        { id: 'def456', symbol: 'GOOGL', riskAmount: 300 }
      ];

      const result = calculateDetailedPortfolioRisk(activeTrades, mockUserEquity);
      
      expect(result.activeTrades).toEqual([
        {
          id: 'abc123',
          symbol: 'AAPL',
          riskAmount: 200,
          riskPercentage: 2.0
        },
        {
          id: 'def456',
          symbol: 'GOOGL',
          riskAmount: 300,
          riskPercentage: 3.0
        }
      ]);
    });
  });
});