/**
 * Document conversion utilities
 *
 * Converts various formats (.docx, .doc, .odt, .ppt, .xls) to PDF using
 * iLoveAPI (iLovePDF) - a high-quality, hosted conversion service.
 *
 *   .docx → iLoveAPI officepdf → PDF
 *   .pdf  → passthrough (no conversion)
 *
 * Quality: very good for complex math, Arabic, RTL, mixed content.
 * Uses LibreOffice under the hood (hosted by iLoveAPI).
 *
 * Free tier: 250 documents/month (with public API key).
 *
 * If the API key is missing or the service fails, the original file
 * is still saved to the teacher's library - the teacher can re-upload
 * a PDF version manually.
 */

import { convertOfficeToPdfViaIloveapi, IloveapiError } from './iloveapi';

export type ConversionResult = {
  pdfBuffer?: Buffer;
  pdfSize?: number;
  warnings: string[];
  provider: 'iloveapi' | 'none' | 'failed';
};

/**
 * Convert an Office document (.docx, .doc, .odt) to PDF
 * Uses iLoveAPI (high quality, hosted LibreOffice)
 */
export async function convertDocxToPdf(
  fileBuffer: Buffer,
  options: {
    fileName?: string;
    title?: string;
    author?: string;
  } = {}
): Promise<ConversionResult> {
  const publicKey = process.env.I_LOVE_API_PUBLIC_KEY;
  const secretKey = process.env.I_LOVE_API_SECRET_KEY;
  const warnings: string[] = [];

  if (!publicKey || !secretKey) {
    warnings.push(
      'I_LOVE_API_PUBLIC_KEY et I_LOVE_API_SECRET_KEY non configurées. Le fichier original est sauvegardé, mais la conversion PDF est désactivée. Ré-uploadez le fichier en PDF manuellement.'
    );
    return { warnings, provider: 'none' };
  }

  try {
    const fileName = options.fileName || 'document.docx';
    const result = await convertOfficeToPdfViaIloveapi(fileBuffer, fileName, publicKey, secretKey);
    return {
      pdfBuffer: result.pdfBuffer,
      pdfSize: result.pdfSize,
      warnings: [...warnings, ...result.warnings],
      provider: 'iloveapi',
    };
  } catch (err) {
    let msg = 'Erreur inconnue';
    if (err instanceof IloveapiError) {
      msg = `iLoveAPI (${err.step}): ${err.message}`;
    } else if (err instanceof Error) {
      msg = err.message;
    }
    console.error('[document-converter] iLoveAPI failed:', err);
    warnings.push(`Conversion échouée: ${msg}. L'original a été sauvegardé. Vous pouvez ré-uploader en PDF manuellement.`);
    return { warnings, provider: 'failed' };
  }
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
  // iLoveAPI also supports:
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