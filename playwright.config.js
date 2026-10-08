import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.SILO_TEST_DATA ||= mkdtempSync(path.join(tmpdir(), "silo-test-"));

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:5184",
    channel: "chrome",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "node server.mjs --production --port 5184",
    url: "http://localhost:5184",
    reuseExistingServer: false,
    env: { WAITLIST_DATA_DIR: process.env.SILO_TEST_DATA },
  },
});
