import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ 
  viewport: { width: 1280, height: 800 },
  ignoreHTTPSErrors: true,
});
const page = await ctx.newPage();
await page.goto('https://edutunisie-j735y6x19-boutitimehdi-6668s-projects.vercel.app/fr/ressources/3987', { waitUntil: 'networkidle' });
// Find the stats line
const info = await page.evaluate(() => {
  // Find the div with KB text
  const divs = Array.from(document.querySelectorAll('#resource-scribd-header div'));
  const stats = divs.find(d => d.textContent && d.textContent.includes('KB ') && d.textContent.includes('vues'));
  if (!stats) return { found: false };
  const cs = getComputedStyle(stats);
  const rect = stats.getBoundingClientRect();
  return {
    found: true,
    direction: cs.direction,
    display: cs.display,
    flexDirection: cs.flexDirection,
    justifyContent: cs.justifyContent,
    textAlign: cs.textAlign,
    width: rect.width,
    left: rect.left,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
