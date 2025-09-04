import Decimal from 'decimal.js';
import { 
  PerformanceStatistics, 
  StatisticalSignificance, 
  BenchmarkLevel,
  PERFORMANCE_BENCHMARKS,
  PerformanceBenchmarks
} from '../types/statistics';
import { TradeWithFullAnalysis } from '../types/analytics';

/**
 * CRITICAL: Use Decimal.js for all statistical calculations to ensure precision
 * This prevents floating-point arithmetic errors in financial calculations
 */

/**
 * Returns empty statistics structure for zero trades
 */
const getEmptyStatistics = (): PerformanceStatistics => ({
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  breakevenTrades: 0,
  winRate: 0,
  lossRate: 0,
  winLossRatio: 0,
  totalPnL: 0,
  averageProfit: 0,
  averageLoss: 0,
  averageTrade: 0,
  expectancy: 0,
  profitFactor: 0,
  recoveryFactor: 0,
  maxWin: 0,
  maxLoss: 0,
  maxConsecutiveWins: 0,
  maxConsecutiveLosses: 0,
  currentStreak: 0,
  streakType: 'NONE',
  averageRisk: 0,
  riskAdjustedReturn: 0,
  maxDrawdown: 0,
  sharpeRatio: 0,
  averageHoldTime: 0,
  tradingFrequency: 0,
  bestMonth: 'N/A',
  worstMonth: 'N/A'
});

/**
 * Calculates maximum consecutive wins or losses
 */
const calculateMaxConsecutive = (
  trades: TradeWithFullAnalysis[], 
  type: 'WIN' | 'LOSS'
): number => {
  if (trades.length === 0) return 0;
  
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  );
  
  let maxConsecutive = 0;
  let currentConsecutive = 0;
  
  for (const trade of sortedTrades) {
    // Determine outcome based on realized P/L
    const outcome = trade.realizedPnL === null || trade.realizedPnL === 0 ? 'BREAKEVEN' :
                    trade.realizedPnL > 0 ? 'WIN' : 'LOSS';
    
    if (outcome === type) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 0;
    }
  }
  
  return maxConsecutive;
};

/**
 * Calculates current winning/losing streak
 */
const calculateCurrentStreak = (trades: TradeWithFullAnalysis[]): number => {
  if (trades.length === 0) return 0;
  
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
  );
  
  let streak = 0;
  const firstTrade = sortedTrades[0];
  if (!firstTrade) return 0;
  
  // Determine outcome based on realized P/L
  const firstTradeOutcome = firstTrade.realizedPnL === null || firstTrade.realizedPnL === 0 ? 'BREAKEVEN' :
                           firstTrade.realizedPnL > 0 ? 'WIN' : 'LOSS';
  
  if (firstTradeOutcome === 'BREAKEVEN') return 0;
  
  for (const trade of sortedTrades) {
    const outcome = trade.realizedPnL === null || trade.realizedPnL === 0 ? 'BREAKEVEN' :
                    trade.realizedPnL > 0 ? 'WIN' : 'LOSS';
    
    if (outcome === firstTradeOutcome) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};

/**
 * Gets current streak type
 */
const getCurrentStreakType = (trades: TradeWithFullAnalysis[]): 'WIN' | 'LOSS' | 'NONE' => {
  if (trades.length === 0) return 'NONE';
  
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
  );
  
  const lastTrade = sortedTrades[0];
  if (!lastTrade) return 'NONE';
  
  // Determine outcome based on realized P/L
  const lastTradeOutcome = lastTrade.realizedPnL === null || lastTrade.realizedPnL === 0 ? 'BREAKEVEN' :
                          lastTrade.realizedPnL > 0 ? 'WIN' : 'LOSS';
  
  return lastTradeOutcome === 'BREAKEVEN' ? 'NONE' : (lastTradeOutcome as 'WIN' | 'LOSS');
};

/**
 * Calculates recovery factor (Total PnL / Max Drawdown)
 */
