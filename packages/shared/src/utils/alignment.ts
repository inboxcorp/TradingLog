import { 
  AlignmentRule, 
  AlignmentAnalysis, 
  AlignmentLevel, 
  TimeframeAlignmentBreakdown 
} from '../types/alignment';
import { MethodAnalysis, IndicatorType, SignalType, DivergenceType } from '../types/analysis';
import { TradeDirection } from '../types';

// Alignment Rules Configuration
export const ALIGNMENT_RULES: AlignmentRule[] = [
  // MACD Rules
  {
    indicator: IndicatorType.MACD,
    signal: SignalType.BUY_SIGNAL,
    bullishAlignment: 1.0,
    bearishAlignment: -1.0,
    weight: 0.8
  },
  {
    indicator: IndicatorType.MACD,
    signal: SignalType.SELL_SIGNAL,
    bullishAlignment: -1.0,
    bearishAlignment: 1.0,
    weight: 0.8
  },
  {
    indicator: IndicatorType.MACD,
    signal: SignalType.CONTINUATION,
    bullishAlignment: 0.6,
    bearishAlignment: 0.6,
    weight: 0.5
  },
  
  // RSI Rules
  {
    indicator: IndicatorType.RSI,
    signal: SignalType.OVERSOLD,
    bullishAlignment: 0.7,
    bearishAlignment: -0.3,
    weight: 0.6
  },
  {
    indicator: IndicatorType.RSI,
    signal: SignalType.OVERBOUGHT,
    bullishAlignment: -0.3,
    bearishAlignment: 0.7,
    weight: 0.6
  },
  {
    indicator: IndicatorType.RSI,
    signal: SignalType.BUY_SIGNAL,
    bullishAlignment: 0.8,
    bearishAlignment: -0.8,
    weight: 0.7
  },
  {
    indicator: IndicatorType.RSI,
    signal: SignalType.SELL_SIGNAL,
    bullishAlignment: -0.8,
    bearishAlignment: 0.8,
    weight: 0.7
  },
  
  // Stochastics Rules
  {
    indicator: IndicatorType.STOCHASTICS,
    signal: SignalType.OVERSOLD,
    bullishAlignment: 0.7,
    bearishAlignment: -0.2,
    weight: 0.5
  },
  {
    indicator: IndicatorType.STOCHASTICS,
    signal: SignalType.OVERBOUGHT,
    bullishAlignment: -0.2,
    bearishAlignment: 0.7,
    weight: 0.5
  },
  {
    indicator: IndicatorType.STOCHASTICS,
    signal: SignalType.BUY_SIGNAL,
    bullishAlignment: 0.8,
    bearishAlignment: -0.8,
    weight: 0.6
  },
  {
    indicator: IndicatorType.STOCHASTICS,
    signal: SignalType.SELL_SIGNAL,
    bullishAlignment: -0.8,
    bearishAlignment: 0.8,
    weight: 0.6
  },
  
  // Moving Averages Rules
  {
    indicator: IndicatorType.MOVING_AVERAGES,
    signal: SignalType.BREAKOUT,
    bullishAlignment: 0.9,
    bearishAlignment: -0.9,
    weight: 0.8
  },
  {
    indicator: IndicatorType.MOVING_AVERAGES,
    signal: SignalType.BREAKDOWN,
    bullishAlignment: -0.9,
    bearishAlignment: 0.9,
    weight: 0.8
  },
  {
    indicator: IndicatorType.MOVING_AVERAGES,
    signal: SignalType.CONTINUATION,
    bullishAlignment: 0.7,
    bearishAlignment: 0.7,
    weight: 0.6
  },
  
  // Support/Resistance Rules
  {
    indicator: IndicatorType.SUPPORT_RESISTANCE,
    signal: SignalType.BREAKOUT,
    bullishAlignment: 0.9,
    bearishAlignment: -0.9,
    weight: 0.9
  },
  {
    indicator: IndicatorType.SUPPORT_RESISTANCE,
    signal: SignalType.BREAKDOWN,
    bullishAlignment: -0.9,
    bearishAlignment: 0.9,
    weight: 0.9
  },
  {
    indicator: IndicatorType.SUPPORT_RESISTANCE,
    signal: SignalType.REVERSAL,
    bullishAlignment: 0.8,
    bearishAlignment: 0.8,
    weight: 0.7
  },
  
  // Volume Rules
  {
    indicator: IndicatorType.VOLUME,
    signal: SignalType.BREAKOUT,
    bullishAlignment: 0.6,
    bearishAlignment: -0.6,
    weight: 0.4
  },
  {
    indicator: IndicatorType.VOLUME,
    signal: SignalType.BREAKDOWN,
    bullishAlignment: -0.6,
    bearishAlignment: 0.6,
    weight: 0.4
  },
  
  // Trendlines Rules
  {
    indicator: IndicatorType.TRENDLINES,
    signal: SignalType.BREAKOUT,
    bullishAlignment: 0.8,
    bearishAlignment: -0.8,
    weight: 0.7
  },
  {
    indicator: IndicatorType.TRENDLINES,
    signal: SignalType.BREAKDOWN,
    bullishAlignment: -0.8,
    bearishAlignment: 0.8,
    weight: 0.7
  },
  
  // Bollinger Bands Rules
  {
    indicator: IndicatorType.BOLLINGER_BANDS,
    signal: SignalType.OVERSOLD,
    bullishAlignment: 0.6,
    bearishAlignment: -0.2,
    weight: 0.5
  },
  {
    indicator: IndicatorType.BOLLINGER_BANDS,
    signal: SignalType.OVERBOUGHT,
    bullishAlignment: -0.2,
    bearishAlignment: 0.6,
    weight: 0.5
  },
  {
    indicator: IndicatorType.BOLLINGER_BANDS,
    signal: SignalType.BREAKOUT,
    bullishAlignment: 0.7,
    bearishAlignment: -0.7,
    weight: 0.6
  },
  {
    indicator: IndicatorType.BOLLINGER_BANDS,
    signal: SignalType.BREAKDOWN,
    bullishAlignment: -0.7,
    bearishAlignment: 0.7,
    weight: 0.6
  },
  
  // Fibonacci Rules
  {
    indicator: IndicatorType.FIBONACCI,
    signal: SignalType.REVERSAL,
    bullishAlignment: 0.7,
    bearishAlignment: 0.7,
    weight: 0.6
  },
  {
    indicator: IndicatorType.FIBONACCI,
    signal: SignalType.CONTINUATION,
    bullishAlignment: 0.5,
    bearishAlignment: 0.5,
    weight: 0.4
  },
  
  // Generic Rules
  {
    indicator: 'ANY' as any,
    signal: SignalType.NEUTRAL,
    bullishAlignment: 0.0,
    bearishAlignment: 0.0,
    weight: 0.1
  }
];

