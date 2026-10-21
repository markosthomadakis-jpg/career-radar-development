import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Entirely local Chromium simulation: every request is intercepted. The form
// posts to the actual V5.4 Worker evaluated with an in-memory synthetic DB.
const cv = (
  'Coordinated training programmes, 200 seminars per year, course scheduling, participant administration, '
  + 'instructor liaison, stakeholder communications, Excel reporting and quality documentation. '
).repeat(4);

const description = (
  'Essential: Coordinate training programme administration, scheduling, participant support, '
  + 'course record-keeping and communication with colleagues, trainers and stakeholders. '
).repeat(16);

function fakeDatabase() {
  return {
    prepare(sql) {
      return {
        bind() {
          return {
            async first() {
              if (sql.includes('FROM beta_profiles')) return { cv_text: cv };
              if (sql.includes('FROM beta_preferences')) return { salary_floor: 35000, min_months: 6 };
              return null;
            },
            async all() { return { results: [] }; }
          };
        }
      };
    }
  };
}

test('V5.4 Chromium: manual structured advert travels through real offline Worker; expired -> Skip, no score', async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (e) { throw new Error('Playwright is required. Run: npm.cmd install --no-save playwright', { cause: e }); }

  const { existsSync } = await import('node:fs');
  if (!existsSync(chromium.executablePath())) {
    throw new Error('Playwright Chromium is required. Run: npx.cmd playwright install chromium');
  }

  const { default: worker } = await import('../dist/server/index.js');
  const app = await worker.fetch(new Request('https://career-radar.test/'), {});
  assert.equal(app.status, 200);
  const html = await app.text();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    const httpRequests = [];
    let submitted = null;
    let evaluated = null;

    page.on('pageerror', err => errors.push('pageerror: ' + err.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

    await page.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      httpRequests.push(url.pathname);
      if (url.origin !== 'https://career-radar.test') {
        errors.push('Unexpected external request: ' + url.hostname);
        return route.fulfill({ status: 403, body: 'External requests are prohibited in the offline smoke test.' });
      }
      if (url.pathname === '/') {
        return route.fulfill({ status: 200, contentType: 'text/html', body: html });
      }
      if (url.pathname === '/api/me') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          email: 'synthetic@example.invalid', cv_text: cv,
          preferences: { location: 'Crawley', radius: 10, salary_floor: 35000, min_months: 6, keywords: 'training coordinator' },
          consent_ai: false, ai_enabled: false
        }) });
      }
      if (url.pathname === '/api/applications' || url.pathname === '/api/feedback') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"results":[]}' });
      }
      if (url.pathname === '/api/evaluate' && request.method() === 'POST') {
        submitted = JSON.parse(request.postData());
        const apiRequest = new Request('https://career-radar.test/api/evaluate', {
          method: 'POST',
          headers: { 'oai-authenticated-user-id': 'synthetic-test-user', 'content-type': 'application/json' },
          body: JSON.stringify(submitted)
        });
        const result = await worker.fetch(apiRequest, { DB: fakeDatabase() });
        const body = await result.text();
        if (result.status === 200) evaluated = JSON.parse(body).result;
        return route.fulfill({ status: result.status, contentType: 'application/json', body });
      }
      // Chromium may request favicon; fulfill it without network or console 404s.
      return route.fulfill({ status: 204, body: '' });
    });

    await page.goto('https://career-radar.test/', { waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('heading')?.textContent?.includes('Welcome back'));
    await page.locator('[data-tab="search"]').click();
    assert.equal(await page.locator('section#search').isVisible(), true);

    await page.locator('#manualTitle').fill('Training Coordinator');
    await page.locator('#manualCompany').fill('Example Employer (synthetic)');
    await page.locator('#manualLocation').fill('London');
    await page.locator('#manualClosing').fill('2020-10-15');
    await page.locator('#manualSalaryMin').fill('38000');
    await page.locator('#manualSalaryMax').fill('42000');
    await page.locator('#manualContractType').selectOption('fixed-term');
    await page.locator('#manualContractMonths').fill('12');
    await page.locator('#manualSourceUrl').fill('https://example.invalid/jobs/123');
    await page.locator('#manualDescription').fill(description);
    await page.locator('#evaluateBtn').click();

    await page.locator('#scoreResult h3').filter({ hasText: /^Skip$/ }).waitFor();
    assert.ok(submitted && submitted.job, 'UI did not POST its job data');
    assert.equal(submitted.job.closing_date, '2020-10-15');
    assert.equal(submitted.job.salary_min, '38000');
    assert.equal(submitted.job.salary_max, '42000');
    assert.equal(submitted.job.contract_type, 'fixed-term');
    assert.equal(submitted.job.contract_months, '12');
    assert.equal(submitted.job.location, 'London');
    assert.equal(submitted.job.employer, 'Example Employer (synthetic)');
    assert.equal(submitted.job.source_url, 'https://example.invalid/jobs/123');
    assert.ok(submitted.job.description.length > 100);

    assert.equal(evaluated?.engine_version, '5.4.0');
    assert.equal(evaluated?.eligibility?.status, 'ineligible');
    assert.equal(evaluated?.decision, 'Skip');
    assert.equal(evaluated?.fit_score, null);
    assert.match(await page.locator('#scoreResult .score').innerText(), /unrated/i);
    assert.equal(errors.length, 0, 'Browser errors: ' + errors.join('; '));
    assert.ok(httpRequests.includes('/api/evaluate'));
    console.log('V5.4 verified: UI -> structured POST -> offline Worker -> Skip + null score; zero JS errors; no external APIs.');
  } finally {
    await browser.close();
  }
});
