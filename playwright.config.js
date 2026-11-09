import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    timeout: 30000,
    workers: 2,
    use: { baseURL: "http://127.0.0.1:4185", reducedMotion: "reduce", screenshot: "only-on-failure", trace: "retain-on-failure" },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"] } },
        { name: "android", use: { ...devices["Pixel 7"] } },
        { name: "ios", use: { ...devices["iPhone 13"] } }
    ],
    webServer: { command: "node scripts/ui-server.js", url: "http://127.0.0.1:4185", reuseExistingServer: false }
});
