import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QuickActions } from '../components/QuickActions';
import { TradeList } from '../components/TradeList';
import EquityDisplay from '../components/EquityDisplay';
import { userApi } from '../lib/api';

export const TradingPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'CLOSED' | 'ALL'>('ALL');
  
  // Get user data for equity display
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: userApi.getUser,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Trading Dashboard</h1>
          <p className="text-lg text-gray-600">
            Manage your trades and monitor your performance
          </p>
        </header>

        {/* Top Section: Equity Display and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Equity Display - Takes up 2 columns on large screens */}
          <div className="lg:col-span-2">
            {user && (
              <EquityDisplay 
                equity={user.totalEquity} 
                loading={userLoading}
                lastUpdated={user.updatedAt}
              />
            )}
          </div>
          
          {/* Quick Actions - Takes up 1 column on large screens */}
          <div className="lg:col-span-1">
            <QuickActions />
          </div>
        </div>

        {/* Trade Journal Section */}
        <section className="space-y-6">
          {/* Section Header with Filter */}
          <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Trade Journal</h2>
                <p className="text-sm text-gray-600">Track and analyze your trading activity</p>
              </div>
              <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-lg">
                <label htmlFor="status-filter" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Show:
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'ACTIVE' | 'CLOSED' | 'ALL')}
                  className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500 bg-white px-3 py-2"
                >
                  <option value="ALL">All Trades</option>
                  <option value="ACTIVE">Active Trades</option>
                  <option value="CLOSED">Closed Trades</option>
                </select>
              </div>
            </div>
          </div>

          {/* Trade List */}
          <TradeList statusFilter={statusFilter} />
        </section>
      </div>
    </div>
  );
};