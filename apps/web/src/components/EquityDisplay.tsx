import React, { useState } from 'react';
import { formatCurrency } from '@trading-log/shared';
import { CashAdjustmentModal } from './CashAdjustmentModal';
import { useQueryClient } from '@tanstack/react-query';

interface EquityDisplayProps {
  equity: number;
  loading?: boolean;
  lastUpdated?: Date;
}

const EquityDisplay: React.FC<EquityDisplayProps> = ({
  equity,
  loading = false,
  lastUpdated,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleAdjustmentSuccess = () => {
    // Refresh user data after successful adjustment
    queryClient.invalidateQueries({ queryKey: ['user'] });
    queryClient.invalidateQueries({ queryKey: ['portfolio-risk'] });
  };

  return (
    <>
      <div className="max-w-md mx-auto mb-6">
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white p-6 rounded-xl shadow-lg text-center">
          <h2 className="text-lg font-semibold mb-4 opacity-90 sm:text-base">
            Current Total Equity
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center gap-3 text-base">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Loading...</span>
            </div>
          ) : (
            <div className="my-4">
              <span className="text-4xl font-bold sm:text-3xl" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
                {formatCurrency(equity)}
              </span>
            </div>
          )}

          {!loading && (
            <div className="mt-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 backdrop-blur-sm"
              >
                Adjust Cash
              </button>
            </div>
          )}

          {lastUpdated && !loading && (
            <p className="mt-3 text-xs opacity-80">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      <CashAdjustmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAdjustmentSuccess}
        currentEquity={equity}
      />
    </>
  );
};

export default EquityDisplay;