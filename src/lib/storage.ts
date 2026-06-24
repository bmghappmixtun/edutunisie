import { put, del } from '@vercel/blob';
import { promises as fs } from 'fs';
import path from 'path';

const IS_VERCEL = process.env.VERCEL === '1';

export async function uploadFile(
  filename: string,
  data: Buffer | Blob,
  contentType = 'application/pdf'
): Promise<{ url: string; key: string }> {
  // Production: Vercel Blob (uses OIDC auto-detection, no token needed)
  if (IS_VERCEL) {
    const blob = await put(filename, data, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
    });
    return { url: blob.url, key: blob.pathname };
  }

  // Dev: local storage
  const uploadDir = process.env.UPLOAD_DIR || './public/uploads';
  await fs.mkdir(uploadDir, { recursive: true });
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueName = `${Date.now()}-${safeName}`;
  const filepath = path.join(uploadDir, uniqueName);
  const buffer = data instanceof Blob ? Buffer.from(await data.arrayBuffer()) : data;
  await fs.writeFile(filepath, buffer);
  return { url: `/uploads/${uniqueName}`, key: uniqueName };
}

export async function deleteFile(keyOrUrl: string): Promise<void> {
  if (IS_VERCEL && keyOrUrl.startsWith('http')) {
    try { await del(keyOrUrl); } catch {}
    return;
  }
  // Local delete
  try {
    const uploadDir = process.env.UPLOAD_DIR || './public/uploads';
    await fs.unlink(path.join(uploadDir, path.basename(keyOrUrl)));
  } catch {}
}
