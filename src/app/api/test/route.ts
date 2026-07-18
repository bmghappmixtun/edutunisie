export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(JSON.stringify({
    ok: true,
    timestamp: Date.now(),
    node: process.env.NODE_ENV,
    env: {
      hasDb: !!process.env.DATABASE_URL,
      dbPrefix: process.env.DATABASE_URL?.split('@')[1]?.split('?')[0] || 'none',
    },
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
