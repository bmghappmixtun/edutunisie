import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getLocale } from '@/lib/i18n-server';
import { faqSchema, breadcrumbSchema } from '@/lib/structured-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';

export async function generateMetadata(): Promise<Metadata> {
  const locale = getLocale();
  const isAr = locale === "ar";
  return {
    title: isAr ? "الأسئلة الشائعة — إكسامانت" : "FAQ — Questions fréquentes",
    description: isAr ? "جميع الإجابات على أسئلتك حول إكسامانت: دروس مجانية، مستويات، مواد، معلمون، تحميل." : "Toutes les réponses à vos questions sur Examanet : cours gratuits, niveaux, matières, enseignants, téléchargement.",
    alternates: isAr ? {"canonical":"/faq"} : {"canonical":"/faq"},
    openGraph: {
      title: isAr ? "الأسئلة الشائعة إكسامانت" : "FAQ Examanet",
      description: isAr ? "اعثر بسرعة على إجابات أسئلتك حول إكسامانت." : "Trouvez rapidement les réponses à vos questions sur Examanet.",
      url: isAr ? "/faq" : "/faq",
      type: isAr ? "website" : "website",
      locale: isAr ? "ar_TN" : "fr_TN",
    },
  };
}

const FAQS = [
  {
    category: 'Général',
    questions: [
      {
        q: "Qu'est-ce qu'Examanet ?",
        a: "Examanet est la plateforme pédagogique gratuite #1 en Tunisie. Elle regroupe des cours, devoirs, séries d'exercices, sujets Bac et corrigés pour les élèves du collège (7ème, 8ème, 9ème année de base) et du lycée (1ère, 2ème, 3ème, 4ème année secondaire / Bac). Toutes les ressources sont 100% gratuites et accessibles sans inscription.",
      },
      {
        q: "Examanet est-il vraiment gratuit ?",
        a: "Oui, 100% gratuit. Aucune inscription n'est requise pour consulter, télécharger ou imprimer les ressources. Le site est soutenu par la communauté enseignante tunisienne.",
      },
      {
        q: "Quelles sont les matières disponibles ?",
        a: "Mathématiques, Physique, Sciences de la Vie et de la Terre (SVT), Français, Arabe, Anglais, Histoire-Géographie, Philosophie, Économie, Gestion, Informatique, Technologie, et plus encore.",
      },
      {
        q: "Examanet couvre-t-il tout le programme officiel tunisien ?",
        a: "Oui, les ressources suivent le programme officiel du Ministère de l'Éducation tunisien pour chaque niveau et chaque matière.",
      },
    ],
  },
  {
    category: 'Navigation & Téléchargement',
    questions: [
      {
        q: "Comment trouver une ressource précise ?",
        a: "Utilisez la barre de recherche en haut de la page, ou naviguez par niveau (Enseignement de base / Enseignement Secondaire), par classe (7ème, 8ème, 9ème, etc.) ou par matière. Vous pouvez aussi filtrer par type (Cours, Devoir, Série, Sujet Bac, Corrigé).",
      },
      {
        q: "Comment télécharger un PDF ?",
        a: "Sur la page d'une ressource, cliquez sur le bouton 'Télécharger' (icône en bas de page). Le PDF s'ouvre dans un nouvel onglet — vous pouvez ensuite l'enregistrer ou l'imprimer.",
      },
      {
        q: 'Puis-je imprimer les ressources ?',
        a: "Oui, toutes les ressources sont au format PDF et peuvent être imprimées librement pour un usage personnel ou scolaire.",
      },
    ],
  },
  {
    category: 'Niveaux & Classes',
    questions: [
      {
        q: "Quelle est la différence entre 'Classe' et 'Niveau' ?",
        a: "La 'Classe' indique l'année précise (ex: 9ème année de base, 2ème année secondaire). Le 'Niveau' (ou cycle) indique le type d'enseignement : 'Enseignement de base' pour le collège (7-8-9ème) ou 'Enseignement Secondaire' pour le lycée (1-4ème année, Bac).",
      },
      {
        q: "Qu'est-ce que l'Enseignement de base ?",
        a: "L'Enseignement de base en Tunisie correspond au collège (7ème, 8ème, 9ème année). C'est le premier cycle du secondaire, après l'école primaire.",
      },
      {
        q: "Qu'est-ce que l'Enseignement Secondaire ?",
        a: "L'Enseignement Secondaire en Tunisie correspond au lycée (1ère, 2ème, 3ème, 4ème année secondaire). La 4ème année est l'année du Baccalauréat.",
      },
    ],
  },
  {
    category: 'Enseignants',
    questions: [
      {
        q: "Comment devenir contributeur sur Examanet ?",
        a: "Si vous êtes enseignant et souhaitez partager vos ressources, créez un compte enseignant gratuit sur examanet.com, puis ajoutez vos cours/devoirs depuis votre espace personnel.",
      },
      {
        q: "Comment contacter un enseignant ?",
        a: "Sur la page profil d'un enseignant (cliquez sur son nom), vous pouvez le suivre ou lui envoyer un message privé via la plateforme.",
      },
    ],
  },
  {
    category: 'Technique',
    questions: [
      {
        q: "Le site ne s'affiche pas correctement, que faire ?",
        a: "Essayez de vider le cache de votre navigateur (Ctrl+Shift+R ou Cmd+Shift+R). Si le problème persiste, contactez-nous via la page Contact.",
      },
      {
        q: "Puis-je utiliser Examanet sur mobile ?",
        a: "Oui, le site est entièrement responsive et optimisé pour mobile et tablette. Vous pouvez aussi l'installer comme une application (PWA) depuis votre navigateur.",
      },
    ],
  },
];

export default function FAQPage() {
  // Flatten FAQs for schema
  const flatFaqs = FAQS.flatMap(c => c.questions).map(f => ({ question: f.q, answer: f.a }));
  const jsonLd = faqSchema(flatFaqs);
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: 'Accueil', url: SITE_URL },
    { name: 'FAQ', url: `${SITE_URL}/faq` },
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />

      <main className="flex-1 pt-20">
        <div className="bg-gradient-to-br from-primary-50 to-sky-50 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-sm text-slate-500 mb-4">
              <Link href="/" className="hover:text-primary-600">Accueil</Link>
              <span className="text-slate-300">›</span>
              <span className="text-slate-900 font-semibold">FAQ</span>
            </nav>
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-3">Questions fréquentes</h1>
            <p className="text-lg text-slate-600">Toutes les réponses à vos questions sur Examanet</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
          {FAQS.map((section) => (
            <section key={section.category}>
              <h2 className="text-2xl font-bold mb-4 text-slate-900">{section.category}</h2>
              <div className="space-y-3">
                {section.questions.map((faq, i) => (
                  <details
                    key={i}
                    className="bg-white rounded-xl border border-slate-200 hover:border-primary-300 transition group"
                  >
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
            </section>
          ))}

          <section className="bg-gradient-to-br from-primary-50 to-sky-50 rounded-2xl p-8 text-center border border-primary-100">
            <h2 className="text-2xl font-bold mb-2">Vous ne trouvez pas votre réponse ?</h2>
            <p className="text-slate-600 mb-4">Notre équipe est là pour vous aider.</p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition"
            >
              Nous contacter →
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}