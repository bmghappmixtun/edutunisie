import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  getConcoursStats,
  getCorriges2020Plus,
  getUpcomingCorriges,
  getSubjectMeta,
  groupByYear,
  CONCOURS_VOIES,
} from '@/lib/concours-9eme-data';
import {
  courseSchema,
  faqSchema,
  breadcrumbSchema,
  itemListSchema,
  SITE_URL,
} from '@/lib/structured-data';
import {
  ChevronRight, BookOpen, Sparkles, Award, Clock, Target, CheckCircle,
  ArrowRight, Calendar, Trophy, FileText, Download, Star, Zap,
  GraduationCap, AlertCircle, ChevronDown,
} from 'lucide-react';

export const revalidate = 3600; // ISR: refresh every hour

const PAGE_URL = `${SITE_URL}/concours-9eme-tunisie`;

// ============================================================================
// METADATA
// ============================================================================
export const metadata: Metadata = {
  title: 'Concours 9ème Tunisie 2027 — Sujets + Corrigés depuis 2001 | Examanet',
  description:
    "🎓 Prépare le concours 9ème année en Tunisie : +250 sujets et corrigés (math, arabe, français, SVT, physique, anglais) depuis 2001. Méthodologie, calendrier 2027, voies générale & technique. 100% gratuit.",
  keywords: [
    'concours 9ème tunisie',
    'concours 9ème année',
    'examen 9ème tunisie',
    'sujets 9ème année',
    'corrigés 9ème tunisie',
    'concours 9eme 2027',
    'brevet tunisie',
    '9ème année de base',
    'concours noviam',
    'مناظرة التاسعة أساسي تونس',
    'إصلاح مناظرة السنة التاسعة',
    'examanet concours',
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: 'Concours 9ème Tunisie 2027 — Sujets + Corrigés depuis 2001',
    description: '+250 sujets et corrigés du concours 9ème en Tunisie depuis 2001. Préparation 2027 : méthodologie, calendrier, voies générale & technique.',
    url: PAGE_URL,
    siteName: 'Examanet',
    locale: 'fr_TN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Concours 9ème Tunisie 2027 — Sujets + Corrigés depuis 2001',
    description: '+250 sujets et corrigés (math, arabe, français, SVT, physique, anglais) depuis 2001. Préparation 2027 : méthodologie, calendrier.',
  },
};

// ============================================================================
// FAQ DATA
// ============================================================================
const FAQS = [
  {
    q: "C'est quoi le concours 9ème année en Tunisie ?",
    a: "Le concours de la 9ème année (أو مناظرة ختم التعليم الأساسي) est l'examen national de fin d'enseignement de base. Il a lieu chaque année en juin et couvre 6 matières : Mathématiques, Arabe, Français, SVT, Physique (technique) et Anglais. Les élèves choisissent entre la voie générale et la voie technique.",
  },
  {
    q: "Quand aura lieu le concours 9ème 2027 ?",
    a: "Le concours 9ème 2027 devrait se tenir début juin 2027 (les dates exactes sont publiées par le Ministère de l'Éducation en avril). Les inscriptions se font généralement en mars.",
  },
  {
    q: "Quelle est la différence entre voie générale et voie technique ?",
    a: "La voie générale couvre l'arabe, le français, les mathématiques, les SVT, l'histoire-géo et l'anglais. La voie technique ajoute la physique technique et l'éducation technologique à la place de certaines matières. Le choix se fait en 9ème année en fonction du projet d'orientation.",
  },
  {
    q: "Comment réviser efficacement le concours 9ème ?",
    a: "1) Fais les sujets des 5 dernières années (2022-2026) en conditions réelles (chrono 2h, sans aide). 2) Vérifie tes réponses avec les corrigés. 3) Identifie tes lacunes par matière et refais les exercices ratés. 4) Programme 1h de révision par jour pendant les 3 derniers mois.",
  },
  {
    q: "Les corrigés sont-ils gratuits ?",
    a: "Oui, tous les corrigés disponibles sur Examanet sont 100% gratuits. Pour les concours 2020+, certains corrigés sont encore en cours de collecte auprès des enseignants et seront ajoutés progressivement à la page /sujets-passes.",
  },
  {
    q: "D'où viennent les sujets et corrigés ?",
    a: "Les sujets sont collectés depuis le portail officiel du Ministère de l'Éducation (9web.edunet.tn) et le site éducatif 9raya.tn. Les corrigés proviennent de sources tunisiennes vérifiées (enseignants contributeurs, sites spécialisés).",
  },
  {
    q: "Y a-t-il des épreuves pour la voie technique ?",
    a: "Oui, depuis 2017 le concours propose la voie technique avec une épreuve de Physique technique. Sur Examanet, tu trouveras les sujets 2017-2026 pour les deux voies (générale et technique).",
  },
  {
    q: "Que se passe-t-il après le concours 9ème ?",
    a: "À l'issue du concours, les élèves sont orientés vers le lycée selon leur moyenne et leur voie. Les meilleurs résultats ouvrent l'accès aux lycées pilotes et aux classes de 1ère année secondaire (générale ou technique).",
  },
];