const calculateRecoveryFactor = (trades: TradeWithFullAnalysis[]): number => {
  const maxDrawdown = calculateMaxDrawdown(trades);
  const totalPnL = trades.reduce((sum, trade) => 
    new Decimal(sum).plus(trade.realizedPnL || 0).toNumber(), 0
  );
  
  return maxDrawdown > 0 ? new Decimal(totalPnL).dividedBy(maxDrawdown).toNumber() : 0;
};

/**
 * Calculates maximum drawdown
 */
const calculateMaxDrawdown = (trades: TradeWithFullAnalysis[]): number => {
  if (trades.length === 0) return 0;
  
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  );
  
  let runningPnL = new Decimal(0);
  let peak = new Decimal(0);
  let maxDrawdown = new Decimal(0);
  
  for (const trade of sortedTrades) {
    runningPnL = runningPnL.plus(trade.realizedPnL || 0);
    
    if (runningPnL.gt(peak)) {
      peak = runningPnL;
    }
    
    const drawdown = peak.minus(runningPnL);
    if (drawdown.gt(maxDrawdown)) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown.toNumber();
};

/**
 * Calculates average risk per trade
 */
const calculateAverageRisk = (trades: TradeWithFullAnalysis[]): number => {
  if (trades.length === 0) return 0;
  
  const totalRisk = trades.reduce((sum, trade) => 
    new Decimal(sum).plus(trade.riskAmount).toNumber(), 0
  );
  
  return new Decimal(totalRisk).dividedBy(trades.length).toNumber();
};

/**
 * Calculates risk-adjusted return (Total PnL / Average Risk)
 */
const calculateRiskAdjustedReturn = (trades: TradeWithFullAnalysis[]): number => {
  const averageRisk = calculateAverageRisk(trades);
  const totalPnL = trades.reduce((sum, trade) => 
    new Decimal(sum).plus(trade.realizedPnL || 0).toNumber(), 0
  );
  
  return averageRisk > 0 ? new Decimal(totalPnL).dividedBy(averageRisk).toNumber() : 0;
};

/**
 * Calculates Sharpe ratio (simplified version using daily returns)
 */
const calculateSharpeRatio = (trades: TradeWithFullAnalysis[]): number => {
  if (trades.length < 2) return 0;
  
  const returns = trades.map(trade => trade.returnPercentage || 0);
  const avgReturn = returns.reduce((sum, ret) => 
    new Decimal(sum).plus(ret).toNumber(), 0
  ) / returns.length;
  
  const variance = returns.reduce((sum, ret) => 
    new Decimal(sum).plus(new Decimal(ret).minus(avgReturn).pow(2).toNumber()).toNumber(), 0
  ) / (returns.length - 1);
  
  const standardDeviation = Math.sqrt(variance);
  
  // Assuming risk-free rate of 2% annually (simplified)
  const riskFreeRate = 0.02;
  
  return standardDeviation > 0 ? 
    new Decimal(avgReturn).minus(riskFreeRate).dividedBy(standardDeviation).toNumber() : 0;
};

/**
 * Calculates average hold time in hours
 */
const calculateAverageHoldTime = (trades: TradeWithFullAnalysis[]): number => {
  const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.exitDate);
  
  if (closedTrades.length === 0) return 0;
  
  const totalHours = closedTrades.reduce((sum, trade) => {
    const entryTime = new Date(trade.entryDate).getTime();
    const exitTime = new Date(trade.exitDate!).getTime();
    const hours = (exitTime - entryTime) / (1000 * 60 * 60);
    return new Decimal(sum).plus(hours).toNumber();
  }, 0);
  
  return new Decimal(totalHours).dividedBy(closedTrades.length).toNumber();
};

/**
 * Calculates trading frequency (trades per month)
 */
