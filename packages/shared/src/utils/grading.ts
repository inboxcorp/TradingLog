import Decimal from 'decimal.js';
import { 
  TradeGrade, 
  GradeLevel, 
  GradeComponent, 
  TradeForGrading,
  DEFAULT_GRADING_CONFIG,
  MINDSET_SCORING,
  GradeAnalytics,
  CoachingRecommendation
} from '../types/grading';

/**
 * CRITICAL: Trade Grading Algorithm Implementation
 * Uses precise decimal arithmetic and comprehensive scoring methodology
 */

/**
 * Converts a numeric score (0-100) to a grade level
 * @param score Numeric score from 0-100
 * @returns Corresponding grade level
 */
export const scoreToGradeLevel = (score: number): GradeLevel => {
  if (score >= 97) return GradeLevel.A_PLUS;
  if (score >= 93) return GradeLevel.A;
  if (score >= 90) return GradeLevel.A_MINUS;
  if (score >= 87) return GradeLevel.B_PLUS;
  if (score >= 83) return GradeLevel.B;
  if (score >= 80) return GradeLevel.B_MINUS;
  if (score >= 77) return GradeLevel.C_PLUS;
  if (score >= 73) return GradeLevel.C;
  if (score >= 70) return GradeLevel.C_MINUS;
  if (score >= 60) return GradeLevel.D;
  return GradeLevel.F;
};

/**
 * Calculates risk management component score
 * Based on position sizing, stop-loss usage, and risk percentage adherence
 */
export const calculateRiskManagementScore = (trade: TradeForGrading): GradeComponent => {
  let score = 100;
  const factors: string[] = [];
  const improvements: string[] = [];

  // Calculate risk percentage (50% of risk score)
  const riskPercentage = new Decimal(trade.riskAmount)
    .dividedBy(trade.user.totalEquity)
    .times(100)
    .toNumber();

  if (riskPercentage <= DEFAULT_GRADING_CONFIG.riskThresholds.excellent) {
    factors.push('Excellent risk sizing (≤1.5%)');
  } else if (riskPercentage <= DEFAULT_GRADING_CONFIG.riskThresholds.good) {
    factors.push('Good risk sizing (≤2%)');
    score -= 10;
  } else if (riskPercentage <= DEFAULT_GRADING_CONFIG.riskThresholds.acceptable) {
    factors.push('Acceptable risk sizing (≤3%)');
    score -= 25;
    improvements.push('Reduce position size to stay within 2% rule');
  } else {
    factors.push('Poor risk sizing (>3%)');
    score -= 50;
    improvements.push('CRITICAL: Reduce position size significantly');
  }

  // Stop-loss usage (25% of risk score)
  if (trade.stopLoss) {
    factors.push('Proper stop-loss placement');
  } else {
    score -= 25;
    improvements.push('Always set stop-loss before entering trade');
  }

  // Position sizing validation (25% of risk score)
  const optimalSize = calculateOptimalPositionSize(
    trade.entryPrice,
    trade.stopLoss || trade.entryPrice * 0.98, // Default 2% stop if none set
    trade.user.totalEquity,
    0.02 // 2% risk target
  );

  const sizingAccuracy = Math.abs(trade.positionSize - optimalSize) / optimalSize;
  if (sizingAccuracy <= 0.1) {
    factors.push('Optimal position sizing');
  } else if (sizingAccuracy <= 0.25) {
    factors.push('Good position sizing');
    score -= 5;
  } else {
    score -= 15;
    improvements.push('Improve position sizing calculation');
  }

  return {
    score: Math.max(0, score),
    weight: DEFAULT_GRADING_CONFIG.weights.riskManagement,
    factors,
    improvements
  };
};

/**
 * Calculates optimal position size based on risk parameters
 * @param entryPrice Entry price per share
 * @param stopLoss Stop loss price per share
 * @param totalEquity Total account equity
 * @param riskPercentage Target risk percentage (e.g., 0.02 for 2%)
 * @returns Optimal position size in shares
 */