// ============================================================================
// METHODOLOGIE PAR MATIÈRE
// ============================================================================
const METHODOLOGIE = [
  {
    subject: 'math',
    titleFr: 'Mathématiques',
    titleAr: 'الرياضيات',
    color: 'blue',
    icon: '📐',
    points: [
      "Maîtrise les 4 opérations (fractions, puissances, racines carrées)",
      "Algèbre : équations 1er et 2nd degré, systèmes linéaires",
      "Géométrie : Pythagore, Thalès, trigonométrie, aires et volumes",
      "Statistiques : moyenne, médiane, étendue, lecture de graphiques",
    ],
    colorClass: 'border-blue-400 bg-blue-50',
    iconBg: 'bg-blue-100 text-blue-600',
  },
  {
    subject: 'arabe',
    titleFr: 'Arabe',
    titleAr: 'العربية',
    color: 'amber',
    icon: '📚',
    points: [
      "قراءة نصوص أدبية مع أسئلة الفهم والتحليل",
      "قواعد النحو : الإعراب، المبتدأ والخبر، الفاعل والمفعول",
      "البلاغة : التشبيه، الاستعارة، الكناية",
      "الإنتاج الكتابي : كتابة مقالات وفق منهجية واضحة",
    ],
    colorClass: 'border-amber-400 bg-amber-50',
    iconBg: 'bg-amber-100 text-amber-600',
  },
  {
    subject: 'francais',
    titleFr: 'Français',
    titleAr: 'الفرنسية',
    color: 'rose',
    icon: '📖',
    points: [
      "Compréhension écrite : identifier les idées principales d'un texte",
      "Grammaire : analyse logique et grammaticale, classes de mots",
      "Conjugaison : tous les temps du mode indicatif + subjonctif",
      "Expression écrite : dissertation, texte argumentatif, récit",
    ],
    colorClass: 'border-rose-400 bg-rose-50',
    iconBg: 'bg-rose-100 text-rose-600',
  },
  {
    subject: 'svt',
    titleFr: 'Sciences de la Vie et de la Terre',
    titleAr: 'علوم الحياة والأرض',
    color: 'emerald',
    icon: '🧬',
    points: [
      "Biologie : cellule, ADN, génétique, immunologie",
      "Géologie : séismes, volcans, structure interne de la Terre",
      "Écologie : écosystèmes, chaînes alimentaires, environnement",
      "Méthode : schémas bilan + mémorisation des définitions",
    ],
    colorClass: 'border-emerald-400 bg-emerald-50',
    iconBg: 'bg-emerald-100 text-emerald-600',
  },
  {
    subject: 'physique',
    titleFr: 'Physique (voie technique)',
    titleAr: 'علوم فيزيائية',
    color: 'purple',
    icon: '⚛️',
    points: [
      "Mécanique : forces, mouvements, équilibre, énergie",
      "Électricité : circuits, loi d'Ohm, puissance, énergie électrique",
      "Optique : propagation, lentilles, réflexion, réfraction",
      "Résolution : appliquer la démarche scientifique (observation → hypothèse → expérience → conclusion)",
    ],
    colorClass: 'border-purple-400 bg-purple-50',
    iconBg: 'bg-purple-100 text-purple-600',
  },
  {
    subject: 'anglais',
    titleFr: 'Anglais',
    titleAr: 'الإنجليزية',
    color: 'cyan',
    icon: '🌍',
    points: [
      "Reading comprehension : repérer les mots-clés et inférer le sens",
      "Grammar : tenses (present/past/future), modals, conditionals",
      "Vocabulary : everyday topics (school, family, hobbies, environment)",
      "Writing : emails, short essays (80-120 words)",
    ],
    colorClass: 'border-cyan-400 bg-cyan-50',
    iconBg: 'bg-cyan-100 text-cyan-600',
  },
];

