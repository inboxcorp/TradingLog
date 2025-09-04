import { describe, test, expect } from '@jest/globals';
import { 
  calculatePerformanceStatistics, 
  assessStatisticalSignificance, 
  getBenchmarkLevel,
  formatStatistic 
} from '../statistics';
import { TradeWithFullAnalysis } from '../../types/analytics';
import Decimal from 'decimal.js';

// Mock trade data for testing
const createMockTrade = (
  id: string,
  realizedPnL: number,
  riskAmount: number,
  entryDate: string,
  exitDate?: string
): TradeWithFullAnalysis => ({
  id,
  userId: 'user1',
  symbol: 'AAPL',
  direction: 'LONG',
  entryPrice: 150,
  positionSize: 10,
  stopLoss: 145,
  exitPrice: realizedPnL > 0 ? 155 : 140,
  status: 'CLOSED',
  entryDate: new Date(entryDate),
  exitDate: exitDate ? new Date(exitDate) : new Date(),
  realizedPnL,
  riskAmount,
  riskPercentage: (riskAmount / 10000) * 100,
  notes: null,
  alignmentScore: null,
  alignmentLevel: null,
  alignmentWarnings: null,
  alignmentConfirmations: null,
  createdAt: new Date(entryDate),
  updatedAt: new Date(),
  outcome: realizedPnL > 0 ? 'WIN' : realizedPnL < 0 ? 'LOSS' : 'BREAKEVEN',
  returnPercentage: (realizedPnL / riskAmount) * 100,
  methodAnalysis: [],
  mindsetTags: []
});

