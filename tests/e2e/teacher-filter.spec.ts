import { test, expect } from '@playwright/test';

const TEACHER_ID = 'cmqj8v8c90002hqfuq6knpy3k';

test('teacher profile shows "166 Ressources"', async ({ page }) => {
  await page.goto(`/professeurs/${TEACHER_ID}`);
  await page.waitForLoadState('networkidle');
  const body = await page.content();
  expect(body).toContain('Ressources (', '166');
});

test('"voir tout" filter shows 166 not 234', async ({ page }) => {
  await page.goto(`/ressources?teacher=${TEACHER_ID}`);
  await expect(page.locator('h1:has-text("Ressources de l")')).toBeVisible();
  const body = await page.content();
  // Should contain 166 (teacher's total), not 234 (platform total)
  expect(body).toMatch(/\b166\b/);
  // Should NOT contain 234
  expect(body).not.toMatch(/\b234\b/);
  await page.screenshot({ path: 'tests/e2e/screenshots/teacher-filter-fixed.png', fullPage: false });
});

test('"voir tout" with no teacher param shows all 234', async ({ page }) => {
  await page.goto('/ressources');
  await expect(page.locator('h1:has-text("Toutes les ressources")')).toBeVisible();
  const body = await page.content();
  expect(body).toMatch(/\b234\b/);
});