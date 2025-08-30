import { 
  validateStopLossAdjustment, 
  recalculateTradeRisk,
  calculateNewRiskPercentage 
} from '@trading-log/shared';
import { Trade } from '@trading-log/shared';

describe('Stop-Loss Validation', () => {
  const mockLongTrade: Trade = {
    id: 'trade-1',
    userId: 'user-1',
    symbol: 'AAPL',
    direction: 'LONG',
    entryPrice: 150.00,
    positionSize: 100,
    stopLoss: 145.00,
    exitPrice: null,
    status: 'ACTIVE',
    entryDate: new Date(),
    exitDate: null,
    realizedPnL: null,
    riskAmount: 500,
    riskPercentage: 2.0,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockShortTrade: Trade = {
    ...mockLongTrade,
    id: 'trade-2',
    direction: 'SHORT',
    entryPrice: 100.00,
    stopLoss: 105.00,
    riskAmount: 500,
  };

  describe('validateStopLossAdjustment', () => {
    describe('LONG positions', () => {
      it('should allow higher stop-loss (risk reduction)', () => {
        const result = validateStopLossAdjustment(mockLongTrade, 147.00);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should allow stop-loss above entry price (profit locking)', () => {
        const result = validateStopLossAdjustment(mockLongTrade, 152.00);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should reject lower stop-loss (increased risk)', () => {
        const result = validateStopLossAdjustment(mockLongTrade, 143.00);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('must be higher');
      });

      it('should reject same stop-loss', () => {
        const result = validateStopLossAdjustment(mockLongTrade, 145.00);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('must be higher');
      });
    });

    describe('SHORT positions', () => {
      it('should allow lower stop-loss (risk reduction)', () => {
        const result = validateStopLossAdjustment(mockShortTrade, 103.00);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should allow stop-loss below entry price (profit locking)', () => {
        const result = validateStopLossAdjustment(mockShortTrade, 98.00);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should reject higher stop-loss (increased risk)', () => {
        const result = validateStopLossAdjustment(mockShortTrade, 107.00);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('must be lower');
      });

      it('should reject same stop-loss', () => {
        const result = validateStopLossAdjustment(mockShortTrade, 105.00);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('must be lower');
      });
    });

    describe('Input validation', () => {
      it('should reject zero stop-loss', () => {
        const result = validateStopLossAdjustment(mockLongTrade, 0);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('positive number');
      });

      it('should reject negative stop-loss', () => {
        const result = validateStopLossAdjustment(mockLongTrade, -10);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('positive number');
      });

      it('should reject non-finite stop-loss', () => {
        const result = validateStopLossAdjustment(mockLongTrade, NaN);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('positive number');
      });
    });
  });

  describe('recalculateTradeRisk', () => {
    it('should recalculate risk for LONG position with higher stop', () => {
      const newRisk = recalculateTradeRisk(mockLongTrade, 147.00);
      expect(newRisk).toBe(300); // (150 - 147) * 100 = 300
    });

    it('should recalculate risk for LONG position with stop above entry (profit lock)', () => {
      const newRisk = recalculateTradeRisk(mockLongTrade, 152.00);
      expect(newRisk).toBe(200); // |150 - 152| * 100 = 200
    });

    it('should recalculate risk for SHORT position with lower stop', () => {
      const newRisk = recalculateTradeRisk(mockShortTrade, 103.00);
      expect(newRisk).toBe(300); // |100 - 103| * 100 = 300
    });

    it('should recalculate risk for SHORT position with stop below entry (profit lock)', () => {
      const newRisk = recalculateTradeRisk(mockShortTrade, 98.00);
      expect(newRisk).toBe(200); // |100 - 98| * 100 = 200
    });

    it('should handle decimal precision correctly', () => {
      const newRisk = recalculateTradeRisk(mockLongTrade, 147.50);
      expect(newRisk).toBeCloseTo(250, 3); // (150 - 147.5) * 100 = 250
    });

    it('should return zero risk when stop equals entry', () => {
      const newRisk = recalculateTradeRisk(mockLongTrade, 150.00);
      expect(newRisk).toBe(0);
    });
  });

  describe('calculateNewRiskPercentage', () => {
    it('should calculate risk percentage correctly', () => {
      const percentage = calculateNewRiskPercentage(300, 100000);
      expect(percentage).toBeCloseTo(0.3, 3); // 300/100000 * 100 = 0.3%
    });

    it('should handle decimal precision for small amounts', () => {
      const percentage = calculateNewRiskPercentage(123.45, 10000);
      expect(percentage).toBeCloseTo(1.2345, 4); // 123.45/10000 * 100 = 1.2345%
    });

    it('should handle large amounts correctly', () => {
      const percentage = calculateNewRiskPercentage(2000, 100000);
      expect(percentage).toBeCloseTo(2.0, 3); // 2000/100000 * 100 = 2%
    });
  });
});