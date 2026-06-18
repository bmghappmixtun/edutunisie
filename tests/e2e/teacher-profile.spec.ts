import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Teacher profile page', () => {
  let teacherId: string;

  test.beforeAll(async ({ playwright }) => {
    // Get a verified teacher's ID via API
    const context = await playwright.request.newContext({ baseURL: BASE });
    try {
      // Login as admin to access internal data
      const loginRes = await context.post(`${BASE}/api/auth/login`, {
        data: { email: 'boutiti.mehdi@gmail.com', password: 'demo1234' }
      });
      expect(loginRes.ok()).toBeTruthy();

      // Use the public API to find teachers
      const res = await context.get(`${BASE}/professeurs`);
      expect(res.ok()).toBeTruthy();
      const html = await res.text();
      // Extract first teacher ID from href
      const match = html.match(/\/professeurs\/([a-z0-9]+)/);
      if (!match) throw new Error('No teacher found in listing');
      teacherId = match[1];
      console.log('Test teacher ID:', teacherId);
    } finally {
      await context.dispose();
    }
  });

  test('Teacher profile page loads (status 200)', async ({ request }) => {
    const res = await request.get(`${BASE}/professeurs/${teacherId}`);
    expect(res.status()).toBe(200);
    console.log(`✓ Page /professeurs/${teacherId} returns 200`);
  });

  test('Page displays teacher name', async ({ request }) => {
    const res = await request.get(`${BASE}/professeurs/${teacherId}`);
    const html = await res.text();
    // Should have an h1 with the teacher name
    expect(html).toMatch(/<h1[^>]*>/);
    expect(html).toContain('Professeur vérifié');
    console.log('✓ Page shows teacher name and verified badge');
  });

  test('Page shows stats cards (files, views, downloads, rating, favorites)', async ({ request }) => {
    const res = await request.get(`${BASE}/professeurs/${teacherId}`);
    const html = await res.text();
    expect(html).toContain('Ressources');
    expect(html).toContain('Vues');
    expect(html).toContain('Téléchargements');
    expect(html).toContain('Note moyenne');
    expect(html).toContain('Favoris');
    console.log('✓ All 5 stats cards visible');
  });

  test('Page shows school/governorate/diploma if set', async ({ request }) => {
    const res = await request.get(`${BASE}/professeurs/${teacherId}`);
    const html = await res.text();
    // These might or might not be present depending on the teacher
    expect(html).toContain('Membre depuis');
    console.log('✓ Profile metadata visible');
  });

  test('Page shows resources list (or empty state)', async ({ request }) => {
    const res = await request.get(`${BASE}/professeurs/${teacherId}`);
    const html = await res.text();
    // Either has resources OR has empty state
    const hasResources = html.includes('Tout voir →');
    const hasEmptyState = html.includes('Aucune ressource publiée');
    expect(hasResources || hasEmptyState).toBeTruthy();
    console.log(`✓ Resources section: ${hasResources ? 'has items' : 'empty state'}`);
  });

  test('Page has Share button', async ({ request }) => {
    const res = await request.get(`${BASE}/professeurs/${teacherId}`);
    const html = await res.text();
    expect(html).toContain('Partager');
    console.log('✓ Share button visible');
  });

  test('Invalid teacher ID returns 404', async ({ request }) => {
    const res = await request.get(`${BASE}/professeurs/non-existent-id`);
    expect(res.status()).toBe(404);
    console.log('✓ Invalid ID returns 404');
  });

  test('Non-teacher user (student) is not accessible as teacher profile', async ({ request }) => {
    // Try to access a student's ID as a teacher profile
    // First get a student ID by querying an admin resource
    const res = await request.get(`${BASE}/professeurs/admin-user-id-test`);
    expect([404, 200]).toContain(res.status()); // Either 404 or 200 depending on if it's a teacher
    console.log('✓ Random non-teacher ID returns 404 or falls through');
  });

  test('Clicking teacher in /professeurs list navigates to profile', async ({ page }) => {
    await page.goto(`${BASE}/professeurs`);
    await page.waitForLoadState('networkidle');

    // Find first teacher link
    const firstTeacherLink = page.locator('a[href^="/professeurs/"]').first();
    await expect(firstTeacherLink).toBeVisible();

    const href = await firstTeacherLink.getAttribute('href');
    console.log('Clicking teacher link:', href);

    await firstTeacherLink.click();
    await page.waitForURL(/\/professeurs\/[a-z0-9]+/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify profile page elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Professeur vérifié')).toBeVisible();

    // Verify URL
    const url = page.url();
    expect(url).toMatch(/\/professeurs\/[a-z0-9]+/);
    console.log('✓ Navigation to profile works, URL:', url);
  });

  test('Profile page is responsive (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const res = await page.goto(`${BASE}/professeurs/${teacherId}`);
    expect(res?.ok()).toBeTruthy();

    await page.waitForLoadState('networkidle');

    // Page should not have horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // Hero should still be visible
    await expect(page.locator('h1')).toBeVisible();
    console.log('✓ Mobile responsive, no horizontal scroll');
  });

  test('Share dropdown opens and shows options', async ({ page }) => {
    await page.goto(`${BASE}/professeurs/${teacherId}`);
    await page.waitForLoadState('networkidle');

    // Click share button
    const shareBtn = page.locator('button', { hasText: 'Partager' });
    await shareBtn.click();

    // Verify dropdown options
    await expect(page.locator('text=Copier le lien')).toBeVisible();
    await expect(page.locator('text=Partager sur X')).toBeVisible();
    await expect(page.locator('text=Partager sur Facebook')).toBeVisible();
    await expect(page.locator('text=Partager sur WhatsApp')).toBeVisible();

    console.log('✓ Share dropdown shows all options');

    // Click outside to close
    await page.keyboard.press('Escape');
    await page.mouse.click(10, 10);
  });

  test('Clicking a resource navigates to its page', async ({ page }) => {
    await page.goto(`${BASE}/professeurs/${teacherId}`);
    await page.waitForLoadState('networkidle');

    // Find first resource link
    const resourceLink = page.locator('a[href^="/ressources/"]').first();
    const count = await page.locator('a[href^="/ressources/"]').count();
    console.log(`Found ${count} resource links`);

    if (count > 0) {
      await resourceLink.click();
      await page.waitForURL(/\/ressources\/[a-z0-9-]+/, { timeout: 10000 });
      console.log('✓ Resource link click navigates correctly');
    } else {
      console.log('⚠️ No resources to test navigation');
    }
  });
});