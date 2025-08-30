import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { 
  Trade,
  formatCurrency,
  validateStopLossAdjustment,
  recalculateTradeRisk,
  calculateNewRiskPercentage
} from '@trading-log/shared';
import { tradeApi, userApi } from '../lib/api';

interface AdjustStopModalProps {
  trade: Trade;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedTrade: Trade) => void;
}

interface AdjustStopFormData {
  stopLoss: number;
}

const AdjustStopRequestSchema = z.object({
  stopLoss: z.number().positive(),
});

export const AdjustStopModal: React.FC<AdjustStopModalProps> = ({
  trade,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [newRiskAmount, setNewRiskAmount] = useState<number>(0);
  const [validationError, setValidationError] = useState<string>('');
  const queryClient = useQueryClient();

  // Get user data for risk calculations
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: userApi.getUser,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustStopFormData>({
    resolver: zodResolver(AdjustStopRequestSchema),
    defaultValues: {
      stopLoss: trade.stopLoss,
    },
  });

  // Watch stop-loss value for real-time validation and risk calculation
  const watchedStopLoss = watch('stopLoss');

  // Real-time validation and risk calculation
  useEffect(() => {
    if (watchedStopLoss && user) {
      // Validate stop-loss adjustment
      const validation = validateStopLossAdjustment(trade, watchedStopLoss);
      
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid stop-loss adjustment');
        setNewRiskAmount(0);
        return;
      }
      
      // Calculate new risk
      const newRisk = recalculateTradeRisk(trade, watchedStopLoss);
      setNewRiskAmount(newRisk);
      setValidationError('');
    } else {
      setNewRiskAmount(0);
      setValidationError('');
    }
  }, [watchedStopLoss, trade, user]);

  // Adjust stop-loss mutation
  const adjustStopMutation = useMutation({
    mutationFn: (data: AdjustStopFormData) => 
      tradeApi.adjustStopLoss(trade.id, data.stopLoss),
    onSuccess: (updatedTrade) => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      onSuccess(updatedTrade);
      handleClose();
    },
    onError: (error: Error) => {
      console.error('Error adjusting stop-loss:', error);
    },
  });

  const onSubmit = async (data: AdjustStopFormData) => {
    try {
      await adjustStopMutation.mutateAsync(data);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleClose = () => {
    reset({ stopLoss: trade.stopLoss });
    setNewRiskAmount(0);
    setValidationError('');
    onClose();
  };

  if (!isOpen) return null;

  const canSubmit = !isSubmitting && !validationError && watchedStopLoss !== trade.stopLoss;
  const newRiskPercentage = user && newRiskAmount > 0 
    ? calculateNewRiskPercentage(newRiskAmount, user.totalEquity) 
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="border-b border-gray-200 p-4 sm:p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Adjust Stop-Loss</h2>
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
          {/* Trade Information */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-bold text-gray-900">{trade.symbol}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                trade.direction === 'LONG' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {trade.direction}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Entry Price:</span>
                <div className="font-medium">{formatCurrency(trade.entryPrice)}</div>
              </div>
              <div>
                <span className="text-gray-500">Position Size:</span>
                <div className="font-medium">{trade.positionSize} shares</div>
              </div>
              <div>
                <span className="text-gray-500">Current Stop:</span>
                <div className="font-medium">{formatCurrency(trade.stopLoss)}</div>
              </div>
              <div>
                <span className="text-gray-500">Current Risk:</span>
                <div className="font-medium text-red-600">{formatCurrency(trade.riskAmount)}</div>
              </div>
            </div>
          </div>

          {/* Direction Rules */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm">
                <p className="text-blue-800 font-medium">Stop-Loss Rules:</p>
                <p className="text-blue-700 mt-1">
                  {trade.direction === 'LONG' 
                    ? 'For LONG positions, you can only move the stop higher (reducing risk).'
                    : 'For SHORT positions, you can only move the stop lower (reducing risk).'
                  }
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* New Stop-Loss Input */}
            <div>
              <label htmlFor="stopLoss" className="block text-sm font-medium text-gray-700 mb-2">
                New Stop-Loss Price ($)
              </label>
              <input
                {...register('stopLoss', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-3 px-4"
              />
              {errors.stopLoss && (
                <p className="mt-2 text-sm text-red-600">{errors.stopLoss.message}</p>
              )}
              {validationError && (
                <p className="mt-2 text-sm text-red-600">{validationError}</p>
              )}
            </div>

            {/* Risk Comparison */}
            {newRiskAmount > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Risk Comparison</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Risk:</span>
                    <span className="text-sm font-medium text-red-600">
                      {formatCurrency(trade.riskAmount)} 
                      ({trade.riskPercentage.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">New Risk:</span>
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency(newRiskAmount)} 
                      ({newRiskPercentage.toFixed(2)}%)
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Risk Reduction:</span>
                      <span className="text-sm font-bold text-green-600">
                        -{formatCurrency(trade.riskAmount - newRiskAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {adjustStopMutation.error && (
              <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">
                      {adjustStopMutation.error.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="adjust-stop-form"
              onClick={handleSubmit(onSubmit)}
              disabled={!canSubmit}
              className={`w-full sm:w-auto px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                canSubmit
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Adjusting...' : 'Adjust Stop-Loss'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};