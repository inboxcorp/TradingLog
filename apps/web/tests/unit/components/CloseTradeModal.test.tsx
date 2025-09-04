import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CloseTradeModal } from '../../../src/components/CloseTradeModal';
import { Trade } from '@trading-log/shared';
import * as tradeApi from '../../../src/lib/api';

// Mock the API
vi.mock('../../../src/lib/api', () => ({
  tradeApi: {
    closeTrade: vi.fn(),
  },
}));

const mockTrade: Trade = {
  id: 'test-trade-1',
  userId: 'test-user',
  symbol: 'AAPL',
  direction: 'LONG',
  entryPrice: 150.00,
  positionSize: 100,
  stopLoss: 145.00,
  exitPrice: null,
  status: 'ACTIVE',
  entryDate: new Date('2024-01-01T10:00:00Z'),
  exitDate: null,
  realizedPnL: null,
  riskAmount: 500,
  notes: 'Test trade',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('CloseTradeModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    renderWithQueryClient(
      <CloseTradeModal
        trade={mockTrade}
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText('Close Trade')).not.toBeInTheDocument();
  });

  it('should render modal when isOpen is true', () => {
    renderWithQueryClient(
      <CloseTradeModal
        trade={mockTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Close Trade')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('LONG')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should display trade information correctly', () => {
    renderWithQueryClient(
      <CloseTradeModal
        trade={mockTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Check trade summary section
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('LONG')).toBeInTheDocument();
    expect(screen.getByText('$150.00')).toBeInTheDocument(); // Entry Price
    expect(screen.getByText('$145.00')).toBeInTheDocument(); // Stop Loss
    expect(screen.getByText('$500.00')).toBeInTheDocument(); // Risk Amount
    expect(screen.getByText('100')).toBeInTheDocument(); // Position Size
  });

  it('should show P/L preview when exit price is entered', async () => {
    renderWithQueryClient(
      <CloseTradeModal
        trade={mockTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const exitPriceInput = screen.getByLabelText(/exit price/i);
    fireEvent.change(exitPriceInput, { target: { value: '160' } });

    await waitFor(() => {
      expect(screen.getByText('P/L Preview')).toBeInTheDocument();
      expect(screen.getByText('+$1,000.00')).toBeInTheDocument(); // (160-150) * 100 = 1000
    });
  });

  it('should show negative P/L for losses', async () => {
    renderWithQueryClient(
      <CloseTradeModal
        trade={mockTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const exitPriceInput = screen.getByLabelText(/exit price/i);
    fireEvent.change(exitPriceInput, { target: { value: '140' } });

    await waitFor(() => {
      expect(screen.getByText('-$1,000.00')).toBeInTheDocument(); // (140-150) * 100 = -1000
    });
  });

  it('should show zero P/L for break-even trades', async () => {
    renderWithQueryClient(
      <CloseTradeModal
        trade={mockTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const exitPriceInput = screen.getByLabelText(/exit price/i);
    fireEvent.change(exitPriceInput, { target: { value: '150' } });

    await waitFor(() => {
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });
  });

  it('should handle SHORT trade P/L calculation correctly', async () => {
    const shortTrade: Trade = {
      ...mockTrade,
      direction: 'SHORT',
      entryPrice: 100,
    };

    renderWithQueryClient(
      <CloseTradeModal
        trade={shortTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const exitPriceInput = screen.getByLabelText(/exit price/i);
    fireEvent.change(exitPriceInput, { target: { value: '90' } });

    await waitFor(() => {
      expect(screen.getByText('+$1,000.00')).toBeInTheDocument(); // (100-90) * 100 = 1000
    });
  });

  it('should show confirmation dialog when Review Close is clicked', async () => {
    renderWithQueryClient(
      <CloseTradeModal
        trade={mockTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const exitPriceInput = screen.getByLabelText(/exit price/i);
    fireEvent.change(exitPriceInput, { target: { value: '160' } });

    const reviewButton = screen.getByText('Review Close');
    fireEvent.click(reviewButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Trade Close')).toBeInTheDocument();
      expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();
      expect(screen.getByText('Close Trade')).toBeInTheDocument(); // The final close button
    });
  });

  it('should allow going back from confirmation to edit', async () => {
    renderWithQueryClient(
      <CloseTradeModal
        trade={mockTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Enter exit price and proceed to confirmation
    const exitPriceInput = screen.getByLabelText(/exit price/i);
    fireEvent.change(exitPriceInput, { target: { value: '160' } });
    fireEvent.click(screen.getByText('Review Close'));

    await waitFor(() => {
      expect(screen.getByText('Confirm Trade Close')).toBeInTheDocument();
    });

    // Click back to edit
    const backButton = screen.getByText('Back to Edit');
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByText('Close Trade')).toBeInTheDocument();
      expect(screen.queryByText('Confirm Trade Close')).not.toBeInTheDocument();
    });
  });

  it('should call closeTrade API when confirmed', async () => {
    const mockCloseTrade = vi.mocked(tradeApi.tradeApi.closeTrade);
    const closedTrade: Trade = {
      ...mockTrade,
      status: 'CLOSED',
      exitPrice: 160,
      realizedPnL: 1000,
      exitDate: new Date(),
    };
    mockCloseTrade.mockResolvedValue(closedTrade);

    renderWithQueryClient(
      <CloseTradeModal
        trade={mockTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Enter exit price and proceed to confirmation
    const exitPriceInput = screen.getByLabelText(/exit price/i);
    fireEvent.change(exitPriceInput, { target: { value: '160' } });
    fireEvent.click(screen.getByText('Review Close'));

    await waitFor(() => {
      expect(screen.getByText('Confirm Trade Close')).toBeInTheDocument();
    });

    // Confirm the close
    const closeButton = screen.getByText('Close Trade');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(mockCloseTrade).toHaveBeenCalledWith('test-trade-1', 160);
      expect(mockOnSuccess).toHaveBeenCalledWith(closedTrade);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should handle API errors gracefully', async () => {
    const mockCloseTrade = vi.mocked(tradeApi.tradeApi.closeTrade);
    mockCloseTrade.mockRejectedValue(new Error('Failed to close trade'));

    renderWithQueryClient(
      <CloseTradeModal
        trade={mockTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Enter exit price and proceed to confirmation
    const exitPriceInput = screen.getByLabelText(/exit price/i);
    fireEvent.change(exitPriceInput, { target: { value: '160' } });
    fireEvent.click(screen.getByText('Review Close'));

    await waitFor(() => {
      expect(screen.getByText('Confirm Trade Close')).toBeInTheDocument();
    });

    // Try to close the trade
    const closeButton = screen.getByText('Close Trade');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.getByText('Error Closing Trade')).toBeInTheDocument();
      expect(screen.getByText('Failed to close trade')).toBeInTheDocument();
    });

    // Should not call onSuccess or onClose on error
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should validate exit price input', async () => {
    renderWithQueryClient(
      <CloseTradeModal
        trade={mockTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const reviewButton = screen.getByText('Review Close');
    
    // Initially disabled without valid exit price
    expect(reviewButton).toBeDisabled();

    // Enter invalid exit price
    const exitPriceInput = screen.getByLabelText(/exit price/i);
    fireEvent.change(exitPriceInput, { target: { value: '0' } });

    // Button should still be disabled
    await waitFor(() => {
      expect(reviewButton).toBeDisabled();
    });

    // Enter valid exit price
    fireEvent.change(exitPriceInput, { target: { value: '160' } });

    // Button should now be enabled
    await waitFor(() => {
      expect(reviewButton).not.toBeDisabled();
    });
  });

  it('should close modal when close button is clicked', () => {
    renderWithQueryClient(
      <CloseTradeModal
        trade={mockTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close modal when cancel button is clicked', () => {
    renderWithQueryClient(
      <CloseTradeModal
        trade={mockTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle decimal precision correctly', async () => {
    const precisionTrade: Trade = {
      ...mockTrade,
      entryPrice: 100.123,
      positionSize: 333,
    };

    renderWithQueryClient(
      <CloseTradeModal
        trade={precisionTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const exitPriceInput = screen.getByLabelText(/exit price/i);
    fireEvent.change(exitPriceInput, { target: { value: '101.456' } });

    await waitFor(() => {
      // (101.456 - 100.123) * 333 = 1.333 * 333 = 443.889
      expect(screen.getByText('+$443.89')).toBeInTheDocument();
    });
  });

  it('should show loading state during API call', async () => {
    const mockCloseTrade = vi.mocked(tradeApi.tradeApi.closeTrade);
    mockCloseTrade.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({...mockTrade, status: 'CLOSED'}), 1000)
    ));

    renderWithQueryClient(
      <CloseTradeModal
        trade={mockTrade}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Enter exit price and proceed to confirmation
    const exitPriceInput = screen.getByLabelText(/exit price/i);
    fireEvent.change(exitPriceInput, { target: { value: '160' } });
    fireEvent.click(screen.getByText('Review Close'));

    await waitFor(() => {
      expect(screen.getByText('Confirm Trade Close')).toBeInTheDocument();
    });

    // Start the close operation
    const closeButton = screen.getByText('Close Trade');
    fireEvent.click(closeButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Closing...')).toBeInTheDocument();
    });
  });
});