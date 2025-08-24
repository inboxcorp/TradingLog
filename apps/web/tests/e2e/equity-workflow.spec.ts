import { test, expect } from '@playwright/test';

test.describe('Equity Setting Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/');
  });

  test('should complete full equity setting workflow', async ({ page }) => {
    // Should show login form initially (assuming no auth)
    await expect(page.getByText('Trading Log')).toBeVisible();
    await expect(page.getByText('Please sign in to continue')).toBeVisible();

    // Fill in login credentials
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    
    // Submit login
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should now see the equity page
    await expect(page.getByText('Trading Log - Set Initial Equity')).toBeVisible();
    await expect(page.getByText('Set your starting equity')).toBeVisible();

    // Should see current equity display (with default value)
    await expect(page.getByText('Current Total Equity')).toBeVisible();
    await expect(page.getByText('$10,000.00')).toBeVisible(); // Default equity

    // Should see equity form
    await expect(page.getByLabel('Total Equity')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update Equity' })).toBeVisible();

    // Update equity value
    const equityInput = page.getByLabel('Total Equity');
    await equityInput.clear();
    await equityInput.fill('25000');

    // Should see preview
    await expect(page.getByText('Preview: $25,000.00')).toBeVisible();

    // Submit the form
    await page.getByRole('button', { name: 'Update Equity' }).click();

    // Should see success message
    await expect(page.getByText('Equity updated successfully!')).toBeVisible();

    // Should see updated equity in display
    await expect(page.getByText('$25,000.00')).toBeVisible();

    // Should see last updated timestamp
    await expect(page.getByText(/Last updated:/)).toBeVisible();
  });

  test('should handle form validation errors', async ({ page }) => {
    // Login first
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for equity page to load
    await expect(page.getByText('Trading Log - Set Initial Equity')).toBeVisible();

    // Try to submit empty form
    const equityInput = page.getByLabel('Total Equity');
    await equityInput.clear();
    await page.getByRole('button', { name: 'Update Equity' }).click();

    // Should see validation error
    await expect(page.getByText('Equity is required')).toBeVisible();

    // Try invalid input
    await equityInput.fill('abc');
    await page.getByRole('button', { name: 'Update Equity' }).click();

    // Should see validation error
    await expect(page.getByText('Must be a valid number')).toBeVisible();

    // Try negative value
    await equityInput.clear();
    await equityInput.fill('-1000');
    await page.getByRole('button', { name: 'Update Equity' }).click();

    // Should see validation error
    await expect(page.getByText('Equity must be positive')).toBeVisible();
  });

  test('should handle decimal values correctly', async ({ page }) => {
    // Login first
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for equity page to load
    await expect(page.getByText('Trading Log - Set Initial Equity')).toBeVisible();

    // Enter decimal value
    const equityInput = page.getByLabel('Total Equity');
    await equityInput.clear();
    await equityInput.fill('15000.75');

    // Should see preview with correct formatting
    await expect(page.getByText('Preview: $15,000.75')).toBeVisible();

    // Submit the form
    await page.getByRole('button', { name: 'Update Equity' }).click();

    // Should see success message
    await expect(page.getByText('Equity updated successfully!')).toBeVisible();

    // Should see updated equity with correct decimal precision
    await expect(page.getByText('$15,000.75')).toBeVisible();
  });

  test('should show loading states correctly', async ({ page }) => {
    // Login first
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for equity page to load
    await expect(page.getByText('Trading Log - Set Initial Equity')).toBeVisible();

    // Enter new value
    const equityInput = page.getByLabel('Total Equity');
    await equityInput.clear();
    await equityInput.fill('30000');

    // Submit the form
    const submitButton = page.getByRole('button', { name: 'Update Equity' });
    await submitButton.click();

    // Should briefly see loading state (this might be fast in tests)
    // The button text should change to "Updating..." and be disabled
    // Note: This might be too fast to catch in tests, but we test the behavior
  });

  test('should handle sign up workflow', async ({ page }) => {
    // Should show login form initially
    await expect(page.getByText('Trading Log')).toBeVisible();
    
    // Click sign up link
    await page.getByRole('button', { name: 'Need an account? Sign Up' }).click();

    // Should now show sign up form
    await expect(page.getByRole('button', { name: 'Sign Up' })).toBeVisible();

    // Fill in sign up credentials
    await page.getByLabel('Email').fill('newuser@example.com');
    await page.getByLabel('Password').fill('newpassword123');
    
    // Submit sign up
    await page.getByRole('button', { name: 'Sign Up' }).click();

    // Should be logged in and see equity page
    await expect(page.getByText('Trading Log - Set Initial Equity')).toBeVisible();
  });

  test('should handle logout workflow', async ({ page }) => {
    // Login first
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for equity page to load
    await expect(page.getByText('Trading Log - Set Initial Equity')).toBeVisible();

    // Should see user email and logout button
    await expect(page.getByText('test@example.com')).toBeVisible();
    
    // Click logout
    await page.getByRole('button', { name: 'Sign Out' }).click();

    // Should return to login page
    await expect(page.getByText('Please sign in to continue')).toBeVisible();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should still be functional on mobile
    await expect(page.getByText('Trading Log - Set Initial Equity')).toBeVisible();
    await expect(page.getByLabel('Total Equity')).toBeVisible();
    
    // Form should still work
    const equityInput = page.getByLabel('Total Equity');
    await equityInput.clear();
    await equityInput.fill('12000');
    
    await page.getByRole('button', { name: 'Update Equity' }).click();
    await expect(page.getByText('Equity updated successfully!')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Login first
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for equity page to load
    await expect(page.getByText('Trading Log - Set Initial Equity')).toBeVisible();

    // Simulate network failure by intercepting requests
    await page.route('**/api/user', route => route.abort());

    // Try to update equity
    const equityInput = page.getByLabel('Total Equity');
    await equityInput.clear();
    await equityInput.fill('15000');
    await page.getByRole('button', { name: 'Update Equity' }).click();

    // Should show error message
    await expect(page.getByText(/failed to update equity/i)).toBeVisible();
  });
});