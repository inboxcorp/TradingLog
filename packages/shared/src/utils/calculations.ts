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
  return priceDiff.times(multiplier).times(size).toNumber();
};