import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('PDF Viewer', () => {
  let resourceSlug: string;

  test.beforeAll(async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: BASE });
    try {
      // Get a PDF resource from /ressources
      const res = await ctx.get(`${BASE}/ressources`);
      const html = await res.text();
      const match = html.match(/\/ressources\/([a-z0-9-]+)\/viewer/);
      // Fallback: get a resource slug
      const slugMatch = html.match(/\/ressources\/([a-z0-9-]+)(?!["])/);
      resourceSlug = slugMatch ? slugMatch[1] : '';
      // Filter out non-resource links
      if (resourceSlug && !resourceSlug.includes('-')) resourceSlug = '';

      // If no viewer link, get any resource link and add /viewer
      if (!resourceSlug) {
        const allMatches = Array.from(html.matchAll(/\/ressources\/([a-z0-9-]+)/g));
        for (const m of allMatches) {
          const slug = m[1];
          if (slug !== 'page' && slug.length > 5) {
            resourceSlug = slug;
            break;
          }
        }
      }
      console.log('Test resource slug:', resourceSlug);
    } finally {
      await ctx.dispose();
    }
  });

  test('PDF viewer page loads without client-side error', async ({ page }) => {
    // Capture console errors
    const consoleErrors: string[] = [];
    page.on('pageerror', err => consoleErrors.push(err.message));

    await page.goto(`${BASE}/ressources/${resourceSlug}/viewer`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for viewer to render
    await page.waitForTimeout(3000);

    // Should NOT see "Application error" page
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('Application error');
    expect(bodyText).not.toContain('client-side exception');
    console.log('✓ No client-side error');

    // Should see the toolbar buttons
    const chevronLeft = page.locator('button[aria-label="Page précédente"]');
    const chevronRight = page.locator('button[aria-label="Page suivante"]');
    const zoomIn = page.locator('button[aria-label="Zoom avant"]');
    const zoomOut = page.locator('button[aria-label="Zoom arrière"]');

    await expect(chevronLeft).toBeVisible();
    await expect(chevronRight).toBeVisible();
    await expect(zoomIn).toBeVisible();
    await expect(zoomOut).toBeVisible();
    console.log('✓ Toolbar buttons present');

    // No console errors
    if (consoleErrors.length > 0) {
      console.log('⚠️ Console errors:', consoleErrors);
    }
    expect(consoleErrors.length).toBe(0);
  });

  test('Zoom in button increases zoom level', async ({ page }) => {
    await page.goto(`${BASE}/ressources/${resourceSlug}/viewer`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);

    // Wait for page to load
    await page.waitForSelector('.pdf-viewer-container', { timeout: 10000 });

    // Get initial zoom
    const zoomButton = page.locator('button[aria-label="Réinitialiser le zoom"]');
    const initialText = await zoomButton.textContent();
    const initialPct = parseInt(initialText?.match(/\d+/)?.[0] || '0');
    console.log('Initial zoom:', initialPct + '%');

    // Click zoom in
    await page.locator('button[aria-label="Zoom avant"]').click();
    await page.waitForTimeout(500);

    const newText = await zoomButton.textContent();
    const newPct = parseInt(newText?.match(/\d+/)?.[0] || '0');
    console.log('After zoom in:', newPct + '%');

    expect(newPct).toBeGreaterThan(initialPct);
    console.log('✓ Zoom in works');
  });

  test('Zoom out button decreases zoom level', async ({ page }) => {
    await page.goto(`${BASE}/ressources/${resourceSlug}/viewer`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);
    await page.waitForSelector('.pdf-viewer-container', { timeout: 10000 });

    const zoomButton = page.locator('button[aria-label="Réinitialiser le zoom"]');
    const initialText = await zoomButton.textContent();
    const initialPct = parseInt(initialText?.match(/\d+/)?.[0] || '0');
    console.log('Initial zoom:', initialPct + '%');

    await page.locator('button[aria-label="Zoom arrière"]').click();
    await page.waitForTimeout(500);

    const newText = await zoomButton.textContent();
    const newPct = parseInt(newText?.match(/\d+/)?.[0] || '0');
    console.log('After zoom out:', newPct + '%');

    expect(newPct).toBeLessThan(initialPct);
    console.log('✓ Zoom out works');
  });

  test('Next page button advances page', async ({ page }) => {
    await page.goto(`${BASE}/ressources/${resourceSlug}/viewer`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);
    await page.waitForSelector('.pdf-viewer-container', { timeout: 10000 });

    // Wait for PDF to load
    await page.waitForTimeout(2000);

    // Find page input
    const pageInput = page.locator('input[aria-label="Numéro de page"]');
    const initialValue = await pageInput.inputValue();
    console.log('Initial page:', initialValue);

    // Click next page
    await page.locator('button[aria-label="Page suivante"]').click();
    await page.waitForTimeout(500);

    const newValue = await pageInput.inputValue();
    console.log('After next:', newValue);

    expect(parseInt(newValue)).toBe(parseInt(initialValue) + 1);
    console.log('✓ Next page works');
  });

  test('Prev page button goes back', async ({ page }) => {
    await page.goto(`${BASE}/ressources/${resourceSlug}/viewer`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);
    await page.waitForSelector('.pdf-viewer-container', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const pageInput = page.locator('input[aria-label="Numéro de page"]');
    const initialValue = await pageInput.inputValue();

    // Go to page 2 first
    await page.locator('button[aria-label="Page suivante"]').click();
    await page.waitForTimeout(500);

    // Now go back
    await page.locator('button[aria-label="Page précédente"]').click();
    await page.waitForTimeout(500);

    const newValue = await pageInput.inputValue();
    console.log('Prev button: page from', initialValue, '→ 2 → ', newValue);
    expect(parseInt(newValue)).toBe(parseInt(initialValue));
    console.log('✓ Prev page works');
  });

  test('Keyboard arrows navigate pages', async ({ page }) => {
    await page.goto(`${BASE}/ressources/${resourceSlug}/viewer`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);
    await page.waitForSelector('.pdf-viewer-container', { timeout: 10000 });
    await page.waitForTimeout(2000);

    const pageInput = page.locator('input[aria-label="Numéro de page"]');
    const initialValue = await pageInput.inputValue();

    // Press right arrow
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);

    const after1 = await pageInput.inputValue();
    expect(parseInt(after1)).toBe(parseInt(initialValue) + 1);
    console.log('✓ ArrowRight works');

    // Press left arrow
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);

    const after2 = await pageInput.inputValue();
    expect(parseInt(after2)).toBe(parseInt(initialValue));
    console.log('✓ ArrowLeft works');
  });

  test('Reset zoom button returns to 100%', async ({ page }) => {
    await page.goto(`${BASE}/ressources/${resourceSlug}/viewer`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(2000);
    await page.waitForSelector('.pdf-viewer-container', { timeout: 10000 });

    const zoomButton = page.locator('button[aria-label="Réinitialiser le zoom"]');

    // Zoom in several times
    await page.locator('button[aria-label="Zoom avant"]').click();
    await page.locator('button[aria-label="Zoom avant"]').click();
    await page.waitForTimeout(300);

    const before = await zoomButton.textContent();
    console.log('Before reset:', before);

    // Click reset
    await zoomButton.click();
    await page.waitForTimeout(300);

    const after = await zoomButton.textContent();
    console.log('After reset:', after);

    expect(after).toContain('120%'); // DEFAULT_SCALE * 100
    console.log('✓ Reset zoom works (returned to 120%)');
  });
});