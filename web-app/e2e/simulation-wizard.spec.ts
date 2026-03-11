import { test, expect, Page } from '@playwright/test';

const API_URL = 'http://localhost:3000';

/**
 * Set up common route mocks so the app loads without real backend state.
 */
async function setupMocks(page: Page): Promise<void> {
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
}

/**
 * Navigate to the app and click "New project" to start the wizard fresh.
 */
async function startFreshWizard(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const newProjectButton = page.locator('button[nz-button]:has-text("New project")');
  await newProjectButton.click();
}

test.describe('Simulation Wizard', () => {

  // ──────────────────────────────────────────────
  // Step 0: Project Setup
  // ──────────────────────────────────────────────

  test('step 0: empty name disables Next', async ({ page }) => {
    await setupMocks(page);
    await startFreshWizard(page);

    // Name input should be empty on fresh wizard
    const nameInput = page.locator('input[formcontrolname="name"]');
    await expect(nameInput).toHaveValue('');

    // Next button should be disabled because name is required
    const nextButton = page.locator('button[nz-button]:has-text("Next")');
    await expect(nextButton).toBeDisabled();
  });

  test('step 0: fill name, prefix, cellsize - Next becomes enabled', async ({ page }) => {
    await setupMocks(page);
    await startFreshWizard(page);

    const nameInput = page.locator('input[formcontrolname="name"]');
    const prefixInput = page.locator('input[formcontrolname="prefix"]');
    const nextButton = page.locator('button[nz-button]:has-text("Next")');

    // Initially disabled (name empty)
    await expect(nextButton).toBeDisabled();

    // Fill the project name
    await nameInput.fill('test_project');

    // Prefix already has default "sim", cellsize has default 20
    // So filling name alone should enable Next
    await expect(prefixInput).toHaveValue('sim');
    await expect(nextButton).toBeEnabled();

    // Verify cellsize has default value of 20
    const cellsizeInput = page.locator('nz-input-number[formcontrolname="cellsize"] input.ant-input-number-input');
    await expect(cellsizeInput).toHaveValue('20');
  });

  // ──────────────────────────────────────────────
  // Step 1: Raster Files
  // ──────────────────────────────────────────────

  test('step 1: Next is disabled without elevation or hrelease', async ({ page }) => {
    await setupMocks(page);
    await startFreshWizard(page);

    // Fill step 0 and advance
    await page.locator('input[formcontrolname="name"]').fill('test_project');
    await page.locator('button[nz-button]:has-text("Next")').click();

    // Now on step 1. No rasters selected, Next should be disabled.
    await page.waitForSelector('nz-select[formcontrolname="elevation"]');
    const nextButton = page.locator('button[nz-button]:has-text("Next")');
    await expect(nextButton).toBeDisabled();

    // Inject rasters but only set elevation (no hrelease) — still invalid
    await page.evaluate(() => {
      const appRef = (window as any).ng?.getComponent(document.querySelector('app-simulation-wizard'));
      if (appRef) {
        appRef.availableRasters = ['dem.tif'];
        appRef.rastersForm.patchValue({ elevation: 'dem.tif' });
      }
    });

    // rastersForm has a custom validator: atLeastOneHrelease. Even with elevation,
    // Next should remain disabled because no hrelease is set.
    await expect(nextButton).toBeDisabled();

    // Now add an hrelease — Next should become enabled
    await page.evaluate(() => {
      const appRef = (window as any).ng?.getComponent(document.querySelector('app-simulation-wizard'));
      if (appRef) {
        appRef.rastersForm.patchValue({ hrelease1: 'hrelease_s.tif' });
      }
    });
    await expect(nextButton).toBeEnabled({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────
  // Step 2: Material Properties
  // ──────────────────────────────────────────────

  test('step 2: material fields have default values (density 2600, 1300, 1000)', async ({ page }) => {
    await setupMocks(page);
    await startFreshWizard(page);

    // Navigate to step 2
    await page.locator('input[formcontrolname="name"]').fill('test_project');
    await page.locator('button[nz-button]:has-text("Next")').click();

    // Step 1: inject rasters and advance
    await page.waitForSelector('nz-select[formcontrolname="elevation"]');
    await page.evaluate(() => {
      const appRef = (window as any).ng?.getComponent(document.querySelector('app-simulation-wizard'));
      if (appRef) {
        appRef.availableRasters = ['dem.tif', 'hrelease_s.tif'];
        appRef.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: 'hrelease_s.tif' });
      }
    });
    await page.locator('button[nz-button]:has-text("Next")').click();

    // Now on step 2: Materials
    await page.waitForSelector('nz-input-number[formcontrolname="density0"]');

    // Verify default density values
    const density0 = page.locator('nz-input-number[formcontrolname="density0"] input.ant-input-number-input');
    const density1 = page.locator('nz-input-number[formcontrolname="density1"] input.ant-input-number-input');
    const density2 = page.locator('nz-input-number[formcontrolname="density2"] input.ant-input-number-input');

    await expect(density0).toHaveValue('2600');
    await expect(density1).toHaveValue('1300');
    await expect(density2).toHaveValue('1000');

    // Verify default friction values
    const friction0 = page.locator('nz-input-number[formcontrolname="friction0"] input.ant-input-number-input');
    const friction1 = page.locator('nz-input-number[formcontrolname="friction1"] input.ant-input-number-input');
    const friction2 = page.locator('nz-input-number[formcontrolname="friction2"] input.ant-input-number-input');

    await expect(friction0).toHaveValue('35');
    await expect(friction1).toHaveValue('20');
    await expect(friction2).toHaveValue('0');
  });

  // ──────────────────────────────────────────────
  // Step 3: Advanced / Timing
  // ──────────────────────────────────────────────

  test('step 3: time fields validate tend > tint', async ({ page }) => {
    await setupMocks(page);
    await startFreshWizard(page);

    // Navigate through steps 0-2
    await page.locator('input[formcontrolname="name"]').fill('test_project');
    await page.locator('button[nz-button]:has-text("Next")').click();

    await page.waitForSelector('nz-select[formcontrolname="elevation"]');
    await page.evaluate(() => {
      const appRef = (window as any).ng?.getComponent(document.querySelector('app-simulation-wizard'));
      if (appRef) {
        appRef.availableRasters = ['dem.tif', 'hrelease_s.tif'];
        appRef.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: 'hrelease_s.tif' });
      }
    });
    await page.locator('button[nz-button]:has-text("Next")').click();

    await page.waitForSelector('nz-input-number[formcontrolname="density0"]');
    await page.locator('button[nz-button]:has-text("Next")').click();

    // Now on step 3: Advanced
    await page.waitForSelector('nz-input-number[formcontrolname="tint"]');
    const nextButton = page.locator('button[nz-button]:has-text("Next")');

    // Default values: tint=10, tend=120. Next should be enabled.
    await expect(nextButton).toBeEnabled();

    // Set tend <= tint to trigger validation error
    await page.evaluate(() => {
      const appRef = (window as any).ng?.getComponent(document.querySelector('app-simulation-wizard'));
      if (appRef) {
        appRef.advancedForm.patchValue({ tint: 100, tend: 50 });
      }
    });

    // Next should become disabled because tend <= tint
    await expect(nextButton).toBeDisabled({ timeout: 5000 });

    // The error message should be visible
    const errorMsg = page.locator('.ant-form-item-explain-error').filter({
      hasText: 'End time must be greater than output interval',
    });
    await expect(errorMsg).toBeVisible();

    // Fix the values: tend > tint
    await page.evaluate(() => {
      const appRef = (window as any).ng?.getComponent(document.querySelector('app-simulation-wizard'));
      if (appRef) {
        appRef.advancedForm.patchValue({ tint: 10, tend: 300 });
      }
    });

    await expect(nextButton).toBeEnabled({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────
  // Step 4: Review & Run
  // ──────────────────────────────────────────────

  test('step 4: review shows correct summary', async ({ page }) => {
    await setupMocks(page);
    await startFreshWizard(page);

    const projectName = `review_test_${Date.now()}`;

    // Step 0
    await page.locator('input[formcontrolname="name"]').fill(projectName);
    await page.locator('button[nz-button]:has-text("Next")').click();

    // Step 1
    await page.waitForSelector('nz-select[formcontrolname="elevation"]');
    await page.evaluate(() => {
      const appRef = (window as any).ng?.getComponent(document.querySelector('app-simulation-wizard'));
      if (appRef) {
        appRef.availableRasters = ['dem.tif', 'hrelease_s.tif'];
        appRef.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: 'hrelease_s.tif' });
      }
    });
    await page.locator('button[nz-button]:has-text("Next")').click();

    // Step 2: defaults
    await page.waitForSelector('nz-input-number[formcontrolname="density0"]');
    await page.locator('button[nz-button]:has-text("Next")').click();

    // Step 3: defaults
    await page.waitForSelector('nz-input-number[formcontrolname="tint"]');
    await page.locator('button[nz-button]:has-text("Next")').click();

    // Step 4: Review
    await page.waitForSelector('nz-descriptions');

    // Check summary values
    const descriptions = page.locator('nz-descriptions');
    await expect(descriptions).toContainText(projectName);
    await expect(descriptions).toContainText('sim');       // prefix
    await expect(descriptions).toContainText('20 m');      // cellsize
    await expect(descriptions).toContainText('3-phase');
    await expect(descriptions).toContainText('dem.tif');   // elevation
    await expect(descriptions).toContainText('2600, 1300, 1000'); // density
    await expect(descriptions).toContainText('10 s');      // tint
    await expect(descriptions).toContainText('120 s');     // tend
  });

  test('step 4: script preview contains r.avaflow command', async ({ page }) => {
    await setupMocks(page);
    await startFreshWizard(page);

    // Navigate through all steps
    await page.locator('input[formcontrolname="name"]').fill('script_test');
    await page.locator('button[nz-button]:has-text("Next")').click();

    await page.waitForSelector('nz-select[formcontrolname="elevation"]');
    await page.evaluate(() => {
      const appRef = (window as any).ng?.getComponent(document.querySelector('app-simulation-wizard'));
      if (appRef) {
        appRef.availableRasters = ['dem.tif', 'hrelease_s.tif'];
        appRef.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: 'hrelease_s.tif' });
      }
    });
    await page.locator('button[nz-button]:has-text("Next")').click();

    await page.waitForSelector('nz-input-number[formcontrolname="density0"]');
    await page.locator('button[nz-button]:has-text("Next")').click();

    await page.waitForSelector('nz-input-number[formcontrolname="tint"]');
    await page.locator('button[nz-button]:has-text("Next")').click();

    // Step 4: verify script preview
    await page.waitForSelector('.script-preview');
    const scriptPreview = page.locator('.script-preview code');
    const scriptText = await scriptPreview.textContent();

    expect(scriptText).toContain('r.avaflow');
    expect(scriptText).toContain('elevation=dem');
    expect(scriptText).toContain('hrelease1=hrelease_s');
    expect(scriptText).toContain('phases=s,fs,f');
    expect(scriptText).toContain('cellsize=20');
    expect(scriptText).toContain('prefix=sim');
    expect(scriptText).toContain('density=2600,1300,1000');
    expect(scriptText).toContain('time=10,120');
    expect(scriptText).toContain('r.in.gdal');
    expect(scriptText).toContain('g.region');
  });

  // ──────────────────────────────────────────────
  // Save and navigation
  // ──────────────────────────────────────────────

  test('"Save only" button creates project', async ({ page }) => {
    await setupMocks(page);

    // Mock the experiment endpoint
    let savedPayload: any = null;
    await page.route(`${API_URL}/experiment`, async (route) => {
      savedPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'ok' }),
      });
    });

    await startFreshWizard(page);

    const projectName = `save_test_${Date.now()}`;

    // Step 0
    await page.locator('input[formcontrolname="name"]').fill(projectName);
    await page.locator('button[nz-button]:has-text("Next")').click();

    // Step 1
    await page.waitForSelector('nz-select[formcontrolname="elevation"]');
    await page.evaluate(() => {
      const appRef = (window as any).ng?.getComponent(document.querySelector('app-simulation-wizard'));
      if (appRef) {
        appRef.availableRasters = ['dem.tif', 'hrelease_s.tif'];
        appRef.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: 'hrelease_s.tif' });
      }
    });
    await page.locator('button[nz-button]:has-text("Next")').click();

    // Step 2
    await page.waitForSelector('nz-input-number[formcontrolname="density0"]');
    await page.locator('button[nz-button]:has-text("Next")').click();

    // Step 3
    await page.waitForSelector('nz-input-number[formcontrolname="tint"]');
    await page.locator('button[nz-button]:has-text("Next")').click();

    // Step 4: Click "Save only"
    await page.waitForSelector('nz-descriptions');
    const saveOnlyButton = page.locator('button[nz-button]:has-text("Save only")');
    await expect(saveOnlyButton).toBeEnabled();
    await saveOnlyButton.click();

    // Wait for the save API call
    await page.waitForResponse(
      (resp) => resp.url().includes('/experiment') && resp.status() === 201,
      { timeout: 10000 },
    );

    // Verify the payload that was sent
    expect(savedPayload).not.toBeNull();
    expect(savedPayload.name).toBe(projectName);
    expect(savedPayload.experiments).toHaveLength(1);
    expect(savedPayload.experiments[0].name).toBe('sim');
    expect(savedPayload.experiments[0].parameters.cellsize).toBe(20);
    expect(savedPayload.experiments[0].parameters.elevation).toBe('dem.tif');
  });

  test('Back button navigates to previous step', async ({ page }) => {
    await setupMocks(page);
    await startFreshWizard(page);

    // Fill step 0 and go to step 1
    await page.locator('input[formcontrolname="name"]').fill('back_test');
    await page.locator('button[nz-button]:has-text("Next")').click();

    // We should now be on step 1
    await page.waitForSelector('nz-select[formcontrolname="elevation"]');

    // Back button should be visible on step 1
    const backButton = page.locator('button[nz-button]:has-text("Back")');
    await expect(backButton).toBeVisible();
    await backButton.click();

    // We should be back on step 0 with the name still filled in
    const nameInput = page.locator('input[formcontrolname="name"]');
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue('back_test');

    // Back button should NOT be visible on step 0 (first step)
    await expect(backButton).not.toBeVisible();
  });
});
