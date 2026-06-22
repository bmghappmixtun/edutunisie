import Link from 'next/link';
import Image from 'next/image';
import { GraduationCap, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import T from '@/components/i18n/T';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-6 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-4 group" aria-label="Examanet - accueil">
              <Image
                src="/logo-cream-on-dark.png"
                alt="Examanet - Plateforme pédagogique tunisienne"
                width={159}
                height={60}
                className="h-[60px] w-auto opacity-95 group-hover:opacity-100 transition"
                priority={false}
              />
            </Link>
            <p className="text-sm text-slate-400 mb-4 max-w-sm">
              <T k="footer.madeWith" />
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
            <h4 className="font-bold text-white mb-4 text-sm"><T k="footer.navigation" /></h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-primary-400 transition"><T k="nav.home" /></Link></li>
              <li><Link href="/ressources" className="hover:text-primary-400 transition"><T k="nav.resources" /></Link></li>
              <li><Link href="/niveaux" className="hover:text-primary-400 transition"><T k="nav.levels" /></Link></li>
              <li><Link href="/matieres" className="hover:text-primary-400 transition"><T k="nav.subjects" /></Link></li>
              <li><Link href="/professeurs" className="hover:text-primary-400 transition"><T k="nav.teachers" /></Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4 text-sm"><T k="footer.resources" /></h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/ressources?type=COURSE" className="hover:text-primary-400 transition"><T k="resource.type" /></Link></li>
              <li><Link href="/ressources?type=HOMEWORK" className="hover:text-primary-400 transition">Devoirs</Link></li>
              <li><Link href="/ressources?type=BAC_SUBJECT" className="hover:text-primary-400 transition">Sujets Bac</Link></li>
              <li><Link href="/ressources?type=CORRECTION" className="hover:text-primary-400 transition">Corrigés</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4 text-sm"><T k="footer.about" /></h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/cgu" className="hover:text-primary-400 transition">CGU</Link></li>
              <li><Link href="/a-propos" className="hover:text-primary-400 transition"><T k="footer.about" /></Link></li>
              <li><Link href="/contact" className="hover:text-primary-400 transition">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-xs text-slate-500"><T k="footer.copyright" vars={{ year: String(new Date().getFullYear()) }} /></p>
          <p className="text-xs text-slate-500"><T k="footer.madeWith" /></p>
        </div>
      </div>
    </footer>
  );
}