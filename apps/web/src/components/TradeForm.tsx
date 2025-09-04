import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  CreateTradeRequestSchema, 
  TradeDirection,
  CreateMethodAnalysisRequest,
  MindsetTagType,
  IntensityLevel,
  calculateTradeRisk,
  calculatePortfolioRisk,
  exceedsIndividualRiskLimit,
  exceedsPortfolioRiskLimit,
  formatCurrency,
  AlignmentAnalysis,
  MethodAnalysis
} from '@trading-log/shared';
import { tradeApi, userApi, alignmentApi } from '../lib/api';
import MethodAnalysisForm from './MethodAnalysisForm';
import MindsetTagSelector from './MindsetTagSelector';
import AlignmentFeedback from './AlignmentFeedback';

interface TradeFormProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TradeFormData {
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  positionSize: number;
  stopLoss: number;
  notes?: string;
  methodAnalysis?: CreateMethodAnalysisRequest[];
  mindsetTags?: Array<{ tag: MindsetTagType; intensity: IntensityLevel }>;
}

export const TradeForm: React.FC<TradeFormProps> = ({ isOpen, onClose }) => {
  const [riskAmount, setRiskAmount] = useState<number>(0);
  const [riskWarning, setRiskWarning] = useState<string>('');
  const [methodAnalysis, setMethodAnalysis] = useState<CreateMethodAnalysisRequest[]>([]);
  const [mindsetTags, setMindsetTags] = useState<Array<{ tag: MindsetTagType; intensity: IntensityLevel }>>([]);
  const [alignmentAnalysis, setAlignmentAnalysis] = useState<AlignmentAnalysis | null>(null);
  const [ignoreAlignmentWarning, setIgnoreAlignmentWarning] = useState<boolean>(false);
  const queryClient = useQueryClient();

  // Get user data for risk calculations
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: userApi.getUser,
  });

  // Get active trades for portfolio risk calculation
  const { data: activeTrades = [] } = useQuery({
    queryKey: ['trades', 'ACTIVE'],
    queryFn: () => tradeApi.getTrades('ACTIVE'),
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TradeFormData>({
    resolver: zodResolver(CreateTradeRequestSchema),
    defaultValues: {
      direction: 'LONG' as TradeDirection,
    },
  });

  // Watch form values for real-time risk calculation and alignment analysis
  const watchedValues = watch(['entryPrice', 'positionSize', 'stopLoss', 'direction']);
  const [entryPrice, positionSize, stopLoss, direction] = watchedValues;

  // Real-time risk calculation
  useEffect(() => {
    if (entryPrice && positionSize && stopLoss && user && activeTrades) {
      const calculatedRisk = calculateTradeRisk(entryPrice, stopLoss, positionSize);
      setRiskAmount(calculatedRisk);

      // Check individual risk limit (2%)
      if (exceedsIndividualRiskLimit(calculatedRisk, user.totalEquity)) {
        const maxRisk = user.totalEquity * 0.02;
        setRiskWarning(
          `⚠️ Trade risk (${formatCurrency(calculatedRisk)}) exceeds 2% individual limit (${formatCurrency(maxRisk)})`
        );
      } else {
        // Check portfolio risk limit (6%)
        const currentPortfolioRisk = calculatePortfolioRisk(activeTrades);
        const newPortfolioRisk = currentPortfolioRisk + calculatedRisk;
        
        if (exceedsPortfolioRiskLimit(newPortfolioRisk, user.totalEquity)) {
          const maxPortfolioRisk = user.totalEquity * 0.06;
          setRiskWarning(
            `⚠️ Total portfolio risk (${formatCurrency(newPortfolioRisk)}) would exceed 6% limit (${formatCurrency(maxPortfolioRisk)})`
          );
        } else {
          setRiskWarning('');
        }
      }
    } else {
      setRiskAmount(0);
      setRiskWarning('');
    }
  }, [entryPrice, positionSize, stopLoss, user, activeTrades]);

  // Real-time alignment analysis
  useEffect(() => {
    const performAlignmentAnalysis = async () => {
      if (direction && methodAnalysis.length > 0) {
        try {
          // Convert form data to MethodAnalysis format for alignment calculation
          const analysisForAlignment = methodAnalysis.map((analysis, index) => ({
            id: `temp-${index}`, // Temporary ID for calculation
            tradeId: 'temp', // Temporary trade ID
            timeframe: analysis.timeframe,
            indicator: analysis.indicator,
            signal: analysis.signal,
            divergence: analysis.divergence,
            notes: analysis.notes || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })) as MethodAnalysis[];

          const alignment = await alignmentApi.analyzeAlignment(direction, analysisForAlignment);
          setAlignmentAnalysis(alignment);
        } catch (error) {
          console.error('Error analyzing alignment:', error);
          setAlignmentAnalysis(null);
        }
      } else {
        setAlignmentAnalysis(null);
      }
    };

    // Debounce alignment analysis to avoid excessive API calls
    const timeoutId = setTimeout(performAlignmentAnalysis, 500);
    return () => clearTimeout(timeoutId);
  }, [direction, methodAnalysis]);

  // Create trade mutation
  const createTradeMutation = useMutation({
    mutationFn: tradeApi.createTrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      reset();
      onClose();
    },
    onError: (error: Error) => {
      console.error('Error creating trade:', error);
    },
  });

  const onSubmit = async (data: TradeFormData) => {
    try {
      // Include method analysis and mindset tags in the submission
      const tradeData = {
        ...data,
        methodAnalysis: methodAnalysis.length > 0 ? methodAnalysis : undefined,
        mindsetTags: mindsetTags.length > 0 ? mindsetTags : undefined
      };
      await createTradeMutation.mutateAsync(tradeData);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleClose = () => {
    reset();
    setRiskAmount(0);
    setRiskWarning('');
    setMethodAnalysis([]);
    setMindsetTags([]);
    setAlignmentAnalysis(null);
    setIgnoreAlignmentWarning(false);
    onClose();
  };

  const handleIgnoreAlignmentWarning = () => {
    setIgnoreAlignmentWarning(true);
  };

  // Check if alignment blocks submission
  const hasBlockingAlignmentConflict = alignmentAnalysis && 
    alignmentAnalysis.alignmentLevel === 'STRONG_CONFLICT' && 
    !ignoreAlignmentWarning;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">New Trade</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              type="button"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-4 sm:p-6">

        <form id="trade-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Symbol and Direction Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-2">
                Symbol
              </label>
              <input
                {...register('symbol')}
                type="text"
                placeholder="AAPL"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-3 px-4"
              />
              {errors.symbol && (
                <p className="mt-2 text-sm text-red-600">{errors.symbol.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="direction" className="block text-sm font-medium text-gray-700 mb-2">
                Direction
              </label>
              <select
                {...register('direction')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-3 px-4"
              >
                <option value="LONG">Long</option>
                <option value="SHORT">Short</option>
              </select>
              {errors.direction && (
                <p className="mt-2 text-sm text-red-600">{errors.direction.message}</p>
              )}
            </div>
          </div>

          {/* Price Fields Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="entryPrice" className="block text-sm font-medium text-gray-700 mb-2">
                Entry Price ($)
              </label>
              <input
                {...register('entryPrice', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="150.00"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-3 px-4"
              />
              {errors.entryPrice && (
                <p className="mt-2 text-sm text-red-600">{errors.entryPrice.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="stopLoss" className="block text-sm font-medium text-gray-700 mb-2">
                Stop Loss ($)
              </label>
              <input
                {...register('stopLoss', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="145.00"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-3 px-4"
              />
              {errors.stopLoss && (
                <p className="mt-2 text-sm text-red-600">{errors.stopLoss.message}</p>
              )}
            </div>
          </div>

          {/* Position Size */}
          <div>
            <label htmlFor="positionSize" className="block text-sm font-medium text-gray-700 mb-2">
              Position Size (shares)
            </label>
            <input
              {...register('positionSize', { valueAsNumber: true })}
              type="number"
              step="1"
              placeholder="100"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-3 px-4"
            />
            {errors.positionSize && (
              <p className="mt-2 text-sm text-red-600">{errors.positionSize.message}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              placeholder="Trade rationale, setup notes..."
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-3 px-4"
            />
          </div>

          {/* Method Analysis */}
          <div className="border-t border-gray-200 pt-6">
            <MethodAnalysisForm
              onAnalysisChange={setMethodAnalysis}
              disabled={isSubmitting}
            />
          </div>

          {/* Mindset Tags */}
          <div className="border-t border-gray-200 pt-6">
            <MindsetTagSelector
              selectedTags={mindsetTags}
              onTagsChange={setMindsetTags}
              disabled={isSubmitting}
              maxSelections={5}
            />
          </div>

          {/* Alignment Feedback */}
          {alignmentAnalysis && (
            <div className="border-t border-gray-200 pt-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Signal Alignment Analysis</h3>
                <p className="text-sm text-gray-600">
                  Review how your technical signals align with your intended trade direction
                </p>
              </div>
              <AlignmentFeedback
                alignment={alignmentAnalysis}
                onIgnoreWarning={handleIgnoreAlignmentWarning}
                showRecommendations={true}
                isSubmitting={isSubmitting}
              />
            </div>
          )}

          {/* Risk Display */}
          {riskAmount > 0 && (
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Trade Risk:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(riskAmount)}
                </span>
              </div>
              {user && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">% of Equity:</span>
                  <span className="text-xs text-gray-700">
                    {((riskAmount / user.totalEquity) * 100).toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          )}


          {/* Error Message */}
          {createTradeMutation.error && (
            <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4 shadow-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-base font-semibold text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">
                    {createTradeMutation.error.message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6">
          {/* Risk Warning - positioned right above buttons */}
          {riskWarning && (
            <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4 shadow-md mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-base font-semibold text-red-800">Risk Limit Exceeded</h3>
                  <p className="text-sm text-red-700 mt-1">{riskWarning}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="trade-form"
              disabled={isSubmitting || !!riskWarning || !!hasBlockingAlignmentConflict}
              className={`w-full sm:w-auto px-6 py-3 text-base font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isSubmitting || riskWarning || hasBlockingAlignmentConflict
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'Creating...' : 'Create Trade'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};