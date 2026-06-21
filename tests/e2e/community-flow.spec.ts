import { test, expect } from '@playwright/test';

test.describe('Community teacher sharing', () => {
  test('student does NOT see Original download button', async ({ page }) => {
    // Login as student
    await page.goto('/connexion');
    await page.fill('input[type="email"]', 'yassine@example.com');
    await page.fill('input[type="password"]', 'demo1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/mon-compte|eleve|student|profil/, { timeout: 15000 });

    // Go to any resource
    await page.goto('/ressources');
    const firstResource = page.locator('a[href^="/ressources/"]').first();
    await firstResource.click();
    await page.waitForLoadState('networkidle');

    // Look for Original button (should NOT exist for students)
    const originalBtn = page.locator('button:has-text("Original")');
    const count = await originalBtn.count();
    console.log(`Student sees ${count} Original buttons (should be 0)`);
    expect(count).toBe(0);

    await page.screenshot({ path: 'tests/e2e/screenshots/student-no-original.png', fullPage: true });
  });

  test('teacher sees Original download button + community page', async ({ page }) => {
    // Login as teacher
    await page.goto('/connexion');
    await page.fill('input[type="email"]', 'ahmed.benali@edutunisie.tn');
    await page.fill('input[type="password"]', 'demo1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/mon-compte|enseignant/, { timeout: 15000 });

    // Go to community page
    await page.goto('/enseignant/communaute');
    await expect(page.locator('h1:has-text("Communauté")')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'tests/e2e/screenshots/teacher-community.png', fullPage: true });

    // Should show hero stats
    await expect(page.locator('text=fichiers partagés')).toBeVisible();
    await expect(page.locator('text=enseignants actifs')).toBeVisible();
  });

  test('inscription page shows teacher motivation banner', async ({ page }) => {
    await page.goto('/inscription');

    // Click on teacher option
    await page.click('button:has-text("Enseignant")');

    // Should show motivation banner
    await expect(page.locator('text=Rejoignez la communauté des enseignants')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Bibliothèque personnelle')).toBeVisible();
    await expect(page.locator('text=Conversion Word → PDF')).toBeVisible();
    await expect(page.locator('text=Communauté unique en Tunisie')).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/inscription-teacher.png', fullPage: true });

    // Click on student option
    await page.click('button:has-text("Élève")');
    await expect(page.locator('text=milliers de ressources gratuites')).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/inscription-student.png', fullPage: true });
  });

  test('home page shows new feature cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should show new feature cards
    await expect(page.locator('text=Bibliothèque personnelle').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Conversion Word → PDF').first()).toBeVisible();
    await expect(page.locator('text=Communauté enseignants').first()).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/screenshots/home-features.png', fullPage: true });
  });
});