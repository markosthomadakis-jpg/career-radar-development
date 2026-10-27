import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const expectedViews=['dashboard','tracker','live','matching','calibration','remote','watchlist'];
test.beforeEach(async({page})=>{await page.route(/^https:\/\/(?!127\.0\.0\.1)/,route=>route.fulfill({status:204,body:''}));});
test('application loads without browser errors and every navigation view opens',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));page.on('console',message=>{if(message.type()==='error')errors.push(`console: ${message.text()}`)});
 await page.goto('/',{waitUntil:'domcontentloaded'});await expect(page).toHaveTitle(/Career Radar/i);
 for(const view of expectedViews){const control=page.locator(`[data-view="${view}"]:visible`).first();await expect(control,`navigation control for ${view}`).toBeVisible();await control.click();const section=page.locator(`#${view}`);await expect(section,`${view} section`).toBeVisible();await expect(section).not.toHaveClass(/\bhide\b/);}
 expect(errors,'uncaught exceptions or console errors').toEqual([]);
});
test('paid and live APIs are not contacted during smoke navigation',async({page})=>{
 const calls=[];page.on('request',request=>{if(request.url().includes('/api/'))calls.push(new URL(request.url()).pathname)});await page.goto('/');for(const view of expectedViews)await page.locator(`[data-view="${view}"]:visible`).first().click();expect(calls.filter(path=>path!=='/api/ai/status')).toEqual([]);
});
test('core page has no serious or critical WCAG A/AA violations',async({page},testInfo)=>{
 await page.goto('/');const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();const blocking=results.violations.filter(x=>['serious','critical'].includes(x.impact));await testInfo.attach('axe-results',{body:Buffer.from(JSON.stringify(results,null,2)),contentType:'application/json'});expect(blocking.map(x=>({id:x.id,impact:x.impact,help:x.help,nodes:x.nodes.map(n=>n.target)}))).toEqual([]);
});