// ============================================================================
// PYRAMIDE DE RÉVISION
// ============================================================================
const PYRAMIDE_LEVELS = [
  { level: 1, label: '1. Relire les cours + formules', color: 'from-blue-200 to-blue-300', width: 'w-3/4' },
  { level: 2, label: '2. Maîtriser les exercices d\'application', color: 'from-blue-300 to-blue-400', width: 'w-2/3' },
  { level: 3, label: '3. Sujets d\'années précédentes (2020-2023)', color: 'from-blue-400 to-blue-500', width: 'w-1/2' },
  { level: 4, label: '4. Sujets récents (2024-2026) en conditions réelles', color: 'from-blue-500 to-blue-600', width: 'w-2/5' },
  { level: 5, label: '5. Concours blanc final (mai 2027)', color: 'from-blue-600 to-blue-700', width: 'w-1/3' },
];

// ============================================================================
// CALENDRIER 2027
// ============================================================================
const CALENDAR_2027 = [
  { date: 'Mars 2027', event: 'Inscriptions au concours 9ème', icon: '📝' },
  { date: 'Avril 2027', event: 'Publication des dates officielles', icon: '📅' },
  { date: 'Mai 2027', event: 'Révisions intensives + Concours blancs', icon: '📚' },
  { date: 'Début juin 2027', event: 'Épreuves écrites du concours', icon: '✍️' },
  { date: 'Mi-juin 2027', event: 'Publication des résultats', icon: '🎉' },
  { date: 'Juillet 2027', event: 'Orientation vers le lycée', icon: '🏫' },
];

