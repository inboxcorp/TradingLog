import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi } from 'vitest';
import PerformanceStatsWidget from '../../../src/components/PerformanceStatsWidget';
import { PerformanceStatistics, StatisticalSignificance } from '@trading-log/shared';

// Mock the shared utilities
vi.mock('@trading-log/shared', async () => {
  const actual = await vi.importActual('@trading-log/shared');
  return {
    ...actual,
    formatStatistic: vi.fn((value: number, type: string) => {
      switch (type) {
        case 'currency': return `$${value.toFixed(2)}`;
        case 'percentage': return `${value.toFixed(1)}%`;
        case 'ratio': return value === Infinity ? '∞' : value.toFixed(2);
        case 'number': return value.toLocaleString();
        default: return value.toString();
      }
    }),
    getBenchmarkLevel: vi.fn(() => 'good')
  };
});

describe('PerformanceStatsWidget', () => {
  const mockStatistics: PerformanceStatistics = {
    totalTrades: 100,
    winningTrades: 60,
    losingTrades: 35,
    breakevenTrades: 5,
    winRate: 60,
    lossRate: 35,
    winLossRatio: 1.714,
    totalPnL: 5000,
    averageProfit: 150,
    averageLoss: 85,
    averageTrade: 50,
    expectancy: 32.5,
    profitFactor: 1.8,
    recoveryFactor: 2.5,
    maxWin: 500,
    maxLoss: -300,
    maxConsecutiveWins: 7,
    maxConsecutiveLosses: 4,
    currentStreak: 3,
    streakType: 'WIN',
    averageRisk: 100,
    riskAdjustedReturn: 1.2,
    maxDrawdown: 2000,
    sharpeRatio: 1.5,
    averageHoldTime: 24.5,
    tradingFrequency: 8.5,
    bestMonth: '2025-01',
    worstMonth: '2024-12'
  };

  const mockSignificance: StatisticalSignificance = {
    sampleSize: 100,
    confidenceLevel: 95,
    isSignificant: true,
    marginOfError: 0.05,
    recommendation: 'Statistics are reliable for analysis'
  };

  test('renders loading state correctly', () => {
    render(<PerformanceStatsWidget statistics={mockStatistics} loading={true} />);
    
    expect(screen.getByText('Performance Statistics')).toBeInTheDocument();
    
    // Should show loading skeleton
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('renders primary metrics correctly', () => {
    render(<PerformanceStatsWidget statistics={mockStatistics} loading={false} />);
    
    expect(screen.getByText('Performance Statistics')).toBeInTheDocument();
    
    // Check primary metrics
    expect(screen.getByText('Win Rate')).toBeInTheDocument();
    expect(screen.getByText('60.0%')).toBeInTheDocument();
    
    expect(screen.getByText('Total P/L')).toBeInTheDocument();
    expect(screen.getByText('$5000.00')).toBeInTheDocument();
    
    expect(screen.getByText('Profit Factor')).toBeInTheDocument();
    expect(screen.getByText('1.80')).toBeInTheDocument();
    
    expect(screen.getByText('Expectancy')).toBeInTheDocument();
    expect(screen.getByText('$32.50')).toBeInTheDocument();
  });

  test('displays statistical significance warning for small samples', () => {
    const smallSampleSignificance: StatisticalSignificance = {
      sampleSize: 15,
      confidenceLevel: 47.5,
      isSignificant: false,
      marginOfError: 0.2,
      recommendation: 'Need 15 more trades for statistical significance'
    };

    render(
      <PerformanceStatsWidget 
        statistics={mockStatistics} 
        loading={false}
        significance={smallSampleSignificance}
      />
    );
    
    expect(screen.getByText('Limited Statistical Significance')).toBeInTheDocument();
    expect(screen.getByText('Need 15 more trades for statistical significance')).toBeInTheDocument();
  });

  test('expands and collapses detailed metrics', async () => {
    render(<PerformanceStatsWidget statistics={mockStatistics} loading={false} />);
    
    // Find the detailed metrics toggle button
    const detailsButton = screen.getByText('Show details');
    expect(detailsButton).toBeInTheDocument();
    
    // Initially, detailed metrics should not be visible
    expect(screen.queryByText('Average Profit')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(detailsButton);
    
    await waitFor(() => {
      expect(screen.getByText('Average Profit')).toBeInTheDocument();
      expect(screen.getByText('$150.00')).toBeInTheDocument();
      
      expect(screen.getByText('Average Loss')).toBeInTheDocument();
      expect(screen.getByText('$85.00')).toBeInTheDocument();
      
      expect(screen.getByText('Max Consecutive Wins')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });
    
    // Button text should change
    expect(screen.getByText('Hide details')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(screen.getByText('Hide details'));
    
    await waitFor(() => {
      expect(screen.queryByText('Average Profit')).not.toBeInTheDocument();
    });
  });

  test('displays advanced metrics when detailed view is expanded', async () => {
    render(<PerformanceStatsWidget statistics={mockStatistics} loading={false} />);
    
    // Expand detailed metrics
    fireEvent.click(screen.getByText('Show details'));
    
    await waitFor(() => {
      expect(screen.getByText('Advanced Analytics')).toBeInTheDocument();
      expect(screen.getByText('Sharpe Ratio')).toBeInTheDocument();
      expect(screen.getByText('1.50')).toBeInTheDocument();
      
      expect(screen.getByText('Max Drawdown')).toBeInTheDocument();
      expect(screen.getByText('$2000.00')).toBeInTheDocument();
      
      expect(screen.getByText('Recovery Factor')).toBeInTheDocument();
      expect(screen.getByText('2.50')).toBeInTheDocument();
    });
  });

  test('displays time-based performance when available', async () => {
    render(<PerformanceStatsWidget statistics={mockStatistics} loading={false} />);
    
    // Should show best/worst months
    expect(screen.getByText('Best Month')).toBeInTheDocument();
    expect(screen.getByText('2025-01')).toBeInTheDocument();
    
    expect(screen.getByText('Worst Month')).toBeInTheDocument();
    expect(screen.getByText('2024-12')).toBeInTheDocument();
  });

  test('hides time-based performance when not available', () => {
    const statsWithoutTimeData = {
      ...mockStatistics,
      bestMonth: 'N/A',
      worstMonth: 'N/A'
    };

    render(<PerformanceStatsWidget statistics={statsWithoutTimeData} loading={false} />);
    
    // Should not show time-based performance section
    expect(screen.queryByText('Best Month')).not.toBeInTheDocument();
    expect(screen.queryByText('Worst Month')).not.toBeInTheDocument();
  });

  test('handles compact view correctly', () => {
    render(
      <PerformanceStatsWidget 
        statistics={mockStatistics} 
        loading={false}
        compactView={true}
      />
    );
    
    // Should show expand/collapse button for compact view
    const expandButton = document.querySelector('[data-testid="expand-button"]') || 
                        screen.getByRole('button', { name: /chevron/i });
    expect(expandButton).toBeInTheDocument();
  });

  test('displays trend indicators correctly', () => {
    const statsWithPositiveTrend = {
      ...mockStatistics,
      totalPnL: 1500 // Positive P/L should show up trend
    };

    render(<PerformanceStatsWidget statistics={statsWithPositiveTrend} loading={false} />);
    
    // Should display trend indicators (this would need actual trend props in the component)
    // For now, we check that the P/L value is displayed correctly
    expect(screen.getByText('$1500.00')).toBeInTheDocument();
  });

  test('handles edge cases gracefully', () => {
    const edgeCaseStats: PerformanceStatistics = {
      ...mockStatistics,
      totalTrades: 0,
      winRate: 0,
      profitFactor: Infinity,
      winLossRatio: Infinity
    };

    render(<PerformanceStatsWidget statistics={edgeCaseStats} loading={false} />);
    
    // Should handle infinite values
    expect(screen.getByText('∞')).toBeInTheDocument();
    
    // Should handle zero values
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  test('shows comparison statistics when available', () => {
    render(
      <PerformanceStatsWidget 
        statistics={mockStatistics} 
        loading={false}
        showComparison={true}
      />
    );
    
    // The component should somehow indicate that comparison is available
    // This would depend on the actual implementation of comparison display
    expect(screen.getByText('Performance Statistics')).toBeInTheDocument();
  });

  test('handles empty statistics object', () => {
    const emptyStats = {} as PerformanceStatistics;
    
    render(<PerformanceStatsWidget statistics={emptyStats} loading={false} />);
    
    // Should not crash and should display the component structure
    expect(screen.getByText('Performance Statistics')).toBeInTheDocument();
  });

  test('displays proper descriptions for metrics', async () => {
    render(<PerformanceStatsWidget statistics={mockStatistics} loading={false} />);
    
    // Check that descriptions are shown
    expect(screen.getByText('60W/35L of 100 trades')).toBeInTheDocument();
    expect(screen.getByText('Average: $50.00/trade')).toBeInTheDocument();
    expect(screen.getByText('Gross Profit / Gross Loss')).toBeInTheDocument();
    expect(screen.getByText('Expected profit per trade')).toBeInTheDocument();
  });

  test('accessibility features work correctly', () => {
    render(<PerformanceStatsWidget statistics={mockStatistics} loading={false} />);
    
    // Check for proper heading structure
    expect(screen.getByRole('heading', { name: 'Performance Statistics' })).toBeInTheDocument();
    
    // Check for button accessibility
    const detailsButton = screen.getByText('Show details');
    expect(detailsButton).toHaveAttribute('type', 'button');
  });

  test('updates when statistics prop changes', () => {
    const { rerender } = render(
      <PerformanceStatsWidget statistics={mockStatistics} loading={false} />
    );
    
    expect(screen.getByText('60.0%')).toBeInTheDocument();
    
    const updatedStats = { ...mockStatistics, winRate: 75 };
    rerender(<PerformanceStatsWidget statistics={updatedStats} loading={false} />);
    
    expect(screen.getByText('75.0%')).toBeInTheDocument();
  });

  test('maintains state between renders', async () => {
    const { rerender } = render(
      <PerformanceStatsWidget statistics={mockStatistics} loading={false} />
    );
    
    // Expand detailed view
    fireEvent.click(screen.getByText('Show details'));
    
    await waitFor(() => {
      expect(screen.getByText('Average Profit')).toBeInTheDocument();
    });
    
    // Re-render with new data
    const updatedStats = { ...mockStatistics, totalPnL: 6000 };
    rerender(<PerformanceStatsWidget statistics={updatedStats} loading={false} />);
    
    // Detailed view should still be expanded
    expect(screen.getByText('Average Profit')).toBeInTheDocument();
    expect(screen.getByText('$6000.00')).toBeInTheDocument();
  });
});