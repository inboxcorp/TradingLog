import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TradeForm } from '../../../src/components/TradeForm';
import { tradeApi, userApi } from '../../../src/lib/api';

// Mock the API modules
jest.mock('../../../src/lib/api', () => ({
  tradeApi: {
    createTrade: jest.fn(),
  },
  userApi: {
    getUser: jest.fn(),
  },
}));

const mockUserApi = userApi as jest.Mocked<typeof userApi>;
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

describe('TradeForm', () => {
  const mockUser = {
    id: 'test-user',
    email: 'test@example.com',
    totalEquity: 100000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserApi.getUser.mockResolvedValue(mockUser);
  });

  it('should render form fields when open', () => {
    render(
      <TradeForm isOpen={true} onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByLabelText(/symbol/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/direction/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/entry price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/position size/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/stop loss/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <TradeForm isOpen={false} onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByLabelText(/symbol/i)).not.toBeInTheDocument();
  });

  it('should calculate risk in real-time', async () => {
    render(
      <TradeForm isOpen={true} onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );

    // Wait for user data to load
    await waitFor(() => {
      expect(mockUserApi.getUser).toHaveBeenCalled();
    });

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/entry price/i), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText(/position size/i), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText(/stop loss/i), {
      target: { value: '95' },
    });

    // Should show calculated risk
    await waitFor(() => {
      expect(screen.getByText(/trade risk/i)).toBeInTheDocument();
      expect(screen.getByText(/\$500\.00/)).toBeInTheDocument(); // (100-95)*100 = 500
    });
  });

  it('should show risk warning when exceeding 2% limit', async () => {
    render(
      <TradeForm isOpen={true} onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockUserApi.getUser).toHaveBeenCalled();
    });

    // Fill in form fields with high risk trade
    fireEvent.change(screen.getByLabelText(/entry price/i), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText(/position size/i), {
      target: { value: '300' }, // Risk = (100-90)*300 = 3000 > 2% of 100k = 2000
    });
    fireEvent.change(screen.getByLabelText(/stop loss/i), {
      target: { value: '90' },
    });

    // Should show risk warning
    await waitFor(() => {
      expect(screen.getByText(/⚠️.*exceeds 2% limit/i)).toBeInTheDocument();
    });

    // Submit button should be disabled
    const submitButton = screen.getByRole('button', { name: /create trade/i });
    expect(submitButton).toBeDisabled();
  });

  it('should submit valid trade data', async () => {
    const mockTrade = {
      id: 'trade-1',
      userId: 'test-user',
      symbol: 'AAPL',
      direction: 'LONG' as const,
      entryPrice: 150,
      positionSize: 100,
      stopLoss: 145,
      exitPrice: null,
      status: 'ACTIVE' as const,
      entryDate: new Date(),
      exitDate: null,
      realizedPnL: null,
      riskAmount: 500,
      notes: 'Test trade',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockTradeApi.createTrade.mockResolvedValue(mockTrade);

    render(
      <TradeForm isOpen={true} onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockUserApi.getUser).toHaveBeenCalled();
    });

    // Fill in valid form data
    fireEvent.change(screen.getByLabelText(/symbol/i), {
      target: { value: 'AAPL' },
    });
    fireEvent.change(screen.getByLabelText(/entry price/i), {
      target: { value: '150' },
    });
    fireEvent.change(screen.getByLabelText(/position size/i), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText(/stop loss/i), {
      target: { value: '145' },
    });
    fireEvent.change(screen.getByLabelText(/notes/i), {
      target: { value: 'Test trade' },
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create trade/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockTradeApi.createTrade).toHaveBeenCalledWith({
        symbol: 'AAPL',
        direction: 'LONG',
        entryPrice: 150,
        positionSize: 100,
        stopLoss: 145,
        notes: 'Test trade',
      });
    });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should handle form validation errors', async () => {
    render(
      <TradeForm isOpen={true} onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );

    // Submit empty form
    const submitButton = screen.getByRole('button', { name: /create trade/i });
    fireEvent.click(submitButton);

    // Should show validation errors (exact messages depend on Zod schema)
    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  it('should handle API errors', async () => {
    const errorMessage = 'Trade creation failed';
    mockTradeApi.createTrade.mockRejectedValue(new Error(errorMessage));

    render(
      <TradeForm isOpen={true} onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockUserApi.getUser).toHaveBeenCalled();
    });

    // Fill in valid form data
    fireEvent.change(screen.getByLabelText(/symbol/i), {
      target: { value: 'AAPL' },
    });
    fireEvent.change(screen.getByLabelText(/entry price/i), {
      target: { value: '150' },
    });
    fireEvent.change(screen.getByLabelText(/position size/i), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText(/stop loss/i), {
      target: { value: '145' },
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create trade/i });
    fireEvent.click(submitButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should close form when cancel button is clicked', () => {
    render(
      <TradeForm isOpen={true} onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close form when X button is clicked', () => {
    render(
      <TradeForm isOpen={true} onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should transform symbol to uppercase', async () => {
    const mockTrade = {
      id: 'trade-1',
      userId: 'test-user',
      symbol: 'AAPL',
      direction: 'LONG' as const,
      entryPrice: 150,
      positionSize: 100,
      stopLoss: 145,
      exitPrice: null,
      status: 'ACTIVE' as const,
      entryDate: new Date(),
      exitDate: null,
      realizedPnL: null,
      riskAmount: 500,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockTradeApi.createTrade.mockResolvedValue(mockTrade);

    render(
      <TradeForm isOpen={true} onClose={mockOnClose} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockUserApi.getUser).toHaveBeenCalled();
    });

    // Fill in form with lowercase symbol
    fireEvent.change(screen.getByLabelText(/symbol/i), {
      target: { value: 'aapl' },
    });
    fireEvent.change(screen.getByLabelText(/entry price/i), {
      target: { value: '150' },
    });
    fireEvent.change(screen.getByLabelText(/position size/i), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText(/stop loss/i), {
      target: { value: '145' },
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create trade/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockTradeApi.createTrade).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'AAPL', // Should be uppercase
        })
      );
    });
  });
});