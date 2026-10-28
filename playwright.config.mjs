import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,forbidOnly:true,retries:0,workers:1,
 outputDir:`${process.env.TEMP || process.env.TMP || '.'}/career-radar-playwright-results`,
 reporter:[['list'],['html',{outputFolder:'reports/playwright-html',open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4187',trace:'retain-on-failure',screenshot:'only-on-failure',video:process.env.REVIEW_CHROMIUM_PATH?'off':'retain-on-failure',launchOptions:process.env.REVIEW_CHROMIUM_PATH?{executablePath:process.env.REVIEW_CHROMIUM_PATH}:{}},
 projects:[{name:'desktop-chromium',use:{...devices['Desktop Chrome']}},{name:'mobile-chromium',use:{...devices['Pixel 7']}}],
 webServer:{command:'node qa-preview/server.mjs --port=4187',url:'http://127.0.0.1:4187',reuseExistingServer:false,timeout:15000,stdout:'pipe',stderr:'pipe'}
});