const calculateTradingFrequency = (trades: TradeWithFullAnalysis[]): number => {
  if (trades.length === 0) return 0;
  
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  );
  
  const firstDate = new Date(sortedTrades[0].entryDate);
  const lastDate = new Date(sortedTrades[sortedTrades.length - 1].entryDate);
  
  const monthsDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  return monthsDiff > 0 ? new Decimal(trades.length).dividedBy(monthsDiff).toNumber() : 0;
};

/**
 * Finds best performing month
 */
const findBestMonth = (trades: TradeWithFullAnalysis[]): string => {
  if (trades.length === 0) return 'N/A';
  
  const monthlyPnL = new Map<string, number>();
  
  trades.forEach(trade => {
    const monthKey = new Date(trade.entryDate).toISOString().substring(0, 7); // YYYY-MM
    const currentPnL = monthlyPnL.get(monthKey) || 0;
    monthlyPnL.set(monthKey, new Decimal(currentPnL).plus(trade.realizedPnL || 0).toNumber());
  });
  
  let bestMonth = 'N/A';
  let bestPnL = -Infinity;
  
  monthlyPnL.forEach((pnl, month) => {
    if (pnl > bestPnL) {
      bestPnL = pnl;
      bestMonth = month;
    }
  });
  
  return bestMonth;
};

/**
 * Finds worst performing month
 */
const findWorstMonth = (trades: TradeWithFullAnalysis[]): string => {
  if (trades.length === 0) return 'N/A';
  
  const monthlyPnL = new Map<string, number>();
  
  trades.forEach(trade => {
    const monthKey = new Date(trade.entryDate).toISOString().substring(0, 7); // YYYY-MM
    const currentPnL = monthlyPnL.get(monthKey) || 0;
    monthlyPnL.set(monthKey, new Decimal(currentPnL).plus(trade.realizedPnL || 0).toNumber());
  });
  
  let worstMonth = 'N/A';
  let worstPnL = Infinity;
  
  monthlyPnL.forEach((pnl, month) => {
    if (pnl < worstPnL) {
      worstPnL = pnl;
      worstMonth = month;
    }
  });
  
  return worstMonth;
};

/**
 * MAIN FUNCTION: Calculates comprehensive performance statistics
 */
