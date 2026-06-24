import { issueSignedToken } from '@vercel/blob';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf-8');
const oidcToken = envContent.match(/VERCEL_OIDC_TOKEN="([^"]+)"/)?.[1];

if (!oidcToken) {
  console.error('No OIDC token');
  process.exit(1);
}

try {
  // Issue a long-lived signed token (max 7 days for signed tokens)
  const token = await issueSignedToken({
    storeId: 'store_kMy1h6Us8L7BG7bG',
    access: 'public',
    validFor: 7 * 24 * 60 * 60, // 7 days in seconds (max)
    pathname: '*',
    token: oidcToken,
  });
  console.log('=== Signed token issued ===');
  console.log(token);
} catch (e) {
  console.error('Error:', e.message);
  console.error('Stack:', e.stack);
}
