const path = require('path');
const { defineConfig } = require('@playwright/test');

const PORT = process.env.E2E_PORT || '8000';

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'node serve.js',
      cwd: __dirname,
      url: `http://127.0.0.1:${PORT}/api/parametres`,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      cwd: path.join(__dirname, '..', 'frontend'),
      url: 'http://localhost:5173',
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
