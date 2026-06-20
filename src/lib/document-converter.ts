/**
 * Document conversion utilities
 *
 * Converts various formats (.docx, .doc, .odt) to PDF using a server-side
 * Chromium via @sparticuz/chromium (works on Vercel serverless + Lambda).
 *
 * Pipeline:
 *   .docx → mammoth → HTML → chromium → PDF
 *   .pdf  → passthrough (no conversion)
 *
 * For complex math/Arabic, the teacher is encouraged to also upload a
 * pre-made PDF, but the conversion will still produce a usable PDF.
 */

import mammoth from 'mammoth';

export type ConversionResult = {
  pdfBuffer: Buffer;
  htmlPreview?: string;  // intermediate HTML for preview/debug
  warnings: string[];
};

/**
 * Convert .docx → PDF
 * Uses mammoth to extract clean HTML, then renders to PDF via puppeteer
 */
export async function convertDocxToPdf(
  fileBuffer: Buffer,
  options: {
    title?: string;
    author?: string;
  } = {}
): Promise<ConversionResult> {
  const warnings: string[] = [];

  // 1. Extract HTML from .docx via mammoth
  const { value: html, messages } = await mammoth.convertToHtml(
    { buffer: fileBuffer },
    {
      // Mammoth style map for better conversion of math (uses OMML by default)
      // We keep defaults for now; teacher can re-upload PDF for complex docs.
    }
  );

  // Collect warnings from mammoth (e.g. unsupported elements)
  for (const msg of messages) {
    if (msg.type === 'warning') {
      warnings.push(`mammoth: ${msg.message}`);
    }
  }

  // 2. Wrap HTML in a styled page (RTL support, Arabic-friendly fonts)
  const fullHtml = buildPrintableHtml(html, options);

  // 3. Render to PDF via puppeteer + @sparticuz/chromium (works on Vercel)
  const pdfBuffer = await htmlToPdf(fullHtml, options);

  return { pdfBuffer, htmlPreview: html, warnings };
}

/**
 * Wrap extracted HTML in a printable document
 * - RTL detection (Arabic text)
 * - Arabic-friendly font fallback
 * - A4 page size, sane margins
 */
function buildPrintableHtml(content: string, opts: { title?: string; author?: string }): string {
  const isRtl = /[\u0600-\u06FF]/.test(content);
  const dir = isRtl ? 'rtl' : 'ltr';
  const lang = isRtl ? 'ar' : 'fr';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(opts.title || 'Document')}</title>
<style>
  @page {
    size: A4;
    margin: 20mm 15mm;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: 'Amiri', 'Noto Naskh Arabic', 'Arial', 'Liberation Sans', 'DejaVu Sans', sans-serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #1a1a1a;
    direction: ${dir};
  }
  body { padding: 0; }
  h1, h2, h3, h4, h5, h6 {
    margin: 0.6em 0 0.4em;
    color: #0f172a;
    font-weight: 700;
    page-break-after: avoid;
  }
  h1 { font-size: 1.8em; border-bottom: 2px solid #0EA5E9; padding-bottom: 6px; }
  h2 { font-size: 1.4em; color: #0369A1; }
  h3 { font-size: 1.2em; }
  p { margin: 0 0 0.7em; text-align: justify; orphans: 3; widows: 3; }
  ul, ol { margin: 0 0 0.7em 1.5em; padding: 0; }
  li { margin-bottom: 0.2em; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.5em 0;
    page-break-inside: avoid;
  }
  td, th {
    border: 1px solid #cbd5e1;
    padding: 6px 8px;
    text-align: ${isRtl ? 'right' : 'left'};
    vertical-align: top;
  }
  th { background: #f1f5f9; font-weight: 600; }
  img { max-width: 100%; height: auto; }
  blockquote {
    margin: 0.5em 0;
    padding: 0.5em 1em;
    border-${isRtl ? 'right' : 'left'}: 3px solid #0EA5E9;
    background: #f8fafc;
    color: #475569;
    font-style: italic;
  }
  code {
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.92em;
  }
  pre {
    background: #0f172a;
    color: #f1f5f9;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.9em;
  }
  /* Page breaks */
  h1, h2 { page-break-before: auto; }
  ${isRtl ? 'body { font-family: "Amiri", "Noto Naskh Arabic", "Traditional Arabic", serif; }' : ''}
  @media print {
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
${content}
</body>
</html>`;
}

/**
 * Render HTML to PDF using puppeteer + @sparticuz/chromium
 * Works on Vercel serverless (the bundled Chromium is Lambda-compatible)
 */
async function htmlToPdf(html: string, opts: { title?: string; author?: string }): Promise<Buffer> {
  // Lazy-load puppeteer-core + sparticuz chromium (heavy deps)
  const chromium = (await import('@sparticuz/chromium')).default;
  const puppeteer = await import('puppeteer-core');

  const browser = await puppeteer.launch({
    args: [
      ...chromium.args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' as any, timeout: 30000 });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      displayHeaderFooter: false,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/**
 * Detect file format from name or mime type
 */
export function detectFormat(filename: string, mimeType?: string): {
  format: 'pdf' | 'docx' | 'doc' | 'odt' | 'rtf' | 'unknown';
  isConvertible: boolean;
  isPdf: boolean;
} {
  const ext = filename.toLowerCase().split('.').pop() || '';

  if (ext === 'pdf' || mimeType === 'application/pdf') {
    return { format: 'pdf', isConvertible: false, isPdf: true };
  }
  if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return { format: 'docx', isConvertible: true, isPdf: false };
  }
  if (ext === 'doc' || mimeType === 'application/msword') {
    return { format: 'doc', isConvertible: true, isPdf: false };
  }
  if (ext === 'odt' || mimeType === 'application/vnd.oasis.opendocument.text') {
    return { format: 'odt', isConvertible: true, isPdf: false };
  }
  if (ext === 'rtf' || mimeType === 'application/rtf') {
    return { format: 'rtf', isConvertible: true, isPdf: false };
  }
  return { format: 'unknown', isConvertible: false, isPdf: false };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}