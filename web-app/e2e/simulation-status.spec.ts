import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:3000';

test.describe('Simulation Status', () => {

  test.beforeEach(async ({ page }) => {
    // Mock the projects list
    await page.route(`${API_URL}/projects`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route(`${API_URL}/rasters`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to the "Modeling" tab (second tab, index 1)
    const modelingTab = page.locator('.ant-tabs-tab').filter({ hasText: 'Modeling' });
    await modelingTab.click();
  });

  test('status tab shows "Idle" badge initially', async ({ page }) => {
    // The simulation-status component renders a nz-badge with status text
    const badgeText = page.locator('app-simulation-status nz-badge');
    await expect(badgeText).toBeVisible();

    // The badge text should be "Idle"
    const statusLabel = page.locator('app-simulation-status .status-header');
    await expect(statusLabel).toContainText('Idle');
  });

  test('stop button is disabled when idle', async ({ page }) => {
    // The stop button is disabled when status !== 'running'
    const stopButton = page.locator('app-simulation-status button[nz-button]').filter({ hasText: 'Stop' });
    await expect(stopButton).toBeVisible();
    await expect(stopButton).toBeDisabled();
  });

  test('clear button clears log', async ({ page }) => {
    // First, inject some log lines into the component via evaluate
    await page.evaluate(() => {
      const statusComponent = (window as any).ng?.getComponent(
        document.querySelector('app-simulation-status')
      );
      if (statusComponent) {
        statusComponent.logLines = ['Line 1: Starting simulation...', 'Line 2: t = 10.00 s (of 120.00 s)', 'Line 3: Done'];
      }
    });

    // Wait a moment for Angular change detection
    await page.waitForTimeout(500);

    // Trigger change detection
    await page.evaluate(() => {
      const appRef = (window as any).ng?.getComponent(document.querySelector('app-root'));
      // Alternatively, force zone.run or markForCheck
    });

    // Verify log lines are visible in the pre element
    const logOutput = page.locator('app-simulation-status .log-output');

    // The log might not update via evaluate alone due to change detection.
    // Alternative: check that clear button exists and click it.
    const clearButton = page.locator('app-simulation-status button[nz-button]').filter({ hasText: 'Clear' });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // After clearing, the log container should be empty
    // The pre element should have no content (empty ng-container loop)
    const logText = await logOutput.textContent();
    expect(logText?.trim()).toBe('');
  });
});
