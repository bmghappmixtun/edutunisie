import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import UserMenu from './UserMenu';
import MobileMenu from './MobileMenu';
import LanguageSwitcher from './LanguageSwitcher';
import HoverSearchBar from '@/components/search/HoverSearchBar';
import T from '@/components/i18n/T';
import { getT } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';

export default async function Header() {
  const user = await getCurrentUser();
  const t = getT();
  const unreadNotifications = user
    ? await prisma.notification.count({ where: { userId: user.id, isRead: false } })
    : 0;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-40 lg:h-48 gap-4">
          {/* LEFT: Logo */}
          <div className="flex-1 flex justify-start min-w-0">
            <Link href="/" className="flex items-center group shrink-0" aria-label="Examanet - accueil">
              {/* Mobile: icon only */}
              <Image
                src="/logo-examanet.png"
                alt=""
                width={128}
                height={128}
                className="sm:hidden w-32 h-32 rounded-2xl shadow-md group-hover:scale-105 transition"
                priority
              />
              {/* Desktop: full logo (icon + wordmark) — single SVG master */}
              <Image
                src="/logo.svg"
                alt="Examanet"
                width={288}
                height={160}
                className="hidden sm:block h-32 lg:h-40 w-auto group-hover:scale-[1.02] transition-transform"
                priority
              />
            </Link>
          </div>

          {/* CENTER: Main nav (centered between logo and search) */}
          <nav className="hidden lg:flex items-center gap-7 shrink-0">
            <Link href="/ressources" className="text-sm font-medium text-slate-700 hover:text-primary-600 transition"><T k="nav.resources" /></Link>
            <Link href="/niveaux" className="text-sm font-medium text-slate-700 hover:text-primary-600 transition"><T k="nav.levels" /></Link>
            <Link href="/matieres" className="text-sm font-medium text-slate-700 hover:text-primary-600 transition"><T k="nav.subjects" /></Link>
            <Link href="/professeurs" className="text-sm font-medium text-slate-700 hover:text-primary-600 transition"><T k="nav.teachers" /></Link>
          </nav>

          {/* RIGHT: Search + actions */}
          <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
            <HoverSearchBar />
            <Link href="/recherche" className="md:hidden flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-primary-600">
              <span>🔍</span>
            </Link>
            <LanguageSwitcher />
            {user ? (
              <UserMenu user={user} unreadCount={unreadNotifications} />
            ) : (
              <>
                <Link href="/connexion" className="hidden sm:block text-sm font-semibold text-slate-700 hover:text-primary-600 px-3 py-2 transition">
                  <T k="nav.login" />
                </Link>
                <Link href="/inscription" className="btn-primary text-sm">
                  <T k="nav.signup" />
                </Link>
              </>
            )}
            <MobileMenu user={user} />
          </div>
        </div>
      </div>
    </header>
  );
}
