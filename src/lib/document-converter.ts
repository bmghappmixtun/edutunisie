/**
 * Document conversion utilities
 *
 * Converts .docx (and other Office formats) to PDF for the teacher library
 * and the "ajouter une ressource" flow.
 *
 * Conversion chain (tries each in order, falls back automatically):
 *   1. iLoveAPI         — high quality, hosted LibreOffice, requires API keys (paid)
 *   2. Gotenberg        — totally free, open-source, self-hosted, requires URL
 *   3. Puppeteer+Chromium — totally free, no config, slower (cold start ~3s)
 *   4. ConvertAPI       — free tier (1500/mo), requires API token
 *   5. original only    — last resort, just store the .docx + warn the user
 *
 * Recommended free setup:
 *   - Deploy Gotenberg on Render.com (free Docker tier) or Fly.io
 *   - Set GOTENBERG_URL=https://your-gotenberg.onrender.com
 *   - Done. Free forever, no quota, high quality (LibreOffice).
 */

import { convertOfficeToPdfViaIloveapi, IloveapiError } from './iloveapi';
import { convertOfficeToPdfViaGotenberg, GotenbergError } from './gotenberg';
import { convertDocxToPdfViaPuppeteer, PuppeteerConvertError } from './puppeteer-converter';
import { convertOfficeToPdfViaConvertApi, ConvertApiError } from './convertapi';

export type ConversionResult = {
  pdfBuffer?: Buffer;
  pdfSize?: number;
  warnings: string[];
  provider: 'iloveapi' | 'gotenberg' | 'puppeteer' | 'convertapi' | 'none' | 'failed';
};

/**
 * Convert a .docx buffer to a PDF
 * Tries providers in order until one succeeds
 */
