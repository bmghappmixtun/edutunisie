import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome', args: ['--no-sandbox'] });
try {
  const page1 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page1.goto('http://localhost:3313/enseignant/ajouter', { waitUntil: 'networkidle' });
  await page1.waitForTimeout(1500);
  await page1.screenshot({ path: '/tmp/ajouter-initial.png', fullPage: true });
  console.log('OK initial');
  await page1.close();
} catch (e) { console.error('initial:', e.message); }

try {
  const page2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page2.goto('http://localhost:3313/enseignant/ajouter', { waitUntil: 'networkidle' });
  await page2.waitForTimeout(1500);
  const buttons = await page2.locator('button:has-text("Devoir")').all();
  if (buttons.length > 0) {
    await buttons[0].click();
    await page2.waitForTimeout(500);
    await page2.screenshot({ path: '/tmp/ajouter-devoir.png', fullPage: true });
    console.log('OK devoir');
  }
  await page2.close();
} catch (e) { console.error('devoir:', e.message); }

try {
  const page3 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page3.goto('http://localhost:3313/enseignant/ajouter', { waitUntil: 'networkidle' });
  await page3.waitForTimeout(1500);
  const buttons = await page3.locator('button:has-text("Autres")').all();
  if (buttons.length > 0) {
    await buttons[0].click();
    await page3.waitForTimeout(500);
    await page3.screenshot({ path: '/tmp/ajouter-autres.png', fullPage: true });
    console.log('OK autres');
  }
  await page3.close();
} catch (e) { console.error('autres:', e.message); }

await browser.close();
