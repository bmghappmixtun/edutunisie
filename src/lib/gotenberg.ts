/**
 * Gotenberg integration for Office → PDF conversion
 *
 * https://gotenberg.dev/
 *
 * Gotenberg is a Docker-powered, open-source API for converting HTML,
 * Markdown, MS Office (Word, Excel, PowerPoint), and more to PDF.
 * Under the hood it uses LibreOffice — same quality as iLoveAPI.
 *
 * Why Gotenberg is great as plan B:
 *   ✅ Totally free (open-source, no API key, no quota)
 *   ✅ High quality (LibreOffice)
 *   ✅ Self-hosted → you control your data (good for privacy)
 *   ✅ Supports: .docx, .doc, .odt, .pptx, .xlsx, .rtf, .html, .md, etc.
 *
 * How to deploy (free):
 *   1. Render.com (free Docker tier): https://render.com/
 *      - New → Web Service → Public Docker Image → gotenberg/gotenberg:8
 *      - Free plan gives 750h/month, spins down after 15min idle
 *   2. Fly.io (free tier): fly launch --image gotenberg/gotenberg:8
 *   3. Railway.app (with limits)
 *   4. Your own VPS / home server
 *
 *   Then set env var:
 *     GOTENBERG_URL=https://your-gotenberg.onrender.com
 *
 *   No auth header needed by default. If you add GOTENBERG_API_KEY on
 *   Gotenberg side, set the same key here (or use the apiKeyHeader option).
 */

export class GotenbergError extends Error {
  constructor(
    message: string,
    public step: 'start' | 'upload' | 'convert' | 'download' = 'start',
    public status?: number
  ) {
    super(message);
    this.name = 'GotenbergError';
  }
}

export type GotenbergResult = {
  pdfBuffer: Buffer;
  pdfSize: number;
  warnings: string[];
};

export type GotenbergOptions = {
  /** Base URL of the Gotenberg instance (e.g. https://gotenberg.example.com) */
  url: string;
  /** Optional API key if Gotenberg is configured with one */
  apiKey?: string;
  /** Custom header name for the API key (Gotenberg default: Gotenberg-Api-Key) */
  apiKeyHeader?: string;
};

/**
 * Convert an Office document to PDF via a self-hosted Gotenberg instance.
 * Endpoint: POST {url}/forms/libreoffice/convert
 */
export async function convertOfficeToPdfViaGotenberg(
  fileBuffer: Buffer,
  fileName: string,
  options: GotenbergOptions
): Promise<GotenbergResult> {
  const { url, apiKey, apiKeyHeader = 'Gotenberg-Api-Key' } = options;

  if (!url) {
    throw new GotenbergError(
      'GOTENBERG_URL non configuré. Déployez Gotenberg (cf. README) et définissez l\'URL.',
      'start'
    );
  }

  // Normalize URL (strip trailing slash)
  const baseUrl = url.replace(/\/+$/, '');

  // Build multipart form (Gotenberg expects field "files" - plural)
  const form = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)], {
    type: 'application/octet-stream',
  });
  form.append('files', blob, fileName);

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers[apiKeyHeader] = apiKey;
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/forms/libreoffice/convert`, {
      method: 'POST',
      headers,
      body: form as any,
    });
  } catch (e: any) {
    throw new GotenbergError(
      `Gotenberg requête échouée (${baseUrl}): ${e?.message || 'erreur réseau'}`,
      'start'
    );
  }

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errBody = await res.text();
      errMsg = `${errMsg} — ${errBody.slice(0, 300)}`;
    } catch {
      // ignore
    }
    throw new GotenbergError(
      `Gotenberg a renvoyé une erreur: ${errMsg}`,
      res.status === 401 || res.status === 403 ? 'start' : 'convert',
      res.status
    );
  }

  // The response is the PDF binary directly
  const arrayBuffer = await res.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);

  if (pdfBuffer.length < 100) {
    throw new GotenbergError('Gotenberg a renvoyé un fichier vide', 'convert');
  }
  if (!pdfBuffer.subarray(0, 4).toString().startsWith('%PDF')) {
    throw new GotenbergError(
      'Gotenberg a renvoyé du contenu non-PDF (URL incorrecte? service arrêté?)',
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
 * Quick health check — calls /health (Gotenberg's standard health endpoint)
 */
export async function checkGotenbergHealth(url: string): Promise<{
  ok: boolean;
  error?: string;
  version?: string;
}> {
  if (!url) return { ok: false, error: 'Missing GOTENBERG_URL' };
  try {
    const baseUrl = url.replace(/\/+$/, '');
    const res = await fetch(`${baseUrl}/health`, {
      // 5s timeout for health check
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    // /version returns "8.x.x"
    let version: string | undefined;
    try {
      const vRes = await fetch(`${baseUrl}/version`, {
        signal: AbortSignal.timeout(3000),
      });
      if (vRes.ok) version = (await vRes.text()).trim();
    } catch {
      // ignore version error
    }
    return { ok: true, version };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Unknown' };
  }
}