/**
 * Analyzes the alignment between trade direction and method analysis
 * @param tradeDirection The intended trade direction (LONG or SHORT)
 * @param methodAnalysis Array of method analysis from different timeframes
 * @returns Complete alignment analysis with scores, warnings, and confirmations
 */
export const analyzeAlignment = (
  tradeDirection: TradeDirection,
  methodAnalysis: MethodAnalysis[]
): AlignmentAnalysis => {
  let totalScore = 0;
  let totalWeight = 0;
  const warnings: string[] = [];
  const confirmations: string[] = [];
  const timeframeBreakdown: TimeframeAlignmentBreakdown[] = [];

  for (const analysis of methodAnalysis) {
    // Find matching alignment rule
    const rule = findAlignmentRule(analysis.indicator, analysis.signal);
    
    if (!rule) {
      // Default neutral handling for unknown combinations
      timeframeBreakdown.push({
        timeframe: analysis.timeframe,
        score: 0,
        analysis,
        alignment: 'NEUTRAL'
      });
      continue;
    }

    // Calculate base alignment score
    const baseAlignmentScore = tradeDirection === 'LONG' ? 
      rule.bullishAlignment : rule.bearishAlignment;

    // Apply divergence multiplier
    const divergenceMultiplier = calculateDivergenceMultiplier(
      analysis.divergence, 
      tradeDirection
    );

    // Calculate final score
    const finalScore = baseAlignmentScore * divergenceMultiplier;
    const weightedScore = finalScore * rule.weight;

    totalScore += weightedScore;
    totalWeight += rule.weight;

    // Generate warnings and confirmations
    const alignmentCategory = categorizeAlignment(finalScore);
    
    if (alignmentCategory === 'CONFLICTED') {
      warnings.push(
        `${analysis.timeframe}: ${analysis.indicator} ${analysis.signal} conflicts with ${tradeDirection} direction`
      );
    } else if (alignmentCategory === 'ALIGNED') {
      confirmations.push(
        `${analysis.timeframe}: ${analysis.indicator} ${analysis.signal} supports ${tradeDirection} direction`
      );
    }

    // Add divergence-specific messages
    if (analysis.divergence !== DivergenceType.NONE) {
      const divergenceAligned = (
        (analysis.divergence === DivergenceType.BULLISH && tradeDirection === 'LONG') ||
        (analysis.divergence === DivergenceType.BEARISH && tradeDirection === 'SHORT')
      );

      if (divergenceAligned) {
        confirmations.push(
          `${analysis.timeframe}: ${analysis.divergence} divergence strengthens ${tradeDirection} setup`
        );
      } else {
        warnings.push(
          `${analysis.timeframe}: ${analysis.divergence} divergence conflicts with ${tradeDirection} direction`
        );
      }
    }

    timeframeBreakdown.push({
      timeframe: analysis.timeframe,
      score: finalScore,
      analysis,
      alignment: alignmentCategory
    });
  }

  // Calculate overall score
  const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0;

  // Determine alignment level
  const alignmentLevel = determineAlignmentLevel(overallScore);

  return {
    overallScore,
    alignmentLevel,
    warnings,
    confirmations,
    timeframeBreakdown
  };
};

