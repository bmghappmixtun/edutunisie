import Link from 'next/link';
import { GraduationCap, Target, Heart, Users, BookOpen, Globe, Sparkles, Award, ArrowRight, Mail } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { breadcrumbSchema, SITE_URL } from '@/lib/structured-data';

export const revalidate = 3600; // 1 hour cache

export const metadata = {
  title: 'À propos — Notre mission, équipe et valeurs',
  description: 'Découvrez Examanet, la plateforme pédagogique #1 en Tunisie. Notre mission : rendre l\'éducation gratuite et accessible à tous les élèves tunisiens.',
  alternates: { canonical: '/a-propos' },
  openGraph: {
    title: 'À propos d\'Examanet',
    description: 'Notre mission, notre équipe et nos valeurs pour l\'éducation en Tunisie.',
    url: '/a-propos',
    type: 'website',
  },
};

const breadcrumbJsonLd = breadcrumbSchema([
  { name: 'Accueil', url: SITE_URL },
  { name: 'À propos', url: `${SITE_URL}/a-propos` },
]);

const team = [
  { name: 'Mehdi Boutiti', role: 'Fondateur & CEO', email: 'boutiti.mehdi@gmail.com' }
];

const milestones = [
  { year: '2024', title: 'Lancement du projet', desc: 'Idée de créer une alternative moderne à devoirat.net' },
  { year: '2025', title: 'Première version bêta', desc: 'Plateforme lancée avec 16 matières et 50 ressources' },
  { year: '2026', title: '+10 000 ressources', desc: 'Import depuis tunisiecollege.net, communauté grandissante' }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />

      <main className="flex-1 pt-16 lg:pt-20">
        {/* HERO */}
        <section className="relative bg-gradient-to-br from-primary-50 via-white to-sky-50 py-16 lg:py-24 overflow-hidden">
          <div className="absolute top-20 -left-20 w-96 h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
          <div className="absolute top-40 -right-20 w-96 h-96 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-white border border-primary-200 rounded-full px-4 py-2 mb-6 shadow-sm">
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                <span className="text-xs font-semibold text-slate-700">Fait avec ❤️ en Tunisie 🇹🇳</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                Notre mission : <span className="gradient-text">démocratiser l'éducation</span> en Tunisie
              </h1>
              <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto">
                Examanet est née d'un constat simple : trop d'élèves tunisiens n'ont pas accès à des ressources
                pédagogiques de qualité. Nous avons décidé de changer ça.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
              {[
                { value: '+10 000', label: 'Ressources', icon: BookOpen, color: 'bg-primary-100 text-primary-600' },
                { value: '+200', label: 'Enseignants', icon: Users, color: 'bg-amber-100 text-amber-600' },
                { value: '+30 000', label: 'Élèves', icon: GraduationCap, color: 'bg-emerald-100 text-emerald-600' },
                { value: '100%', label: 'Gratuit', icon: Award, color: 'bg-purple-100 text-purple-600' }
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-xl ${s.color} flex items-center justify-center`}>
                    <s.icon className="w-6 h-6" />
                  </div>
                  <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 mb-1">{s.value}</div>
                  <div className="text-sm text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Notre histoire */}
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-block px-4 py-1.5 bg-primary-100 text-primary-700 rounded-full text-xs font-bold mb-3">NOTRE HISTOIRE</div>
              <h2 className="text-3xl lg:text-5xl font-extrabold mb-3">D'où venons-nous ?</h2>
            </div>

            <div className="prose prose-lg max-w-3xl mx-auto text-slate-600 space-y-4">
              <p>
                <strong className="text-slate-900">Tout a commencé en 2024</strong>, lorsque notre fondateur,
                Mehdi Boutiti, a cherché des ressources de mathématiques pour aider un cousin en 9ème année.
                Les sites existants (devoirat.net, tunisiecollege.net) étaient vieillissants, pleins de
                publicités intrusives, et l'expérience utilisateur laissait à désirer.
              </p>
              <p>
                L'idée est née : <em className="text-slate-900">« Et si on créait une plateforme moderne,
                gratuite, sans pub, et faite par et pour les Tunisiens ? »</em>
              </p>
              <p>
                En 2025, la première version voyait le jour. Aujourd'hui, Examanet héberge des milliers
                de ressources partagées par des enseignants passionnés, et est devenue la référence pour
                des dizaines de milliers d'élèves à travers le pays.
              </p>
            </div>
          </div>
        </section>

        {/* Nos valeurs */}
        <section className="py-20 bg-gradient-to-br from-slate-50 to-primary-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-block px-4 py-1.5 bg-primary-100 text-primary-700 rounded-full text-xs font-bold mb-3">NOS VALEURS</div>
              <h2 className="text-3xl lg:text-5xl font-extrabold mb-3">Ce qui nous anime</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Heart, title: 'Gratuit pour tous', desc: 'Aucune ressource payante, aucun paywall. L\'éducation est un droit, pas un privilège.' },
                { icon: Sparkles, title: 'Qualité avant tout', desc: 'Chaque PDF est vérifié par notre équipe avant publication pour garantir l\'excellence.' },
                { icon: Users, title: 'Communauté', desc: 'Une plateforme collaborative où enseignants et élèves grandissent ensemble.' },
                { icon: Globe, title: 'Accessibilité', desc: 'Mobile-first, performant même avec une connexion lente, disponible partout en Tunisie.' },
                { icon: Target, title: 'Transparence', desc: 'Pas d\'algorithmes cachés, pas de manipulation. Le meilleur contenu remonte naturellement.' },
                { icon: Award, title: 'Excellence tunisienne', desc: 'Nous mettons en valeur le savoir-faire des enseignants tunisiens et le programme national.' }
              ].map((v, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 card-hover">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
                    <v.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{v.title}</h3>
                  <p className="text-slate-600 text-sm">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-block px-4 py-1.5 bg-primary-100 text-primary-700 rounded-full text-xs font-bold mb-3">JALONS</div>
              <h2 className="text-3xl lg:text-5xl font-extrabold mb-3">Notre parcours</h2>
            </div>

            <div className="space-y-6">
              {milestones.map((m, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center font-extrabold text-lg shadow-lg shadow-primary-500/20">
                    {m.year}
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 className="text-xl font-bold mb-1">{m.title}</h3>
                    <p className="text-slate-600">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Équipe */}
        <section className="py-20 bg-gradient-to-br from-slate-50 to-primary-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-block px-4 py-1.5 bg-primary-100 text-primary-700 rounded-full text-xs font-bold mb-3">L'ÉQUIPE</div>
              <h2 className="text-3xl lg:text-5xl font-extrabold mb-3">Qui sommes-nous ?</h2>
              <p className="text-lg text-slate-600">Une petite équipe passionnée qui croit en l'éducation.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {team.map((m, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 text-center border border-slate-100">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
                    {m.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
                  </div>
                  <h3 className="font-bold text-lg mb-1">{m.name}</h3>
                  <div className="text-sm text-primary-600 font-semibold mb-2">{m.role}</div>
                  <a href={`mailto:${m.email}`} className="text-xs text-slate-500 hover:text-primary-600 inline-flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {m.email}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4">Rejoignez l'aventure</h2>
            <p className="text-lg text-slate-600 mb-8">
              Vous êtes enseignant ? Partagez vos ressources avec la communauté.
              <br />Vous êtes élève ? Explorez des milliers de PDFs gratuits.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/inscription" className="btn-primary inline-flex items-center gap-2 px-7 py-3.5">
                Créer un compte gratuit
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
              <Link href="/professeurs" className="btn-accent inline-flex items-center gap-2 px-7 py-3.5">
                Devenir enseignant
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}