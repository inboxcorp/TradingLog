import { 
  calculateTradeGrade, 
  calculateRiskManagementScore,
  calculateMethodAlignmentScore,
  calculateMindsetQualityScore,
  calculateExecutionScore,
  scoreToGradeLevel,
  calculateOptimalPositionSize,
  calculateRiskRewardRatio,
  generateCoachingRecommendations
} from '../grading';
import { TradeForGrading, GradeLevel } from '../../types/grading';
import { IndicatorType, SignalType, TimeframeType, DivergenceType } from '../../types/analysis';
import { MindsetTagType, IntensityLevel } from '../../types/mindset';

// Mock trade data for testing  
const createMockTrade = (overrides: Partial<TradeForGrading> = {}): TradeForGrading => ({
  id: 'test-trade-1',
  userId: 'user-1',
  symbol: 'AAPL',
  direction: 'LONG',
  entryPrice: 150,
  positionSize: 100,
  stopLoss: 145,
  exitPrice: 160,
  status: 'CLOSED',
  entryDate: new Date('2023-01-01'),
  exitDate: new Date('2023-01-02'),
  realizedPnL: 1000,
  riskAmount: 500,
  riskPercentage: 1.5,
  notes: 'Test trade',
  alignmentScore: 0.8,
  alignmentLevel: 'STRONG_ALIGNMENT',
  alignmentWarnings: null,
  alignmentConfirmations: null,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-02'),
  user: {
    id: 'user-1',
    email: 'test@example.com',
    totalEquity: 100000,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },
  methodAnalysis: [
    {
      id: 'analysis-1',
      tradeId: 'test-trade-1',
      timeframe: TimeframeType.DAILY,
      indicator: IndicatorType.MACD,
      signal: SignalType.BUY_SIGNAL,
      divergence: DivergenceType.NONE,
      notes: 'Strong buy signal',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    },
    {
      id: 'analysis-2',
      tradeId: 'test-trade-1',
      timeframe: TimeframeType.WEEKLY,
      indicator: IndicatorType.RSI,
      signal: SignalType.BUY_SIGNAL,
      divergence: DivergenceType.NONE,
      notes: 'Oversold condition',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    },
    {
      id: 'analysis-3',
      tradeId: 'test-trade-1',
      timeframe: TimeframeType.MONTHLY,
      indicator: IndicatorType.MOVING_AVERAGES,
      signal: SignalType.BUY_SIGNAL,
      divergence: DivergenceType.NONE,
      notes: 'Above moving average',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    }
  ],
  mindsetTags: [
    {
      id: 'mindset-1',
      tradeId: 'test-trade-1',
      tag: MindsetTagType.DISCIPLINED,
      intensity: IntensityLevel.HIGH,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    },
    {
      id: 'mindset-2',
      tradeId: 'test-trade-1',
      tag: MindsetTagType.PATIENT,
      intensity: IntensityLevel.MEDIUM,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    }
  ],
  alignmentAnalysis: {
    overallScore: 0.8,
    alignmentLevel: 'STRONG_ALIGNMENT',
    warnings: [],
    confirmations: ['All timeframes show bullish signals', 'Strong momentum confirmed'],
    timeframeBreakdown: []
  },
  ...overrides
});

