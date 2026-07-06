import { Metadata } from 'next';
import Link from 'next/link';
import { GraduationCap, Eye, MessageCircle, Edit3, BarChart3, Users, ShieldCheck, Sparkles, Heart, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Espace Enseignants — Rejoignez Examanet',
  description: 'Plateforme éducative tunisienne : publiez vos devoirs, cours et exercices. Gagnez en visibilité, suivez vos statistiques et aidez des milliers d\'élèves.',
  alternates: {
    canonical: 'https://examanet.com/enseignants/rejoindre',
  },
};

export default function TeacherLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-sky-700 to-cyan-800 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]"></div>
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>GRATUIT POUR LES ENSEIGNANTS</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
            Vos fichiers vous attendent.<br />
            <span className="bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent">
              Des milliers d'élèves aussi.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-sky-100 max-w-3xl mb-8 leading-relaxed">
            Examanet est la plateforme éducative tunisienne qui rassemble vos devoirs, cours et exercices au même endroit — pour qu'ils touchent plus d'élèves, plus vite.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/connexion"
              className="inline-flex items-center gap-2 bg-white text-sky-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-sky-50 transition shadow-lg"
            >
              J'ai déjà reçu une invitation →
            </Link>
            <a
              href="#avantages"
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition border border-white/20"
            >
              Découvrir les avantages
            </a>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-amber-300">8 608</div>
              <div className="text-sm text-sky-100 mt-1">fichiers publiés</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-amber-300">2 000+</div>
              <div className="text-sm text-sky-100 mt-1">enseignants</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-amber-300">25 000+</div>
              <div className="text-sm text-sky-100 mt-1">élèves tunisiens</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-amber-300">100%</div>
              <div className="text-sm text-sky-100 mt-1">gratuit</div>
            </div>
          </div>
        </div>
      </section>

      {/* AVANTAGES */}
      <section id="avantages" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Heart className="w-4 h-4" />
            POURQUOI REJOINDRE EXAMANET
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4">
            Six bonnes raisons de nous rejoindre
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            On a conçu Examanet avec et pour les enseignants tunisiens. Voici ce que votre compte gratuit vous débloque.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <BenefitCard
            icon={<Eye className="w-6 h-6" />}
            color="sky"
            title="Visibilité décuplée"
            description="Vos ressources sont indexées, recherchables, et出现在了首页推荐中. Chaque téléchargement vous ramène vers votre profil."
          />
          <BenefitCard
            icon={<BarChart3 className="w-6 h-6" />}
            color="emerald"
            title="Statistiques détaillées"
            description="Vues, téléchargements, notes, commentaires — suivez l'impact réel de votre travail, fichier par fichier."
          />
          <BenefitCard
            icon={<Edit3 className="w-6 h-6" />}
            color="amber"
            title="Modifiez à tout moment"
            description="Corrigez une erreur, mettez à jour une donnée, ajoutez une variante. Le flux d'édition est intégré."
          />
          <BenefitCard
            icon={<MessageCircle className="w-6 h-6" />}
            color="purple"
            title="Échanges directs"
            description="Recevez des messages des élèves qui ont des questions sur vos devoirs. Aidez-les, gagnez en réputation."
          />
          <BenefitCard
            icon={<Globe className="w-6 h-6" />}
            color="cyan"
            title="Bilingue FR + AR"
            description="Toutes vos ressources sont décrites en français ET en arabe. Touchez les élèves des deux systèmes."
          />
          <BenefitCard
            icon={<ShieldCheck className="w-6 h-6" />}
            color="rose"
            title="Vous restez propriétaire"
            description="Vous gardez tous vos droits. Modifiez ou supprimez vos fichiers à tout moment. Pas de verrou propriétaire."
          />
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <GraduationCap className="w-4 h-4" />
              COMMENT ÇA MARCHE
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4">
              Trois étapes, et c'est parti
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Step
              number={1}
              title="Recevez votre invitation"
              description="Si vous avez partagé des fichiers via JotForm ou devoirat.net, vous avez reçu un email avec votre code d'activation."
            />
            <Step
              number={2}
              title="Choisissez votre mot de passe"
              description="Cliquez sur le lien d'activation, définissez votre mot de passe personnel — et c'est tout."
            />
            <Step
              number={3}
              title="Retrouvez vos fichiers"
              description="Tous vos fichiers (PDF + Word d'origine) sont déjà là, prêts à être édités, partagés ou améliorés."
            />
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-br from-sky-50 to-cyan-50 rounded-3xl p-10 md:p-16 text-center border border-sky-100">
          <Users className="w-12 h-12 text-sky-600 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">
            Déjà plus de 2 000 enseignants<br />ont fait le pas
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            Rejoignez la communauté des enseignants tunisiens qui partagent leurs ressources sur Examanet — gratuitement, sans engagement, en gardant le contrôle.
          </p>
          <Link
            href="/connexion"
            className="inline-flex items-center gap-2 bg-sky-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-sky-700 transition shadow-lg"
          >
            Activer mon compte →
          </Link>
          <div className="mt-6 text-sm text-slate-500">
            Vous n'avez pas reçu d'invitation ? <Link href="/contact" className="text-sky-600 underline">Contactez-nous</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-12 text-center">
            Questions fréquentes
          </h2>

          <div className="space-y-6">
            <Faq
              q="C'est vraiment gratuit ?"
              a="Oui, 100% gratuit pour les enseignants. Aucun frais caché, aucune commission sur vos ressources. Notre modèle économique est basé sur les fonctionnalités premium pour les élèves."
            />
            <Faq
              q="Je n'ai pas reçu d'invitation, comment faire ?"
              a="Si vous avez partagé des fichiers via devoirat.net ou JotForm, votre invitation a été envoyée. Vérifiez vos spams. Sinon, contactez-nous via le formulaire de contact et nous vous enverrons une invitation manuelle."
            />
            <Faq
              q="Combien de temps ai-je pour activer mon compte ?"
              a="Votre lien d'activation est valide 10 jours. Passé ce délai, vous pouvez demander une nouvelle invitation à l'administrateur."
            />
            <Faq
              q="Puis-je supprimer mes fichiers si je change d'avis ?"
              a="Absolument. Vous restez propriétaire de vos contenus. Vous pouvez modifier, archiver ou supprimer n'importe lequel de vos fichiers à tout moment depuis votre tableau de bord."
            />
            <Faq
              q="Mes fichiers Word d'origine sont-ils conservés ?"
              a="Oui ! Quand vous activez votre compte, vous retrouvez à la fois les PDF propres et les fichiers Word (.doc/.docx) d'origine que vous aviez partagés."
            />
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
          Prêt à récupérer vos fichiers ?
        </h2>
        <p className="text-slate-600 mb-8">
          Activez votre compte en 2 minutes.
        </p>
        <Link
          href="/connexion"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-600 to-cyan-600 text-white px-10 py-5 rounded-xl font-bold text-lg hover:shadow-xl transition"
        >
          Activer mon compte gratuit →
        </Link>
      </section>
    </div>
  );
}

function BenefitCard({ icon, color, title, description }: { icon: React.ReactNode; color: string; title: string; description: string }) {
  const colorClasses: Record<string, string> = {
    sky: 'bg-sky-100 text-sky-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-700',
    cyan: 'bg-cyan-100 text-cyan-700',
    rose: 'bg-rose-100 text-rose-700',
  };
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition group">
      <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
        {icon}
      </div>
      <h3 className="font-bold text-lg text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-cyan-600 text-white rounded-full flex items-center justify-center text-2xl font-extrabold mx-auto mb-4 shadow-lg">
        {number}
      </div>
      <h3 className="font-bold text-xl text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="bg-slate-800 rounded-xl p-6 hover:bg-slate-750 transition cursor-pointer">
      <summary className="font-semibold text-lg flex items-center justify-between">
        {q}
        <span className="text-sky-400 text-2xl">+</span>
      </summary>
      <p className="text-slate-300 mt-4 leading-relaxed">{a}</p>
    </details>
  );
}