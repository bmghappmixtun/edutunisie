import { test, expect } from '@playwright/test';

test('brand kit visible on home + header', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Header wordmark: 'exam' navy + 'anet' orange
  const exam = page.locator('header span:text-is("exam")').first();
  const anet = page.locator('header span:text-is("anet")').first();
  await expect(exam).toBeVisible();
  await expect(anet).toBeVisible();

  const examColor = await exam.evaluate(el => getComputedStyle(el).color);
  const anetColor = await anet.evaluate(el => getComputedStyle(el).color);
  console.log('exam color:', examColor);
  console.log('anet color:', anetColor);
  // exam should be navy-ish (close to rgb(6, 38, 78))
  expect(examColor).toMatch(/rgb\(6,\s*38,\s*78\)/);
  // anet should be orange-ish (close to rgb(250, 140, 49))
  expect(anetColor).toMatch(/rgb\(250,\s*140,\s*49\)/);

  // Home hero should show the brand logo
  await expect(page.locator('img[alt="Examanet"]').first()).toBeVisible();

  // OG image available
  const ogResp = await page.request.get('/og-image.png');
  expect(ogResp.status()).toBe(200);
  expect(Number(ogResp.headers()['content-length'])).toBeGreaterThan(100000);

  // Favicon available
  const favResp = await page.request.get('/favicon.ico');
  expect(favResp.status()).toBe(200);

  await page.screenshot({ path: 'tests/e2e/screenshots/brand-home.png', fullPage: false });
});