/**
 * Document conversion utilities
 *
 * Converts .docx (and other Office formats) to PDF for the teacher library
 * and the "ajouter une ressource" flow.
 *
 * Conversion chain (only 2 providers):
 *   1. iLoveAPI   — high quality, hosted LibreOffice, requires API keys (plan A)
 *   2. APIConvert — free tier fallback, requires APICONVERT_API_KEY (plan B)
 *
 * If both fail, the original .docx is still saved and the user can
 * re-upload a PDF manually.
 *
 * To configure:
 *   - I_LOVE_API_PUBLIC_KEY + I_LOVE_API_SECRET_KEY  → enables plan A
 *   - APICONVERT_API_KEY                              → enables plan B
 *
 * If neither is configured, the converter returns `provider: 'failed'`
 * and the original .docx is preserved.
 */

import { convertOfficeToPdfViaIloveapi, IloveapiError } from './iloveapi';
import { convertOfficeToPdfViaConvertApi, ApiconvertError } from './apiconvert';

export type ConversionResult = {
  pdfBuffer?: Buffer;
  pdfSize?: number;
  warnings: string[];
  provider: 'iloveapi' | 'apiconvert' | 'none' | 'failed';
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

  // ============== PLAN A: iLoveAPI ==============
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
      console.warn('[document-converter] iLoveAPI failed, falling back to APIConvert:', msg);
      warnings.push(`iLoveAPI indisponible (${msg}). Plan B (APIConvert) activé.`);
    }
  } else {
    warnings.push('iLoveAPI non configuré.');
  }

  // ============== PLAN B: APIConvert ==============
  const apiconvertKey = process.env.APICONVERT_API_KEY;
  if (apiconvertKey) {
    try {
      const fileName = options.fileName || 'document.docx';
      const result = await convertOfficeToPdfViaConvertApi(
        fileBuffer,
        fileName,
        apiconvertKey
      );
      return {
        pdfBuffer: result.pdfBuffer,
        pdfSize: result.pdfSize,
        warnings: [...warnings, ...result.warnings],
        provider: 'apiconvert',
      };
    } catch (err) {
      let msg = 'Erreur inconnue';
      if (err instanceof ApiconvertError) msg = `APIConvert (${err.step}): ${err.message}`;
      else if (err instanceof Error) msg = err.message;
      console.error('[document-converter] APIConvert failed:', err);
      warnings.push(`APIConvert indisponible (${msg}).`);
    }
  } else {
    warnings.push('APIConvert non configuré (APICONVERT_API_KEY manquant).');
  }

  // ============== Aucun provider n'a fonctionné ==============
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
