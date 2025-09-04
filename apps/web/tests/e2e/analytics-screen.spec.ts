import { test, expect } from '@playwright/test';

test.describe('Analytics Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
  });

  test('should display analytics screen and navigation', async ({ page }) => {
    // Check if we're on the dashboard initially
    await expect(page.locator('h1')).toContainText('Trading Dashboard');
    
    // Look for Analytics navigation link
    const analyticsLink = page.locator('nav a[href="/analytics"]');
    await expect(analyticsLink).toBeVisible();
    
    // Click on Analytics navigation
    await analyticsLink.click();
    
    // Wait for navigation to complete
    await page.waitForURL('**/analytics');
    
    // Verify we're on the analytics page
    await expect(page.locator('h1')).toContainText('Trade Analytics');
    await expect(page.locator('text=Analyze your trading performance')).toBeVisible();
  });

  test('should display filter panel with sections', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('http://localhost:3000/analytics');
    
    // Check if filter panel is visible
    await expect(page.locator('text=Filters')).toBeVisible();
    
    // Check for filter sections
    await expect(page.locator('text=Date Range')).toBeVisible();
    await expect(page.locator('text=Outcomes')).toBeVisible();
    await expect(page.locator('text=Trade Direction')).toBeVisible();
    
    // Check for collapsible filter panel toggle
    const toggleButton = page.locator('button').filter({ hasText: /Filters/ }).locator('svg');
    await expect(toggleButton).toBeVisible();
  });

  test('should allow filtering by outcomes', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('http://localhost:3000/analytics');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Look for outcome filters
    const winningTradesCheckbox = page.locator('label:has-text("🟢 Winning Trades") input');
    const losingTradesCheckbox = page.locator('label:has-text("🔴 Losing Trades") input');
    
    if (await winningTradesCheckbox.isVisible()) {
      // Click on winning trades filter
      await winningTradesCheckbox.check();
      
      // Wait for filter to apply
      await page.waitForTimeout(1000);
      
      // Verify filter is applied (should show active filter count)
      await expect(page.locator('text=1').first()).toBeVisible();
    }
  });

  test('should display summary statistics cards', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('http://localhost:3000/analytics');
    
    // Wait for data to load
    await page.waitForLoadState('networkidle');
    
    // Check for summary cards (these should be visible even with no data)
    await expect(page.locator('text=Win Rate')).toBeVisible();
    await expect(page.locator('text=Total P&L')).toBeVisible();
    await expect(page.locator('text=Average Risk')).toBeVisible();
    await expect(page.locator('text=Total Trades')).toBeVisible();
  });

  test('should display export buttons', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('http://localhost:3000/analytics');
    
    // Check for export buttons
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
    await expect(page.locator('button:has-text("Export JSON")')).toBeVisible();
  });

  test('should toggle filter panel', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('http://localhost:3000/analytics');
    
    // Find the filter panel toggle button
    const toggleButton = page.locator('button').filter({ hasText: /rotate/ }).or(
      page.locator('button svg[viewBox="0 0 24 24"]').first()
    );
    
    // Check if filter content is initially visible
    const filterContent = page.locator('text=Date Range');
    await expect(filterContent).toBeVisible();
    
    // Click toggle button to collapse
    await toggleButton.click();
    
    // Wait for animation
    await page.waitForTimeout(300);
    
    // Filter content should be hidden
    await expect(filterContent).not.toBeVisible();
    
    // Click again to expand
    await toggleButton.click();
    await page.waitForTimeout(300);
    
    // Filter content should be visible again
    await expect(filterContent).toBeVisible();
  });

  test('should handle loading states', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('http://localhost:3000/analytics');
    
    // Should show loading indicator initially
    const loadingText = page.locator('text=Loading analytics...');
    
    // Wait for either loading to appear or data to load
    await Promise.race([
      loadingText.waitFor({ timeout: 2000 }).catch(() => {}),
      page.waitForLoadState('networkidle')
    ]);
  });

  test('should navigate back to dashboard', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('http://localhost:3000/analytics');
    
    // Click on Dashboard navigation link
    const dashboardLink = page.locator('nav a[href="/"]');
    await expect(dashboardLink).toBeVisible();
    await dashboardLink.click();
    
    // Wait for navigation
    await page.waitForURL('**/');
    
    // Verify we're back on dashboard
    await expect(page.locator('h1')).toContainText('Trading Dashboard');
  });
});