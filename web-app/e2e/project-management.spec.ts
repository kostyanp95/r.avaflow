import { test, expect, Page } from '@playwright/test';

const API_URL = 'http://localhost:3000';
const TEST_PROJECT_PREFIX = 'e2e_test_';

function uniqueProjectName(): string {
  return `${TEST_PROJECT_PREFIX}${Date.now()}`;
}

/**
 * Helper: fill the wizard from step 0 through step 4 and save the project.
 * Assumes the page is already loaded and on a fresh "New project" state.
 */
async function createProjectViaWizard(page: Page, projectName: string): Promise<void> {
  // Step 0: Project Setup
  const nameInput = page.locator('input[formcontrolname="name"]');
  await nameInput.fill(projectName);

  const prefixInput = page.locator('input[formcontrolname="prefix"]');
  await prefixInput.fill('sim');

  // cellsize already has default 20 — leave it
  const nextButton = page.locator('button[nz-button]:has-text("Next")');
  await expect(nextButton).toBeEnabled();
  await nextButton.click();

  // Step 1: Raster Files — we need to mock rasters via the API route intercept
  // Instead, we use page.route to mock the rasters endpoint and inject test files
  // For the wizard to advance, we need elevation + at least one hrelease selected.
  // We'll set them via Angular form by evaluating JS in the page.
  await page.waitForSelector('nz-select[formcontrolname="elevation"]');

  // Inject rasters into the Angular component's availableRasters array
  await page.evaluate(() => {
    const wizard = (document.querySelector('app-simulation-wizard') as any)?.__ngContext__;
    // Alternative: use the nz-select directly by adding options
    // We need to inject options into the DOM so nz-select can pick them up
  });

  // Since no real server files exist, mock the raster selection via route interception.
  // The selectors are nz-select dropdowns. We need to open them and pick a value.
  // But without uploaded files, the dropdown will be empty.
  // Strategy: intercept the API to provide rasters AND set form values directly.
  // The cleanest approach: use page.evaluate to set Angular form values.
  await page.evaluate(() => {
    const appRef = (window as any).ng?.getComponent(document.querySelector('app-simulation-wizard'));
    if (appRef) {
      appRef.availableRasters = ['dem.tif', 'hrelease_s.tif'];
      appRef.rastersForm.patchValue({
        elevation: 'dem.tif',
        hrelease1: 'hrelease_s.tif',
      });
    }
  });

  // After patching, the Next button should become enabled
  await expect(nextButton).toBeEnabled({ timeout: 5000 });
  await nextButton.click();

  // Step 2: Materials — defaults are pre-filled, just click Next
  await page.waitForSelector('form[nz-form] nz-input-number[formcontrolname="density0"]');
  await expect(nextButton).toBeEnabled();
  await nextButton.click();

  // Step 3: Advanced — defaults are pre-filled (tint=10, tend=120), just click Next
  await page.waitForSelector('nz-input-number[formcontrolname="tint"]');
  await expect(nextButton).toBeEnabled();
  await nextButton.click();

  // Step 4: Review & Run — click "Save only"
  await page.waitForSelector('nz-descriptions');
  const saveOnlyButton = page.locator('button[nz-button]:has-text("Save only")');
  await expect(saveOnlyButton).toBeEnabled();
  await saveOnlyButton.click();

  // Wait for the save request to complete
  await page.waitForResponse(
    (resp) => resp.url().includes('/experiment') && resp.status() === 201,
    { timeout: 10000 },
  );
}

/**
 * Helper: delete a test project via the API directly.
 */
async function deleteProjectViaApi(projectName: string): Promise<void> {
  try {
    await fetch(`${API_URL}/project/${projectName}`, { method: 'DELETE' });
  } catch {
    // Ignore errors during cleanup
  }
}

