import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EquityForm from '../../../src/components/EquityForm';

// Mock the shared package
vi.mock('@trading-log/shared', () => ({
  formatCurrency: (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  validateEquityValue: (value: number) => value >= 0 && value <= 1000000000 && Number.isFinite(value),
}));

describe('EquityForm', () => {
  const mockOnSubmit = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  const renderEquityForm = (props = {}) => {
    const defaultProps = {
      onSubmit: mockOnSubmit,
      loading: false,
      initialEquity: 0,
    };
    return render(<EquityForm {...defaultProps} {...props} />);
  };

  describe('Rendering', () => {
    it('should render with default values', () => {
      renderEquityForm();
      
      expect(screen.getByLabelText(/total equity/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your total equity/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update equity/i })).toBeInTheDocument();
    });

    it('should render with initial equity value', () => {
      renderEquityForm({ initialEquity: 10000 });
      
      const input = screen.getByLabelText(/total equity/i) as HTMLInputElement;
      expect(input.value).toBe('10000');
    });

    it('should show currency symbol', () => {
      renderEquityForm();
      
      expect(screen.getByText('$')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      renderEquityForm({ loading: true });
      
      expect(screen.getByRole('button', { name: /updating.../i })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty input', async () => {
      renderEquityForm();
      
      const submitButton = screen.getByRole('button', { name: /update equity/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Equity is required/)).toBeInTheDocument();
      });
    });

    it('should show error for non-numeric input', async () => {
      renderEquityForm();
      
      const input = screen.getByLabelText(/total equity/i);
      await user.type(input, 'abc');
      
      const submitButton = screen.getByRole('button', { name: /update equity/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/must be a valid number/i)).toBeInTheDocument();
      });
    });

    it('should show error for negative values', async () => {
      renderEquityForm();
      
      const input = screen.getByLabelText(/total equity/i);
      await user.type(input, '-100');
      
      const submitButton = screen.getByRole('button', { name: /update equity/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/equity must be positive/i)).toBeInTheDocument();
      });
    });

    it('should accept valid positive numbers', async () => {
      renderEquityForm();
      
      const input = screen.getByLabelText(/total equity/i);
      await user.type(input, '10000');
      
      const submitButton = screen.getByRole('button', { name: /update equity/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(10000);
      });
    });

    it('should accept decimal values', async () => {
      renderEquityForm();
      
      const input = screen.getByLabelText(/total equity/i);
      await user.type(input, '10000.55');
      
      const submitButton = screen.getByRole('button', { name: /update equity/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(10000.55);
      });
    });

    it('should accept zero value', async () => {
      renderEquityForm();
      
      const input = screen.getByLabelText(/total equity/i);
      await user.type(input, '0');
      
      const submitButton = screen.getByRole('button', { name: /update equity/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(0);
      });
    });
  });

  describe('Preview Display', () => {
    it('should show preview for valid positive numbers', async () => {
      renderEquityForm();
      
      const input = screen.getByLabelText(/total equity/i);
      await user.type(input, '5000');

      await waitFor(() => {
        expect(screen.getByText(/preview:/i)).toBeInTheDocument();
        expect(screen.getByText(/\$5,000\.00/)).toBeInTheDocument();
      });
    });

    it('should not show preview for zero or invalid values', async () => {
      renderEquityForm();
      
      const input = screen.getByLabelText(/total equity/i);
      await user.type(input, '0');

      // Preview should not appear for zero
      expect(screen.queryByText(/preview:/i)).not.toBeInTheDocument();
    });

    it('should update preview in real-time', async () => {
      renderEquityForm();
      
      const input = screen.getByLabelText(/total equity/i);
      await user.type(input, '1000');

      await waitFor(() => {
        expect(screen.getByText(/\$1,000\.00/)).toBeInTheDocument();
      });

      await user.clear(input);
      await user.type(input, '2000');

      await waitFor(() => {
        expect(screen.getByText(/\$2,000\.00/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with correct value', async () => {
      renderEquityForm();
      
      const input = screen.getByLabelText(/total equity/i);
      await user.type(input, '15000');
      
      const submitButton = screen.getByRole('button', { name: /update equity/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(15000);
      });
    });

    it('should disable form during submission', async () => {
      // Mock a slow onSubmit
      mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderEquityForm();
      
      const input = screen.getByLabelText(/total equity/i);
      await user.type(input, '10000');
      
      const submitButton = screen.getByRole('button', { name: /update equity/i });
      await user.click(submitButton);

      // Button should be disabled during submission
      expect(submitButton).toBeDisabled();
      expect(input).toBeDisabled();
    });

    it('should handle submission errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockOnSubmit.mockRejectedValue(new Error('Network error'));
      
      renderEquityForm();
      
      const input = screen.getByLabelText(/total equity/i);
      await user.type(input, '10000');
      
      const submitButton = screen.getByRole('button', { name: /update equity/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to update equity:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      renderEquityForm();
      
      const input = screen.getByLabelText(/total equity/i);
      expect(input).toHaveAttribute('id', 'totalEquity');
    });

    it('should show error messages with proper ARIA attributes', async () => {
      renderEquityForm();
      
      const submitButton = screen.getByRole('button', { name: /update equity/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/Equity is required/);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should disable inputs when loading prop is true', () => {
      renderEquityForm({ loading: true });
      
      const input = screen.getByLabelText(/total equity/i);
      const button = screen.getByRole('button');
      
      expect(input).toBeDisabled();
      expect(button).toBeDisabled();
    });
  });
});