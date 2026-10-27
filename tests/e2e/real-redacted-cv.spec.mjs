import fs from 'node:fs';
import {test,expect} from '@playwright/test';

const cvPath=process.env.CAREER_RADAR_REDACTED_CV;
test.skip(!cvPath,'Set CAREER_RADAR_REDACTED_CV to an owner-approved redacted DOCX.');

test('owner-approved redacted DOCX structures locally without provider or AI calls',async({page})=>{
 const external=[];
 await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'All APIs blocked during real-CV parsing test'}}));
 await page.route(/^https:\/\/(?!127\.0\.0\.1)/,route=>{const request=route.request();external.push({url:request.url(),method:request.method(),resourceType:request.resourceType()});return route.abort('blockedbyclient');});
 await page.goto('/');
 await page.locator('[data-view="matching"]:visible').first().click();
 await page.locator('#matchFile').setInputFiles({name:'Anonymised_Learning_Operations_CV.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:fs.readFileSync(cvPath)});
 await expect(page.locator('#matchStatus')).toContainText('Structured CV ready');
 await expect(page.locator('#matchText')).not.toHaveValue('');
 expect((await page.locator('#matchText').inputValue()).length).toBeGreaterThan(4000);
 expect(external.every(request=>request.method==='GET'&&request.resourceType==='stylesheet')).toBe(true);
});
