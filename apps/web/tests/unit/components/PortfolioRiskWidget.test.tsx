import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PortfolioRiskWidget } from '../../../src/components/PortfolioRiskWidget';
import { userApi } from '../../../src/lib/api';

// Mock the API
vi.mock('../../../src/lib/api');
const mockedUserApi = vi.mocked(userApi);

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('PortfolioRiskWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays loading state initially', () => {
    mockedUserApi.getPortfolioRisk.mockImplementation(() => new Promise(() => {}));
    
    render(
      <TestWrapper>
        <PortfolioRiskWidget />
      </TestWrapper>
    );

    expect(screen.getByText('Portfolio Risk')).toBeInTheDocument();
    expect(screen.getByTestId('loading-skeleton') || document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays portfolio risk data correctly', async () => {
    const mockPortfolioRisk = {
      success: true,
      data: {
        totalRiskAmount: 500,
        totalRiskPercentage: 5.0,
        exceedsLimit: false,
        riskLevel: 'WARNING' as const,
        userEquity: 10000,
        activeTrades: [
          {
            id: 'trade-1',
            symbol: 'AAPL',
            riskAmount: 200,
            riskPercentage: 2.0
          },
          {
            id: 'trade-2',
            symbol: 'TSLA',
            riskAmount: 300,
            riskPercentage: 3.0
          }
        ]
      }
    };

    mockedUserApi.getPortfolioRisk.mockResolvedValue(mockPortfolioRisk);

    render(
      <TestWrapper>
        <PortfolioRiskWidget />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('$500.00')).toBeInTheDocument();
      expect(screen.getByText('5.00% of equity')).toBeInTheDocument();
    });

    // Check progress bar percentage
    expect(screen.getByText('5.0% / 6.0%')).toBeInTheDocument();

    // Check active trades breakdown
    expect(screen.getByText('Active Trades (2)')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('TSLA')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
    expect(screen.getByText('$300.00')).toBeInTheDocument();
  });

  it('displays correct risk level styling for SAFE level', async () => {
    const mockPortfolioRisk = {
      success: true,
      data: {
        totalRiskAmount: 200,
        totalRiskPercentage: 2.0,
        exceedsLimit: false,
        riskLevel: 'SAFE' as const,
        userEquity: 10000,
        activeTrades: []
      }
    };

    mockedUserApi.getPortfolioRisk.mockResolvedValue(mockPortfolioRisk);

    render(
      <TestWrapper>
        <PortfolioRiskWidget />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('🛡️')).toBeInTheDocument();
      expect(screen.getByText('$200.00')).toBeInTheDocument();
    });
  });

  it('displays warning for DANGER level and exceeds limit', async () => {
    const mockPortfolioRisk = {
      success: true,
      data: {
        totalRiskAmount: 700,
        totalRiskPercentage: 7.0,
        exceedsLimit: true,
        riskLevel: 'DANGER' as const,
        userEquity: 10000,
        activeTrades: []
      }
    };

    mockedUserApi.getPortfolioRisk.mockResolvedValue(mockPortfolioRisk);

    render(
      <TestWrapper>
        <PortfolioRiskWidget />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('🚨')).toBeInTheDocument();
      expect(screen.getByText('Risk Limit Exceeded')).toBeInTheDocument();
      expect(screen.getByText(/Your portfolio risk exceeds the 6% limit/)).toBeInTheDocument();
    });
  });

  it('displays no active trades state', async () => {
    const mockPortfolioRisk = {
      success: true,
      data: {
        totalRiskAmount: 0,
        totalRiskPercentage: 0,
        exceedsLimit: false,
        riskLevel: 'SAFE' as const,
        userEquity: 10000,
        activeTrades: []
      }
    };

    mockedUserApi.getPortfolioRisk.mockResolvedValue(mockPortfolioRisk);

    render(
      <TestWrapper>
        <PortfolioRiskWidget />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('📊')).toBeInTheDocument();
      expect(screen.getByText('No active trades')).toBeInTheDocument();
      expect(screen.getByText('Your portfolio risk is 0%')).toBeInTheDocument();
    });
  });

  it('displays error state correctly', async () => {
    mockedUserApi.getPortfolioRisk.mockRejectedValue(new Error('Failed to fetch'));

    render(
      <TestWrapper>
        <PortfolioRiskWidget />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load portfolio risk')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });
  });

  it('handles refresh functionality', async () => {
    const mockOnRefresh = vi.fn();
    const mockPortfolioRisk = {
      success: true,
      data: {
        totalRiskAmount: 300,
        totalRiskPercentage: 3.0,
        exceedsLimit: false,
        riskLevel: 'SAFE' as const,
        userEquity: 10000,
        activeTrades: []
      }
    };

    mockedUserApi.getPortfolioRisk.mockResolvedValue(mockPortfolioRisk);

    render(
      <TestWrapper>
        <PortfolioRiskWidget onRefresh={mockOnRefresh} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('$300.00')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: 'Refresh portfolio risk' });
    refreshButton.click();

    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('displays correct progress bar percentage', async () => {
    const mockPortfolioRisk = {
      success: true,
      data: {
        totalRiskAmount: 450,
        totalRiskPercentage: 4.5,
        exceedsLimit: false,
        riskLevel: 'WARNING' as const,
        userEquity: 10000,
        activeTrades: []
      }
    };

    mockedUserApi.getPortfolioRisk.mockResolvedValue(mockPortfolioRisk);

    render(
      <TestWrapper>
        <PortfolioRiskWidget />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('4.5% / 6.0%')).toBeInTheDocument();
    });

    // Check that progress bar shows 75% (4.5/6 * 100)
    const progressBar = document.querySelector('[style*="width: 75%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('caps progress bar at 100% for values over 6%', async () => {
    const mockPortfolioRisk = {
      success: true,
      data: {
        totalRiskAmount: 800,
        totalRiskPercentage: 8.0,
        exceedsLimit: true,
        riskLevel: 'DANGER' as const,
        userEquity: 10000,
        activeTrades: []
      }
    };

    mockedUserApi.getPortfolioRisk.mockResolvedValue(mockPortfolioRisk);

    render(
      <TestWrapper>
        <PortfolioRiskWidget />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('8.0% / 6.0%')).toBeInTheDocument();
    });

    // Progress bar should be capped at 100%
    const progressBar = document.querySelector('[style*="width: 100%"]');
    expect(progressBar).toBeInTheDocument();
  });
});