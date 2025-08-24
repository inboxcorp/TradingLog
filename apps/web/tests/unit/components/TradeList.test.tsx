import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TradeList } from '../../../src/components/TradeList';
import { tradeApi } from '../../../src/lib/api';

// Mock the API module
jest.mock('../../../src/lib/api', () => ({
  tradeApi: {
    getTrades: jest.fn(),
  },
}));

const mockTradeApi = tradeApi as jest.Mocked<typeof tradeApi>;

// Helper to wrap components with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('TradeList', () => {
  const mockTrades = [
    {
      id: 'trade-1',
      userId: 'user-1',
      symbol: 'AAPL',
      direction: 'LONG' as const,
      entryPrice: 150,
      positionSize: 100,
      stopLoss: 145,
      exitPrice: null,
      status: 'ACTIVE' as const,
      entryDate: new Date('2024-01-15'),
      exitDate: null,
      realizedPnL: null,
      riskAmount: 500,
      notes: 'Test active trade',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 'trade-2',
      userId: 'user-1',
      symbol: 'TSLA',
      direction: 'SHORT' as const,
      entryPrice: 200,
      positionSize: 50,
      stopLoss: 210,
      exitPrice: 190,
      status: 'CLOSED' as const,
      entryDate: new Date('2024-01-10'),
      exitDate: new Date('2024-01-12'),
      realizedPnL: 500,
      riskAmount: 500,
      notes: 'Successful short trade',
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-12'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display loading state', () => {
    mockTradeApi.getTrades.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<TradeList />, { wrapper: createWrapper() });

    expect(screen.getByText(/loading trades/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { hidden: true })).toHaveClass('animate-spin');
  });

  it('should display error state', async () => {
    const errorMessage = 'Failed to load trades';
    mockTradeApi.getTrades.mockRejectedValue(new Error(errorMessage));

    render(<TradeList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/error loading trades/i)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should display empty state when no trades', async () => {
    mockTradeApi.getTrades.mockResolvedValue([]);

    render(<TradeList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/no trades found/i)).toBeInTheDocument();
      expect(screen.getByText(/start by creating your first trade/i)).toBeInTheDocument();
    });
  });

  it('should display trades in desktop table format', async () => {
    mockTradeApi.getTrades.mockResolvedValue(mockTrades);

    // Mock matchMedia to simulate desktop
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query.includes('md:'), // Simulate desktop
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    render(<TradeList />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Check table headers
      expect(screen.getByText('Symbol')).toBeInTheDocument();
      expect(screen.getByText('Direction')).toBeInTheDocument();
      expect(screen.getByText('Entry Price')).toBeInTheDocument();
      expect(screen.getByText('Size')).toBeInTheDocument();
      expect(screen.getByText('Risk')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Entry Date')).toBeInTheDocument();

      // Check trade data
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('TSLA')).toBeInTheDocument();
      expect(screen.getByText('$150.00')).toBeInTheDocument();
      expect(screen.getByText('$200.00')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });

  it('should show trade count in header', async () => {
    mockTradeApi.getTrades.mockResolvedValue(mockTrades);

    render(<TradeList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('2 trades found')).toBeInTheDocument();
    });
  });

  it('should display status badges correctly', async () => {
    mockTradeApi.getTrades.mockResolvedValue(mockTrades);

    render(<TradeList />, { wrapper: createWrapper() });

    await waitFor(() => {
      const activeBadge = screen.getByText('active');
      const closedBadge = screen.getByText('closed');
      
      expect(activeBadge).toBeInTheDocument();
      expect(closedBadge).toBeInTheDocument();
      
      // Check badge styling classes
      expect(activeBadge).toHaveClass('bg-green-100', 'text-green-800');
      expect(closedBadge).toHaveClass('bg-gray-100', 'text-gray-800');
    });
  });

  it('should display direction badges correctly', async () => {
    mockTradeApi.getTrades.mockResolvedValue(mockTrades);

    render(<TradeList />, { wrapper: createWrapper() });

    await waitFor(() => {
      const longBadge = screen.getByText('long');
      const shortBadge = screen.getByText('short');
      
      expect(longBadge).toBeInTheDocument();
      expect(shortBadge).toBeInTheDocument();
      
      // Check badge styling classes
      expect(longBadge).toHaveClass('bg-blue-100', 'text-blue-800');
      expect(shortBadge).toHaveClass('bg-orange-100', 'text-orange-800');
    });
  });

  it('should format currency values correctly', async () => {
    mockTradeApi.getTrades.mockResolvedValue(mockTrades);

    render(<TradeList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('$150.00')).toBeInTheDocument(); // Entry price
      expect(screen.getByText('$200.00')).toBeInTheDocument(); // Entry price
      expect(screen.getAllByText('$500.00')).toHaveLength(2); // Risk amounts
    });
  });

  it('should format dates correctly', async () => {
    mockTradeApi.getTrades.mockResolvedValue(mockTrades);

    render(<TradeList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Jan 10, 2024')).toBeInTheDocument();
    });
  });

  it('should filter trades by status', async () => {
    // Test with ACTIVE filter
    mockTradeApi.getTrades.mockResolvedValue([mockTrades[0]]);

    render(<TradeList statusFilter="ACTIVE" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockTradeApi.getTrades).toHaveBeenCalledWith('ACTIVE');
      expect(screen.getByText('1 trade found')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.queryByText('TSLA')).not.toBeInTheDocument();
    });
  });

  it('should handle empty state for filtered results', async () => {
    mockTradeApi.getTrades.mockResolvedValue([]);

    render(<TradeList statusFilter="ACTIVE" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/no trades found/i)).toBeInTheDocument();
      expect(screen.getByText(/you have no active trades/i)).toBeInTheDocument();
    });
  });

  it('should show different empty states for different filters', async () => {
    mockTradeApi.getTrades.mockResolvedValue([]);

    // Test CLOSED filter
    const { rerender } = render(<TradeList statusFilter="CLOSED" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/you have no closed trades/i)).toBeInTheDocument();
    });

    // Test ALL filter
    rerender(<TradeList statusFilter="ALL" />);

    await waitFor(() => {
      expect(screen.getByText(/start by creating your first trade/i)).toBeInTheDocument();
    });
  });

  it('should show filter status in header', async () => {
    mockTradeApi.getTrades.mockResolvedValue(mockTrades);

    render(<TradeList statusFilter="ACTIVE" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('(active trades)')).toBeInTheDocument();
    });
  });

  it('should handle notes display in mobile view', async () => {
    const tradesWithNotes = [
      {
        ...mockTrades[0],
        notes: 'This is a test note for mobile view',
      },
    ];
    
    mockTradeApi.getTrades.mockResolvedValue(tradesWithNotes);

    render(<TradeList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('This is a test note for mobile view')).toBeInTheDocument();
    });
  });

  it('should call API with correct parameters for different filters', async () => {
    mockTradeApi.getTrades.mockResolvedValue([]);

    // Test ALL filter
    const { rerender } = render(<TradeList statusFilter="ALL" />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(mockTradeApi.getTrades).toHaveBeenCalledWith('ALL');
    });

    jest.clearAllMocks();

    // Test ACTIVE filter
    rerender(<TradeList statusFilter="ACTIVE" />);
    await waitFor(() => {
      expect(mockTradeApi.getTrades).toHaveBeenCalledWith('ACTIVE');
    });

    jest.clearAllMocks();

    // Test CLOSED filter
    rerender(<TradeList statusFilter="CLOSED" />);
    await waitFor(() => {
      expect(mockTradeApi.getTrades).toHaveBeenCalledWith('CLOSED');
    });
  });
});