export const calculateOptimalPositionSize = (
  entryPrice: number,
  stopLoss: number,
  totalEquity: number,
  riskPercentage: number
): number => {
  const riskPerShare = new Decimal(entryPrice).minus(stopLoss).abs();
  const maxRiskAmount = new Decimal(totalEquity).times(riskPercentage);
  return maxRiskAmount.dividedBy(riskPerShare).floor().toNumber();
};

/**
 * Calculates method alignment component score
 * Based on indicator confluence and timeframe analysis
 */
export const calculateMethodAlignmentScore = (trade: TradeForGrading): GradeComponent => {
  let score = 100;
  const factors: string[] = [];
  const improvements: string[] = [];

  if (!trade.alignmentAnalysis) {
    return {
      score: 50,
      weight: DEFAULT_GRADING_CONFIG.weights.methodAlignment,
      factors: ['No method analysis provided'],
      improvements: ['Complete method analysis for all timeframes']
    };
  }

  // Overall alignment score impact (60% of method score)
  const alignmentBonus = DEFAULT_GRADING_CONFIG.alignmentScoring[
    trade.alignmentAnalysis.alignmentLevel.toLowerCase() as keyof typeof DEFAULT_GRADING_CONFIG.alignmentScoring
  ] || 0;
  
  score = 80 + alignmentBonus; // Base 80 points + alignment adjustment

  switch (trade.alignmentAnalysis.alignmentLevel) {
    case 'STRONG_ALIGNMENT':
      factors.push('Excellent signal alignment across timeframes');
      break;
    case 'WEAK_ALIGNMENT':
      factors.push('Good signal alignment');
      break;
    case 'NEUTRAL':
      factors.push('Neutral signal alignment');
      improvements.push('Seek stronger confluence between timeframes');
      break;
    case 'WEAK_CONFLICT':
      factors.push('Some signal conflicts detected');
      improvements.push('Review conflicting signals before entry');
      break;
    case 'STRONG_CONFLICT':
      factors.push('Major signal conflicts detected');
      improvements.push('CRITICAL: Avoid trades with conflicting signals');
      break;
  }

  // Timeframe completeness (40% of method score)
  const completedTimeframes = trade.methodAnalysis?.length || 0;
  if (completedTimeframes >= 3) {
    factors.push('Complete three-timeframe analysis');
  } else if (completedTimeframes === 2) {
    score -= 10;
    improvements.push('Complete analysis for all three timeframes');
  } else {
    score -= 20;
    improvements.push('Perform multi-timeframe analysis before trading');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    weight: DEFAULT_GRADING_CONFIG.weights.methodAlignment,
    factors,
    improvements
  };
};

/**
 * Calculates mindset quality component score
 * Based on psychological state tracking and emotional discipline
 */
export const calculateMindsetQualityScore = (trade: TradeForGrading): GradeComponent => {
  let score = 100;
  const factors: string[] = [];
  const improvements: string[] = [];

  if (!trade.mindsetTags || trade.mindsetTags.length === 0) {
    return {
      score: 50,
      weight: DEFAULT_GRADING_CONFIG.weights.mindsetQuality,
      factors: ['No mindset assessment provided'],
      improvements: ['Track psychological state before trading']
    };
  }

  let positiveCount = 0;
  let negativeCount = 0;

  trade.mindsetTags.forEach((tagEntry: any) => {
    if (MINDSET_SCORING.positive.includes(tagEntry.tag)) {
      positiveCount++;
      factors.push(`Positive mindset: ${tagEntry.tag}`);
    } else if (MINDSET_SCORING.negative.includes(tagEntry.tag)) {
      negativeCount++;
      factors.push(`Negative mindset: ${tagEntry.tag}`);
      improvements.push(`Address ${tagEntry.tag.toLowerCase().replace('_', ' ')} before trading`);
    }
  });

  // Score based on mindset balance
  if (negativeCount === 0 && positiveCount > 0) {
    factors.push('Excellent psychological state');
  } else if (positiveCount > negativeCount) {
    score -= negativeCount * 10;
    factors.push('Generally positive mindset');
  } else if (negativeCount > positiveCount) {
    score -= negativeCount * 20;
    improvements.push('Work on psychological preparation before trading');
  } else {
    score -= 25;
    improvements.push('Improve psychological consistency');
  }

  return {
    score: Math.max(0, score),
    weight: DEFAULT_GRADING_CONFIG.weights.mindsetQuality,
    factors,
    improvements
  };
};