describe('Statistics Calculation Engine', () => {
  describe('calculatePerformanceStatistics', () => {
    test('should return empty statistics for no trades', () => {
      const statistics = calculatePerformanceStatistics([]);
      
      expect(statistics.totalTrades).toBe(0);
      expect(statistics.winningTrades).toBe(0);
      expect(statistics.losingTrades).toBe(0);
      expect(statistics.winRate).toBe(0);
      expect(statistics.totalPnL).toBe(0);
    });

    test('should calculate basic statistics correctly with Decimal.js precision', () => {
      const trades: TradeWithFullAnalysis[] = [
        createMockTrade('1', 100.50, 50, '2025-01-01'), // Win, 2:1 R/R
        createMockTrade('2', -50, 50, '2025-01-02'),    // Loss, 1:1 R/R  
        createMockTrade('3', 150.75, 75, '2025-01-03'), // Win, 2:1 R/R
        createMockTrade('4', -25, 25, '2025-01-04')     // Loss, 1:1 R/R
      ];

      const statistics = calculatePerformanceStatistics(trades);
      
      // Basic metrics
      expect(statistics.totalTrades).toBe(4);
      expect(statistics.winningTrades).toBe(2);
      expect(statistics.losingTrades).toBe(2);
      expect(statistics.breakevenTrades).toBe(0);
      
      // Win/Loss rates
      expect(statistics.winRate).toBe(50);
      expect(statistics.lossRate).toBe(50);
      
      // P/L calculations using Decimal.js precision
      const expectedTotalPnL = new Decimal(100.50).plus(150.75).minus(50).minus(25).toNumber();
      expect(statistics.totalPnL).toBe(expectedTotalPnL);
      expect(statistics.totalPnL).toBe(176.25);
      
      // Average calculations
      const expectedAverageProfit = new Decimal(100.50).plus(150.75).dividedBy(2).toNumber();
      expect(statistics.averageProfit).toBe(expectedAverageProfit);
      expect(statistics.averageProfit).toBe(125.625);
      
      const expectedAverageLoss = new Decimal(50).plus(25).dividedBy(2).toNumber();
      expect(statistics.averageLoss).toBe(expectedAverageLoss);
      expect(statistics.averageLoss).toBe(37.5);
      
      const expectedAverageTrade = new Decimal(expectedTotalPnL).dividedBy(4).toNumber();
      expect(statistics.averageTrade).toBe(expectedAverageTrade);
      expect(statistics.averageTrade).toBe(44.0625);
    });

    test('should calculate profit factor correctly', () => {
      const trades: TradeWithFullAnalysis[] = [
        createMockTrade('1', 200, 100, '2025-01-01'), // Win
        createMockTrade('2', 100, 100, '2025-01-02'), // Win
        createMockTrade('3', -100, 100, '2025-01-03') // Loss
      ];

      const statistics = calculatePerformanceStatistics(trades);
      
      const grossProfit = 200 + 100; // 300
      const grossLoss = 100;         // 100
      const expectedProfitFactor = new Decimal(grossProfit).dividedBy(grossLoss).toNumber();
      
      expect(statistics.profitFactor).toBe(expectedProfitFactor);
      expect(statistics.profitFactor).toBe(3);
    });

    test('should handle profit factor edge cases', () => {
      // All winning trades
      const allWins: TradeWithFullAnalysis[] = [
        createMockTrade('1', 100, 50, '2025-01-01'),
        createMockTrade('2', 200, 100, '2025-01-02')
      ];
      
      const winStats = calculatePerformanceStatistics(allWins);
      expect(winStats.profitFactor).toBe(Infinity);
      
      // All losing trades  
      const allLosses: TradeWithFullAnalysis[] = [
        createMockTrade('1', -50, 50, '2025-01-01'),
        createMockTrade('2', -100, 100, '2025-01-02')
      ];
      
      const lossStats = calculatePerformanceStatistics(allLosses);
      expect(lossStats.profitFactor).toBe(0);
    });

    test('should calculate expectancy correctly', () => {
      const trades: TradeWithFullAnalysis[] = [
        createMockTrade('1', 100, 50, '2025-01-01'), // 2:1 R/R
        createMockTrade('2', -50, 50, '2025-01-02'), // 1:1 R/R
        createMockTrade('3', 150, 75, '2025-01-03'), // 2:1 R/R  
        createMockTrade('4', -25, 25, '2025-01-04')  // 1:1 R/R
      ];

      const statistics = calculatePerformanceStatistics(trades);
      
      // Win Rate: 50%, Average Win: 125, Loss Rate: 50%, Average Loss: 37.5
      // Expectancy = (0.5 * 125) - (0.5 * 37.5) = 62.5 - 18.75 = 43.75
      const expectedExpectancy = new Decimal(0.5)
        .times(125)
        .minus(new Decimal(0.5).times(37.5))
        .toNumber();
      
      expect(statistics.expectancy).toBe(expectedExpectancy);
      expect(statistics.expectancy).toBe(43.75);
    });

    test('should calculate consecutive wins and losses', () => {
      const trades: TradeWithFullAnalysis[] = [
        createMockTrade('1', 100, 50, '2025-01-01'), // Win
        createMockTrade('2', 150, 75, '2025-01-02'), // Win  
        createMockTrade('3', 75, 50, '2025-01-03'),  // Win - 3 consecutive
        createMockTrade('4', -50, 50, '2025-01-04'), // Loss
        createMockTrade('5', -25, 25, '2025-01-05'), // Loss - 2 consecutive  
        createMockTrade('6', 200, 100, '2025-01-06') // Win
      ];

      const statistics = calculatePerformanceStatistics(trades);
      
      expect(statistics.maxConsecutiveWins).toBe(3);
      expect(statistics.maxConsecutiveLosses).toBe(2);
    });

    test('should calculate current streak correctly', () => {
      const trades: TradeWithFullAnalysis[] = [
        createMockTrade('1', 100, 50, '2025-01-01'), // Win
        createMockTrade('2', -50, 50, '2025-01-02'), // Loss
        createMockTrade('3', 150, 75, '2025-01-03'), // Win - current
        createMockTrade('4', 75, 50, '2025-01-04'),  // Win - current
      ];

      const statistics = calculatePerformanceStatistics(trades);
      
      expect(statistics.currentStreak).toBe(2);
      expect(statistics.streakType).toBe('WIN');
    });

    test('should handle breakeven trades correctly', () => {
      const trades: TradeWithFullAnalysis[] = [
        createMockTrade('1', 0, 50, '2025-01-01'), // Breakeven
        createMockTrade('2', 100, 50, '2025-01-02'), // Win
        createMockTrade('3', -50, 50, '2025-01-03')  // Loss
      ];

      const statistics = calculatePerformanceStatistics(trades);
      
      expect(statistics.totalTrades).toBe(3);
      expect(statistics.winningTrades).toBe(1);
      expect(statistics.losingTrades).toBe(1);
      expect(statistics.breakevenTrades).toBe(1);
      expect(statistics.totalPnL).toBe(50); // 0 + 100 - 50
    });

    test('should calculate max drawdown correctly', () => {
      // Sequence: +100, -200 (drawdown 200), +150 (recovery to -50), +200 (profit +150)
      const trades: TradeWithFullAnalysis[] = [
        createMockTrade('1', 100, 50, '2025-01-01'),
        createMockTrade('2', -200, 100, '2025-01-02'), 
        createMockTrade('3', 150, 75, '2025-01-03'),
        createMockTrade('4', 200, 100, '2025-01-04')
      ];

      const statistics = calculatePerformanceStatistics(trades);
      
      // Max drawdown should be 100 (from peak of 100 to trough of -100)
      expect(statistics.maxDrawdown).toBe(100);
    });
  });

  describe('Statistical Significance Assessment', () => {
    test('should assess statistical significance correctly', () => {
      const smallSample: TradeWithFullAnalysis[] = [
        createMockTrade('1', 100, 50, '2025-01-01'),
        createMockTrade('2', -50, 50, '2025-01-02')
      ];
      
      const smallSignificance = assessStatisticalSignificance(smallSample);
      expect(smallSignificance.isSignificant).toBe(false);
      expect(smallSignificance.sampleSize).toBe(2);
      expect(smallSignificance.recommendation).toContain('28 more trades');

      // Large sample (30+ trades)
      const largeSample: TradeWithFullAnalysis[] = Array.from({ length: 35 }, (_, i) =>
        createMockTrade(`${i}`, i % 2 === 0 ? 100 : -50, 50, `2025-01-${String(i + 1).padStart(2, '0')}`)
      );
      
      const largeSignificance = assessStatisticalSignificance(largeSample);
      expect(largeSignificance.isSignificant).toBe(true);
      expect(largeSignificance.sampleSize).toBe(35);
      expect(largeSignificance.confidenceLevel).toBe(95);
    });
  });

  describe('Benchmark Level Assessment', () => {
    test('should correctly assess benchmark levels', () => {
      expect(getBenchmarkLevel('winRate', 75)).toBe('excellent');
      expect(getBenchmarkLevel('winRate', 65)).toBe('good');
      expect(getBenchmarkLevel('winRate', 55)).toBe('acceptable');
      expect(getBenchmarkLevel('winRate', 35)).toBe('poor');
      
      expect(getBenchmarkLevel('profitFactor', 2.5)).toBe('excellent');
      expect(getBenchmarkLevel('profitFactor', 1.7)).toBe('good');
      expect(getBenchmarkLevel('profitFactor', 1.3)).toBe('acceptable');
      expect(getBenchmarkLevel('profitFactor', 0.8)).toBe('poor');
    });
  });

  describe('Statistic Formatting', () => {
    test('should format statistics correctly', () => {
      expect(formatStatistic(1250.50, 'currency')).toBe('$1,250.50');
      expect(formatStatistic(65.5, 'percentage')).toBe('65.5%');
      expect(formatStatistic(1.75, 'ratio')).toBe('1.75');
      expect(formatStatistic(Infinity, 'ratio')).toBe('∞');
      expect(formatStatistic(1500, 'number')).toBe('1,500');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle trades with null P/L', () => {
      const trades: TradeWithFullAnalysis[] = [
        { ...createMockTrade('1', 100, 50, '2025-01-01'), realizedPnL: null, status: 'ACTIVE' },
        createMockTrade('2', 150, 75, '2025-01-02')
      ];

      const statistics = calculatePerformanceStatistics(trades);
      
      // Should only count closed trades with realized P/L
      expect(statistics.totalTrades).toBe(1);
      expect(statistics.totalPnL).toBe(150);
    });

    test('should handle zero risk amounts', () => {
      const trades: TradeWithFullAnalysis[] = [
        { ...createMockTrade('1', 100, 0, '2025-01-01'), riskAmount: 0 }
      ];

      const statistics = calculatePerformanceStatistics(trades);
      
      expect(statistics.averageRisk).toBe(0);
      expect(statistics.riskAdjustedReturn).toBe(0);
    });

    test('should handle identical entry and exit dates', () => {
      const trades: TradeWithFullAnalysis[] = [
        createMockTrade('1', 100, 50, '2025-01-01T10:00:00Z', '2025-01-01T10:00:00Z')
      ];

      const statistics = calculatePerformanceStatistics(trades);
      
      expect(statistics.averageHoldTime).toBe(0);
    });
  });

  describe('Decimal.js Precision Tests', () => {
    test('should maintain precision in P/L calculations', () => {
      const trades: TradeWithFullAnalysis[] = [
        createMockTrade('1', 0.01, 0.001, '2025-01-01'), // Small amounts
        createMockTrade('2', 0.02, 0.001, '2025-01-02'),
        createMockTrade('3', -0.015, 0.001, '2025-01-03')
      ];

      const statistics = calculatePerformanceStatistics(trades);
      
      // Should maintain decimal precision
      const expectedTotalPnL = new Decimal(0.01).plus(0.02).minus(0.015).toNumber();
      expect(statistics.totalPnL).toBe(expectedTotalPnL);
      expect(statistics.totalPnL).toBe(0.015);
      
      // Avoid floating-point errors
      expect(statistics.totalPnL).not.toBe(0.01 + 0.02 - 0.015); // This would be 0.014999999999999999
    });

    test('should handle large numbers with precision', () => {
      const trades: TradeWithFullAnalysis[] = [
        createMockTrade('1', 999999.99, 100000, '2025-01-01'),
        createMockTrade('2', -500000.01, 50000, '2025-01-02')
      ];

      const statistics = calculatePerformanceStatistics(trades);
      
      const expectedTotalPnL = new Decimal(999999.99).minus(500000.01).toNumber();
      expect(statistics.totalPnL).toBe(expectedTotalPnL);
      expect(statistics.totalPnL).toBe(499999.98);
    });
  });
});