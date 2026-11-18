import {defineConfig} from '@playwright/test'
import process from 'node:process'

export default defineConfig({
  testDir:'./tests/browser', outputDir:process.env.LAB_TEST_OUTPUT || 'test-results', fullyParallel:true, workers:2, timeout:45000,
  use:{
    baseURL:process.env.LAB_TEST_URL || 'http://127.0.0.1:4178',
    channel:process.env.LAB_CHROME_CHANNEL || undefined,
    trace:'retain-on-failure',
  },
  webServer: process.env.LAB_TEST_URL ? undefined : {
    command:'npm run preview -- --host 127.0.0.1 --port 4178 --strictPort',
    url:'http://127.0.0.1:4178', reuseExistingServer:false,
  },
})
