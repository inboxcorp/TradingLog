import { test, expect, Page } from '@playwright/test';

// Helper to set up test data
async function setupTestTrades(page: Page) {
  // Navigate to trading page and create test trades
  await page.goto('/trading');
  
  // Create a winning trade
  await page.click('[data-testid="add-trade-button"]');
  await page.fill('[data-testid="symbol-input"]', 'AAPL');
  await page.selectOption('[data-testid="direction-select"]', 'LONG');
  await page.fill('[data-testid="entry-price-input"]', '150');
  await page.fill('[data-testid="position-size-input"]', '10');
  await page.fill('[data-testid="stop-loss-input"]', '145');
  await page.click('[data-testid="create-trade-button"]');
  
  // Wait for trade to be created
  await expect(page.locator('[data-testid="trade-AAPL"]')).toBeVisible();
  
  // Close the trade as a winner
  await page.click('[data-testid="close-trade-AAPL"]');
  await page.fill('[data-testid="exit-price-input"]', '160');
  await page.click('[data-testid="confirm-close-trade"]');
  
  // Create a losing trade
  await page.click('[data-testid="add-trade-button"]');
  await page.fill('[data-testid="symbol-input"]', 'TSLA');
  await page.selectOption('[data-testid="direction-select"]', 'LONG');
  await page.fill('[data-testid="entry-price-input"]', '200');
  await page.fill('[data-testid="position-size-input"]', '5');
  await page.fill('[data-testid="stop-loss-input"]', '190');
  await page.click('[data-testid="create-trade-button"]');
  
  await expect(page.locator('[data-testid="trade-TSLA"]')).toBeVisible();
  
  // Close as a loser
  await page.click('[data-testid="close-trade-TSLA"]');
  await page.fill('[data-testid="exit-price-input"]', '185');
  await page.click('[data-testid="confirm-close-trade"]');
  
  // Create one more winning trade for better statistics
  await page.click('[data-testid="add-trade-button"]');
  await page.fill('[data-testid="symbol-input"]', 'MSFT');
  await page.selectOption('[data-testid="direction-select"]', 'LONG');
  await page.fill('[data-testid="entry-price-input"]', '300');
  await page.fill('[data-testid="position-size-input"]', '3');
  await page.fill('[data-testid="stop-loss-input"]', '290');
  await page.click('[data-testid="create-trade-button"]');
  
  await expect(page.locator('[data-testid="trade-MSFT"]')).toBeVisible();
  
  await page.click('[data-testid="close-trade-MSFT"]');
  await page.fill('[data-testid="exit-price-input"]', '315');
  await page.click('[data-testid="confirm-close-trade"]');
}

