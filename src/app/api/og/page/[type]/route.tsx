import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const PAGE_CONFIG: Record<string, {
  title: string;
  subtitle: string;
  badge: string;
  bgGradient: string;
}> = {
  home: {
    title: 'Examanet',
    subtitle: 'Cours, devoirs, exercices et corrigés gratuits',
    badge: 'Plateforme #1 en Tunisie',
    bgGradient: 'linear-gradient(135deg, #06264E 0%, #0F172A 50%, #082F49 100%)',
  },
  matieres: {
    title: 'Toutes les matières',
    subtitle: 'Maths, Physique, SVT, Français, Arabe, Anglais et plus',
    badge: 'Catalogue complet',
    bgGradient: 'linear-gradient(135deg, #0F172A 0%, #082F49 50%, #0E7490 100%)',
  },
  niveaux: {
    title: 'Tous les niveaux scolaires',
    subtitle: 'Primaire, Collège, Lycée — du 1ère année au Bac',
    badge: 'Référentiel national',
    bgGradient: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
  },
  professeurs: {
    title: 'Professeurs tunisiens',
    subtitle: '2 500+ enseignants certifiés partagent leurs ressources',
    badge: 'Communauté enseignante',
    bgGradient: 'linear-gradient(135deg, #14532D 0%, #166534 50%, #15803D 100%)',
  },
  concours: {
    title: 'Concours 9ème Tunisie',
    subtitle: '257 sujets et corrigés PDF pour préparer le concours national',
    badge: 'Entrée au Lycée',
    bgGradient: 'linear-gradient(135deg, #7C2D12 0%, #9A3412 50%, #C2410C 100%)',
  },
  college: {
    title: 'Collège — 7ème, 8ème, 9ème année',
    subtitle: '4 700+ ressources pour le cycle de base',
    badge: 'Enseignement de base',
    bgGradient: 'linear-gradient(135deg, #4C1D95 0%, #5B21B6 50%, #6D28D9 100%)',
  },
  recherche: {
    title: 'Recherche avancée',
    subtitle: 'Trouvez des ressources par matière, classe, type ou enseignant',
    badge: 'Moteur PG full-text',
    bgGradient: 'linear-gradient(135deg, #134E4A 0%, #115E59 50%, #0F766E 100%)',
  },
  default: {
    title: 'Examanet',
    subtitle: 'Cours, devoirs, exercices et corrigés gratuits en Tunisie',
    badge: 'Plateforme pédagogique',
    bgGradient: 'linear-gradient(135deg, #06264E 0%, #0F172A 50%, #082F49 100%)',
  },
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const config = PAGE_CONFIG[type] || PAGE_CONFIG.default;

  const url = new URL(req.url);
  const titleOverride = url.searchParams.get('title');
  const subtitleOverride = url.searchParams.get('subtitle');
  if (titleOverride) config.title = titleOverride;
  if (subtitleOverride) config.subtitle = subtitleOverride;

  // For AR locale (?locale=ar), overlay Arabic versions
  if (url.searchParams.get('locale') === 'ar') {
    const AR_OVERLAY: Record<string, { title?: string; subtitle?: string; badge?: string; bgGradient?: string }> = {
      home: { title: 'إكسامانت', subtitle: 'دروس, فروض, تمارين و إصلاحات مجانية في تونس', badge: 'المنصة التربوية #1' },
      matieres: { title: 'جميع المواد', subtitle: 'الرياضيات, الفيزياء, علوم الحياة والأرض, الفرنسية, العربية, الإنجليزية و المزيد', badge: 'البرنامج الرسمي' },
      niveaux: { title: 'جميع المستويات الدراسية', subtitle: 'الابتدائي, الإعدادي, الثانوي — من السنة الأولى إلى الباكالوريا', badge: 'البرنامج الوطني' },
      professeurs: { title: 'المعلمون التونسيون', subtitle: 'أكثر من 2500 معلم معتمد يشاركون مواردهم التعليمية', badge: 'مجتمع المعلمين' },
      concours: { title: 'مناظرة التاسعة تونس', subtitle: '257 موضوع و إصلاح PDF للتحضير للمناظرة الوطنية', badge: 'دخول الثانوي' },
      college: { title: 'الإعدادي — السنة 7, 8, 9', subtitle: 'أكثر من 4700 مورد لدورة التعليم الأساسي', badge: 'التعليم الأساسي' },
      recherche: { title: 'البحث المتقدم', subtitle: 'ابحث عن موارد حسب المادة, المستوى, النوع أو المعلم', badge: 'محرك بحث كامل' },
      default: { title: 'إكسامانت', subtitle: 'دروس, فروض, تمارين و إصلاحات مجانية في تونس', badge: 'المنصة التربوية' },
    };
    const overlay = AR_OVERLAY[type] || AR_OVERLAY.default;
    if (overlay.title) config.title = overlay.title;
    if (overlay.subtitle) config.subtitle = overlay.subtitle;
    if (overlay.badge) config.badge = overlay.badge;
    if (overlay.bgGradient) config.bgGradient = overlay.bgGradient;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: config.bgGradient,
          fontFamily: 'sans-serif',
          color: 'white',
          padding: 80,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#FA8C31',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 900,
              color: '#06264E',
            }}
          >
            E
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -0.5 }}>
            Examanet
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1.0,
              letterSpacing: -3,
              marginBottom: 32,
              display: 'flex',
            }}
          >
            {config.title}
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 500,
              lineHeight: 1.3,
              color: 'rgba(255,255,255,0.85)',
              maxWidth: 1000,
              display: 'flex',
            }}
          >
            {config.subtitle}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              padding: '14px 28px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              fontSize: 26,
              fontWeight: 600,
              display: 'flex',
            }}
          >
            {config.badge}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: '#FA8C31',
              display: 'flex',
            }}
          >
            examanet.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
