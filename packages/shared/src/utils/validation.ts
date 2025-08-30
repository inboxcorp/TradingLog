import Decimal from 'decimal.js';
import { Trade } from '../types/index';

/**
 * Validates stop-loss adjustment according to trade direction rules
 * For LONG positions: new stop must be higher (reducing risk)
 * For SHORT positions: new stop must be lower (reducing risk)
 */
export const validateStopLossAdjustment = (
  trade: Trade, 
  newStopLoss: number
): { isValid: boolean; error?: string } => {
  // Basic validation
  if (!Number.isFinite(newStopLoss) || newStopLoss <= 0) {
    return { isValid: false, error: 'Stop-loss must be a positive number' };
  }

  const currentStop = new Decimal(trade.stopLoss);
  const newStop = new Decimal(newStopLoss);
  const entry = new Decimal(trade.entryPrice);
  
  if (trade.direction === 'LONG') {
    // For LONG trades, new stop must be higher (closer to/above entry)
    if (newStop.lte(currentStop)) {
      return { 
        isValid: false, 
        error: 'New stop-loss must be higher than current stop for LONG positions' 
      };
    }
    
    // Allow profit locking (stop above entry)
    if (newStop.gt(entry)) {
      return { isValid: true }; // Profit locking allowed
    }
  } else if (trade.direction === 'SHORT') {
    // For SHORT trades, new stop must be lower (closer to/below entry) 
    if (newStop.gte(currentStop)) {
      return { 
        isValid: false, 
        error: 'New stop-loss must be lower than current stop for SHORT positions' 
      };
    }
    
    // Allow profit locking (stop below entry)
    if (newStop.lt(entry)) {
      return { isValid: true }; // Profit locking allowed
    }
  }
  
  return { isValid: true };
};

/**
 * Recalculates trade risk with new stop-loss price
 * Uses Decimal.js for precision in financial calculations
 */
export const recalculateTradeRisk = (trade: Trade, newStopLoss: number): number => {
  return new Decimal(trade.entryPrice)
    .minus(newStopLoss)
    .abs()
    .times(trade.positionSize)
    .toNumber();
};

/**
 * Calculates the new risk percentage based on user's current equity
 */
export const calculateNewRiskPercentage = (
  riskAmount: number, 
  userEquity: number
): number => {
  return new Decimal(riskAmount)
    .dividedBy(userEquity)
    .times(100)
    .toNumber();
};