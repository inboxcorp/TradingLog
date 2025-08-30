import React, { useState } from 'react';
import { CashAdjustmentRequest } from '@trading-log/shared';

interface CashAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentEquity: number;
}

export const CashAdjustmentModal: React.FC<CashAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentEquity,
}) => {
  const [type, setType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const adjustmentData: CashAdjustmentRequest = {
        type,
        amount: parseFloat(amount),
        description: description.trim() || undefined,
      };

      const response = await fetch('/api/user/cash-adjustment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dev-token', // TODO: Replace with real auth
        },
        body: JSON.stringify(adjustmentData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to process adjustment');
      }

      // Reset form
      setAmount('');
      setDescription('');
      setError('');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setDescription('');
    setError('');
    onClose();
  };

  const previewEquity = () => {
    const adjustmentAmount = parseFloat(amount) || 0;
    if (type === 'DEPOSIT') {
      return currentEquity + adjustmentAmount;
    } else {
      return currentEquity - adjustmentAmount;
    }
  };

  const isValidAmount = () => {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num <= 10000000;
  };

  const wouldExceedBalance = () => {
    if (type === 'WITHDRAWAL') {
      const num = parseFloat(amount) || 0;
      return num > currentEquity;
    }
    return false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Cash Adjustment</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adjustment Type
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="DEPOSIT"
                  checked={type === 'DEPOSIT'}
                  onChange={(e) => setType(e.target.value as 'DEPOSIT')}
                  disabled={isLoading}
                  className="mr-2"
                />
                Deposit
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="WITHDRAWAL"
                  checked={type === 'WITHDRAWAL'}
                  onChange={(e) => setType(e.target.value as 'WITHDRAWAL')}
                  disabled={isLoading}
                  className="mr-2"
                />
                Withdrawal
              </label>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount ($)
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount..."
              min="0.01"
              max="10000000"
              step="0.01"
              disabled={isLoading}
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                wouldExceedBalance() ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {wouldExceedBalance() && (
              <p className="text-red-500 text-sm mt-1">
                Insufficient funds. Available: ${currentEquity.toFixed(2)}
              </p>
            )}
          </div>

          {/* Description Input */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Performance bonus, Emergency withdrawal..."
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Preview */}
          {amount && isValidAmount() && !wouldExceedBalance() && (
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-600">
                Current Equity: ${currentEquity.toFixed(2)}
              </div>
              <div className="text-sm font-medium">
                New Equity: ${previewEquity().toFixed(2)}
                <span className={`ml-2 ${type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'}`}>
                  ({type === 'DEPOSIT' ? '+' : '-'}${parseFloat(amount).toFixed(2)})
                </span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isLoading || 
                !amount || 
                !isValidAmount() || 
                wouldExceedBalance()
              }
              className={`flex-1 px-4 py-2 text-white rounded-md disabled:opacity-50 ${
                type === 'DEPOSIT' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isLoading ? 'Processing...' : `${type === 'DEPOSIT' ? 'Deposit' : 'Withdraw'} $${amount || '0.00'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};