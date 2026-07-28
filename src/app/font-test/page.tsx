import { Vazirmatn, Zain, Noto_Sans_Arabic, Cairo } from 'next/font/google';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// Fustat is not in next/font/google, so we load it via CSS @import in globals.css
// (see: src/app/font-test/fustat.css)

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-vazirmatn',
  weight: ['400', '500', '600', '700', '800'],
  preload: true,
});

const zain = Zain({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-zain',
  weight: ['400', '700'],
  preload: true,
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-noto-arabic',
  weight: ['400', '500', '600', '700', '800'],
  preload: true,
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-cairo',
  weight: ['400', '600', '700', '800'],
  preload: true,
});

export const metadata = {
  title: 'Font Test - Arabic Fonts Comparison',
  description: 'Compare 5 Arabic fonts: Vazirmatn, Zain, Fustat, Noto Sans Arabic, Cairo',
};

const SAMPLE_TITLE = 'فرض تأليفي عدد 1 - العربية - السابعة أساسي';
const SAMPLE_LARGE = 'كل المواد الدراسية للتلاميذ التونسيين';
const SAMPLE_LIGHT = 'في رحاب اللغة العربية وآدابها';
const SAMPLE_BODY = 'يضم هذا الوثيقة التعليمية مجموعة من التمارين والاختبارات التي تساعد التلميذ على فهم المقرر وتطوير مهاراته في اللغة العربية وآدابها. يتضمن أسئلة متعددة المستويات.';

const FONTS = [
  { name: 'Vazirmatn', cssVar: vazirmatn.variable, note: 'Moderne, lisible, géométrique' },
  { name: 'Zain', cssVar: zain.variable, note: 'Élégant, classique, serré' },
  { name: 'Fustat', cssVar: 'var(--font-fustat)', note: 'Google, marqué, libre (CSS @import)' },
  { name: 'Noto Sans Arabic', cssVar: notoSansArabic.variable, note: 'Standard, neutre, universel' },
  { name: 'Cairo', cssVar: cairo.variable, note: 'Actuel, géométrique, rond (celui en prod)' },
];

export default function FontTestPage() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fustat:wght@400;500;700;800&display=swap"
      />
      <style>{`
        :root { --font-fustat: 'Fustat', 'Inter', system-ui, sans-serif; }
      `}</style>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 pt-24 lg:pt-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
              <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900">
                Test de polices arabes
              </h1>
              <p className="text-slate-600 mt-2">
                Compare 5 polices avec un titre de resource typique. <strong>Hard refresh (Ctrl+Shift+R)</strong> pour voir les changements.
              </p>
            </div>

            <div className="space-y-8">
              {FONTS.map((font) => (
                <div
                  key={font.name}
                  className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8 shadow-sm"
                  style={{ fontFamily: font.cssVar }}
                >
                  <div className="flex items-baseline gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-slate-900">{font.name}</h2>
                    <span className="text-sm text-slate-500">— {font.note}</span>
                  </div>
                  <div className="text-xs text-slate-400 mb-4 font-mono" style={{ fontFamily: 'monospace' }}>
                    font-family: {font.cssVar}
                  </div>

                  <div className="mb-4 pb-4 border-b border-slate-100">
                    <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Titre h1 (text-3xl lg:text-4xl font-extrabold) — comme dans l'app
                    </div>
                    <h3 className="text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight" dir="rtl">
                      {SAMPLE_TITLE}
                    </h3>
                  </div>

                  <div className="mb-4 pb-4 border-b border-slate-100">
                    <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Sous-titre h2 (text-2xl font-bold)
                    </div>
                    <h4 className="text-2xl font-bold text-slate-800" dir="rtl">
                      {SAMPLE_LARGE}
                    </h4>
                  </div>

                  <div className="mb-4 pb-4 border-b border-slate-100">
                    <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Titre carte (text-xl font-semibold)
                    </div>
                    <h5 className="text-xl font-semibold text-slate-800" dir="rtl">
                      {SAMPLE_LIGHT}
                    </h5>
                  </div>

                  <div className="mb-4 pb-4 border-b border-slate-100">
                    <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Body (text-base) — note la lisibilité
                    </div>
                    <p className="text-base text-slate-700 leading-relaxed" dir="rtl">
                      {SAMPLE_BODY}
                    </p>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Petit texte (text-sm) — meta, badges
                    </div>
                    <p className="text-sm text-slate-500" dir="rtl">
                      2AS · العلوم · الثلاثي 1 · 2023-2024
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 bg-slate-100 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-3">Référence (police Inter actuelle — français)</h2>
              <p className="text-slate-600">
                Devoir de Synthèse N°1 - Mathématiques - 7ème année (2023-2024)
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