test.describe('Performance Statistics E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'test-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        user: { id: 'test-user', email: 'test@example.com' }
      }));
    });
  });

  test('displays comprehensive performance statistics on analytics page', async ({ page }) => {
    // Set up test trades first
    await setupTestTrades(page);
    
    // Navigate to analytics page
    await page.goto('/analytics');
    
    // Wait for statistics to load
    await expect(page.locator('[data-testid="performance-stats-widget"]')).toBeVisible();
    
    // Check that primary metrics are displayed
    await expect(page.locator('[data-testid="win-rate-metric"]')).toContainText('%');
    await expect(page.locator('[data-testid="total-pnl-metric"]')).toContainText('$');
    await expect(page.locator('[data-testid="profit-factor-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="expectancy-metric"]')).toContainText('$');
    
    // Verify specific calculated values
    // With our test trades: 2 wins, 1 loss = 66.7% win rate
    await expect(page.locator('[data-testid="win-rate-value"]')).toContainText('66.7%');
    
    // Check that trade count is correct
    await expect(page.locator('[data-testid="total-trades-count"]')).toContainText('3');
  });

  test('updates statistics in real-time when filters are applied', async ({ page }) => {
    await setupTestTrades(page);
    await page.goto('/analytics');
    
    // Wait for initial statistics
    await expect(page.locator('[data-testid="performance-stats-widget"]')).toBeVisible();
    
    // Note initial win rate (should be ~66.7% with 2 wins, 1 loss)
    const initialWinRate = await page.locator('[data-testid="win-rate-value"]').textContent();
    
    // Apply filter to show only AAPL trades (should be 100% win rate)
    await page.click('[data-testid="filter-panel-toggle"]');
    await page.fill('[data-testid="symbol-filter-input"]', 'AAPL');
    await page.press('[data-testid="symbol-filter-input"]', 'Enter');
    
    // Wait for statistics to update
    await page.waitForTimeout(500); // Allow for debounced update
    
    // Win rate should now be 100% (1 win, 0 losses for AAPL)
    await expect(page.locator('[data-testid="win-rate-value"]')).toContainText('100.0%');
    
    // Trade count should be 1
    await expect(page.locator('[data-testid="total-trades-count"]')).toContainText('1');
    
    // Clear filter
    await page.click('[data-testid="clear-filters-button"]');
    
    // Statistics should return to original values
    await expect(page.locator('[data-testid="win-rate-value"]')).toContainText('66.7%');
    await expect(page.locator('[data-testid="total-trades-count"]')).toContainText('3');
  });

  test('expands and shows detailed statistics', async ({ page }) => {
    await setupTestTrades(page);
    await page.goto('/analytics');
    
    await expect(page.locator('[data-testid="performance-stats-widget"]')).toBeVisible();
    
    // Initially, detailed metrics should not be visible
    await expect(page.locator('[data-testid="average-profit-metric"]')).not.toBeVisible();
    
    // Click to expand detailed view
    await page.click('[data-testid="expand-details-button"]');
    
    // Detailed metrics should now be visible
    await expect(page.locator('[data-testid="average-profit-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="average-loss-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="max-consecutive-wins"]')).toBeVisible();
    await expect(page.locator('[data-testid="max-consecutive-losses"]')).toBeVisible();
    
    // Click to expand advanced metrics
    await page.click('[data-testid="show-advanced-button"]');
    
    // Advanced metrics should be visible
    await expect(page.locator('[data-testid="sharpe-ratio-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="max-drawdown-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="recovery-factor-metric"]')).toBeVisible();
  });

  test('shows statistical significance warning for small sample sizes', async ({ page }) => {
    // Create only 2 trades (below significance threshold)
    await page.goto('/trading');
    
    // Create one trade
    await page.click('[data-testid="add-trade-button"]');
    await page.fill('[data-testid="symbol-input"]', 'AAPL');
    await page.selectOption('[data-testid="direction-select"]', 'LONG');
    await page.fill('[data-testid="entry-price-input"]', '150');
    await page.fill('[data-testid="position-size-input"]', '10');
    await page.fill('[data-testid="stop-loss-input"]', '145');
    await page.click('[data-testid="create-trade-button"]');
    
    await page.click('[data-testid="close-trade-AAPL"]');
    await page.fill('[data-testid="exit-price-input"]', '160');
    await page.click('[data-testid="confirm-close-trade"]');
    
    // Navigate to analytics
    await page.goto('/analytics');
    
    // Should show statistical significance warning
    await expect(page.locator('[data-testid="significance-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="significance-warning"]')).toContainText('Limited Statistical Significance');
    await expect(page.locator('[data-testid="significance-recommendation"]')).toContainText('more trades');
  });

  test('handles loading states correctly', async ({ page }) => {
    await setupTestTrades(page);
    
    // Navigate to analytics page
    await page.goto('/analytics');
    
    // Initially should show loading state
    await expect(page.locator('[data-testid="statistics-loading"]')).toBeVisible();
    
    // Then should show actual statistics
    await expect(page.locator('[data-testid="performance-stats-widget"]')).toBeVisible();
    await expect(page.locator('[data-testid="statistics-loading"]')).not.toBeVisible();
  });

  test('exports statistics data correctly', async ({ page }) => {
    await setupTestTrades(page);
    await page.goto('/analytics');
    
    await expect(page.locator('[data-testid="performance-stats-widget"]')).toBeVisible();
    
    // Set up download handling
    const downloadPromise = page.waitForEvent('download');
    
    // Click export JSON button
    await page.click('[data-testid="export-json-button"]');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('trade-analytics');
    expect(download.suggestedFilename()).toContain('.json');
    
    // Set up CSV download
    const csvDownloadPromise = page.waitForEvent('download');
    
    // Click export CSV button
    await page.click('[data-testid="export-csv-button"]');
    
    const csvDownload = await csvDownloadPromise;
    expect(csvDownload.suggestedFilename()).toContain('trade-analytics');
    expect(csvDownload.suggestedFilename()).toContain('.csv');
  });

  test('refreshes statistics data when refresh button is clicked', async ({ page }) => {
    await setupTestTrades(page);
    await page.goto('/analytics');
    
    await expect(page.locator('[data-testid="performance-stats-widget"]')).toBeVisible();
    
    // Note current statistics
    const originalWinRate = await page.locator('[data-testid="win-rate-value"]').textContent();
    
    // Click refresh button
    await page.click('[data-testid="refresh-button"]');
    
    // Should show loading state briefly
    await expect(page.locator('[data-testid="refresh-button"]')).toContainText('Loading...');
    
    // Then should show updated statistics (in this case, same values)
    await expect(page.locator('[data-testid="refresh-button"]')).toContainText('Refresh');
    await expect(page.locator('[data-testid="win-rate-value"]')).toContainText(originalWinRate || '');
  });

  test('displays benchmark levels and color coding correctly', async ({ page }) => {
    await setupTestTrades(page);
    await page.goto('/analytics');
    
    await expect(page.locator('[data-testid="performance-stats-widget"]')).toBeVisible();
    
    // Check that benchmark indicators are present
    await expect(page.locator('[data-testid="win-rate-benchmark"]')).toBeVisible();
    await expect(page.locator('[data-testid="profit-factor-benchmark"]')).toBeVisible();
    
    // Check for appropriate color coding (this would depend on the actual values)
    const winRateCard = page.locator('[data-testid="win-rate-card"]');
    const cardClasses = await winRateCard.getAttribute('class');
    expect(cardClasses).toBeTruthy();
  });

  test('handles error states gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/analytics**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Internal server error' })
      });
    });
    
    await page.goto('/analytics');
    
    // Should show error message
    await expect(page.locator('[data-testid="analytics-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="analytics-error"]')).toContainText('Failed to load analytics');
  });

  test('maintains performance with large datasets', async ({ page }) => {
    // This test would need to create many trades or mock a large dataset
    // For now, we'll test that the page loads and functions with the existing data
    
    await setupTestTrades(page);
    await page.goto('/analytics');
    
    // Measure load time
    const startTime = Date.now();
    await expect(page.locator('[data-testid="performance-stats-widget"]')).toBeVisible();
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time (adjust based on requirements)
    expect(loadTime).toBeLessThan(3000); // 3 seconds
    
    // Statistics should be responsive to interactions
    const filterStartTime = Date.now();
    await page.click('[data-testid="filter-panel-toggle"]');
    await page.fill('[data-testid="symbol-filter-input"]', 'AAPL');
    await page.press('[data-testid="symbol-filter-input"]', 'Enter');
    
    // Wait for update and measure response time
    await expect(page.locator('[data-testid="win-rate-value"]')).toContainText('100.0%');
    const filterTime = Date.now() - filterStartTime;
    
    expect(filterTime).toBeLessThan(1000); // 1 second for filter response
  });

  test('works correctly on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await setupTestTrades(page);
    await page.goto('/analytics');
    
    await expect(page.locator('[data-testid="performance-stats-widget"]')).toBeVisible();
    
    // Statistics cards should be stacked on mobile
    const statsGrid = page.locator('[data-testid="primary-stats-grid"]');
    await expect(statsGrid).toBeVisible();
    
    // Filter panel should be collapsible on mobile
    const filterPanel = page.locator('[data-testid="filter-panel"]');
    if (await filterPanel.isVisible()) {
      // Should be able to collapse it
      await page.click('[data-testid="filter-panel-toggle"]');
      await expect(filterPanel).not.toBeVisible();
    }
  });
});