import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUBJECT_COLORS: Record<string, string> = {
  mathematiques: '#0EA5E9', // cyan
  physique: '#8B5CF6', // purple
  svt: '#10B981', // green
  sciences: '#10B981',
  technologie: '#F59E0B', // amber
  anglais: '#EF4444', // red
  francais: '#EC4899', // pink
  informatique: '#6366F1', // indigo
  arabe: '#14B8A6', // teal
  islamique: '#0D9488',
  histoire: '#B45309', // dark amber
  geographie: '#65A30D', // lime
  philosophie: '#7C3AED', // violet
  default: '#0EA5E9',
};

function getColor(subjectSlug?: string | null): string {
  if (!subjectSlug) return SUBJECT_COLORS.default;
  return SUBJECT_COLORS[subjectSlug.toLowerCase()] || SUBJECT_COLORS.default;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const numericId = parseInt(rawId, 10);
  if (isNaN(numericId)) {
    return new Response('Invalid ID', { status: 400 });
  }
  const resource = await prisma.resource.findUnique({
    where: { numericId },
    include: {
      subject: true,
      class: true,
      teacher: { select: { firstName: true, lastName: true } },
    },
  });

  if (!resource) {
    return new Response('Resource not found', { status: 404 });
  }

  const color = getColor(resource.subject?.slug);
  const title = resource.title;
  const subject = resource.subject?.nameFr || '';
  const className = resource.class?.nameFr || '';
  const teacherName = resource.teacher
    ? `${resource.teacher.firstName || ''} ${resource.teacher.lastName || ''}`.trim()
    : '';
  const type = resource.type; // HOMEWORK, EXAM, COURSE...
  const year = resource.year || '';
  const hasCorrection = resource.hasCorrection;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #06264E 0%, #0F172A 100%)',
        fontFamily: 'sans-serif',
        color: 'white',
        padding: 60,
      }}
    >
      {/* Top bar: brand + subject chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#FA8C31',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 900,
              color: '#06264E',
            }}
          >
            E
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5 }}>Examanet</div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 999,
            background: color,
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          {subject}
        </div>
      </div>

      {/* Main title block */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          marginTop: 40,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: -2,
            marginBottom: 24,
            display: 'flex',
          }}
        >
          {title.length > 80 ? title.slice(0, 77) + '...' : title}
        </div>

        {/* Tags row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
          {className && (
            <div
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.1)',
                fontSize: 22,
                fontWeight: 600,
                display: 'flex',
              }}
            >
              {className}
            </div>
          )}
          {type && (
            <div
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.1)',
                fontSize: 22,
                fontWeight: 600,
                textTransform: 'capitalize',
                display: 'flex',
              }}
            >
              {type.toLowerCase()}
            </div>
          )}
          {year && (
            <div
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.1)',
                fontSize: 22,
                fontWeight: 600,
                display: 'flex',
              }}
            >
              {year}
            </div>
          )}
          {hasCorrection && (
            <div
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                background: '#10B981',
                fontSize: 22,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              ✓ Corrigé
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar: teacher + URL */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          borderTop: '1px solid rgba(255,255,255,0.15)',
          paddingTop: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            {teacherName[0] || '?'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{teacherName || 'Examanet'}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, color: '#94A3B8' }}>examanet.com</div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  );
}