export async function convertDocxToPdf(
  fileBuffer: Buffer,
  options: {
    fileName?: string;
    title?: string;
    author?: string;
  } = {}
): Promise<ConversionResult> {
  const warnings: string[] = [];

  // Defensive check: skip PDF files (no conversion needed)
  if (options.fileName) {
    const fmt = detectFormat(options.fileName);
    if (fmt.isPdf) {
      return { warnings, provider: 'none' };
    }
  }

  // ============== PROVIDER 1: iLoveAPI (high quality, paid) ==============
  const ilovePublicKey = process.env.I_LOVE_API_PUBLIC_KEY;
  const iloveSecretKey = process.env.I_LOVE_API_SECRET_KEY || process.env.I_LOVE_API_KEY;

  if (ilovePublicKey && iloveSecretKey) {
    try {
      const fileName = options.fileName || 'document.docx';
      const result = await convertOfficeToPdfViaIloveapi(
        fileBuffer,
        fileName,
        ilovePublicKey,
        iloveSecretKey
      );
      return {
        pdfBuffer: result.pdfBuffer,
        pdfSize: result.pdfSize,
        warnings: [...warnings, ...result.warnings],
        provider: 'iloveapi',
      };
    } catch (err) {
      let msg = 'Erreur inconnue';
      if (err instanceof IloveapiError) msg = `iLoveAPI (${err.step}): ${err.message}`;
      else if (err instanceof Error) msg = err.message;
      console.warn('[document-converter] iLoveAPI failed, falling back to Gotenberg:', msg);
      warnings.push(`iLoveAPI indisponible (${msg}).`);
    }
  } else {
    warnings.push('iLoveAPI non configuré.');
  }

  // ============== PROVIDER 2: Gotenberg (self-hosted, totally free) ==============
  // Recommended free plan: deploy Gotenberg on Render.com / Fly.io / your VPS.
  // Quality: LibreOffice based, identical to paid services.
  const gotenbergUrl = process.env.GOTENBERG_URL;
  if (gotenbergUrl) {
    try {
      const fileName = options.fileName || 'document.docx';
      const result = await convertOfficeToPdfViaGotenberg(fileBuffer, fileName, {
        url: gotenbergUrl,
        apiKey: process.env.GOTENBERG_API_KEY,
      });
      return {
        pdfBuffer: result.pdfBuffer,
        pdfSize: result.pdfSize,
        warnings: [...warnings, ...result.warnings],
        provider: 'gotenberg',
      };
    } catch (err) {
      let msg = 'Erreur inconnue';
      if (err instanceof GotenbergError) msg = `Gotenberg (${err.step}): ${err.message}`;
      else if (err instanceof Error) msg = err.message;
      console.warn('[document-converter] Gotenberg failed, falling back to Puppeteer:', msg);
      warnings.push(`Gotenberg indisponible (${msg}).`);
    }
  } else {
    warnings.push('Gotenberg non configuré (GOTENBERG_URL manquant).');
  }

  // ============== PROVIDER 3: Puppeteer + Chromium (totally free, no config) ==============
  // Always-available fallback. Slower cold start (~3s for chromium download on
  // first use per cold server). Quality: very good (full HTML rendering).
  try {
    const fileName = options.fileName || 'document.docx';
    const result = await convertDocxToPdfViaPuppeteer(fileBuffer, {
      fileName,
      title: options.title,
      author: options.author,
    });
    return {
      pdfBuffer: result.pdfBuffer,
      pdfSize: result.pdfSize,
      warnings: [...warnings, ...result.warnings],
      provider: 'puppeteer',
    };
  } catch (err) {
    let msg = 'Erreur inconnue';
    if (err instanceof PuppeteerConvertError) msg = `Puppeteer (${err.step}): ${err.message}`;
    else if (err instanceof Error) msg = err.message;
    console.error('[document-converter] Puppeteer failed:', err);
    warnings.push(`Puppeteer/Chromium indisponible (${msg}).`);
  }

  // ============== PROVIDER 4: ConvertAPI (optional, requires API token) ==============
  const convertApiSecret = process.env.CONVERTAPI_SECRET;
  if (convertApiSecret) {
    try {
      const fileName = options.fileName || 'document.docx';
      const result = await convertOfficeToPdfViaConvertApi(
        fileBuffer,
        fileName,
        convertApiSecret
      );
      return {
        pdfBuffer: result.pdfBuffer,
        pdfSize: result.pdfSize,
        warnings: [...warnings, ...result.warnings],
        provider: 'convertapi',
      };
    } catch (err) {
      let msg = 'Erreur inconnue';
      if (err instanceof ConvertApiError) msg = `ConvertAPI (${err.step}): ${err.message}`;
      else if (err instanceof Error) msg = err.message;
      console.error('[document-converter] ConvertAPI failed:', err);
      warnings.push(`ConvertAPI indisponible (${msg}).`);
    }
  }

  // ============== PROVIDER 5: nothing left, return failure ==============
  warnings.push(
    'Aucun service de conversion PDF disponible. Le fichier original (.docx) est sauvegardé dans votre bibliothèque. Vous pouvez le re-uploader en PDF manuellement depuis /enseignant/bibliotheque.'
  );
  return { warnings, provider: 'failed' };
}

/**
 * Detect file format from name or mime type
 */
export function detectFormat(filename: string, mimeType?: string): {
  format: 'pdf' | 'docx' | 'doc' | 'odt' | 'rtf' | 'pptx' | 'ppt' | 'xlsx' | 'xls' | 'unknown';
  isConvertible: boolean;
  isPdf: boolean;
} {
  const ext = filename.toLowerCase().split('.').pop() || '';

  if (ext === 'pdf' || mimeType === 'application/pdf') {
    return { format: 'pdf', isConvertible: false, isPdf: true };
  }
  if (
    ext === 'docx' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
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
  if (
    ext === 'pptx' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return { format: 'pptx', isConvertible: true, isPdf: false };
  }
  if (ext === 'ppt' || mimeType === 'application/vnd.ms-powerpoint') {
    return { format: 'ppt', isConvertible: true, isPdf: false };
  }
  if (
    ext === 'xlsx' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return { format: 'xlsx', isConvertible: true, isPdf: false };
  }
  if (ext === 'xls' || mimeType === 'application/vnd.ms-excel') {
    return { format: 'xls', isConvertible: true, isPdf: false };
  }
  return { format: 'unknown', isConvertible: false, isPdf: false };
}
