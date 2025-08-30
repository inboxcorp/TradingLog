import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, Trade } from '@trading-log/shared';
import { tradeApi } from '../lib/api';
import { CloseTradeModal } from './CloseTradeModal';
import { AdjustStopModal } from './AdjustStopModal';

interface TradeListProps {
  statusFilter?: 'ACTIVE' | 'CLOSED' | 'ALL';
}

export const TradeList: React.FC<TradeListProps> = ({ statusFilter = 'ALL' }) => {
  const [tradeToClose, setTradeToClose] = useState<Trade | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [tradeToAdjust, setTradeToAdjust] = useState<Trade | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const {
    data: trades = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['trades', statusFilter],
    queryFn: () => tradeApi.getTrades(statusFilter),
  });

  const handleCloseTrade = (trade: Trade) => {
    setTradeToClose(trade);
    setIsCloseModalOpen(true);
  };

  const handleCloseModalClose = () => {
    setIsCloseModalOpen(false);
    setTradeToClose(null);
  };

  const handleAdjustStop = (trade: Trade) => {
    setTradeToAdjust(trade);
    setIsAdjustModalOpen(true);
  };

  const handleAdjustModalClose = () => {
    setIsAdjustModalOpen(false);
    setTradeToAdjust(null);
  };

  const handleAdjustSuccess = (updatedTrade: Trade) => {
    // Modal will close automatically via handleAdjustModalClose
    // QueryClient will invalidate and refetch trades automatically
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading trades...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading trades</h3>
            <div className="mt-2 text-sm text-red-700">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">
          <svg
            className="mx-auto h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No trades found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {statusFilter === 'ACTIVE' 
              ? 'You have no active trades.'
              : statusFilter === 'CLOSED'
              ? 'You have no closed trades.'
              : 'Start by creating your first trade.'}
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    const statusClasses = {
      ACTIVE: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
    };
    
    return (
      <span className={`${baseClasses} ${statusClasses[status as keyof typeof statusClasses]}`}>
        {status.toLowerCase()}
      </span>
    );
  };

  const getDirectionBadge = (direction: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    const directionClasses = {
      LONG: 'bg-blue-100 text-blue-800',
      SHORT: 'bg-orange-100 text-orange-800',
    };
    
    return (
      <span className={`${baseClasses} ${directionClasses[direction as keyof typeof directionClasses]}`}>
        {direction.toLowerCase()}
      </span>
    );
  };

  return (
    <div className="bg-white shadow-sm overflow-hidden sm:rounded-md">
      <div className="px-4 py-4 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Trading Journal
          {statusFilter !== 'ALL' && (
            <span className="ml-2 text-sm text-gray-500">
              ({statusFilter.toLowerCase()} trades)
            </span>
          )}
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          {trades.length} trade{trades.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Symbol
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Direction
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Entry Price
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Risk Amount
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Entry Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                P/L
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-blue-50 hover:border-blue-200 transition-colors duration-150">
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className="text-base font-bold text-gray-900">{trade.symbol}</span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  {getDirectionBadge(trade.direction)}
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(trade.entryPrice)}</span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-800">{trade.positionSize} shares</span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className="text-sm font-bold text-red-600">{formatCurrency(trade.riskAmount)}</span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  {getStatusBadge(trade.status)}
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{formatDate(trade.entryDate)}</span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  {trade.realizedPnL !== null && trade.realizedPnL !== undefined ? (
                    <span className={`text-sm font-bold ${
                      trade.realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trade.realizedPnL >= 0 ? '+' : ''}{formatCurrency(trade.realizedPnL)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-right">
                  {trade.status === 'ACTIVE' ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAdjustStop(trade)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Adjust Stop
                      </button>
                      <button
                        onClick={() => handleCloseTrade(trade)}
                        className="bg-red-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4 px-4 pb-4">
        {trades.map((trade) => (
          <div key={trade.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
            {/* Header with Symbol, Direction, and Status */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-bold text-gray-900">{trade.symbol}</h3>
                {getDirectionBadge(trade.direction)}
              </div>
              {getStatusBadge(trade.status)}
            </div>
            
            {/* Price Information */}
            <div className="space-y-2 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Entry Price</span>
                <span className="text-lg font-semibold text-gray-900">{formatCurrency(trade.entryPrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Position Size</span>
                <span className="text-base font-medium text-gray-800">{trade.positionSize} shares</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Risk Amount</span>
                <span className="text-base font-semibold text-red-600">{formatCurrency(trade.riskAmount)}</span>
              </div>
              {trade.realizedPnL !== null && trade.realizedPnL !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Realized P/L</span>
                  <span className={`text-lg font-bold ${
                    trade.realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trade.realizedPnL >= 0 ? '+' : ''}{formatCurrency(trade.realizedPnL)}
                  </span>
                </div>
              )}
            </div>
            
            {/* Date and Notes */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                <span>Entry Date: {formatDate(trade.entryDate)}</span>
              </div>
              {trade.notes && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 italic">"{trade.notes}"</p>
                </div>
              )}
              
              {/* Actions */}
              {trade.status === 'ACTIVE' && (
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                  <button
                    onClick={() => handleAdjustStop(trade)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Adjust Stop-Loss
                  </button>
                  <button
                    onClick={() => handleCloseTrade(trade)}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Close Trade
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Close Trade Modal */}
      {tradeToClose && (
        <CloseTradeModal
          trade={tradeToClose}
          isOpen={isCloseModalOpen}
          onClose={handleCloseModalClose}
        />
      )}

      {/* Adjust Stop Modal */}
      {tradeToAdjust && (
        <AdjustStopModal
          trade={tradeToAdjust}
          isOpen={isAdjustModalOpen}
          onClose={handleAdjustModalClose}
          onSuccess={handleAdjustSuccess}
        />
      )}
    </div>
  );
};