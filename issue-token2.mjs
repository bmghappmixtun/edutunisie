import { issueSignedToken } from '@vercel/blob';

const OLD_TOKEN = 'vercel_blob_rw_KMy1h6Us8L7BG7bG_EzUeWUec2V20Jt8qMHFvzRgm8SdpjR';

try {
  const token = await issueSignedToken({
    storeId: 'store_kMy1h6Us8L7BG7bG',
    access: 'public',
    validFor: 7 * 24 * 60 * 60,
    pathname: '*',
    token: OLD_TOKEN,
  });
  console.log('=== Signed token ===');
  console.log(token);
} catch (e) {
  console.error('Error:', e.message);
}
