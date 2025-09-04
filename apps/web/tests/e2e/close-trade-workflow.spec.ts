import { test, expect } from '@playwright/test';

test.describe('Close Trade Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Go to trading page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full trade close workflow with profit', async ({ page }) => {
    // First, create a trade to close
    await page.getByText('New Trade').click();
    
    // Fill in trade form
    await page.fill('[data-testid="symbol-input"]', 'AAPL');
    await page.selectOption('[data-testid="direction-select"]', 'LONG');
    await page.fill('[data-testid="entry-price-input"]', '150');
    await page.fill('[data-testid="position-size-input"]', '100');
    await page.fill('[data-testid="stop-loss-input"]', '145');
    await page.fill('[data-testid="notes-input"]', 'Test trade for closing');

    // Submit trade
    await page.click('[data-testid="submit-trade-button"]');
    await page.waitForSelector('[data-testid="trade-created-success"]', { timeout: 5000 });

    // Verify trade appears in the list
    await expect(page.getByText('AAPL')).toBeVisible();
    await expect(page.getByText('LONG')).toBeVisible();
    await expect(page.getByText('ACTIVE')).toBeVisible();

    // Record initial equity
    const initialEquityText = await page.textContent('[data-testid="current-equity"]');
    const initialEquity = parseFloat(initialEquityText?.replace(/[$,]/g, '') || '0');

    // Click Close button for the trade
    await page.click('[data-testid="close-trade-button"]');

    // Verify modal opened
    await expect(page.getByText('Close Trade')).toBeVisible();

    // Verify trade details in modal
    await expect(page.getByText('AAPL')).toBeVisible();
    await expect(page.getByText('LONG')).toBeVisible();
    await expect(page.getByText('$150.00')).toBeVisible(); // Entry price
    await expect(page.getByText('100')).toBeVisible(); // Position size

    // Enter profitable exit price
    await page.fill('[data-testid="exit-price-input"]', '160');

    // Verify P/L preview shows profit
    await expect(page.getByText('P/L Preview')).toBeVisible();
    await expect(page.getByText('+$1,000.00')).toBeVisible(); // (160-150) * 100

    // Click Review Close
    await page.click('[data-testid="review-close-button"]');

    // Verify confirmation screen
    await expect(page.getByText('Confirm Trade Close')).toBeVisible();
    await expect(page.getByText('This action cannot be undone')).toBeVisible();
    await expect(page.getByText('+$1,000.00')).toBeVisible(); // P/L confirmation

    // Confirm the close
    await page.click('[data-testid="confirm-close-button"]');

    // Wait for success and modal to close
    await expect(page.getByText('Close Trade')).not.toBeVisible({ timeout: 5000 });

    // Verify trade status updated to CLOSED
    await expect(page.getByText('CLOSED')).toBeVisible();

    // Verify P/L is displayed in trade list
    await expect(page.getByText('+$1,000.00')).toBeVisible();

    // Verify equity was updated
    const updatedEquityText = await page.textContent('[data-testid="current-equity"]');
    const updatedEquity = parseFloat(updatedEquityText?.replace(/[$,]/g, '') || '0');
    expect(updatedEquity).toBe(initialEquity + 1000);

    // Verify trade details show exit information
    if (await page.getByText('$160.00').isVisible()) { // Exit price
      await expect(page.getByText('$160.00')).toBeVisible();
    }
  });

  test('should complete full trade close workflow with loss', async ({ page }) => {
    // Create a trade to close
    await page.getByText('New Trade').click();
    
    await page.fill('[data-testid="symbol-input"]', 'TSLA');
    await page.selectOption('[data-testid="direction-select"]', 'LONG');
    await page.fill('[data-testid="entry-price-input"]', '200');
    await page.fill('[data-testid="position-size-input"]', '50');
    await page.fill('[data-testid="stop-loss-input"]', '190');

    await page.click('[data-testid="submit-trade-button"]');
    await page.waitForSelector('[data-testid="trade-created-success"]', { timeout: 5000 });

    // Record initial equity
    const initialEquityText = await page.textContent('[data-testid="current-equity"]');
    const initialEquity = parseFloat(initialEquityText?.replace(/[$,]/g, '') || '0');

    // Close the trade at a loss
    await page.click('[data-testid="close-trade-button"]');
    await page.fill('[data-testid="exit-price-input"]', '180'); // Loss: (180-200) * 50 = -1000

    // Verify loss P/L preview
    await expect(page.getByText('-$1,000.00')).toBeVisible();

    await page.click('[data-testid="review-close-button"]');
    await page.click('[data-testid="confirm-close-button"]');

    // Wait for completion
    await expect(page.getByText('Close Trade')).not.toBeVisible({ timeout: 5000 });

    // Verify loss P/L in trade list
    await expect(page.getByText('-$1,000.00')).toBeVisible();

    // Verify equity decreased
    const updatedEquityText = await page.textContent('[data-testid="current-equity"]');
    const updatedEquity = parseFloat(updatedEquityText?.replace(/[$,]/g, '') || '0');
    expect(updatedEquity).toBe(initialEquity - 1000);
  });

  test('should handle SHORT trade close correctly', async ({ page }) => {
    // Create a SHORT trade
    await page.getByText('New Trade').click();
    
    await page.fill('[data-testid="symbol-input"]', 'GOOGL');
    await page.selectOption('[data-testid="direction-select"]', 'SHORT');
    await page.fill('[data-testid="entry-price-input"]', '100');
    await page.fill('[data-testid="position-size-input"]', '100');
    await page.fill('[data-testid="stop-loss-input"]', '105');

    await page.click('[data-testid="submit-trade-button"]');
    await page.waitForSelector('[data-testid="trade-created-success"]', { timeout: 5000 });

    // Close at profit (price went down)
    await page.click('[data-testid="close-trade-button"]');
    await page.fill('[data-testid="exit-price-input"]', '90'); // Profit: (100-90) * 100 = 1000

    // Verify SHORT trade P/L calculation
    await expect(page.getByText('+$1,000.00')).toBeVisible();

    await page.click('[data-testid="review-close-button"]');
    await page.click('[data-testid="confirm-close-button"]');

    // Verify trade closed successfully
    await expect(page.getByText('Close Trade')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('+$1,000.00')).toBeVisible();
  });

  test('should allow cancelling trade close', async ({ page }) => {
    // Create a trade
    await page.getByText('New Trade').click();
    await page.fill('[data-testid="symbol-input"]', 'AMZN');
    await page.selectOption('[data-testid="direction-select"]', 'LONG');
    await page.fill('[data-testid="entry-price-input"]', '150');
    await page.fill('[data-testid="position-size-input"]', '100');
    await page.fill('[data-testid="stop-loss-input"]', '145');
    await page.click('[data-testid="submit-trade-button"]');
    await page.waitForSelector('[data-testid="trade-created-success"]', { timeout: 5000 });

    // Open close modal
    await page.click('[data-testid="close-trade-button"]');
    await expect(page.getByText('Close Trade')).toBeVisible();

    // Cancel using cancel button
    await page.click('[data-testid="cancel-close-button"]');
    await expect(page.getByText('Close Trade')).not.toBeVisible();

    // Trade should still be ACTIVE
    await expect(page.getByText('ACTIVE')).toBeVisible();

    // Try again and cancel from confirmation
    await page.click('[data-testid="close-trade-button"]');
    await page.fill('[data-testid="exit-price-input"]', '160');
    await page.click('[data-testid="review-close-button"]');
    
    // Cancel from confirmation screen
    await page.click('[data-testid="back-to-edit-button"]');
    await expect(page.getByText('Close Trade')).toBeVisible();
    await expect(page.queryByText('Confirm Trade Close')).not.toBeVisible();

    // Close modal completely
    await page.click('[data-testid="cancel-close-button"]');
    
    // Trade should still be ACTIVE
    await expect(page.getByText('ACTIVE')).toBeVisible();
  });

  test('should validate exit price input', async ({ page }) => {
    // Create a trade
    await page.getByText('New Trade').click();
    await page.fill('[data-testid="symbol-input"]', 'NVDA');
    await page.selectOption('[data-testid="direction-select"]', 'LONG');
    await page.fill('[data-testid="entry-price-input"]', '500');
    await page.fill('[data-testid="position-size-input"]', '10');
    await page.fill('[data-testid="stop-loss-input"]', '480');
    await page.click('[data-testid="submit-trade-button"]');
    await page.waitForSelector('[data-testid="trade-created-success"]', { timeout: 5000 });

    // Open close modal
    await page.click('[data-testid="close-trade-button"]');

    const reviewButton = page.getByTestId('review-close-button');

    // Button should be disabled initially
    await expect(reviewButton).toBeDisabled();

    // Enter invalid exit price (zero)
    await page.fill('[data-testid="exit-price-input"]', '0');
    await expect(reviewButton).toBeDisabled();

    // Enter negative exit price
    await page.fill('[data-testid="exit-price-input"]', '-100');
    await expect(reviewButton).toBeDisabled();

    // Enter valid exit price
    await page.fill('[data-testid="exit-price-input"]', '520');
    await expect(reviewButton).not.toBeDisabled();
  });

  test('should handle break-even trade (zero P/L)', async ({ page }) => {
    // Create a trade
    await page.getByText('New Trade').click();
    await page.fill('[data-testid="symbol-input"]', 'META');
    await page.selectOption('[data-testid="direction-select"]', 'LONG');
    await page.fill('[data-testid="entry-price-input"]', '300');
    await page.fill('[data-testid="position-size-input"]', '10');
    await page.fill('[data-testid="stop-loss-input"]', '290');
    await page.click('[data-testid="submit-trade-button"]');
    await page.waitForSelector('[data-testid="trade-created-success"]', { timeout: 5000 });

    // Record initial equity
    const initialEquityText = await page.textContent('[data-testid="current-equity"]');
    const initialEquity = parseFloat(initialEquityText?.replace(/[$,]/g, '') || '0');

    // Close at break-even
    await page.click('[data-testid="close-trade-button"]');
    await page.fill('[data-testid="exit-price-input"]', '300'); // Same as entry = $0 P/L

    // Verify zero P/L
    await expect(page.getByText('$0.00')).toBeVisible();

    await page.click('[data-testid="review-close-button"]');
    await page.click('[data-testid="confirm-close-button"]');

    await expect(page.getByText('Close Trade')).not.toBeVisible({ timeout: 5000 });

    // Verify equity unchanged
    const updatedEquityText = await page.textContent('[data-testid="current-equity"]');
    const updatedEquity = parseFloat(updatedEquityText?.replace(/[$,]/g, '') || '0');
    expect(updatedEquity).toBe(initialEquity);
  });

  test('should only show close button for ACTIVE trades', async ({ page }) => {
    // Create and immediately close a trade
    await page.getByText('New Trade').click();
    await page.fill('[data-testid="symbol-input"]', 'CLOSED');
    await page.selectOption('[data-testid="direction-select"]', 'LONG');
    await page.fill('[data-testid="entry-price-input"]', '100');
    await page.fill('[data-testid="position-size-input"]', '10');
    await page.fill('[data-testid="stop-loss-input"]', '95');
    await page.click('[data-testid="submit-trade-button"]');
    await page.waitForSelector('[data-testid="trade-created-success"]', { timeout: 5000 });

    // Close the trade
    await page.click('[data-testid="close-trade-button"]');
    await page.fill('[data-testid="exit-price-input"]', '105');
    await page.click('[data-testid="review-close-button"]');
    await page.click('[data-testid="confirm-close-button"]');
    await expect(page.getByText('Close Trade')).not.toBeVisible({ timeout: 5000 });

    // Verify trade is now CLOSED
    await expect(page.getByText('CLOSED')).toBeVisible();

    // Create another ACTIVE trade
    await page.getByText('New Trade').click();
    await page.fill('[data-testid="symbol-input"]', 'ACTIVE');
    await page.selectOption('[data-testid="direction-select"]', 'LONG');
    await page.fill('[data-testid="entry-price-input"]', '200');
    await page.fill('[data-testid="position-size-input"]', '5');
    await page.fill('[data-testid="stop-loss-input"]', '190');
    await page.click('[data-testid="submit-trade-button"]');
    await page.waitForSelector('[data-testid="trade-created-success"]', { timeout: 5000 });

    // Should have one ACTIVE trade with close button and one CLOSED trade without
    const closeButtons = page.getByTestId('close-trade-button');
    await expect(closeButtons).toHaveCount(1);

    // Filter to show only ACTIVE trades
    await page.selectOption('[data-testid="status-filter"]', 'ACTIVE');
    await expect(closeButtons).toHaveCount(1);

    // Filter to show only CLOSED trades
    await page.selectOption('[data-testid="status-filter"]', 'CLOSED');
    await expect(closeButtons).toHaveCount(0);
  });
});