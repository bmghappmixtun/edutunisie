/**
 * ConvertAPI integration for Office → PDF conversion
 *
 * https://www.convertapi.com/
 *
 * ConvertAPI is a hosted file conversion service backed by LibreOffice.
 * Free tier: 1500 conversions/month (no credit card required).
 *
 * The REST API is simple:
 *   POST https://v2.convertapi.com/convert/docx/to/pdf
 *   Authorization: Bearer <CONVERTAPI_SECRET>
 *   Body: multipart/form-data with file + optional params
 *
 * Quality: very good for math, Arabic, RTL, mixed content.
 *   Better than mammoth+pdf-lib (text-only), a bit lower than iLoveAPI.
 *
 * Required env var:
 *   CONVERTAPI_SECRET  (get one at https://www.convertapi.com/a/signup)
 */

export class ConvertApiError extends Error {
  constructor(
    message: string,
    public step: 'start' | 'upload' | 'convert' = 'start',
    public status?: number
  ) {
    super(message);
    this.name = 'ConvertApiError';
  }
}

export type ConvertApiResult = {
  pdfBuffer: Buffer;
  pdfSize: number;
  warnings: string[];
};

/**
 * Convert an Office document to PDF via ConvertAPI REST.
 * Supports: .docx, .doc, .odt, .pptx, .xlsx, .rtf, etc.
 */
export async function convertOfficeToPdfViaConvertApi(
  fileBuffer: Buffer,
  fileName: string,
  secret: string
): Promise<ConvertApiResult> {
  if (!secret) {
    throw new ConvertApiError('CONVERTAPI_SECRET non configuré');
  }

  // Detect the source format from the extension
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const formatMap: Record<string, string> = {
    docx: 'docx',
    doc: 'doc',
    odt: 'odt',
    rtf: 'rtf',
    pptx: 'pptx',
    ppt: 'ppt',
    xlsx: 'xlsx',
    xls: 'xls',
  };
  const sourceFormat = formatMap[ext];
  if (!sourceFormat) {
    throw new ConvertApiError(`Format non supporté: .${ext}`);
  }

  // Build multipart form
  const form = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)], {
    type: 'application/octet-stream',
  });
  form.append('File', blob, fileName);

  const url = `https://v2.convertapi.com/convert/${sourceFormat}/to/pdf`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
      },
      body: form as any,
    });
  } catch (e: any) {
    throw new ConvertApiError(
      `ConvertAPI requête échouée: ${e?.message || 'erreur réseau'}`,
      'start'
    );
  }

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errBody = await res.text();
      errMsg = `${errMsg} — ${errBody.slice(0, 300)}`;
    } catch {
      // ignore body parsing
    }
    throw new ConvertApiError(
      `ConvertAPI error: ${errMsg}`,
      res.status === 401 || res.status === 403 ? 'start' : 'convert',
      res.status
    );
  }

  // The response is the PDF binary directly
  const arrayBuffer = await res.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);

  if (pdfBuffer.length < 100) {
    throw new ConvertApiError('ConvertAPI a renvoyé un fichier vide', 'convert');
  }
  if (!pdfBuffer.subarray(0, 4).toString().startsWith('%PDF')) {
    throw new ConvertApiError(
      'ConvertAPI a renvoyé du contenu non-PDF (rate limit? erreur?)',
      'convert'
    );
  }

  return {
    pdfBuffer,
    pdfSize: pdfBuffer.length,
    warnings: [],
  };
}

/**
 * Quick health check — uses the small "any to pdf" endpoint
 */
export async function checkConvertApiHealth(secret: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!secret) return { ok: false, error: 'Missing CONVERTAPI_SECRET' };
  try {
    // Use a tiny .txt as a smoke test
    const form = new FormData();
    form.append(
      'File',
      new Blob(['Hello Examanet'], { type: 'text/plain' }),
      'test.txt'
    );
    const res = await fetch('https://v2.convertapi.com/convert/txt/to/pdf', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      body: form,
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`,
      };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Unknown' };
  }
}