test.describe('Project Management', () => {
  let testProjectName: string;

  test.beforeEach(async ({ page }) => {
    // Intercept the projects list API to return a consistent state
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterAll(async () => {
    // Clean up any test projects created during this suite
    // We can't enumerate them easily, so we rely on individual test cleanup
  });

  test('page loads with r.avaflow header', async ({ page }) => {
    // The sidebar logo contains an h1 with "r.avaflow"
    const logo = page.locator('.sidebar-logo h1');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveText('r.avaflow');
  });

  test('sidebar shows "Projects" section', async ({ page }) => {
    // The sidebar has a submenu with title "Projects"
    const projectsSubmenu = page.locator('li[nz-submenu]').filter({ hasText: 'Projects' });
    await expect(projectsSubmenu).toBeVisible();
  });

  test('"New project" button exists and is clickable', async ({ page }) => {
    const newProjectButton = page.locator('button[nz-button]:has-text("New project")');
    await expect(newProjectButton).toBeVisible();
    await newProjectButton.click();

    // After clicking "New project", the header should show "New project"
    const header = page.locator('nz-header h1');
    await expect(header).toHaveText('New project');
  });

  test('create a new project via the wizard', async ({ page }) => {
    testProjectName = uniqueProjectName();

    // Mock the experiment save endpoint
    await page.route(`${API_URL}/experiment`, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'ok' }),
      });
    });

    // Mock the projects list to include the newly created project after save
    let projectCreated = false;
    await page.route(`${API_URL}/projects`, async (route) => {
      if (projectCreated) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { name: testProjectName, hasJson: true, hasScript: true },
          ]),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    // Click "New project"
    const newProjectButton = page.locator('button[nz-button]:has-text("New project")');
    await newProjectButton.click();

    // Step 0: fill project name
    const nameInput = page.locator('input[formcontrolname="name"]');
    await nameInput.fill(testProjectName);

    const nextButton = page.locator('button[nz-button]:has-text("Next")');
    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    // Step 1: inject rasters via Angular component
    await page.waitForSelector('nz-select[formcontrolname="elevation"]');
    await page.evaluate(() => {
      const appRef = (window as any).ng?.getComponent(document.querySelector('app-simulation-wizard'));
      if (appRef) {
        appRef.availableRasters = ['dem.tif', 'hrelease_s.tif'];
        appRef.rastersForm.patchValue({
          elevation: 'dem.tif',
          hrelease1: 'hrelease_s.tif',
        });
      }
    });
    await expect(nextButton).toBeEnabled({ timeout: 5000 });
    await nextButton.click();

    // Step 2: Materials — defaults already filled
    await page.waitForSelector('nz-input-number[formcontrolname="density0"]');
    await nextButton.click();

    // Step 3: Advanced — defaults already filled
    await page.waitForSelector('nz-input-number[formcontrolname="tint"]');
    await nextButton.click();

    // Step 4: Review — verify summary shows the project name
    await page.waitForSelector('nz-descriptions');
    const summaryName = page.locator('nz-descriptions-item').filter({ hasText: testProjectName });
    await expect(summaryName).toBeVisible();

    // Save the project
    projectCreated = true;
    const saveOnlyButton = page.locator('button[nz-button]:has-text("Save only")');
    await saveOnlyButton.click();

    // Wait for save response
    await page.waitForResponse(
      (resp) => resp.url().includes('/experiment') && resp.status() === 201,
      { timeout: 10000 },
    );
  });

  test('project appears in sidebar after save', async ({ page }) => {
    const projectName = uniqueProjectName();

    // Mock: initially no projects, then one after save
    let saved = false;
    await page.route(`${API_URL}/projects`, async (route) => {
      if (saved) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ name: projectName, hasJson: true, hasScript: true }]),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
    });

    await page.route(`${API_URL}/experiment`, async (route) => {
      saved = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'ok' }),
      });
    });

    // Reload to pick up mocked empty project list
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify sidebar has no projects
    const noProjectsItem = page.locator('[nz-menu-item]:has-text("No projects yet")');
    await expect(noProjectsItem).toBeVisible();

    // Create project via wizard
    const newProjectButton = page.locator('button[nz-button]:has-text("New project")');
    await newProjectButton.click();

    await page.locator('input[formcontrolname="name"]').fill(projectName);
    await page.locator('button[nz-button]:has-text("Next")').click();

    // Step 1: inject rasters
    await page.waitForSelector('nz-select[formcontrolname="elevation"]');
    await page.evaluate(() => {
      const appRef = (window as any).ng?.getComponent(document.querySelector('app-simulation-wizard'));
      if (appRef) {
        appRef.availableRasters = ['dem.tif', 'hrelease_s.tif'];
        appRef.rastersForm.patchValue({ elevation: 'dem.tif', hrelease1: 'hrelease_s.tif' });
      }
    });
    await page.locator('button[nz-button]:has-text("Next")').click();

    // Step 2 & 3: skip through
    await page.waitForSelector('nz-input-number[formcontrolname="density0"]');
    await page.locator('button[nz-button]:has-text("Next")').click();
    await page.waitForSelector('nz-input-number[formcontrolname="tint"]');
    await page.locator('button[nz-button]:has-text("Next")').click();

    // Step 4: save
    await page.waitForSelector('nz-descriptions');
    await page.locator('button[nz-button]:has-text("Save only")').click();

    // After save, the sidebar should reload and show the project
    await page.waitForResponse(
      (resp) => resp.url().includes('/experiment') && resp.status() === 201,
    );

    // The component calls loadProjects() after save; wait for the sidebar to update
    const projectItem = page.locator('.project-name').filter({ hasText: projectName });
    await expect(projectItem).toBeVisible({ timeout: 10000 });
  });

  test('open existing project populates form', async ({ page }) => {
    const projectName = 'existing_project';

    // Mock projects list with one existing project
    await page.route(`${API_URL}/projects`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ name: projectName, hasJson: true, hasScript: true }]),
      });
    });

    // Mock project detail endpoint
    await page.route(`${API_URL}/project?projectName=${projectName}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          name: projectName,
          experiments: [{
            name: 'test_prefix',
            parameters: {
              cellsize: 15,
              phases: 's,fs,f',
              elevation: 'test_dem.tif',
              hrelease1: 'test_hrelease.tif',
              density: { densityOfP1: 2500, densityOfP2: 1200, densityOfP3: 1000 },
              friction: {
                internalFrictionAngleOfP1: 30,
                internalFrictionAngleOfP2: 15,
                internalFrictionAngleOfP3: 0,
                basalFrictionAngleOfP1: 18,
                basalFrictionAngleOfP2: 8,
                basalFrictionAngleOfP3: 0,
                fluidFrictionOfP1: 5,
                fluidFrictionOfP2: 4,
                fluidFrictionOfP3: 0,
              },
              tint: 5,
              tend: 60,
            },
          }],
        }),
      });
    });

    // Mock project files endpoint
    await page.route(`${API_URL}/project/${projectName}/files`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(['test_dem.tif', 'test_hrelease.tif']),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click the project in the sidebar
    const projectItem = page.locator('[nz-menu-item]').filter({ hasText: projectName });
    await projectItem.click();

    // The header should show the project name
    const header = page.locator('nz-header h1');
    await expect(header).toHaveText(projectName);

    // Step 0 should be visible with the populated name
    const nameInput = page.locator('input[formcontrolname="name"]');
    await expect(nameInput).toHaveValue(projectName);

    // Prefix should be populated
    const prefixInput = page.locator('input[formcontrolname="prefix"]');
    await expect(prefixInput).toHaveValue('test_prefix');

    // Cellsize should be 15
    const cellsizeInput = page.locator('nz-input-number[formcontrolname="cellsize"] input.ant-input-number-input');
    await expect(cellsizeInput).toHaveValue('15');
  });

  test('delete project removes it from sidebar', async ({ page }) => {
    const projectName = 'project_to_delete';
    let deleted = false;

    // Mock projects list: show project initially, empty after delete
    await page.route(`${API_URL}/projects`, async (route) => {
      if (deleted) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ name: projectName, hasJson: true, hasScript: false }]),
        });
      }
    });

    // Mock delete endpoint
    await page.route(`${API_URL}/project/${projectName}`, async (route) => {
      if (route.request().method() === 'DELETE') {
        deleted = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: `Project "${projectName}" deleted` }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify project is in sidebar
    const projectItem = page.locator('.project-name').filter({ hasText: projectName });
    await expect(projectItem).toBeVisible();

    // Click the delete icon on the project
    const deleteIcon = page.locator('li[nz-menu-item]')
      .filter({ hasText: projectName })
      .locator('[nz-icon][nztype="delete"]');
    await deleteIcon.click();

    // Confirm the popconfirm dialog
    const confirmButton = page.locator('.ant-popover .ant-btn-primary');
    await confirmButton.click();

    // Wait for the delete request
    await page.waitForResponse(
      (resp) => resp.url().includes(`/project/${projectName}`) && resp.request().method() === 'DELETE',
      { timeout: 10000 },
    );

    // After delete + reload, project should be gone
    await expect(projectItem).not.toBeVisible({ timeout: 10000 });
  });
});