/**
 * Calculates execution quality component score
 * Based on trade outcome relative to process quality
 */
export const calculateExecutionScore = (trade: TradeForGrading): GradeComponent => {
  let score = 100;
  const factors: string[] = [];
  const improvements: string[] = [];

  // For closed trades, consider outcome vs process
  if (trade.status === 'CLOSED' && trade.realizedPnL !== null && trade.realizedPnL !== undefined) {
    const pnl = trade.realizedPnL;
    
    if (pnl > 0) {
      factors.push('Profitable trade execution');
    } else {
      // Losing trades get scored based on whether loss was within expected risk
      const expectedLoss = trade.riskAmount;
      const actualLoss = Math.abs(pnl);
      
      if (actualLoss <= expectedLoss * 1.1) { // Within 10% of expected risk
        factors.push('Loss contained within risk parameters');
        score -= 10; // Small penalty for loss but good risk control
      } else {
        factors.push('Loss exceeded planned risk');
        score -= 30;
        improvements.push('Ensure stop-loss orders are properly executed');
      }
    }
  } else {
    // For active trades, base on setup quality
    factors.push('Trade execution pending');
  }

  // Check for proper entry timing (if data available)
  if (trade.entryPrice && trade.stopLoss) {
    const riskRewardRatio = calculateRiskRewardRatio(
      trade.entryPrice,
      trade.stopLoss,
      trade.targetPrice || trade.entryPrice * 1.06 // Default 3:1 RR if no target
    );
    
    if (riskRewardRatio >= 3) {
      factors.push('Excellent risk-reward ratio (≥3:1)');
    } else if (riskRewardRatio >= 2) {
      factors.push('Good risk-reward ratio (≥2:1)');
    } else {
      score -= 15;
      improvements.push('Seek trades with better risk-reward ratios');
    }
  }

  return {
    score: Math.max(0, score),
    weight: DEFAULT_GRADING_CONFIG.weights.execution,
    factors,
    improvements
  };
};

/**
 * Calculates risk-reward ratio for a trade
 * @param entryPrice Entry price
 * @param stopLoss Stop loss price
 * @param targetPrice Target profit price
 * @returns Risk-reward ratio
 */
export const calculateRiskRewardRatio = (
  entryPrice: number,
  stopLoss: number,
  targetPrice: number
): number => {
  const risk = new Decimal(entryPrice).minus(stopLoss).abs();
  const reward = new Decimal(targetPrice).minus(entryPrice).abs();
  return reward.dividedBy(risk).toNumber();
};

/**
 * Main function to calculate complete trade grade
 * Combines all component scores with weighted averages
 */
export const calculateTradeGrade = (trade: TradeForGrading): TradeGrade => {
  // Calculate component scores
  const riskManagement = calculateRiskManagementScore(trade);
  const methodAlignment = calculateMethodAlignmentScore(trade);
  const mindsetQuality = calculateMindsetQualityScore(trade);
  const execution = calculateExecutionScore(trade);

  // Calculate weighted overall score
  const overallScore = new Decimal(riskManagement.score)
    .times(riskManagement.weight)
    .plus(new Decimal(methodAlignment.score).times(methodAlignment.weight))
    .plus(new Decimal(mindsetQuality.score).times(mindsetQuality.weight))
    .plus(new Decimal(execution.score).times(execution.weight))
    .toNumber();

  const grade: TradeGrade = {
    overall: scoreToGradeLevel(overallScore),
    breakdown: {
      riskManagement,
      methodAlignment,
      mindsetQuality,
      execution
    },
    score: Math.round(overallScore * 100) / 100, // Round to 2 decimal places
    explanation: generateGradeExplanation(trade, overallScore),
    recommendations: generateImprovementRecommendations(trade)
  };

  return grade;
};

