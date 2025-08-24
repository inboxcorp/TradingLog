import React from 'react';
import { formatCurrency } from '@trading-log/shared';
import { useEquityForm } from '../hooks/useEquityForm';

interface EquityFormProps {
  initialEquity?: number;
  onSubmit: (equity: number) => Promise<void>;
  loading?: boolean;
}

/**
 * Equity input form component with validation and real-time preview
 * Uses custom hook for form logic separation
 */
const EquityForm: React.FC<EquityFormProps> = ({
  initialEquity = 0,
  onSubmit,
  loading = false,
}) => {
  const {
    form: { register, handleSubmit },
    handleFormSubmit,
    showPreview,
    previewValue,
    isSubmitting,
    errors,
  } = useEquityForm({ initialEquity, onSubmit });

  return (
    <div className="max-w-sm mx-auto p-5">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2">
          <label htmlFor="totalEquity" className="text-sm font-semibold text-gray-700">
            Total Equity
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-gray-500 font-medium z-10">$</span>
            <input
              {...register('totalEquity')}
              type="number"
              step="0.01"
              min="0"
              id="totalEquity"
              className={`w-full pl-7 pr-3 py-3 border-2 rounded-lg text-base text-gray-900 bg-white transition-colors focus:outline-none focus:ring-3 focus:ring-blue-100 ${
                errors.totalEquity 
                  ? 'border-red-400 focus:border-red-400' 
                  : 'border-gray-300 focus:border-blue-500'
              } disabled:bg-gray-100 disabled:cursor-not-allowed`}
              placeholder="Enter your total equity"
              disabled={loading || isSubmitting}
            />
          </div>
          {errors.totalEquity && (
            <p className="text-red-500 text-sm m-0">{errors.totalEquity.message}</p>
          )}
        </div>

        {showPreview && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="m-0 text-blue-800 text-sm">
              Preview: <strong>{formatCurrency(previewValue)}</strong>
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || isSubmitting}
          className={`px-6 py-3 text-white border-0 rounded-lg text-base font-semibold cursor-pointer transition-colors ${
            loading || isSubmitting
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {loading || isSubmitting ? 'Updating...' : 'Update Equity'}
        </button>
      </form>
    </div>
  );
};

export default EquityForm;