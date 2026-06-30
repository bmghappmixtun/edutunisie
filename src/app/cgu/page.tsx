import Link from 'next/link';
import { Scale, FileText, Mail, AlertCircle, CheckCircle, XCircle, Shield, BookOpen, Users, Globe, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'CGU — Conditions Générales d\'Utilisation',
  description: 'Conditions générales d\'utilisation de la plateforme Examanet'
};

const sections = [
  {
    id: 'objet',
    title: '1. Objet',
    content: `Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de définir
    les modalités et conditions d'utilisation de la plateforme Examanet (ci-après « la Plateforme »),
    éditée par Examanet SARL, ainsi que les droits et obligations des utilisateurs.

    Examanet est une plateforme collaborative de partage de ressources pédagogiques destinée
    aux élèves, enseignants et parents d'élèves du système éducatif tunisien.`
  },
  {
    id: 'acceptation',
    title: '2. Acceptation des CGU',
    content: `L'utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU.
    Tout utilisateur qui ne souhaite pas accepter les présentes CGU doit s'abstenir d'utiliser la Plateforme.

    Examanet se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs
    seront informés de toute modification par email et/ou par notification sur la Plateforme.`
  },
  {
    id: 'inscription',
    title: '3. Inscription et compte utilisateur',
    content: `L'accès à certaines fonctionnalités (publication, commentaires, favoris) nécessite la
    création d'un compte. L'utilisateur s'engage à fournir des informations exactes lors de son
    inscription et à les mettre à jour.

    Le compte est personnel et non transférable. L'utilisateur est responsable de la confidentialité
    de ses identifiants et de toutes les actions effectuées depuis son compte.

    Trois rôles sont disponibles :
    • Élève : accès aux ressources, favoris, commentaires
    • Enseignant : publication de ressources après approbation
    • Administrateur : modération de la plateforme`
  },
  {
    id: 'contenu',
    title: '4. Contenu utilisateur',
    content: `L'utilisateur est seul responsable du contenu qu'il publie sur la Plateforme (PDF,
    descriptions, commentaires, images).

    En publiant du contenu, l'utilisateur garantit qu'il en est l'auteur ou qu'il dispose des
    droits nécessaires, et qu'il ne porte pas atteinte aux droits de tiers (propriété intellectuelle,
    droit à l'image, etc.).

    L'utilisateur cède à Examanet une licence non exclusive, mondiale et gratuite d'utilisation,
    de reproduction, de modification et de distribution du contenu publié, dans le cadre du
    fonctionnement de la Plateforme.`
  },
  {
    id: 'propriete',
    title: '5. Propriété intellectuelle',
    content: `L'ensemble du contenu de la Plateforme (textes, images, logos, icônes, ainsi que le code
    source) est protégé par le droit d'auteur et appartient à Examanet ou à ses partenaires.

    Les ressources pédagogiques (PDF) restent la propriété de leurs auteurs. Toute reproduction
    sans autorisation est interdite, sauf usage personnel et pédagogique.

    Les marques, logos et signes distinctifs présents sur la Plateforme sont protégés.`
  },
  {
    id: 'utilisation',
    title: '6. Utilisation acceptable',
    content: `L'utilisateur s'engage à ne pas :
    • Publier de contenu illégal, diffamatoire, injurieux, discriminatoire ou portant atteinte aux bonnes mœurs
    • Usurper l'identité d'un tiers
    • Publier de contenu protégé par des droits d'auteur sans autorisation
    • Tenter de pirater, décompiler ou contourner les mesures de sécurité de la Plateforme
    • Utiliser la Plateforme à des fins commerciales sans autorisation
    • Spam, hameçonnage, ou toute activité malveillante
    • Perturber le fonctionnement normal de la Plateforme`
  },
  {
    id: 'moderation',
    title: '7. Modération et sanctions',
    content: `Examanet se réserve le droit de modérer, modifier ou supprimer tout contenu ne
    respectant pas les présentes CGU, sans préavis.

    En cas de violation grave ou répétée, Examanet peut suspendre ou supprimer le compte de
    l'utilisateur, et le cas échéant engager des poursuites judiciaires.

    Les enseignants sont soumis à une approbation préalable par l'équipe d'Examanet avant de
    pouvoir publier des ressources.`
  },
  {
    id: 'donnees',
    title: '8. Données personnelles',
    content: `Les données personnelles collectées par la Plateforme sont traitées conformément à
    la loi organique n° 2004-63 du 27 juillet 2004 relative à la protection des données à
    caractère personnel et à notre Politique de confidentialité.

    L'utilisateur dispose d'un droit d'accès, de rectification, d'opposition et de suppression
    de ses données. Pour exercer ces droits : contact@examanet.com`
  },
  {
    id: 'responsabilite',
    title: '9. Limitation de responsabilité',
    content: `Examanet s'efforce d'assurer la disponibilité et la qualité de la Plateforme,
    mais ne peut garantir une accessibilité 100% du temps.

    Examanet ne peut être tenu responsable :
    • Des dommages indirects liés à l'utilisation de la Plateforme
    • Du contenu publié par les utilisateurs
    • De l'exactitude pédagogique des ressources (chaque ressource reste sous la responsabilité de son auteur)
    • De l'utilisation détournée des ressources par des tiers`
  },
  {
    id: 'cookies',
    title: '10. Cookies',
    content: `La Plateforme utilise des cookies et technologies similaires pour :
    • Assurer le bon fonctionnement (session, préférences)
    • Mémoriser la langue de l'utilisateur
    • Analyser l'audience (anonymisé)

    L'utilisateur peut gérer ses préférences cookies via les paramètres de son navigateur.`
  },
  {
    id: 'modifications',
    title: '11. Modification des CGU',
    content: `Examanet se réserve le droit de modifier les présentes CGU à tout moment.
    Les utilisateurs seront informés par email et/ou par notification au moins 30 jours avant
    l'entrée en vigueur des modifications.

    En cas de refus des nouvelles CGU, l'utilisateur peut résilier son compte à tout moment.`
  },
  {
    id: 'droit',
    title: '12. Loi applicable et juridiction',
    content: `Les présentes CGU sont régies par le droit tunisien.

    En cas de litige, les parties s'efforceront de trouver une solution amiable. À défaut,
    le litige sera porté devant les tribunaux compétents de Tunis.`
  }
];