/**
 * Generates explanation for the trade grade
 */
export const generateGradeExplanation = (trade: TradeForGrading, score: number): string[] => {
  const explanations: string[] = [];
  
  explanations.push(`Overall score: ${score.toFixed(1)}/100 (${scoreToGradeLevel(score)})`);
  
  const riskPercent = new Decimal(trade.riskAmount)
    .dividedBy(trade.user.totalEquity)
    .times(100)
    .toNumber();
  
  explanations.push(`Risk sizing: ${riskPercent.toFixed(2)}% of equity`);
  
  if (trade.alignmentAnalysis) {
    explanations.push(`Signal alignment: ${trade.alignmentAnalysis.alignmentLevel.replace('_', ' ').toLowerCase()}`);
  }
  
  const mindsetCount = trade.mindsetTags?.length || 0;
  explanations.push(`Mindset tracking: ${mindsetCount} tags recorded`);
  
  if (trade.status === 'CLOSED' && trade.realizedPnL !== null && trade.realizedPnL !== undefined) {
    const outcome = trade.realizedPnL >= 0 ? 'profitable' : 'loss';
    explanations.push(`Trade outcome: ${outcome} ($${trade.realizedPnL.toFixed(2)})`);
  }
  
  return explanations;
};

/**
 * Generates improvement recommendations based on trade analysis
 */
export const generateImprovementRecommendations = (trade: TradeForGrading): string[] => {
  const recommendations: string[] = [];
  
  // Collect recommendations from each component
  const riskComponent = calculateRiskManagementScore(trade);
  const methodComponent = calculateMethodAlignmentScore(trade);
  const mindsetComponent = calculateMindsetQualityScore(trade);
  const executionComponent = calculateExecutionScore(trade);
  
  recommendations.push(...riskComponent.improvements);
  recommendations.push(...methodComponent.improvements);
  recommendations.push(...mindsetComponent.improvements);
  recommendations.push(...executionComponent.improvements);
  
  // Add general recommendations based on overall performance
  const overallScore = new Decimal(riskComponent.score)
    .times(riskComponent.weight)
    .plus(new Decimal(methodComponent.score).times(methodComponent.weight))
    .plus(new Decimal(mindsetComponent.score).times(mindsetComponent.weight))
    .plus(new Decimal(executionComponent.score).times(executionComponent.weight))
    .toNumber();
  
  if (overallScore < 70) {
    recommendations.push('Focus on improving fundamental trading discipline');
    recommendations.push('Consider reducing position sizes until consistency improves');
  }
  
  return [...new Set(recommendations)]; // Remove duplicates
};

/**
 * Determines if a grade should be recalculated based on update type
 */
export const shouldRecalculateGrade = (
  updateType: 'CLOSE' | 'ANALYSIS_UPDATE' | 'MINDSET_UPDATE' | 'STOP_ADJUSTMENT'
): boolean => {
  return ['CLOSE', 'ANALYSIS_UPDATE', 'MINDSET_UPDATE', 'STOP_ADJUSTMENT'].includes(updateType);
};

/**
 * Calculates grade analytics for a set of trades
 */
