import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EquityDisplay from '../../../src/components/EquityDisplay';

// Mock the shared package
vi.mock('@trading-log/shared', () => ({
  formatCurrency: (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
}));

describe('EquityDisplay', () => {
  const renderEquityDisplay = (props = {}) => {
    const defaultProps = {
      equity: 10000,
      loading: false,
    };
    return render(<EquityDisplay {...defaultProps} {...props} />);
  };

  describe('Rendering', () => {
    it('should render equity amount correctly', () => {
      renderEquityDisplay({ equity: 25000 });
      
      expect(screen.getByText('Current Total Equity')).toBeInTheDocument();
      expect(screen.getByText('$25,000.00')).toBeInTheDocument();
    });

    it('should render zero equity', () => {
      renderEquityDisplay({ equity: 0 });
      
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    it('should render decimal amounts correctly', () => {
      renderEquityDisplay({ equity: 10000.55 });
      
      expect(screen.getByText('$10,000.55')).toBeInTheDocument();
    });

    it('should render large amounts correctly', () => {
      renderEquityDisplay({ equity: 1234567.89 });
      
      expect(screen.getByText('$1,234,567.89')).toBeInTheDocument();
    });

    it('should render very small amounts correctly', () => {
      renderEquityDisplay({ equity: 0.01 });
      
      expect(screen.getByText('$0.01')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading is true', () => {
      renderEquityDisplay({ loading: true });
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });

    it('should not show equity amount when loading', () => {
      renderEquityDisplay({ equity: 10000, loading: true });
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('$10,000.00')).not.toBeInTheDocument();
    });

    it('should show loading spinner element', () => {
      renderEquityDisplay({ loading: true });
      
      const loadingSpinner = document.querySelector('.loading-spinner');
      expect(loadingSpinner).toBeInTheDocument();
    });
  });

  describe('Last Updated Display', () => {
    it('should show last updated date when provided', () => {
      const lastUpdated = new Date('2025-08-17T10:30:00Z');
      renderEquityDisplay({ 
        equity: 10000, 
        lastUpdated 
      });
      
      expect(screen.getByText(/last updated:/i)).toBeInTheDocument();
      // The exact format depends on locale, but it should contain the date info
      expect(screen.getByText(/2025/)).toBeInTheDocument();
    });

    it('should not show last updated when not provided', () => {
      renderEquityDisplay({ equity: 10000 });
      
      expect(screen.queryByText(/last updated:/i)).not.toBeInTheDocument();
    });

    it('should not show last updated when loading', () => {
      const lastUpdated = new Date('2025-08-17T10:30:00Z');
      renderEquityDisplay({ 
        equity: 10000, 
        lastUpdated,
        loading: true 
      });
      
      expect(screen.queryByText(/last updated:/i)).not.toBeInTheDocument();
    });

    it('should format date correctly', () => {
      const lastUpdated = new Date('2025-08-17T14:30:00Z');
      renderEquityDisplay({ 
        equity: 10000, 
        lastUpdated 
      });
      
      // Check that toLocaleString is being called (basic check)
      const lastUpdatedText = screen.getByText(/last updated:/i);
      expect(lastUpdatedText).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should have proper CSS classes', () => {
      const { container } = renderEquityDisplay();
      
      expect(container.querySelector('.equity-display')).toBeInTheDocument();
      expect(container.querySelector('.equity-card')).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      renderEquityDisplay();
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Current Total Equity');
    });

    it('should show amount in proper container', () => {
      const { container } = renderEquityDisplay({ equity: 15000 });
      
      const amountContainer = container.querySelector('.equity-value');
      expect(amountContainer).toBeInTheDocument();
      
      const amountSpan = container.querySelector('.amount');
      expect(amountSpan).toHaveTextContent('$15,000.00');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderEquityDisplay();
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
    });

    it('should have meaningful text content', () => {
      renderEquityDisplay({ equity: 5000 });
      
      // Should be readable by screen readers
      expect(screen.getByText('Current Total Equity')).toBeInTheDocument();
      expect(screen.getByText('$5,000.00')).toBeInTheDocument();
    });

    it('should provide loading state for screen readers', () => {
      renderEquityDisplay({ loading: true });
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative numbers (if somehow passed)', () => {
      renderEquityDisplay({ equity: -1000 });
      
      // formatCurrency should handle negative numbers
      expect(screen.getByText(/-/)).toBeInTheDocument();
    });

    it('should handle very large numbers', () => {
      renderEquityDisplay({ equity: 999999999 });
      
      expect(screen.getByText(/999,999,999/)).toBeInTheDocument();
    });

    it('should handle fractional cents correctly', () => {
      renderEquityDisplay({ equity: 100.999 });
      
      // Should be rounded to 2 decimal places
      expect(screen.getByText('$101.00')).toBeInTheDocument();
    });
  });
});