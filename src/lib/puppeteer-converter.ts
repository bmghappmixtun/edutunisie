/**
 * Puppeteer + Chromium converter — TOTALLY FREE, no API key required
 *
 * Strategy: mammoth extracts the .docx content as HTML, then a headless
 * Chromium (via @sparticuz/chromium, designed for serverless) renders the
 * HTML and outputs a PDF.
 *
 * Why this combo:
 * - mammoth: pure-JS, no API key, excellent .docx parsing (preserves images
 *   as base64, headings, tables, lists, bold/italic, links)
 * - Chromium: full HTML/CSS rendering engine, same one used by Google Docs
 *   and Microsoft Word Online
 *
 * Works on Vercel (uses @sparticuz/chromium's optimized binary that
 * doesn't need apt deps). 100% free, no signup, no quota, no rate limits.
 *
 * Tradeoffs:
 * - Cold start: 2-4s (chromium binary is ~50MB, downloaded on first use)
 * - Memory: ~300MB peak during conversion
 * - Timeout: conversion runs in a Vercel function (max 60s on Hobby, 300s on Pro)
 */

import chromium from '@sparticuz/chromium';
import puppeteer, { Browser } from 'puppeteer-core';
import mammoth from 'mammoth';

export class PuppeteerConvertError extends Error {
  constructor(
    message: string,
    public step: 'mammoth' | 'launch' | 'render' | 'export' = 'mammoth'
  ) {
    super(message);
    this.name = 'PuppeteerConvertError';
  }
}

let _browserPromise: Promise<Browser> | null = null;

/**
 * Get a singleton browser instance (singleton keeps memory low across invocations)
 * Note: on serverless, this cache only lives within a single function instance.
 */
async function getBrowser(): Promise<Browser> {
  if (_browserPromise) return _browserPromise;
  _browserPromise = (async () => {
    const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL;
    const executablePath = isLocal
      ? (process.env.CHROME_PATH || undefined) // local: use system Chrome
      : await chromium.executablePath();

    if (!executablePath) {
      throw new PuppeteerConvertError(
        'Chromium binary non trouvé. Sur Vercel, @sparticuz/chromium télécharge automatiquement; en local, installez Chrome ou Chromium et définissez CHROME_PATH.',
        'launch'
      );
    }

    return puppeteer.launch({
      executablePath,
      headless: true,
      args: isLocal
        ? ['--no-sandbox', '--disable-setuid-sandbox']
        : [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
    });
  })();
  return _browserPromise;
}

/**
 * Convert a .docx buffer to a PDF using mammoth + Puppeteer
 */
export async function convertDocxToPdfViaPuppeteer(
  fileBuffer: Buffer,
  options: { fileName?: string; title?: string; author?: string } = {}
): Promise<{ pdfBuffer: Buffer; pdfSize: number; warnings: string[] }> {
  const warnings: string[] = [];

  // 1. Extract HTML from .docx with mammoth
  let html: string;
  let plainText: string;
  try {
    const result = await mammoth.convertToHtml({ buffer: fileBuffer });
    html = result.value;
    const textResult = await mammoth.extractRawText({ buffer: fileBuffer });
    plainText = textResult.value;
    if (result.messages && result.messages.length > 0) {
      const serious = result.messages.filter(
        (m) => /unsupported|error/i.test(m.type || '')
      );
      if (serious.length > 0) {
        warnings.push(
          `${serious.length} élément(s) non supporté(s) (formules complexes, etc.).`
        );
      }
    }
  } catch (err: any) {
    throw new PuppeteerConvertError(
      `mammoth n'a pas pu lire le .docx: ${err?.message || 'erreur'}`,
      'mammoth'
    );
  }

  if (!html || html.trim().length === 0) {
    throw new PuppeteerConvertError(
      'Le document ne contient pas de contenu extractible (images-only ?).',
      'mammoth'
    );
  }

  // 2. Wrap HTML in a styled page (A4, normal margins, print-friendly CSS)
  const title = options.title || options.fileName || 'Document';
  const author = options.author || 'Examanet';
  const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 18mm 15mm; }
  body {
    font-family: 'Helvetica', 'Arial', sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #0F172A;
    margin: 0;
    padding: 0;
  }
  h1, h2, h3, h4, h5, h6 { margin: 1.2em 0 0.5em; line-height: 1.25; page-break-after: avoid; }
  h1 { font-size: 20pt; border-bottom: 2px solid #0EA5E9; padding-bottom: 4px; }
  h2 { font-size: 16pt; color: #0369A1; }
  h3 { font-size: 13pt; color: #0F172A; }
  p { margin: 0.5em 0; text-align: justify; orphans: 3; widows: 3; }
  img { max-width: 100%; height: auto; page-break-inside: avoid; }
  table { border-collapse: collapse; width: 100%; margin: 0.8em 0; page-break-inside: avoid; }
  th, td { border: 1px solid #CBD5E1; padding: 6px 8px; }
  th { background: #F1F5F9; font-weight: 600; }
  ul, ol { margin: 0.5em 0; padding-left: 1.5em; }
  li { margin: 0.2em 0; }
  blockquote { border-left: 3px solid #94A3B8; margin: 0.8em 0; padding: 0.4em 0.8em; color: #475569; font-style: italic; }
  code { font-family: 'Courier New', monospace; font-size: 0.9em; background: #F1F5F9; padding: 1px 4px; border-radius: 3px; }
  pre { background: #F1F5F9; padding: 8px 12px; border-radius: 6px; overflow-x: auto; font-size: 0.9em; }
  .footer { margin-top: 2em; padding-top: 0.5em; border-top: 1px solid #E2E8F0; color: #94A3B8; font-size: 9pt; text-align: center; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>
  ${html}
  <div class="footer">Converti par Examanet (mammoth + Chromium) • ${escapeHtml(author)}</div>
</body>
</html>`;

  // 3. Launch Chromium and render the HTML to PDF
  let browser: Browser;
  try {
    browser = await getBrowser();
  } catch (err: any) {
    throw new PuppeteerConvertError(
      `Chromium impossible à lancer: ${err?.message || 'erreur'}`,
      'launch'
    );
  }

  let pdfBuffer: Buffer;
  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' as any, timeout: 30000 });

    const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '18mm',
        right: '15mm',
        bottom: '18mm',
        left: '15mm',
      },
      displayHeaderFooter: false,
    });
    pdfBuffer = Buffer.from(pdfUint8);

    await page.close();
  } catch (err: any) {
    try { await browser.close(); } catch { /* ignore */ }
    _browserPromise = null;
    throw new PuppeteerConvertError(
      `Rendu PDF échoué: ${err?.message || 'erreur'}`,
      'export'
    );
  }

  if (!pdfBuffer || pdfBuffer.length < 100) {
    throw new PuppeteerConvertError('PDF généré vide ou trop petit', 'export');
  }
  if (!pdfBuffer.subarray(0, 4).toString().startsWith('%PDF')) {
    throw new PuppeteerConvertError(
      'Le fichier généré n\'est pas un PDF valide',
      'export'
    );
  }

  return {
    pdfBuffer,
    pdfSize: pdfBuffer.length,
    warnings,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
