const { put } = require('@vercel/blob');
const fs = require('fs');

const OLD_TOKEN = 'vercel_blob_rw_KMy1h6Us8L7BG7bG_EzUeWUec2V20Jt8qMHFvzRgm8SdpjR';

(async () => {
  try {
    const blob = await put('test/test-' + Date.now() + '.txt', 'hello world', {
      access: 'public',
      token: OLD_TOKEN,
      addRandomSuffix: false,
    });
    console.log('✅ Upload OK:', blob.url);
  } catch (e) {
    console.error('❌ Upload failed:', e.message);
  }
})();
