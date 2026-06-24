import { parseStoreIdFromReadWriteToken } from '@vercel/blob';

const OLD_TOKEN = 'vercel_blob_rw_KMy1h6Us8L7BG7bG_EzUeWUec2V20Jt8qMHFvzRgm8SdpjR';
try {
  const storeId = parseStoreIdFromReadWriteToken(OLD_TOKEN);
  console.log('Parsed storeId:', storeId);
} catch (e) {
  console.error('Parse error:', e.message);
}