describe('Grading Algorithm Tests', () => {
  describe('scoreToGradeLevel', () => {
    it('should assign correct grade levels', () => {
      expect(scoreToGradeLevel(98)).toBe(GradeLevel.A_PLUS);
      expect(scoreToGradeLevel(95)).toBe(GradeLevel.A);
      expect(scoreToGradeLevel(90)).toBe(GradeLevel.A_MINUS);
      expect(scoreToGradeLevel(85)).toBe(GradeLevel.B_PLUS);
      expect(scoreToGradeLevel(80)).toBe(GradeLevel.B_MINUS);
      expect(scoreToGradeLevel(75)).toBe(GradeLevel.C_PLUS);
      expect(scoreToGradeLevel(70)).toBe(GradeLevel.C_MINUS);
      expect(scoreToGradeLevel(65)).toBe(GradeLevel.D);
      expect(scoreToGradeLevel(50)).toBe(GradeLevel.F);
    });
  });

  describe('calculateOptimalPositionSize', () => {
    it('should calculate correct position size', () => {
      const optimalSize = calculateOptimalPositionSize(150, 145, 100000, 0.02);
      expect(optimalSize).toBe(400); // (100000 * 0.02) / (150 - 145) = 400
    });

    it('should handle different risk percentages', () => {
      const optimalSize = calculateOptimalPositionSize(100, 95, 50000, 0.01);
      expect(optimalSize).toBe(100); // (50000 * 0.01) / (100 - 95) = 100
    });
  });

  describe('calculateRiskRewardRatio', () => {
    it('should calculate correct risk-reward ratio', () => {
      const ratio = calculateRiskRewardRatio(150, 145, 165);
      expect(ratio).toBe(3); // (165 - 150) / (150 - 145) = 15 / 5 = 3
    });
  });

  describe('calculateRiskManagementScore', () => {
    it('should give excellent score for low risk', () => {
      const trade = createMockTrade({
        riskAmount: 1500, // 1.5% of 100k equity
        stopLoss: 145,
        positionSize: 100
      });
      
      const score = calculateRiskManagementScore(trade);
      
      expect(score.score).toBeGreaterThan(90);
      expect(score.factors).toContain('Excellent risk sizing (≤1.5%)');
      expect(score.factors).toContain('Proper stop-loss placement');
      expect(score.weight).toBe(0.35);
    });

    it('should penalize high risk', () => {
      const trade = createMockTrade({
        riskAmount: 4000, // 4% of 100k equity
        stopLoss: 145,
        positionSize: 100
      });
      
      const score = calculateRiskManagementScore(trade);
      
      expect(score.score).toBeLessThan(60);
      expect(score.factors).toContain('Poor risk sizing (>3%)');
      expect(score.improvements).toContain('CRITICAL: Reduce position size significantly');
    });

    it('should penalize missing stop-loss', () => {
      const trade = createMockTrade({
        riskAmount: 1500,
        stopLoss: undefined,
        positionSize: 100
      });
      
      const score = calculateRiskManagementScore(trade);
      
      expect(score.score).toBeLessThan(85);
      expect(score.improvements).toContain('Always set stop-loss before entering trade');
    });
  });

  describe('calculateMethodAlignmentScore', () => {
    it('should give high score for strong alignment with complete analysis', () => {
      const trade = createMockTrade({
        alignmentAnalysis: {
          overallScore: 0.8,
          alignmentLevel: 'STRONG_ALIGNMENT',
          warnings: [],
          confirmations: ['Strong bullish signals'],
          timeframeBreakdown: []
        },
        methodAnalysis: [
          { timeframe: TimeframeType.DAILY, indicator: IndicatorType.MACD, signal: SignalType.BUY_SIGNAL },
          { timeframe: TimeframeType.WEEKLY, indicator: IndicatorType.RSI, signal: SignalType.BUY_SIGNAL },
          { timeframe: TimeframeType.MONTHLY, indicator: IndicatorType.MOVING_AVERAGES, signal: SignalType.BUY_SIGNAL }
        ] as any
      });
      
      const score = calculateMethodAlignmentScore(trade);
      
      expect(score.score).toBeGreaterThan(90);
      expect(score.factors).toContain('Excellent signal alignment across timeframes');
      expect(score.factors).toContain('Complete three-timeframe analysis');
    });

    it('should penalize conflicting signals', () => {
      const trade = createMockTrade({
        alignmentAnalysis: {
          overallScore: -0.7,
          alignmentLevel: 'STRONG_CONFLICT',
          warnings: ['Conflicting signals detected'],
          confirmations: [],
          timeframeBreakdown: []
        },
        methodAnalysis: [
          { timeframe: TimeframeType.DAILY, indicator: IndicatorType.MACD, signal: SignalType.BUY_SIGNAL },
          { timeframe: TimeframeType.WEEKLY, indicator: IndicatorType.RSI, signal: SignalType.SELL_SIGNAL }
        ] as any
      });
      
      const score = calculateMethodAlignmentScore(trade);
      
      expect(score.score).toBeLessThan(60);
      expect(score.factors).toContain('Major signal conflicts detected');
      expect(score.improvements).toContain('CRITICAL: Avoid trades with conflicting signals');
    });

    it('should penalize incomplete analysis', () => {
      const trade = createMockTrade({
        alignmentAnalysis: {
          overallScore: 0.5,
          alignmentLevel: 'WEAK_ALIGNMENT',
          warnings: [],
          confirmations: [],
          timeframeBreakdown: []
        },
        methodAnalysis: [
          { timeframe: TimeframeType.DAILY, indicator: IndicatorType.MACD, signal: SignalType.BUY_SIGNAL }
        ] as any
      });
      
      const score = calculateMethodAlignmentScore(trade);
      
      expect(score.score).toBeLessThan(90);
      expect(score.improvements).toContain('Complete analysis for all three timeframes');
    });

    it('should handle missing alignment analysis', () => {
      const trade = createMockTrade({
        alignmentAnalysis: undefined,
        methodAnalysis: []
      });
      
      const score = calculateMethodAlignmentScore(trade);
      
      expect(score.score).toBe(50);
      expect(score.factors).toContain('No method analysis provided');
      expect(score.improvements).toContain('Complete method analysis for all timeframes');
    });
  });

  describe('calculateMindsetQualityScore', () => {
    it('should give excellent score for positive mindset only', () => {
      const trade = createMockTrade({
        mindsetTags: [
          { tag: MindsetTagType.DISCIPLINED, intensity: IntensityLevel.HIGH },
          { tag: MindsetTagType.PATIENT, intensity: IntensityLevel.MEDIUM },
          { tag: MindsetTagType.CONFIDENT, intensity: IntensityLevel.HIGH }
        ] as any
      });
      
      const score = calculateMindsetQualityScore(trade);
      
      expect(score.score).toBe(100);
      expect(score.factors).toContain('Excellent psychological state');
      expect(score.factors).toContain('Positive mindset: DISCIPLINED');
    });

    it('should penalize negative mindset states', () => {
      const trade = createMockTrade({
        mindsetTags: [
          { tag: MindsetTagType.FOMO, intensity: IntensityLevel.HIGH },
          { tag: MindsetTagType.IMPULSIVE, intensity: IntensityLevel.HIGH },
          { tag: MindsetTagType.ANXIOUS, intensity: IntensityLevel.MEDIUM }
        ] as any
      });
      
      const score = calculateMindsetQualityScore(trade);
      
      expect(score.score).toBeLessThan(50);
      expect(score.improvements.length).toBeGreaterThan(0);
      expect(score.improvements[0]).toMatch(/Address .* before trading/);
    });

    it('should handle mixed mindset states', () => {
      const trade = createMockTrade({
        mindsetTags: [
          { tag: MindsetTagType.DISCIPLINED, intensity: IntensityLevel.HIGH },
          { tag: MindsetTagType.FOMO, intensity: IntensityLevel.MEDIUM }
        ] as any
      });
      
      const score = calculateMindsetQualityScore(trade);
      
      expect(score.score).toBe(90); // 100 - 10 for one negative tag
      expect(score.factors).toContain('Generally positive mindset');
    });

    it('should handle missing mindset tags', () => {
      const trade = createMockTrade({
        mindsetTags: []
      });
      
      const score = calculateMindsetQualityScore(trade);
      
      expect(score.score).toBe(50);
      expect(score.factors).toContain('No mindset assessment provided');
      expect(score.improvements).toContain('Track psychological state before trading');
    });
  });

  describe('calculateExecutionScore', () => {
    it('should give high score for profitable trade with good risk-reward', () => {
      const trade = createMockTrade({
        status: 'CLOSED',
        realizedPnL: 1000,
        entryPrice: 150,
        stopLoss: 145,
        targetPrice: 165, // 3:1 risk-reward
        riskAmount: 500
      });
      
      const score = calculateExecutionScore(trade);
      
      expect(score.score).toBeGreaterThan(85);
      expect(score.factors).toContain('Profitable trade execution');
      expect(score.factors).toContain('Excellent risk-reward ratio (≥3:1)');
    });

    it('should handle controlled losses within risk parameters', () => {
      const trade = createMockTrade({
        status: 'CLOSED',
        realizedPnL: -450, // Loss within expected risk of 500
        riskAmount: 500
      });
      
      const score = calculateExecutionScore(trade);
      
      expect(score.score).toBe(90); // 100 - 10 for controlled loss
      expect(score.factors).toContain('Loss contained within risk parameters');
    });

    it('should penalize losses exceeding risk parameters', () => {
      const trade = createMockTrade({
        status: 'CLOSED',
        realizedPnL: -600, // Loss exceeding expected risk of 500
        riskAmount: 500
      });
      
      const score = calculateExecutionScore(trade);
      
      expect(score.score).toBe(70); // 100 - 30 for excessive loss
      expect(score.factors).toContain('Loss exceeded planned risk');
      expect(score.improvements).toContain('Ensure stop-loss orders are properly executed');
    });

    it('should handle active trades', () => {
      const trade = createMockTrade({
        status: 'ACTIVE',
        realizedPnL: undefined
      });
      
      const score = calculateExecutionScore(trade);
      
      expect(score.factors).toContain('Trade execution pending');
    });
  });

  describe('calculateTradeGrade - Integration Tests', () => {
    it('should calculate excellent grade for perfect trade', () => {
      const excellentTrade = createMockTrade({
        riskAmount: 1500, // 1.5% excellent risk
        alignmentAnalysis: {
          overallScore: 0.8,
          alignmentLevel: 'STRONG_ALIGNMENT',
          warnings: [],
          confirmations: ['Perfect alignment'],
          timeframeBreakdown: []
        },
        methodAnalysis: [
          { timeframe: TimeframeType.DAILY, indicator: IndicatorType.MACD, signal: SignalType.BUY_SIGNAL },
          { timeframe: TimeframeType.WEEKLY, indicator: IndicatorType.RSI, signal: SignalType.BUY_SIGNAL },
          { timeframe: TimeframeType.MONTHLY, indicator: IndicatorType.MOVING_AVERAGES, signal: SignalType.BUY_SIGNAL }
        ] as any,
        mindsetTags: [
          { tag: MindsetTagType.DISCIPLINED, intensity: IntensityLevel.HIGH },
          { tag: MindsetTagType.PATIENT, intensity: IntensityLevel.HIGH }
        ] as any,
        realizedPnL: 1000,
        targetPrice: 165
      });
      
      const grade = calculateTradeGrade(excellentTrade);
      
      expect(grade.overall).toMatch(/A[+-]?/); // Should be A grade family
      expect(grade.score).toBeGreaterThan(90);
      expect(grade.explanation.length).toBeGreaterThan(0);
      expect(grade.recommendations.length).toBe(0); // No recommendations for excellent trade
      
      // Check component weights
      expect(grade.breakdown.riskManagement.weight).toBe(0.35);
      expect(grade.breakdown.methodAlignment.weight).toBe(0.30);
      expect(grade.breakdown.mindsetQuality.weight).toBe(0.25);
      expect(grade.breakdown.execution.weight).toBe(0.10);
    });

    it('should calculate poor grade for problematic trade', () => {
      const poorTrade = createMockTrade({
        riskAmount: 5000, // 5% terrible risk
        alignmentAnalysis: {
          overallScore: -0.7,
          alignmentLevel: 'STRONG_CONFLICT',
          warnings: ['Major conflicts'],
          confirmations: [],
          timeframeBreakdown: []
        },
        methodAnalysis: [
          { timeframe: TimeframeType.DAILY, indicator: IndicatorType.MACD, signal: SignalType.BUY_SIGNAL }
        ] as any,
        mindsetTags: [
          { tag: MindsetTagType.FOMO, intensity: IntensityLevel.HIGH },
          { tag: MindsetTagType.IMPULSIVE, intensity: IntensityLevel.HIGH }
        ] as any,
        realizedPnL: -800, // Loss exceeding risk
        stopLoss: undefined
      });
      
      const grade = calculateTradeGrade(poorTrade);
      
      expect(grade.overall).toMatch(/[DF]/); // Should be D or F
      expect(grade.score).toBeLessThan(50);
      expect(grade.explanation.length).toBeGreaterThan(0);
      expect(grade.recommendations.length).toBeGreaterThan(3); // Many recommendations for poor trade
      
      // Should have critical recommendations
      expect(grade.recommendations.some(rec => rec.includes('CRITICAL'))).toBe(true);
    });
  });

  describe('generateCoachingRecommendations', () => {
    it('should generate appropriate recommendations for weak areas', () => {
      const recentGrades = [
        {
          overall: GradeLevel.C,
          score: 70,
          breakdown: {
            riskManagement: { score: 60, weight: 0.35, factors: [], improvements: [] },
            methodAlignment: { score: 75, weight: 0.30, factors: [], improvements: [] },
            mindsetQuality: { score: 65, weight: 0.25, factors: [], improvements: [] },
            execution: { score: 80, weight: 0.10, factors: [], improvements: [] }
          },
          explanation: [],
          recommendations: []
        },
        {
          overall: GradeLevel.D,
          score: 65,
          breakdown: {
            riskManagement: { score: 55, weight: 0.35, factors: [], improvements: [] },
            methodAlignment: { score: 70, weight: 0.30, factors: [], improvements: [] },
            mindsetQuality: { score: 60, weight: 0.25, factors: [], improvements: [] },
            execution: { score: 75, weight: 0.10, factors: [], improvements: [] }
          },
          explanation: [],
          recommendations: []
        }
      ];
      
      const recommendations = generateCoachingRecommendations(recentGrades);
      
      expect(recommendations.length).toBeGreaterThan(0);
      
      const riskRec = recommendations.find(r => r.category === 'RISK_MANAGEMENT');
      expect(riskRec).toBeTruthy();
      expect(riskRec?.priority).toBe('HIGH');
      expect(riskRec?.actionItems.length).toBeGreaterThan(0);
      
      const mindsetRec = recommendations.find(r => r.category === 'MINDSET_QUALITY');
      expect(mindsetRec).toBeTruthy();
      expect(mindsetRec?.priority).toBe('MEDIUM');
    });

    it('should return empty recommendations for excellent grades', () => {
      const excellentGrades = [
        {
          overall: GradeLevel.A,
          score: 95,
          breakdown: {
            riskManagement: { score: 95, weight: 0.35, factors: [], improvements: [] },
            methodAlignment: { score: 90, weight: 0.30, factors: [], improvements: [] },
            mindsetQuality: { score: 98, weight: 0.25, factors: [], improvements: [] },
            execution: { score: 92, weight: 0.10, factors: [], improvements: [] }
          },
          explanation: [],
          recommendations: []
        }
      ];
      
      const recommendations = generateCoachingRecommendations(excellentGrades);
      expect(recommendations.length).toBe(0);
    });
  });
});