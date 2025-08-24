import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../lib/api';
import EquityDisplay from '../components/EquityDisplay';
import EquityForm from '../components/EquityForm';
import { useAuth } from '../components/AuthWrapper';
import { User } from '@trading-log/shared';

const EquityPage: React.FC = () => {
  const { user: authUser, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Fetch user data
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<User>({
    queryKey: ['user'],
    queryFn: userApi.getUser,
    retry: 2,
  });

  // Update equity mutation
  const updateEquityMutation = useMutation({
    mutationFn: userApi.updateEquity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setSuccessMessage('Equity updated successfully!');
      setErrorMessage('');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || 'Failed to update equity');
      setSuccessMessage('');
    },
  });

  // Clear messages when user starts typing
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  const handleEquityUpdate = async (newEquity: number) => {
    await updateEquityMutation.mutateAsync(newEquity);
  };

  if (error) {
    return (
      <div className="error-container">
        <h1>Error Loading User Data</h1>
        <p>{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-5">
      <div className="max-w-2xl mx-auto p-5">
        <header className="mb-10">
          <div className="flex justify-between items-start gap-5 flex-col md:flex-row md:items-center">
            <div>
              <h1 className="text-gray-900 text-2xl md:text-3xl my-0 mb-3 font-bold">Trading Log - Set Initial Equity</h1>
              <p className="text-gray-500 text-base m-0">Set your starting equity to begin tracking your trading performance</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-gray-500 text-sm">{authUser?.email}</span>
              <button 
                onClick={signOut}
                className="bg-red-500 text-white border-none px-4 py-2 rounded-md text-sm cursor-pointer transition-colors hover:bg-red-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Message Alerts */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-5">
            <span className="text-green-800">✅ {successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
            <span className="text-red-800">❌ {errorMessage}</span>
          </div>
        )}

        {/* Current Equity Display */}
        <EquityDisplay
          equity={user?.totalEquity || 0}
          loading={isLoading}
          lastUpdated={user?.updatedAt ? new Date(user.updatedAt) : undefined}
        />

        {/* Equity Update Form */}
        {user && (
          <EquityForm
            initialEquity={user.totalEquity}
            onSubmit={handleEquityUpdate}
            loading={updateEquityMutation.isPending}
          />
        )}
      </div>
    </div>
  );
};

export default EquityPage;