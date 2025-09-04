import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CloseTradeRequestSchema, 
  Trade,
  calculateRealizedPnL,
  formatCurrency
} from '@trading-log/shared';
import { tradeApi } from '../lib/api';

interface CloseTradeModalProps {
  trade: Trade;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedTrade: Trade) => void;
}

interface CloseTradeFormData {
  exitPrice: number;
}

export const CloseTradeModal: React.FC<CloseTradeModalProps> = ({ 
  trade, 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [previewPnL, setPreviewPnL] = useState<number>(0);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CloseTradeFormData>({
    resolver: zodResolver(CloseTradeRequestSchema),
    defaultValues: {
      exitPrice: trade.entryPrice, // Start with entry price
    },
  });

  // Watch exit price for real-time P/L preview
  const exitPrice = watch('exitPrice');

  // Real-time P/L preview calculation
  useEffect(() => {
    if (exitPrice && exitPrice > 0) {
      const calculatedPnL = calculateRealizedPnL(
        trade.entryPrice,
        exitPrice,
        trade.positionSize,
        trade.direction
      );
      setPreviewPnL(calculatedPnL);
    } else {
      setPreviewPnL(0);
    }
  }, [exitPrice, trade]);

  // Close trade mutation
  const closeTradeMutation = useMutation({
    mutationFn: (exitPrice: number) => tradeApi.closeTrade(trade.id, exitPrice),
    onSuccess: (updatedTrade) => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      reset();
      setShowConfirmation(false);
      onClose();
      if (onSuccess) {
        onSuccess(updatedTrade);
      }
    },
    onError: (error: Error) => {
      console.error('Error closing trade:', error);
      setShowConfirmation(false);
    },
  });

  const onSubmit = async (_data: CloseTradeFormData) => {
    setShowConfirmation(true);
  };

  const confirmClose = async () => {
    try {
      await closeTradeMutation.mutateAsync(exitPrice);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleClose = () => {
    reset();
    setPreviewPnL(0);
    setShowConfirmation(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {showConfirmation ? 'Confirm Trade Close' : 'Close Trade'}
            </h2>
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
          {/* Trade Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Symbol:</span>
                <div className="font-semibold">{trade.symbol}</div>
              </div>
              <div>
                <span className="text-gray-500">Direction:</span>
                <div className={`font-semibold ${
                  trade.direction === 'LONG' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trade.direction}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Entry Price:</span>
                <div className="font-semibold">{formatCurrency(trade.entryPrice)}</div>
              </div>
              <div>
                <span className="text-gray-500">Position Size:</span>
                <div className="font-semibold">{trade.positionSize}</div>
              </div>
              <div>
                <span className="text-gray-500">Stop Loss:</span>
                <div className="font-semibold">{formatCurrency(trade.stopLoss)}</div>
              </div>
              <div>
                <span className="text-gray-500">Risk Amount:</span>
                <div className="font-semibold">{formatCurrency(trade.riskAmount)}</div>
              </div>
            </div>
          </div>

          {!showConfirmation ? (
            <>
              {/* Exit Price Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label htmlFor="exitPrice" className="block text-sm font-medium text-gray-700 mb-2">
                    Exit Price ($)
                  </label>
                  <input
                    {...register('exitPrice', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    aria-describedby={errors.exitPrice ? 'exitPrice-error' : undefined}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-3 px-4"
                  />
                  {errors.exitPrice && (
                    <p id="exitPrice-error" className="mt-2 text-sm text-red-600" role="alert">
                      {errors.exitPrice.message}
                    </p>
                  )}
                </div>

                {/* P/L Preview */}
                {exitPrice && exitPrice > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">P/L Preview</h4>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Entry Price:</span>
                        <span className="font-semibold">{formatCurrency(trade.entryPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Exit Price:</span>
                        <span className="font-semibold">{formatCurrency(exitPrice)}</span>
                      </div>
                      <div className="flex justify-between border-t border-blue-200 pt-2">
                        <span className="text-blue-700">Realized P/L:</span>
                        <span className={`font-bold text-lg ${
                          previewPnL >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {previewPnL >= 0 ? '+' : ''}{formatCurrency(previewPnL)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !exitPrice || exitPrice <= 0}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Processing...' : 'Review Close'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Confirmation Summary */}
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h4 className="text-yellow-800 font-semibold">Confirm Trade Close</h4>
                      <p className="text-yellow-700 text-sm mt-1">
                        This action cannot be undone. The trade will be marked as closed and your equity will be updated.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Final Summary</h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trade:</span>
                      <span className="font-semibold">{trade.symbol} {trade.direction}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Exit Price:</span>
                      <span className="font-semibold">{formatCurrency(exitPrice)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2">
                      <span className="text-gray-600">Realized P/L:</span>
                      <span className={`font-bold text-lg ${
                        previewPnL >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {previewPnL >= 0 ? '+' : ''}{formatCurrency(previewPnL)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Confirmation Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Back to Edit
                  </button>
                  <button
                    type="button"
                    onClick={confirmClose}
                    disabled={closeTradeMutation.isPending}
                    className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {closeTradeMutation.isPending ? 'Closing...' : 'Close Trade'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Error Display */}
          {closeTradeMutation.error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-red-800 font-semibold">Error Closing Trade</h4>
                  <p className="text-red-700 text-sm mt-1">
                    {closeTradeMutation.error.message || 'Failed to close trade. Please try again.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};