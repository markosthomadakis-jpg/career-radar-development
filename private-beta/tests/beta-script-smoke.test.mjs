import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {Script} from 'node:vm';
import {page as sourcePage} from '../worker/page.js';

const require=createRequire(import.meta.url);
const tabs=['home','profile','search','tracker','feedback','settings'];

function inlineScript(html){
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length,1,'Expected exactly one inline script');
  return scripts[0][1];
}

function assertScriptSafe(html){
  const code=inlineScript(html);
  assert.doesNotThrow(()=>new Script(code,{filename:'private-beta-inline.js'}));
  for(const token of [
    String.raw`/\.txt$/i`,
    String.raw`/\.docx$/i`,
    String.raw`/<\/w:p>/g`,
    String.raw`/\s+/g`,
    String.raw`/^https:\/\//`,
  ])assert.ok(code.includes(token),`Missing literal browser regex: ${token}`);
  for(const tab of tabs)assert.ok(html.includes(`data-tab="${tab}"`),`Missing ${tab} tab`);
}

test('T1: source HTML preserves regex backslashes and inline JS parses',()=>{
  assertScriptSafe(sourcePage);
});

test('T2: built Worker serves parseable HTML with the six tabs',async()=>{
  const {default:worker}=await import('../dist/server/index.js');
  const response=await worker.fetch(new Request('https://career-radar.test/'),{});
  assert.equal(response.status,200);
  const html=await response.text();
  assertScriptSafe(html);
});

test('T2: browser loads with mocked APIs and every navigation tab switches',async t=>{
  const requireBrowser=process.env.CAREER_RADAR_REQUIRE_BROWSER==='1';
  let chromium;
  try{({chromium}=require('playwright'))}catch(e){
    if(requireBrowser)throw new Error('Playwright missing. Run: npm install --no-save playwright',{cause:e});
    return t.skip('Playwright not available in this environment');
  }
  const {existsSync}=await import('node:fs');
  if(!existsSync(chromium.executablePath())){
    if(requireBrowser)throw new Error('Playwright Chromium missing. Run: npx playwright install chromium');
    return t.skip('Playwright Chromium not installed; no browser download authorised');
  }

  const {default:worker}=await import('../dist/server/index.js');
  const html=await (await worker.fetch(new Request('https://career-radar.test/'),{})).text();
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    await page.route('**/*',route=>{
      const u=new URL(route.request().url());
      if(u.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:html});
      const responses={
        '/api/me':{email:'tester@example.invalid',cv_text:'',preferences:{location:'Crawley',radius:10,salary_floor:35000,min_months:6,keywords:'training coordinator'},consent_ai:false},
        '/api/applications':{results:[]},
        '/api/feedback':{results:[]},
      };
      if(Object.hasOwn(responses,u.pathname))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(responses[u.pathname])});
      return route.fulfill({status:204,body:''});
    });
    await page.goto('https://career-radar.test/');
    await page.waitForFunction(()=>document.getElementById('heading')?.textContent?.includes('Welcome back'));
    for(const tab of tabs){
      await page.locator(`[data-tab="${tab}"]`).click();
      assert.equal(await page.locator(`section#${tab}`).isVisible(),true,`${tab} did not switch`);
    }
    assert.deepEqual(errors,[],'Browser console or runtime errors');
  }finally{await browser.close()}
});