export const calculateGradeAnalytics = (
  gradesOverTime: Array<{ grade: TradeGrade; date: Date; outcome?: number }>
): GradeAnalytics => {
  if (gradesOverTime.length === 0) {
    return {
      gradeDistribution: {} as Record<GradeLevel, number>,
      averageGrade: 0,
      gradeImprovement: {
        trend: 'STABLE',
        changeRate: 0,
        recentAverage: 0,
        historicalAverage: 0
      },
      correlations: {
        gradeVsOutcome: 0,
        gradeVsRisk: 0,
        gradeVsAlignment: 0
      }
    };
  }

  // Calculate grade distribution
  const gradeDistribution: Record<GradeLevel, number> = {} as Record<GradeLevel, number>;
  Object.values(GradeLevel).forEach(grade => {
    gradeDistribution[grade] = 0;
  });

  gradesOverTime.forEach(({ grade }) => {
    gradeDistribution[grade.overall]++;
  });

  // Calculate average grade
  const totalScore = gradesOverTime.reduce((sum, { grade }) => sum + grade.score, 0);
  const averageGrade = totalScore / gradesOverTime.length;

  // Calculate trend (recent vs historical)
  const midPoint = Math.floor(gradesOverTime.length / 2);
  const historicalGrades = gradesOverTime.slice(0, midPoint);
  const recentGrades = gradesOverTime.slice(midPoint);
  
  const historicalAverage = historicalGrades.length > 0 
    ? historicalGrades.reduce((sum, { grade }) => sum + grade.score, 0) / historicalGrades.length
    : averageGrade;
  
  const recentAverage = recentGrades.length > 0
    ? recentGrades.reduce((sum, { grade }) => sum + grade.score, 0) / recentGrades.length
    : averageGrade;

  const changeRate = recentAverage - historicalAverage;
  const trend = Math.abs(changeRate) < 2 ? 'STABLE' : 
                changeRate > 0 ? 'IMPROVING' : 'DECLINING';

  // Calculate correlations (simplified)
  const gradeVsOutcome = gradesOverTime.some(g => g.outcome !== undefined)
    ? calculateCorrelation(
        gradesOverTime.map(g => g.grade.score),
        gradesOverTime.map(g => g.outcome || 0)
      )
    : 0;

  return {
    gradeDistribution,
    averageGrade: Math.round(averageGrade * 100) / 100,
    gradeImprovement: {
      trend,
      changeRate: Math.round(changeRate * 100) / 100,
      recentAverage: Math.round(recentAverage * 100) / 100,
      historicalAverage: Math.round(historicalAverage * 100) / 100
    },
    correlations: {
      gradeVsOutcome: Math.round(gradeVsOutcome * 100) / 100,
      gradeVsRisk: 0, // Would need more data to calculate
      gradeVsAlignment: 0 // Would need more data to calculate
    }
  };
};

/**
 * Calculates Pearson correlation coefficient between two arrays
 */
const calculateCorrelation = (x: number[], y: number[]): number => {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
};

/**
 * Generates coaching recommendations based on recent grade patterns
 */
export const generateCoachingRecommendations = (
  recentGrades: TradeGrade[]
): CoachingRecommendation[] => {
  const recommendations: CoachingRecommendation[] = [];

  if (recentGrades.length === 0) return recommendations;

  // Analyze average component scores
  const avgRiskScore = recentGrades.reduce((sum, g) => 
    sum + g.breakdown.riskManagement.score, 0
  ) / recentGrades.length;

  const avgAlignmentScore = recentGrades.reduce((sum, g) => 
    sum + g.breakdown.methodAlignment.score, 0
  ) / recentGrades.length;

  const avgMindsetScore = recentGrades.reduce((sum, g) => 
    sum + g.breakdown.mindsetQuality.score, 0
  ) / recentGrades.length;

  // Generate recommendations based on weak areas
  if (avgRiskScore < 70) {
    recommendations.push({
      category: 'RISK_MANAGEMENT',
      priority: 'HIGH',
      message: 'Risk management needs immediate attention',
      actionItems: [
        'Review position sizing calculations before each trade',
        'Ensure stop-losses are always set before entry',
        'Practice calculating optimal position sizes'
      ]
    });
  }

  if (avgAlignmentScore < 70) {
    recommendations.push({
      category: 'METHOD_ALIGNMENT',
      priority: 'HIGH',
      message: 'Method analysis consistency needs improvement',
      actionItems: [
        'Complete three-timeframe analysis for every trade',
        'Avoid trades with conflicting technical indicators',
        'Wait for stronger signal confluence before entering'
      ]
    });
  }

  if (avgMindsetScore < 70) {
    recommendations.push({
      category: 'MINDSET_QUALITY',
      priority: 'MEDIUM',
      message: 'Psychological preparation could be enhanced',
      actionItems: [
        'Track emotional state before every trade',
        'Develop pre-trade mental preparation routine',
        'Address negative mindset patterns before trading'
      ]
    });
  }

  return recommendations;
};