import { test } from '@playwright/test';
const BASE = 'https://edutunisie.vercel.app';

test('debug zoom interaction', async ({ page }) => {
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('ERROR:', err.message));

  await page.goto(`${BASE}/ressources/devoir-de-contr-le-n-6-math-devoir-9-me-2024-2025-gharbi-rid-pyixA/viewer`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('--- Initial state ---');
  let btn = page.locator('button[aria-label="Réinitialiser le zoom"]');
  console.log('Button count:', await btn.count());
  console.log('Text:', await btn.textContent({ timeout: 3000 }));

  console.log('--- Clicking Zoom avant ---');
  await page.locator('button[aria-label="Zoom avant"]').click();
  await page.waitForTimeout(1500);

  console.log('--- After click ---');
  btn = page.locator('button[aria-label="Réinitialiser le zoom"]');
  console.log('Button count:', await btn.count());
  try {
    console.log('Text:', await btn.textContent({ timeout: 3000 }));
  } catch (e) {
    console.log('Could not get text:', e.message);
  }
});