export const calculatePerformanceStatistics = (
  trades: TradeWithFullAnalysis[]
): PerformanceStatistics => {
  const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.realizedPnL !== null);
  
  if (closedTrades.length === 0) {
    return getEmptyStatistics();
  }
  
  // Categorize trades
  const winningTrades = closedTrades.filter(t => new Decimal(t.realizedPnL!).gt(0));
  const losingTrades = closedTrades.filter(t => new Decimal(t.realizedPnL!).lt(0));
  const breakevenTrades = closedTrades.filter(t => new Decimal(t.realizedPnL!).eq(0));
  
  // Basic calculations using Decimal.js
  const totalPnL = closedTrades.reduce((sum, trade) => 
    new Decimal(sum).plus(trade.realizedPnL!).toNumber(), 0
  );
  
  // Average profit (winning trades only)
  const averageProfit = winningTrades.length > 0 
    ? winningTrades.reduce((sum, trade) => 
        new Decimal(sum).plus(trade.realizedPnL!).toNumber(), 0
      ) / winningTrades.length
    : 0;
  
  // Average loss (losing trades only, absolute value)
  const averageLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, trade) => 
        new Decimal(sum).plus(trade.realizedPnL!).toNumber(), 0
      ) / losingTrades.length)
    : 0;
  
  // Win/Loss rates
  const winRate = new Decimal(winningTrades.length).dividedBy(closedTrades.length).times(100).toNumber();
  const lossRate = new Decimal(losingTrades.length).dividedBy(closedTrades.length).times(100).toNumber();
  
  // Expectancy calculation
  const expectancy = new Decimal(winRate / 100)
    .times(averageProfit)
    .minus(new Decimal(lossRate / 100).times(averageLoss))
    .toNumber();
  
  // Profit factor calculation
  const grossProfit = winningTrades.reduce((sum, trade) => 
    new Decimal(sum).plus(trade.realizedPnL!).toNumber(), 0
  );
  
  const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => 
    new Decimal(sum).plus(trade.realizedPnL!).toNumber(), 0
  ));
  
  const profitFactor = grossLoss > 0 ? new Decimal(grossProfit).dividedBy(grossLoss).toNumber() : 
                     (grossProfit > 0 ? Infinity : 0);
  
  // Max win and max loss
  const maxWin = winningTrades.length > 0 ? 
    Math.max(...winningTrades.map(t => t.realizedPnL!)) : 0;
  const maxLoss = losingTrades.length > 0 ? 
    Math.min(...losingTrades.map(t => t.realizedPnL!)) : 0;
  
  return {
    totalTrades: closedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakevenTrades: breakevenTrades.length,
    winRate,
    lossRate,
    winLossRatio: losingTrades.length > 0 ? 
      new Decimal(winningTrades.length).dividedBy(losingTrades.length).toNumber() : 
      (winningTrades.length > 0 ? Infinity : 0),
    totalPnL,
    averageProfit,
    averageLoss,
    averageTrade: new Decimal(totalPnL).dividedBy(closedTrades.length).toNumber(),
    expectancy,
    profitFactor,
    recoveryFactor: calculateRecoveryFactor(closedTrades),
    maxWin,
    maxLoss,
    maxConsecutiveWins: calculateMaxConsecutive(closedTrades, 'WIN'),
    maxConsecutiveLosses: calculateMaxConsecutive(closedTrades, 'LOSS'),
    currentStreak: calculateCurrentStreak(closedTrades),
    streakType: getCurrentStreakType(closedTrades),
    averageRisk: calculateAverageRisk(closedTrades),
    riskAdjustedReturn: calculateRiskAdjustedReturn(closedTrades),
    maxDrawdown: calculateMaxDrawdown(closedTrades),
    sharpeRatio: calculateSharpeRatio(closedTrades),
    averageHoldTime: calculateAverageHoldTime(closedTrades),
    tradingFrequency: calculateTradingFrequency(closedTrades),
    bestMonth: findBestMonth(closedTrades),
    worstMonth: findWorstMonth(closedTrades)
  };
};

/**
 * Assesses statistical significance of trading results
 */
export const assessStatisticalSignificance = (
  trades: TradeWithFullAnalysis[]
): StatisticalSignificance => {
  const sampleSize = trades.length;
  
  // Require minimum 30 trades for basic significance
  const isSignificant = sampleSize >= 30;
  const confidenceLevel = Math.min(95, (sampleSize / 30) * 95);
  
  // Simple margin of error calculation (simplified)
  const marginOfError = sampleSize > 0 ? 1.96 / Math.sqrt(sampleSize) : 1;
  
  const recommendation = isSignificant 
    ? 'Statistics are reliable for analysis'
    : `Need ${30 - sampleSize} more trades for statistical significance`;
  
  return {
    sampleSize,
    confidenceLevel,
    isSignificant,
    marginOfError,
    recommendation
  };
};

/**
 * Gets benchmark level for a specific metric
 */
export const getBenchmarkLevel = (
  metric: keyof PerformanceBenchmarks,
  value: number
): BenchmarkLevel => {
  const benchmarks = PERFORMANCE_BENCHMARKS[metric];
  
  if (value >= benchmarks.excellent) return 'excellent';
  if (value >= benchmarks.good) return 'good';
  if (value >= benchmarks.acceptable) return 'acceptable';
  return 'poor';
};

/**
 * Formats statistic value based on type
 */
export const formatStatistic = (
  value: number, 
  type: 'currency' | 'percentage' | 'ratio' | 'number'
): string => {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(value);
    
    case 'percentage':
      return `${value.toFixed(1)}%`;
    
    case 'ratio':
      return value === Infinity ? '∞' : value.toFixed(2);
    
    case 'number':
      return value.toLocaleString();
  }
};