/**
 * iLoveAPI (iLovePDF) integration for Word → PDF conversion
 *
 * Free tier: 250 documents/month
 * API docs: https://developer.ilovepdf.com/
 *
 * Flow:
 *   1. POST /v1/start/officepdf    -> get server + task
 *   2. POST {server}/v1/upload      -> upload file
 *   3. POST {server}/v1/process     -> run conversion
 *   4. GET  {server}/v1/download/{task} -> download PDF
 *
 * Auth: X-API-Key header with the public key
 */

const API_BASE = 'https://api.ilovepdf.com/v1';

export type ConversionResult = {
  pdfBuffer: Buffer;
  pdfSize: number;
  warnings: string[];
};

export class IloveapiError extends Error {
  constructor(
    message: string,
    public step: 'start' | 'upload' | 'process' | 'download',
    public status?: number,
    public responseBody?: any
  ) {
    super(message);
    this.name = 'IloveapiError';
  }
}

/**
 * Convert a .docx/.doc/.odt/.ppt/.xls file to PDF via iLoveAPI
 * Returns the PDF as a Buffer
 */
export async function convertOfficeToPdfViaIloveapi(
  fileBuffer: Buffer,
  fileName: string,
  apiKey: string
): Promise<ConversionResult> {
  if (!apiKey) {
    throw new IloveapiError(
      'I_LOVE_API_KEY non configurée. Ajoutez-la dans vos variables d\'environnement Vercel.',
      'start'
    );
  }

  const warnings: string[] = [];
  const headers = { 'X-API-Key': apiKey };

  // 1. Start a new task for officepdf
  const startRes = await fetch(`${API_BASE}/start/officepdf`, {
    method: 'POST',
    headers,
  });
  if (!startRes.ok) {
    const body = await startRes.text().catch(() => '');
    throw new IloveapiError(
      `iLoveAPI start failed (${startRes.status}): ${body.slice(0, 200)}`,
      'start',
      startRes.status,
      body
    );
  }
  const { server, task } = (await startRes.json()) as { server: string; task: string };
  if (!server || !task) {
    throw new IloveapiError('iLoveAPI start returned invalid response', 'start');
  }

  try {
    // 2. Upload the file
    const formData = new FormData();
    // Use a Blob (Node 18+ has Blob)
    const blob = new Blob([new Uint8Array(fileBuffer)], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    formData.append('file', blob, fileName);

    const uploadUrl = `https://${server}.ilovepdf.com/v1/upload`;
    const uploadRes = await fetch(`${uploadUrl}?task=${task}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!uploadRes.ok) {
      const body = await uploadRes.text().catch(() => '');
      throw new IloveapiError(
        `iLoveAPI upload failed (${uploadRes.status}): ${body.slice(0, 200)}`,
        'upload',
        uploadRes.status,
        body
      );
    }
    const uploadData = (await uploadRes.json()) as {
      server: string;
      task: string;
      filename: string;
    };
    if (!uploadData.filename) {
      throw new IloveapiError('iLoveAPI upload returned no filename', 'upload');
    }

    // 3. Process (run the conversion)
    const processUrl = `https://${server}.ilovepdf.com/v1/process`;
    const processRes = await fetch(`${processUrl}?task=${task}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Default options - no specific tool config needed for officepdf
      }),
    });
    if (!processRes.ok) {
      const body = await processRes.text().catch(() => '');
      throw new IloveapiError(
        `iLoveAPI process failed (${processRes.status}): ${body.slice(0, 200)}`,
        'process',
        processRes.status,
        body
      );
    }

    // 4. Download the converted PDF
    const downloadUrl = `https://${server}.ilovepdf.com/v1/download/${task}`;
    const downloadRes = await fetch(downloadUrl, { headers });
    if (!downloadRes.ok) {
      const body = await downloadRes.text().catch(() => '');
      throw new IloveapiError(
        `iLoveAPI download failed (${downloadRes.status}): ${body.slice(0, 200)}`,
        'download',
        downloadRes.status,
        body
      );
    }
    const arrayBuffer = await downloadRes.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Verify it's actually a PDF (starts with %PDF)
    if (!pdfBuffer.subarray(0, 4).toString().startsWith('%PDF')) {
      throw new IloveapiError(
        'iLoveAPI returned non-PDF content (first 4 bytes: ' +
          pdfBuffer.subarray(0, 4).toString() +
          ')',
        'download'
      );
    }

    return { pdfBuffer, pdfSize: pdfBuffer.length, warnings };
  } catch (err) {
    // Best-effort cleanup: cancel the task
    try {
      await fetch(`https://${server}.ilovepdf.com/v1/task/${task}`, {
        method: 'DELETE',
        headers,
      });
    } catch {
      // ignore
    }
    throw err;
  }
}

/**
 * Quick health check - calls start and immediately cancels.
 * Useful for the /api/health endpoint to verify the key works.
 */
export async function checkIloveapiHealth(apiKey: string): Promise<{ ok: boolean; error?: string; server?: string }> {
  if (!apiKey) return { ok: false, error: 'No API key' };
  try {
    const res = await fetch(`${API_BASE}/start/merge`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 100)}` };
    }
    const data = (await res.json()) as { server: string; task: string };
    // Cancel immediately
    fetch(`https://${data.server}.ilovepdf.com/v1/task/${data.task}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    }).catch(() => {});
    return { ok: true, server: data.server };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}