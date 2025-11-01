import { defineConfig} from '@playwright/test';

export default defineConfig({
    testDir: './src/tests/e2e',
    timeout: 30_000,
    use: {
        headless: true,
    },
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
    },
});
