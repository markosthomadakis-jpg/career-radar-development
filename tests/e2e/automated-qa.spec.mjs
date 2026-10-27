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
test('every active view has no serious or critical WCAG A/AA violations',async({page},testInfo)=>{
 await page.goto('/');const blocking=[];for(const view of expectedViews){await page.locator(`[data-view="${view}"]:visible`).first().click();const results=await new AxeBuilder({page}).include(`#${view}`).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();await testInfo.attach(`axe-${view}`,{body:Buffer.from(JSON.stringify(results,null,2)),contentType:'application/json'});for(const violation of results.violations.filter(x=>['serious','critical'].includes(x.impact)))blocking.push({view,id:violation.id,impact:violation.impact,help:violation.help,nodes:violation.nodes.map(n=>n.target)});}expect(blocking).toEqual([]);
});

test('critical workflows run with synthetic mocked responses only',async({page})=>{
 const remote={id:'jobicy:qa-remote',provider:'jobicy',source_id:'qa-remote',title:'Training Coordinator',company:'Fictional Learning',location:'United Kingdom',description:'Coordinate training schedules, participants, records and instructors for a fictional programme.',source_url:'https://jobicy.com/jobs/qa-remote',posted_at:'2026-10-27T08:00:00.000Z',salary_min:35000,salary_max:40000,salary_currency:'GBP',salary_period:'year',salary_uk_annual_verified:true,uk_eligibility:'eligible',remote_mode:'remote_provider_claim',status:'unknown',career_relevance:{band:'target'},source_reliability:{level:'medium',reason:'Synthetic QA fixture'}};
 const watched={...remote,id:'greenhouse:qa-watch',provider:'greenhouse',source_id:'qa-watch',source_url:'https://boards.greenhouse.io/fictional/jobs/qa-watch',canonical_key:'role:fictional-learning:training-coordinator:united-kingdom',employer_identity:{status:'user_supplied',board:'fictional',platform:'greenhouse'},source_reliability:{level:'high',reason:'Synthetic direct ATS fixture; employer label is user-supplied and must be verified against the board'}};
 await page.route('**/api/sources/remote?*',route=>route.fulfill({json:{results:[remote],returned:1,nextCursors:{},partial:false,errors:[]}}));
 await page.route('**/api/watchlist/jobs?*',route=>route.fulfill({json:{results:[watched],count:1,platform:'greenhouse',board:'fictional'}}));
 await page.goto('/');

 await page.locator('[data-view="matching"]:visible').first().click();
 const cv='PROFILE\nSynthetic coordinator.\nEXPERIENCE\nCoordinated training schedules, participant records, instructors and suppliers. Maintained accurate Excel reports and programme documentation for fictional learning events.';
 await page.locator('#matchFile').setInputFiles({name:'synthetic-cv.txt',mimeType:'text/plain',buffer:Buffer.from(cv)});
 await expect(page.locator('#matchStatus')).toContainText('Structured CV ready');

 await page.locator('[data-view="remote"]:visible').first().click();await page.locator('#remoteForm button[type="submit"]').click();await expect(page.locator('#remoteResults article')).toHaveCount(1);

 await page.locator('[data-view="watchlist"]:visible').first().click();await page.locator('#watchEmployer').fill('Fictional Learning');await page.locator('#watchBoard').fill('fictional');await page.locator('#watchlistForm button[type="submit"]').click();await page.locator('#watchlistRefresh').click();await expect(page.locator('#watchlistResults article')).toHaveCount(1);await expect(page.locator('#watchlistResults')).toContainText('Employer label entered by you');

 await page.evaluate(()=>{window.__careerRadarProfessionalProfile={schema_version:'1.0.0',cv_sha256:'synthetic',confirmed_at:'2026-10-27T08:00:00Z',capabilities:[{review:'confirmed',verified_quote:true,source_passages:[{text:'Coordinated training schedules, participant records, instructors and suppliers.'}]}],roles:[]};});
 await page.locator('[data-view="calibration"]:visible').first().click();await page.locator('#calTitle').fill('Training Coordinator');await page.locator('#calEmployer').fill('Fictional Learning');await page.locator('#calDescription').fill('Responsibilities: coordinate training schedules, maintain participant records, liaise with instructors and prepare Excel reports. Essential criteria: proven administration, accurate record keeping and stakeholder communication. Location: Crawley. Permanent role. Salary £36,000. Closing date: 30 November 2026.');await page.locator('#calFull').check({force:true});await page.locator('#calEvaluate').click();await expect(page.locator('#calStatus')).toHaveText('Evaluated locally · no API charge');
});
