import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: '.',
  timeout: 60000,
  retries: 1,
  outputDir: './screenshots',
  use: {
    baseURL: 'http://localhost:4200',
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
  },
  webServer: [
    {
      command: 'cd server && npx nest start',
      port: 3000,
      timeout: 30000,
      reuseExistingServer: true,
    },
    {
      command: 'npx ng serve -c web --port 4200',
      port: 4200,
      timeout: 60000,
      reuseExistingServer: true,
    },
  ],
};

export default config;