export default function CGUPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 lg:pt-20">
        {/* HERO */}
        <section className="bg-gradient-to-br from-primary-50 via-white to-sky-50 py-12 lg:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 mb-4">
              <Scale className="w-5 h-5 text-primary-600" />
              <span className="text-sm font-bold text-primary-600">Document juridique</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4">
              Conditions Générales d'Utilisation
            </h1>
            <p className="text-lg text-slate-600 mb-2">
              Dernière mise à jour : <strong>18 juin 2026</strong>
            </p>
            <p className="text-slate-500">
              Merci de lire attentivement ces conditions avant d'utiliser Examanet.
            </p>
          </div>
        </section>

        {/* Sommaire */}
        <section className="py-8 bg-slate-50 border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Sommaire</h2>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {sections.map(s => (
                <a key={s.id} href={`#${s.id}`} className="text-primary-600 hover:text-primary-700 hover:underline py-1">
                  → {s.title}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Contenu */}
        <article className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {sections.map(s => (
              <section key={s.id} id={s.id} className="mb-12 scroll-mt-20">
                <h2 className="text-2xl font-extrabold text-slate-900 mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {s.id.length}
                  </span>
                  {s.title}
                </h2>
                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-line">
                  {s.content}
                </div>
              </section>
            ))}

            {/* Acceptation */}
            <div className="mt-12 p-6 bg-gradient-to-br from-primary-50 to-sky-50 border border-primary-200 rounded-2xl">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">En utilisant Examanet, vous acceptez ces CGU</h3>
                  <p className="text-slate-600 text-sm">
                    Si vous avez des questions concernant ces conditions, contactez-nous à{' '}
                    <a href="mailto:contact@examanet.com" className="text-primary-600 font-semibold hover:underline">contact@examanet.com</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}