import Decimal from 'decimal.js';

/**
 * CRITICAL: Use Decimal.js for all monetary calculations to ensure precision
 * This prevents floating-point arithmetic errors in financial calculations
 */

/**
 * Updates user equity with precise decimal arithmetic
 * @param currentEquity Current equity amount
 * @param change Amount to add/subtract
 * @returns Updated equity value
 */
export const updateEquity = (currentEquity: number, change: number): number => {
  return new Decimal(currentEquity).plus(change).toNumber();
};

/**
 * Validates that an equity value is positive and within reasonable bounds
 * @param equity Equity value to validate
 * @returns True if valid, false otherwise
 */
export const validateEquityValue = (equity: number): boolean => {
  if (equity < 0) return false;
  if (equity > 1000000000) return false; // $1B max reasonable limit
  if (!Number.isFinite(equity)) return false;
  return true;
};

/**
 * Validates cash adjustment amount
 * @param amount Amount to validate
 * @returns True if valid, false otherwise
 */
export const validateCashAdjustmentAmount = (amount: number): boolean => {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  if (amount > 10000000) return false; // $10M max per transaction
  return true;
};

/**
 * Validates withdrawal doesn't result in negative equity
 * @param currentEquity Current equity amount
 * @param withdrawalAmount Amount to withdraw
 * @returns True if withdrawal is allowed, false otherwise
 */
export const validateWithdrawal = (currentEquity: number, withdrawalAmount: number): boolean => {
  const newEquity = new Decimal(currentEquity).minus(withdrawalAmount).toNumber();
  return newEquity >= 0;
};

/**
 * Processes cash adjustment and returns new equity
 * @param currentEquity Current equity amount
 * @param type Type of adjustment (DEPOSIT or WITHDRAWAL)
 * @param amount Amount to adjust
 * @returns New equity amount
 * @throws Error if adjustment is invalid
 */
export const processCashAdjustment = (
  currentEquity: number, 
  type: 'DEPOSIT' | 'WITHDRAWAL', 
  amount: number
): number => {
  if (!validateCashAdjustmentAmount(amount)) {
    throw new Error('Invalid adjustment amount');
  }

  if (type === 'WITHDRAWAL') {
    if (!validateWithdrawal(currentEquity, amount)) {
      throw new Error('Insufficient funds for withdrawal');
    }
    return new Decimal(currentEquity).minus(amount).toNumber();
  } else {
    return new Decimal(currentEquity).plus(amount).toNumber();
  }
};

/**
 * Formats currency values for display
 * @param value Numeric value to format
 * @param currency Currency code (default: USD)
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * CRITICAL: Risk Calculation Formula
 * Calculates the monetary risk of a trade using precise decimal arithmetic
 * @param entryPrice Entry price per unit (must be positive)
 * @param stopLoss Stop loss price per unit (must be positive)
 * @param size Number of shares/units (must be positive)
 * @returns Risk amount in dollars
 * @throws Error if any input is invalid
 */
export const calculateTradeRisk = (entryPrice: number, stopLoss: number, size: number): number => {
  // Input validation
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    throw new Error('Entry price must be a positive number');
  }
  if (!Number.isFinite(stopLoss) || stopLoss <= 0) {
    throw new Error('Stop loss must be a positive number');
  }
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error('Position size must be a positive number');
  }
  
  return new Decimal(entryPrice)
    .minus(stopLoss)
    .abs()
    .times(size)
    .toNumber();
};

/**
 * Calculates total portfolio risk from active trades
 * @param trades Array of trades to calculate portfolio risk from
 * @returns Total portfolio risk amount
 */
export const calculatePortfolioRisk = (trades: { status: string; riskAmount: number }[]): number => {
  return trades
    .filter(trade => trade.status === 'ACTIVE')
    .reduce((total, trade) => new Decimal(total).plus(trade.riskAmount).toNumber(), 0);
};

/**
 * Validates if trade risk exceeds individual limit (2% of equity)
 * @param riskAmount Risk amount for the trade
 * @param totalEquity User's total equity
 * @returns True if risk exceeds 2% limit
 */
export const exceedsIndividualRiskLimit = (riskAmount: number, totalEquity: number): boolean => {
  const maxRisk = new Decimal(totalEquity).times(0.02).toNumber(); // 2%
  return riskAmount > maxRisk;
};

/**
 * Validates if portfolio risk exceeds total limit (6% of equity)
 * @param portfolioRisk Total portfolio risk
 * @param totalEquity User's total equity
 * @returns True if portfolio risk exceeds 6% limit
 */
export const exceedsPortfolioRiskLimit = (portfolioRisk: number, totalEquity: number): boolean => {
  const maxRisk = new Decimal(totalEquity).times(0.06).toNumber(); // 6%
  return portfolioRisk > maxRisk;
};

/**
 * Calculates realized P/L for a closed trade
 * @param entryPrice Entry price per unit
 * @param exitPrice Exit price per unit
 * @param size Number of shares/units
 * @param direction Trade direction ('LONG' or 'SHORT')
 * @returns Realized profit or loss
 */
export const calculateRealizedPnL = (
  entryPrice: number,
  exitPrice: number,
  size: number,
  direction: 'LONG' | 'SHORT'
): number => {
  const priceDiff = new Decimal(exitPrice).minus(entryPrice);
  const multiplier = direction === 'LONG' ? 1 : -1;
  const result = priceDiff.times(multiplier).times(size).toNumber();
  // Convert -0 to 0 for consistency
  return result === 0 ? 0 : result;
};

/**
 * Calculate portfolio risk with detailed breakdown
 * @param activeTrades Array of active trades
 * @param userEquity User's current total equity
 * @returns Complete portfolio risk analysis
 */
export const calculateDetailedPortfolioRisk = (
  activeTrades: Array<{ id: string; symbol: string; riskAmount: number }>,
  userEquity: number
): {
  totalRiskAmount: number;
  totalRiskPercentage: number;
  exceedsLimit: boolean;
  riskLevel: 'SAFE' | 'WARNING' | 'DANGER';
  activeTrades: Array<{
    id: string;
    symbol: string;
    riskAmount: number;
    riskPercentage: number;
  }>;
} => {
  const totalRiskAmount = activeTrades.reduce((total, trade) => 
    new Decimal(total).plus(trade.riskAmount).toNumber(), 0
  );
  
  const totalRiskPercentage = new Decimal(totalRiskAmount)
    .dividedBy(userEquity)
    .times(100)
    .toNumber();
    
  const riskLevel = totalRiskPercentage > 6 ? 'DANGER' : 
                   totalRiskPercentage > 4.5 ? 'WARNING' : 'SAFE';
    
  return {
    totalRiskAmount,
    totalRiskPercentage,
    exceedsLimit: totalRiskPercentage > 6,
    riskLevel,
    activeTrades: activeTrades.map(trade => ({
      id: trade.id,
      symbol: trade.symbol,
      riskAmount: trade.riskAmount,
      riskPercentage: new Decimal(trade.riskAmount)
        .dividedBy(userEquity)
        .times(100)
        .toNumber()
    }))
  };
};