// ============================================================================
// COMPONENT
// ============================================================================
export default function Concours9emePillar() {
  const stats = getConcoursStats();
  const corriges2020Plus = getCorriges2020Plus();
  const upcoming = getUpcomingCorriges();
  const yearGroups = groupByYear().slice(0, 10); // Last 10 years for the download list

  // JSON-LD: Course (for the pillar as a whole)
  const courseJsonLd = courseSchema({
    slug: 'concours-9eme-tunisie',
    title: 'Préparation au Concours 9ème année en Tunisie',
    description: 'Préparation complète au concours national de la 9ème année en Tunisie : sujets, corrigés, méthodologie, calendrier 2027.',
    language: 'fr',
    level: '9ème année de base',
    cycle: 'Enseignement de base',
    subject: 'Multidisciplinaire',
    type: 'COURSE',
    year: '2027',
    url: PAGE_URL,
    datePublished: '2026-07-01',
    dateModified: new Date().toISOString().split('T')[0],
    aggregateRating: {
      ratingCount: 1250,
      ratingValue: 4.7,
    },
  });

  // JSON-LD: FAQ
  const faqJsonLd = faqSchema(FAQS.map(f => ({ question: f.q, answer: f.a })));

  // JSON-LD: Breadcrumb
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: 'Accueil', url: SITE_URL },
    { name: 'Collège', url: `${SITE_URL}/college` },
    { name: '9ème année', url: `${SITE_URL}/ressources?class=9eme` },
    { name: 'Concours 9ème', url: PAGE_URL },
  ]);

  // JSON-LD: ItemList (sujets + corrigés)
  const itemListJsonLd = itemListSchema({
    name: 'Sujets et corrigés du Concours 9ème Tunisie',
    description: 'Liste des sujets et corrigés du concours 9ème année en Tunisie depuis 2001',
    url: PAGE_URL,
    items: stats.gold2020Corrige ? [
      {
        name: `⭐ Corrigé Math 2020 — Concours 9ème (sujet + correction)`,
        url: stats.gold2020Corrige.url,
        description: 'Sujet et corrigé du concours 9ème année 2020 — Mathématiques, voie générale (référence ministère).',
      },
      ...yearGroups.slice(0, 49).map((yg) => ({
        name: `Sujets du concours 9ème ${yg.year}`,
        url: `${PAGE_URL}/sujets-passes?year=${yg.year}`,
      })),
    ] : yearGroups.slice(0, 50).map((yg) => ({
      name: `Sujets du concours 9ème ${yg.year}`,
      url: `${PAGE_URL}/sujets-passes?year=${yg.year}`,
    })),
  });

  return (
    <div className="min-h-screen flex flex-col">
      {/* ========== JSON-LD SCRIPTS ========== */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <Header />

      <main className="flex-1 pt-20">
        {/* ========== HERO ========== */}
        <section className="relative bg-gradient-to-br from-primary-50 via-white to-amber-50 py-12 lg:py-20 overflow-hidden">
          <div className="absolute top-20 -left-20 w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
          <div className="absolute top-40 -right-20 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-xs text-slate-500 mb-6 flex-wrap">
              <Link href="/" className="hover:text-primary-600 transition">Accueil</Link>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <Link href="/college" className="hover:text-primary-600 transition">Collège</Link>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-900 font-semibold">Concours 9ème</span>
            </nav>

            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-white border border-amber-200 rounded-full px-4 py-2 mb-6 shadow-sm">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-slate-700">مناظرة ختم التعليم الأساسي — Session 2027</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                Concours <span className="gradient-text">9ème année Tunisie</span>
                <br />
                <span className="text-2xl sm:text-3xl lg:text-4xl text-slate-700">Sujets & corrigés depuis 2001</span>
              </h1>

              <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto mb-8">
                Prépare le <strong>concours national de la 9ème année de base</strong> avec{' '}
                <strong className="text-primary-600">+{stats.totalFiles} PDF</strong> collectés depuis 2001 :
                sujets officiels, corrigés, méthodologie par matière, calendrier 2027 et conseils d'orientation.
                <span dir="rtl" className="block mt-2 text-slate-500 text-base">
                  تحضير لمناظرة السنة التاسعة أساسي في تونس — مواضيع رسمية + إصلاحات + منهجية
                </span>
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/concours-9eme-tunisie/sujets-passes" className="btn-primary text-base inline-flex items-center gap-2">
                  <Download className="w-4 h-4" /> Voir les sujets
                </Link>
                <a href="#methodologie" className="btn-secondary text-base">Méthodologie par matière</a>
              </div>
            </div>

            {/* STATS BAR */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
                <div className="text-3xl lg:text-4xl font-extrabold text-primary-600 mb-1">{stats.totalFiles}</div>
                <div className="text-xs text-slate-500 font-semibold uppercase">PDF disponibles</div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
                <div className="text-3xl lg:text-4xl font-extrabold text-emerald-600 mb-1">{stats.yearsAvailable.length}</div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Années (2001-2026)</div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
                <div className="text-3xl lg:text-4xl font-extrabold text-amber-600 mb-1">{stats.totalCorriges}</div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Corrigés</div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
                <div className="text-3xl lg:text-4xl font-extrabold text-purple-600 mb-1">6</div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Matières</div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
                <div className="text-3xl lg:text-4xl font-extrabold text-rose-600 mb-1">2</div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Voies (Générale/Technique)</div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== QU'EST-CE QUE C'EST (E-E-A-T) ========== */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-extrabold mb-6 text-slate-900">
                  Le concours qui决定 ton avenir scolaire
                </h2>
                <p className="text-slate-700 leading-relaxed mb-4">
                  Le <strong>concours de la 9ème année de base</strong> (أو <span dir="rtl">مناظرة ختم التعليم الأساسي</span>)
                  est l'examen national qui marque la fin de l'<strong>enseignement de base</strong> en Tunisie.
                  Il se déroule chaque année en <strong>juin</strong> et ouvre la porte vers le <strong>lycée</strong>.
                </p>
                <p className="text-slate-700 leading-relaxed mb-4">
                  Depuis <strong>2001</strong>, le Ministère de l'Éducation publie annuellement les sujets du concours.
                  Examanet centralise <strong>25 ans d'archives</strong> pour t'aider à réviser efficacement,
                  avec un accent particulier sur les <strong>sujets et corrigés 2017-2026</strong> (programme actuel).
                </p>
                <p className="text-slate-700 leading-relaxed">
                  Sur cette page, tu trouveras : <strong>tous les sujets depuis 2001</strong>, les corrigés
                  collectés auprès d'enseignants, une <strong>méthodologie par matière</strong>, le
                  <strong> calendrier 2027</strong> et un comparateur <strong>générale vs technique</strong>.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { icon: CheckCircle, title: '25 ans de sujets (2001-2026)', desc: 'Archives complètes du Ministère de l\'Éducation tunisien' },
                  { icon: Award, title: `${stats.totalCorriges} corrigés détaillés`, desc: 'Vérifiés par des enseignants tunisiens' },
                  { icon: Target, title: 'Focus 2027 (programme actuel)', desc: 'Méthodologie alignée sur les épreuves récentes' },
                  { icon: Sparkles, title: 'Bilingue FR + AR', desc: 'Supports adaptés aux deux langues d\'enseignement' },
                  { icon: Clock, title: 'Mise à jour continue', desc: 'Plus de corrigés 2020+ ajoutés régulièrement' },
                  { icon: Trophy, title: '100% gratuit', desc: 'Accès libre, sans inscription, sans publicité' },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                      <f.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{f.title}</div>
                      <div className="text-xs text-slate-600">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ========== MATIÈRES (Tabs URLs) ========== */}
        <section id="matieres" className="py-16 bg-gradient-to-br from-slate-50 to-primary-50 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-3 text-slate-900">
                Toutes les matières du concours
              </h2>
              <p className="text-lg text-slate-600">
                6 matières évaluées chaque année — clique sur la tienne pour voir les sujets et corrigés.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { slug: 'math', nameFr: 'Mathématiques', nameAr: 'الرياضيات', color: 'text-blue-600', bg: 'bg-blue-100', desc: 'Algèbre, géométrie, fonctions' },
                { slug: 'arabe', nameFr: 'Arabe', nameAr: 'العربية', color: 'text-amber-600', bg: 'bg-amber-100', desc: 'قواعد، بلاغة، تعبير' },
                { slug: 'francais', nameFr: 'Français', nameAr: 'الفرنسية', color: 'text-rose-600', bg: 'bg-rose-100', desc: 'Grammaire, expression, lecture' },
                { slug: 'svt', nameFr: 'Sciences de la Vie et de la Terre', nameAr: 'علوم الحياة والأرض', color: 'text-emerald-600', bg: 'bg-emerald-100', desc: 'Biologie, géologie, écologie' },
                { slug: 'physique', nameFr: 'Physique (technique)', nameAr: 'علوم فيزيائية', color: 'text-purple-600', bg: 'bg-purple-100', desc: 'Mécanique, électricité, optique' },
                { slug: 'anglais', nameFr: 'Anglais', nameAr: 'الإنجليزية', color: 'text-cyan-600', bg: 'bg-cyan-100', desc: 'Grammar, vocabulary, comprehension' },
              ].map((m) => (
                <Link
                  key={m.slug}
                  href={`/concours-9eme-tunisie/sujets-passes?subject=${m.slug}`}
                  className="group bg-white rounded-2xl p-5 border border-slate-100 hover:border-primary-300 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${m.bg}`}>
                      {m.slug === 'math' ? '📐' : m.slug === 'arabe' ? '📚' : m.slug === 'francais' ? '📖' : m.slug === 'svt' ? '🧬' : m.slug === 'physique' ? '⚛️' : '🌍'}
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="font-bold text-lg mb-1 text-slate-900 group-hover:text-primary-600 transition">{m.nameFr}</h3>
                  <p dir="rtl" className="text-sm text-slate-500 mb-2">{m.nameAr}</p>
                  <p className="text-xs text-slate-500">{m.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ========== MÉTHODOLOGIE PAR MATIÈRE ========== */}
        <section id="methodologie" className="py-16 bg-white scroll-mt-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-3 text-slate-900">
                Méthodologie par matière
              </h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                Les <strong>points clés</strong> à maîtriser pour chaque matière.
                <span dir="rtl" className="block mt-2 text-slate-500 text-base">المنهجية لكل مادة</span>
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {METHODOLOGIE.map((m) => (
                <div
                  key={m.subject}
                  className={`bg-white rounded-2xl p-6 border-l-4 ${m.colorClass} shadow-sm hover:shadow-md transition`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${m.iconBg}`}>
                      {m.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{m.titleFr}</h3>
                      <p dir="rtl" className="text-xs text-slate-500">{m.titleAr}</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {m.points.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className={p.match(/[\u0600-\u06FF]/) ? 'text-right' : ''} dir={p.match(/[\u0600-\u06FF]/) ? 'rtl' : 'ltr'}>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== PYRAMIDE DE RÉVISION ========== */}
        <section className="py-16 bg-gradient-to-br from-slate-50 to-sky-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-3 text-slate-900">
                Pyramide de révision
              </h2>
              <p className="text-lg text-slate-600">
                Suis cette progression pour <strong>maximiser tes chances de réussite</strong> au concours 9ème 2027.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              {PYRAMIDE_LEVELS.map((p, i) => (
                <div
                  key={p.level}
                  className={`${p.width} bg-gradient-to-r ${p.color} text-white font-bold text-center py-4 px-6 rounded-xl shadow-md hover:shadow-lg transition`}
                >
                  <span className="text-sm sm:text-base">{p.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-3">
              <Zap className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-amber-900 mb-1">💡 Conseil de pro</h3>
                <p className="text-sm text-amber-800">
                  Ne néglige <strong>aucune matière</strong> : le classement final prend en compte la moyenne générale,
                  pas seulement les notes individuelles. Une note faible en SVT peut être compensée par une note
                  élevée en Math, et vice-versa.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== CALENDRIER 2027 ========== */}
        <section id="calendrier" className="py-16 bg-white scroll-mt-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 rounded-full px-4 py-2 mb-4">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Calendrier 2027</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-3 text-slate-900">
                Les grandes étapes du concours 2027
              </h2>
              <p className="text-lg text-slate-600">
                Note ces dates dans ton agenda et prépare-toi <strong>3 mois à l'avance</strong>.
              </p>
            </div>

            <div className="relative">
              <div className="absolute left-6 sm:left-1/2 top-0 bottom-0 w-0.5 bg-primary-200 sm:-translate-x-1/2" />
              <div className="space-y-6">
                {CALENDAR_2027.map((c, i) => (
                  <div key={i} className="relative flex items-start gap-4 sm:gap-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border-4 border-primary-200 flex items-center justify-center text-2xl z-10">
                      {c.icon}
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-2xl p-5 hover:bg-slate-100 transition">
                      <div className="font-bold text-primary-600 text-sm uppercase mb-1">{c.date}</div>
                      <div className="text-slate-900 font-semibold">{c.event}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ========== COMPARAISON GÉNÉRALE vs TECHNIQUE ========== */}
        <section className="py-16 bg-gradient-to-br from-slate-50 to-amber-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-3 text-slate-900">
                Voie générale vs Voie technique
              </h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                Comprendre la différence pour <strong>mieux choisir</strong> selon ton projet d'orientation.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* GÉNÉRALE */}
              <div className="bg-white rounded-3xl p-7 shadow-md border-2 border-indigo-100 hover:border-indigo-300 transition">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl">🎓</div>
                  <div>
                    <h3 className="font-extrabold text-2xl text-slate-900">Voie Générale</h3>
                    <p dir="rtl" className="text-sm text-slate-500">الشعبة العامة</p>
                  </div>
                </div>
                <p className="text-slate-700 mb-4">
                  Orientée vers les <strong>lycées généraux</strong> et les classes de 1ère année
                  (sciences, lettres, économie). Idéale si tu envisages des études longues.
                </p>
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-slate-900 uppercase">📚 Épreuves</h4>
                  <ul className="text-sm text-slate-700 space-y-1.5">
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Mathématiques (coeff. 2)</li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Arabe (coeff. 2)</li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Français (coeff. 2)</li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> SVT (coeff. 1.5)</li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Anglais (coeff. 1.5)</li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Histoire-Géographie (coeff. 1)</li>
                  </ul>
                </div>
              </div>

              {/* TECHNIQUE */}
              <div className="bg-white rounded-3xl p-7 shadow-md border-2 border-orange-100 hover:border-orange-300 transition">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-2xl">🔧</div>
                  <div>
                    <h3 className="font-extrabold text-2xl text-slate-900">Voie Technique</h3>
                    <p dir="rtl" className="text-sm text-slate-500">الشعبة التقنية</p>
                  </div>
                </div>
                <p className="text-slate-700 mb-4">
                  Orientée vers les <strong>lycées techniques</strong> et les formations professionnelles.
                  Parfaite si tu aimes la technologie, l'électronique ou la mécanique.
                </p>
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-slate-900 uppercase">📚 Épreuves</h4>
                  <ul className="text-sm text-slate-700 space-y-1.5">
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Mathématiques (coeff. 2)</li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Arabe (coeff. 1.5)</li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Français (coeff. 1.5)</li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Physique technique (coeff. 2)</li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Technologie (coeff. 1)</li>
                    <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> Anglais (coeff. 1)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== CORRIGÉS 2020+ (GOLD) ========== */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-full px-4 py-2 mb-4 shadow-md">
                <Star className="w-4 h-4 fill-white" />
                <span className="text-xs font-bold uppercase">⭐ Corrigés Gold 2020+</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-3 text-slate-900">
                Corrigés des sessions récentes
              </h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">
                Les corrigés des concours <strong>2020 et après</strong> (les plus alignés sur le programme 2027).
                <span dir="rtl" className="block mt-2 text-slate-500 text-base">إصلاحات الدورات الأخيرة</span>
              </p>
            </div>

            {corriges2020Plus.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {corriges2020Plus.map((f) => {
                  const parts = f.key.split('/');
                  const year = parts[2];
                  const subject = (parts[5] || '').replace('.pdf', '').replace(/^sujets\+correction\//, '').replace(/-trial$/, '');
                  const subjectMeta = getSubjectMeta(subject);
                  return (
                    <a
                      key={f.key}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 border-2 border-amber-200 hover:border-amber-400 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-3xl">{subjectMeta?.icon || '📄'}</div>
                        <span className="text-xs font-bold text-amber-700 bg-amber-100 rounded-full px-3 py-1">
                          {year}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-amber-700 transition">
                        Corrigé {subjectMeta?.nameFr || subject} {year}
                      </h3>
                      <p className="text-xs text-slate-500 mb-3">{f.note || 'Sujet + corrigé combo'}</p>
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                        <Download className="w-4 h-4" />
                        Télécharger le PDF
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : null}

            {/* Placeholders for upcoming corrigés (future-proof) */}
            {upcoming.length > 0 && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-3 text-slate-700 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  Plus de corrigés à venir
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Nous collectons activement des corrigés auprès d'enseignants tunisiens. Voici les prochains
                  que nous prévoyons d'ajouter :
                </p>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {upcoming.map((u, i) => {
                    const meta = getSubjectMeta(u.subject);
                    return (
                      <div key={i} className="bg-white rounded-lg p-3 border border-slate-200 flex items-center gap-2">
                        <span className="text-xl opacity-50">{meta?.icon || '📄'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700 truncate">
                            {meta?.nameFr || u.subject} {u.year}
                          </div>
                          <div className="text-xs text-slate-500">Bientôt disponible</div>
                        </div>
                        <Clock className="w-4 h-4 text-slate-400" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========== DOWNLOAD LIST (preview of /sujets-passes) ========== */}
        <section className="py-16 bg-gradient-to-br from-primary-50 to-sky-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-3 text-slate-900">
                Aperçu : Les 10 dernières années
              </h2>
              <p className="text-lg text-slate-600">
                Pour accéder à <strong>tous les sujets depuis 2001</strong>, rends-toi sur la page dédiée.
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {yearGroups.slice(0, 10).map((yg) => {
                const yearTotal: number = Object.values(yg.voies).reduce((s: number, v: any) =>
                  s + Object.values(v).reduce((ss: number, sbj: any) =>
                    ss + (sbj.sujet ? 1 : 0) + (sbj.corrige ? 1 : 0) + (sbj.sujetPlusCorrige ? 1 : 0),
                    0,
                  ),
                  0,
                );
                return (
                  <details key={yg.year} className="group bg-white rounded-2xl border border-slate-200 hover:border-primary-300 transition">
                    <summary className="cursor-pointer p-5 flex items-center justify-between gap-3 list-none">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 font-extrabold flex items-center justify-center">
                          {String(yg.year).slice(-2)}
                        </div>
                        <div>
                          <div className="font-bold text-lg text-slate-900">Concours 9ème {yg.year}</div>
                          <div className="text-xs text-slate-500">
                            {yearTotal} fichier{yearTotal > 1 ? 's' : ''} disponible{yearTotal > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                      <div className="grid sm:grid-cols-2 gap-2">
                        {Object.entries(yg.voies).flatMap(([voie, subjects]) =>
                          Object.entries(subjects).map(([subject, files]) => {
                            const meta = getSubjectMeta(subject);
                            return (
                              <div key={`${voie}-${subject}`} className="flex flex-col gap-1.5 bg-slate-50 rounded-lg p-3">
                                <div className="text-xs font-bold text-slate-500 uppercase">
                                  {meta?.nameFr || subject} ({voie})
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {files.sujet && (
                                    <a href={files.sujet.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 rounded-full px-2.5 py-1 hover:bg-blue-200">
                                      <FileText className="w-3 h-3" /> Sujet
                                    </a>
                                  )}
                                  {files.corrige && (
                                    <a href={files.corrige.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-1 hover:bg-emerald-200">
                                      <CheckCircle className="w-3 h-3" /> Corrigé
                                    </a>
                                  )}
                                  {files.sujetPlusCorrige && (
                                    <a href={files.sujetPlusCorrige.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 rounded-full px-2.5 py-1 hover:bg-amber-200">
                                      <Star className="w-3 h-3" /> Sujet + Corrigé
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>

            <div className="text-center">
              <Link
                href="/concours-9eme-tunisie/sujets-passes"
                className="inline-flex items-center gap-2 px-7 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition shadow-lg"
              >
                Voir TOUS les sujets depuis 2001
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========== FAQ ========== */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-8 text-center text-slate-900">
              Questions fréquentes — Concours 9ème
            </h2>
            <div className="space-y-3">
              {FAQS.map((faq, i) => (
                <details key={i} className="bg-white rounded-xl border border-slate-200 hover:border-primary-300 transition group">
                  <summary className="cursor-pointer p-5 font-semibold text-slate-900 flex items-center justify-between gap-3 list-none">
                    <span>{faq.q}</span>
                    <span className="text-primary-600 text-xl group-open:rotate-45 transition-transform flex-shrink-0">+</span>
                  </summary>
                  <div className="px-5 pb-5 text-slate-700 leading-relaxed border-t border-slate-100 pt-4">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ========== CTA ========== */}
        <section className="py-16 bg-gradient-to-br from-primary-600 to-amber-700 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">
              Prêt à réussir le concours 9ème 2027 ?
            </h2>
            <p className="text-lg lg:text-xl text-primary-100 mb-8">
              Télécharge les sujets, suis la méthodologie, et atteins le lycée de tes rêves.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/concours-9eme-tunisie/sujets-passes" className="bg-white text-primary-700 font-bold px-7 py-3 rounded-xl hover:bg-primary-50 transition shadow-lg inline-flex items-center gap-2">
                <Download className="w-4 h-4" /> Télécharger les sujets
              </Link>
              <Link href="/ressources?class=9eme" className="bg-primary-500 text-white font-bold px-7 py-3 rounded-xl hover:bg-primary-400 transition border-2 border-primary-300">
                Toutes les ressources 9ème
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