/**
 * Finds the appropriate alignment rule for given indicator and signal
 * @param indicator The technical indicator
 * @param signal The signal type
 * @returns Matching alignment rule or null if not found
 */
const findAlignmentRule = (
  indicator: IndicatorType, 
  signal: SignalType
): AlignmentRule | null => {
  // First try exact match
  let rule = ALIGNMENT_RULES.find(r => 
    r.indicator === indicator && r.signal === signal
  );

  if (rule) return rule;

  // Try indicator match with ANY signal
  rule = ALIGNMENT_RULES.find(r => 
    r.indicator === indicator && r.signal === 'ANY'
  );

  if (rule) return rule;

  // Try ANY indicator with signal match
  rule = ALIGNMENT_RULES.find(r => 
    r.indicator === 'ANY' && r.signal === signal
  );

  if (rule) return rule;

  // Try ANY/ANY fallback
  return ALIGNMENT_RULES.find(r => 
    r.indicator === 'ANY' && r.signal === 'ANY'
  ) || null;
};

/**
 * Calculates the divergence multiplier for alignment scoring
 * @param divergence The divergence type
 * @param tradeDirection The trade direction
 * @returns Multiplier value (0.8 to 1.2)
 */
const calculateDivergenceMultiplier = (
  divergence: DivergenceType, 
  tradeDirection: TradeDirection
): number => {
  if (divergence === DivergenceType.NONE) {
    return 1.0;
  }

  const isDivergenceAligned = (
    (divergence === DivergenceType.BULLISH && tradeDirection === 'LONG') ||
    (divergence === DivergenceType.BEARISH && tradeDirection === 'SHORT')
  );

  return isDivergenceAligned ? 1.2 : 0.8;
};

/**
 * Categorizes alignment score into simple categories
 * @param score Alignment score (-1 to 1)
 * @returns Alignment category
 */
const categorizeAlignment = (score: number): 'ALIGNED' | 'CONFLICTED' | 'NEUTRAL' => {
  if (score > 0.5) return 'ALIGNED';
  if (score < -0.5) return 'CONFLICTED';
  return 'NEUTRAL';
};

/**
 * Determines the overall alignment level based on score
 * @param overallScore The calculated overall score
 * @returns Alignment level enum
 */
const determineAlignmentLevel = (overallScore: number): AlignmentLevel => {
  if (overallScore > 0.7) return 'STRONG_ALIGNMENT';
  if (overallScore > 0.3) return 'WEAK_ALIGNMENT';
  if (overallScore > -0.3) return 'NEUTRAL';
  if (overallScore > -0.7) return 'WEAK_CONFLICT';
  return 'STRONG_CONFLICT';
};

/**
 * Validates alignment analysis request
 * @param direction Trade direction
 * @param methodAnalysis Method analysis array
 * @returns Validation result
 */
export const validateAlignmentRequest = (
  direction: TradeDirection,
  methodAnalysis: MethodAnalysis[]
): { isValid: boolean; error?: string } => {
  if (!direction || !['LONG', 'SHORT'].includes(direction)) {
    return { isValid: false, error: 'Invalid or missing trade direction' };
  }

  if (!methodAnalysis || !Array.isArray(methodAnalysis) || methodAnalysis.length === 0) {
    return { isValid: false, error: 'Method analysis is required for alignment calculation' };
  }

  // Check for duplicate timeframes
  const timeframes = methodAnalysis.map(a => a.timeframe);
  if (new Set(timeframes).size !== timeframes.length) {
    return { isValid: false, error: 'Duplicate timeframe analysis detected' };
  }

  return { isValid: true };
};