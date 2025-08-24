import { test, expect } from '@playwright/test';

test.describe('Trade Logging Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for consistent testing
    await page.route('**/api/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'test-user',
            email: 'test@example.com',
            totalEquity: 100000,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        }),
      });
    });

    await page.route('**/api/trades', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [],
          }),
        });
      } else if (route.request().method() === 'POST') {
        const requestBody = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'new-trade-id',
              userId: 'test-user',
              symbol: requestBody.symbol,
              direction: requestBody.direction,
              entryPrice: requestBody.entryPrice,
              positionSize: requestBody.positionSize,
              stopLoss: requestBody.stopLoss,
              exitPrice: null,
              status: 'ACTIVE',
              entryDate: new Date().toISOString(),
              exitDate: null,
              realizedPnL: null,
              riskAmount: Math.abs(requestBody.entryPrice - requestBody.stopLoss) * requestBody.positionSize,
              notes: requestBody.notes || null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      }
    });

    // Navigate to the trading page
    await page.goto('/');
    
    // Wait for the page to load and show equity display
    await expect(page.locator('text=Trading Dashboard')).toBeVisible();
  });

  test('should allow user to create a new trade through complete workflow', async ({ page }) => {
    // Verify initial state shows no trades
    await expect(page.locator('text=No trades found')).toBeVisible();
    await expect(page.locator('text=Start by creating your first trade')).toBeVisible();

    // Click "New Trade" button in quick actions
    await page.click('button:has-text("New Trade")');

    // Verify trade form modal opens
    await expect(page.locator('text=New Trade')).toBeVisible();
    await expect(page.locator('input[placeholder="AAPL"]')).toBeVisible();

    // Fill out the trade form
    await page.fill('input[placeholder="AAPL"]', 'AAPL');
    await page.selectOption('select', 'LONG');
    await page.fill('input[placeholder="150.00"]', '150.00');
    await page.fill('input[placeholder="100"]', '100');
    await page.fill('input[placeholder="145.00"]', '145.00');
    await page.fill('textarea[placeholder*="Trade rationale"]', 'Test trade for E2E workflow');

    // Verify risk calculation appears
    await expect(page.locator('text=Trade Risk:')).toBeVisible();
    await expect(page.locator('text=$500.00')).toBeVisible(); // (150-145)*100 = 500

    // Verify risk percentage is shown
    await expect(page.locator('text=0.50%')).toBeVisible(); // 500/100000 = 0.5%

    // Submit the trade
    await page.click('button:has-text("Create Trade")');

    // Verify form closes and trade appears in the list
    await expect(page.locator('text=New Trade')).not.toBeVisible();
    
    // Wait for the trade list to update
    await expect(page.locator('text=1 trade found')).toBeVisible();
    await expect(page.locator('text=AAPL')).toBeVisible();
    await expect(page.locator('text=long')).toBeVisible();
    await expect(page.locator('text=active')).toBeVisible();
  });

  test('should show risk warning and disable submit for high-risk trades', async ({ page }) => {
    // Click "New Trade" button
    await page.click('button:has-text("New Trade")');

    // Fill out a high-risk trade (exceeding 2% limit)
    await page.fill('input[placeholder="AAPL"]', 'TSLA');
    await page.selectOption('select', 'LONG');
    await page.fill('input[placeholder="150.00"]', '100.00');
    await page.fill('input[placeholder="100"]', '300'); // Risk = (100-90)*300 = 3000 > 2000 (2% of 100k)
    await page.fill('input[placeholder="145.00"]', '90.00');

    // Verify risk warning appears
    await expect(page.locator('text=⚠️')).toBeVisible();
    await expect(page.locator('text=exceeds 2% limit')).toBeVisible();

    // Verify submit button is disabled
    const submitButton = page.locator('button:has-text("Create Trade")');
    await expect(submitButton).toBeDisabled();

    // Reduce position size to make it valid
    await page.fill('input[placeholder="100"]', '150'); // Risk = (100-90)*150 = 1500 < 2000

    // Verify warning disappears and button is enabled
    await expect(page.locator('text=⚠️')).not.toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test('should allow filtering of trades by status', async ({ page }) => {
    // Mock API to return mixed trades
    await page.route('**/api/trades*', async route => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get('status');
      
      const allTrades = [
        {
          id: 'trade-1',
          userId: 'test-user',
          symbol: 'AAPL',
          direction: 'LONG',
          entryPrice: 150,
          positionSize: 100,
          stopLoss: 145,
          exitPrice: null,
          status: 'ACTIVE',
          entryDate: '2024-01-15T00:00:00Z',
          exitDate: null,
          realizedPnL: null,
          riskAmount: 500,
          notes: 'Active trade',
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
        },
        {
          id: 'trade-2',
          userId: 'test-user',
          symbol: 'TSLA',
          direction: 'SHORT',
          entryPrice: 200,
          positionSize: 50,
          stopLoss: 210,
          exitPrice: 190,
          status: 'CLOSED',
          entryDate: '2024-01-10T00:00:00Z',
          exitDate: '2024-01-12T00:00:00Z',
          realizedPnL: 500,
          riskAmount: 500,
          notes: 'Closed trade',
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-12T00:00:00Z',
        },
      ];

      let filteredTrades;
      if (status === 'ACTIVE') {
        filteredTrades = allTrades.filter(t => t.status === 'ACTIVE');
      } else if (status === 'CLOSED') {
        filteredTrades = allTrades.filter(t => t.status === 'CLOSED');
      } else {
        filteredTrades = allTrades;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: filteredTrades,
        }),
      });
    });

    // Reload page to get new data
    await page.reload();
    await expect(page.locator('text=Trading Dashboard')).toBeVisible();

    // Verify all trades are shown initially
    await expect(page.locator('text=2 trades found')).toBeVisible();
    await expect(page.locator('text=AAPL')).toBeVisible();
    await expect(page.locator('text=TSLA')).toBeVisible();

    // Filter to show only active trades
    await page.selectOption('select#status-filter', 'ACTIVE');
    await expect(page.locator('text=1 trade found')).toBeVisible();
    await expect(page.locator('text=AAPL')).toBeVisible();
    await expect(page.locator('text=TSLA')).not.toBeVisible();

    // Filter to show only closed trades
    await page.selectOption('select#status-filter', 'CLOSED');
    await expect(page.locator('text=1 trade found')).toBeVisible();
    await expect(page.locator('text=TSLA')).toBeVisible();
    await expect(page.locator('text=AAPL')).not.toBeVisible();

    // Return to all trades
    await page.selectOption('select#status-filter', 'ALL');
    await expect(page.locator('text=2 trades found')).toBeVisible();
    await expect(page.locator('text=AAPL')).toBeVisible();
    await expect(page.locator('text=TSLA')).toBeVisible();
  });

  test('should validate form inputs and show appropriate error messages', async ({ page }) => {
    // Click "New Trade" button
    await page.click('button:has-text("New Trade")');

    // Try to submit empty form
    await page.click('button:has-text("Create Trade")');

    // Verify validation errors appear
    await expect(page.locator('text=Required')).toBeVisible();

    // Fill invalid data
    await page.fill('input[placeholder="AAPL"]', ''); // Empty symbol
    await page.fill('input[placeholder="150.00"]', '-100'); // Negative price
    await page.fill('input[placeholder="100"]', '0'); // Zero size

    // Attempt submit again
    await page.click('button:has-text("Create Trade")');

    // Should still show validation errors
    await expect(page.locator('text=Required')).toBeVisible();
  });

  test('should close form when cancel button is clicked', async ({ page }) => {
    // Open form
    await page.click('button:has-text("New Trade")');
    await expect(page.locator('text=New Trade')).toBeVisible();

    // Click cancel
    await page.click('button:has-text("Cancel")');

    // Verify form closes
    await expect(page.locator('text=New Trade')).not.toBeVisible();
  });

  test('should close form when X button is clicked', async ({ page }) => {
    // Open form
    await page.click('button:has-text("New Trade")');
    await expect(page.locator('text=New Trade')).toBeVisible();

    // Click X button
    await page.click('text=✕');

    // Verify form closes
    await expect(page.locator('text=New Trade')).not.toBeVisible();
  });

  test('should display trade information correctly in both desktop and mobile views', async ({ page }) => {
    // Mock API to return a trade
    await page.route('**/api/trades*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{
            id: 'trade-1',
            userId: 'test-user',
            symbol: 'AAPL',
            direction: 'LONG',
            entryPrice: 150.50,
            positionSize: 100,
            stopLoss: 145.25,
            exitPrice: null,
            status: 'ACTIVE',
            entryDate: '2024-01-15T00:00:00Z',
            exitDate: null,
            realizedPnL: null,
            riskAmount: 525, // (150.50 - 145.25) * 100
            notes: 'Sample trade with notes',
            createdAt: '2024-01-15T00:00:00Z',
            updatedAt: '2024-01-15T00:00:00Z',
          }],
        }),
      });
    });

    await page.reload();
    await expect(page.locator('text=Trading Dashboard')).toBeVisible();

    // Verify trade data is displayed correctly
    await expect(page.locator('text=AAPL')).toBeVisible();
    await expect(page.locator('text=long')).toBeVisible();
    await expect(page.locator('text=active')).toBeVisible();
    await expect(page.locator('text=$150.50')).toBeVisible();
    await expect(page.locator('text=$525.00')).toBeVisible();
    await expect(page.locator('text=Jan 15, 2024')).toBeVisible();

    // Test mobile view (simulate smaller screen)
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mobile-specific elements should be visible
    await expect(page.locator('text=Entry:')).toBeVisible();
    await expect(page.locator('text=Size:')).toBeVisible();
    await expect(page.locator('text=Risk:')).toBeVisible();
    await expect(page.locator('text=Sample trade with notes')).toBeVisible();
  });
});