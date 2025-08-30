import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdjustStopModal } from '../../../src/components/AdjustStopModal';
import { tradeApi, userApi } from '../../../src/lib/api';
import { Trade } from '@trading-log/shared';

// Mock the API modules
jest.mock('../../../src/lib/api', () => ({
  tradeApi: {
    adjustStopLoss: jest.fn(),
  },
  userApi: {
    getUser: jest.fn(),
  },
}));

const mockTradeApi = tradeApi as jest.Mocked<typeof tradeApi>;
const mockUserApi = userApi as jest.Mocked<typeof userApi>;

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

describe('AdjustStopModal', () => {
  const mockUser = {
    id: 'test-user',
    email: 'test@example.com',
    totalEquity: 100000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLongTrade: Trade = {
    id: 'trade-1',
    userId: 'user-1',
    symbol: 'AAPL',
    direction: 'LONG',
    entryPrice: 150.00,
    positionSize: 100,
    stopLoss: 145.00,
    exitPrice: null,
    status: 'ACTIVE',
    entryDate: new Date(),
    exitDate: null,
    realizedPnL: null,
    riskAmount: 500,
    riskPercentage: 0.5,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockShortTrade: Trade = {
    ...mockLongTrade,
    id: 'trade-2',
    direction: 'SHORT',
    entryPrice: 100.00,
    stopLoss: 105.00,
  };

  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserApi.getUser.mockResolvedValue(mockUser);
  });

  it('should render modal when open', () => {
    render(
      <AdjustStopModal
        trade={mockLongTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Adjust Stop-Loss')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('LONG')).toBeInTheDocument();
    expect(screen.getByDisplayValue('145')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <AdjustStopModal
        trade={mockLongTrade}
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('Adjust Stop-Loss')).not.toBeInTheDocument();
  });

  it('should show correct validation rules for LONG position', async () => {
    render(
      <AdjustStopModal
        trade={mockLongTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/you can only move the stop higher/i)).toBeInTheDocument();
  });

  it('should show correct validation rules for SHORT position', async () => {
    render(
      <AdjustStopModal
        trade={mockShortTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/you can only move the stop lower/i)).toBeInTheDocument();
  });

  it('should validate LONG position stop-loss in real-time', async () => {
    render(
      <AdjustStopModal
        trade={mockLongTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    const stopLossInput = screen.getByLabelText(/new stop-loss price/i);

    // Test valid higher stop-loss
    fireEvent.change(stopLossInput, { target: { value: '147' } });
    
    await waitFor(() => {
      expect(screen.getByText(/new risk:/i)).toBeInTheDocument();
      expect(screen.getByText('$300.00')).toBeInTheDocument(); // (150-147)*100
    });

    // Test invalid lower stop-loss
    fireEvent.change(stopLossInput, { target: { value: '143' } });
    
    await waitFor(() => {
      expect(screen.getByText(/must be higher/i)).toBeInTheDocument();
    });
  });

  it('should validate SHORT position stop-loss in real-time', async () => {
    render(
      <AdjustStopModal
        trade={mockShortTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    const stopLossInput = screen.getByLabelText(/new stop-loss price/i);

    // Test valid lower stop-loss
    fireEvent.change(stopLossInput, { target: { value: '103' } });
    
    await waitFor(() => {
      expect(screen.getByText(/new risk:/i)).toBeInTheDocument();
      expect(screen.getByText('$300.00')).toBeInTheDocument(); // |100-103|*100
    });

    // Test invalid higher stop-loss
    fireEvent.change(stopLossInput, { target: { value: '107' } });
    
    await waitFor(() => {
      expect(screen.getByText(/must be lower/i)).toBeInTheDocument();
    });
  });

  it('should show risk comparison correctly', async () => {
    render(
      <AdjustStopModal
        trade={mockLongTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    const stopLossInput = screen.getByLabelText(/new stop-loss price/i);
    
    fireEvent.change(stopLossInput, { target: { value: '147' } });
    
    await waitFor(() => {
      // Current risk should show
      expect(screen.getByText('$500.00')).toBeInTheDocument(); // Current risk
      expect(screen.getByText('(0.50%)')).toBeInTheDocument();
      
      // New risk should show  
      expect(screen.getByText('$300.00')).toBeInTheDocument(); // New risk
      expect(screen.getByText('(0.30%)')).toBeInTheDocument();
      
      // Risk reduction should show
      expect(screen.getByText('-$200.00')).toBeInTheDocument(); // 500 - 300
    });
  });

  it('should submit valid adjustment', async () => {
    const updatedTrade = { ...mockLongTrade, stopLoss: 147.00, riskAmount: 300 };
    mockTradeApi.adjustStopLoss.mockResolvedValue(updatedTrade);

    render(
      <AdjustStopModal
        trade={mockLongTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    const stopLossInput = screen.getByLabelText(/new stop-loss price/i);
    const submitButton = screen.getByText('Adjust Stop-Loss');

    fireEvent.change(stopLossInput, { target: { value: '147' } });
    
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockTradeApi.adjustStopLoss).toHaveBeenCalledWith('trade-1', 147);
      expect(mockOnSuccess).toHaveBeenCalledWith(updatedTrade);
    });
  });

  it('should disable submit button for invalid input', async () => {
    render(
      <AdjustStopModal
        trade={mockLongTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    const stopLossInput = screen.getByLabelText(/new stop-loss price/i);
    const submitButton = screen.getByText('Adjust Stop-Loss');

    // Test with invalid (lower) stop-loss
    fireEvent.change(stopLossInput, { target: { value: '143' } });
    
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('should disable submit button when no change', () => {
    render(
      <AdjustStopModal
        trade={mockLongTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    const submitButton = screen.getByText('Adjust Stop-Loss');
    
    // Should be disabled when stop-loss hasn't changed from current
    expect(submitButton).toBeDisabled();
  });

  it('should handle API errors', async () => {
    const errorMessage = 'Adjustment failed';
    mockTradeApi.adjustStopLoss.mockRejectedValue(new Error(errorMessage));

    render(
      <AdjustStopModal
        trade={mockLongTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    const stopLossInput = screen.getByLabelText(/new stop-loss price/i);
    const submitButton = screen.getByText('Adjust Stop-Loss');

    fireEvent.change(stopLossInput, { target: { value: '147' } });
    
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should close modal when cancel clicked', () => {
    render(
      <AdjustStopModal
        trade={mockLongTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close modal when X button clicked', () => {
    render(
      <AdjustStopModal
        trade={mockLongTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should reset form when modal closes', async () => {
    const { rerender } = render(
      <AdjustStopModal
        trade={mockLongTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
      { wrapper: createWrapper() }
    );

    const stopLossInput = screen.getByLabelText(/new stop-loss price/i);
    
    // Change input
    fireEvent.change(stopLossInput, { target: { value: '147' } });
    expect(stopLossInput).toHaveValue(147);

    // Close modal
    rerender(
      <AdjustStopModal
        trade={mockLongTrade}
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Reopen modal
    rerender(
      <AdjustStopModal
        trade={mockLongTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Input should be reset to original value
    const resetInput = screen.getByLabelText(/new stop-loss price/i);
    expect(resetInput).toHaveValue(145);
  });
});