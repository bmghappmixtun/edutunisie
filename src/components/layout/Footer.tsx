import Link from 'next/link';
import { GraduationCap, Facebook, Twitter, Instagram, Youtube, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-6 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-extrabold text-lg text-white">EduTunisie</div>
                <div className="text-[10px] text-slate-400">Plateforme pédagogique</div>
              </div>
            </Link>
            <p className="text-sm text-slate-400 mb-4 max-w-sm">
              La plateforme #1 de ressources pédagogiques en Tunisie. Cours, devoirs, séries et corrigés gratuits pour tous les niveaux.
            </p>
            <div className="flex gap-2">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-full bg-slate-800 hover:bg-primary-600 flex items-center justify-center transition">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4 text-sm">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-primary-400 transition">Accueil</Link></li>
              <li><Link href="/ressources" className="hover:text-primary-400 transition">Ressources</Link></li>
              <li><Link href="/niveaux" className="hover:text-primary-400 transition">Niveaux</Link></li>
              <li><Link href="/matieres" className="hover:text-primary-400 transition">Matières</Link></li>
              <li><Link href="/professeurs" className="hover:text-primary-400 transition">Professeurs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4 text-sm">Ressources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/ressources?type=COURSE" className="hover:text-primary-400 transition">Cours</Link></li>
              <li><Link href="/ressources?type=HOMEWORK" className="hover:text-primary-400 transition">Devoirs</Link></li>
              <li><Link href="/ressources?type=EXERCISE" className="hover:text-primary-400 transition">Séries d'exercices</Link></li>
              <li><Link href="/ressources?type=BAC_SUBJECT" className="hover:text-primary-400 transition">Sujets Bac</Link></li>
              <li><Link href="/ressources?type=CORRECTION" className="hover:text-primary-400 transition">Corrigés</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4 text-sm">À propos</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary-400 transition">Qui sommes-nous</a></li>
              <li><a href="#" className="hover:text-primary-400 transition">Contact</a></li>
              <li><a href="#" className="hover:text-primary-400 transition">CGU</a></li>
              <li><a href="#" className="hover:text-primary-400 transition">Confidentialité</a></li>
              <li><a href="#" className="hover:text-primary-400 transition">Mentions légales</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} EduTunisie. Tous droits réservés.</p>
          <p className="text-xs text-slate-500">Conçu avec ❤️ en Tunisie 🇹🇳 pour les élèves tunisiens</p>
        </div>
      </div>
    </footer>
  );
}
