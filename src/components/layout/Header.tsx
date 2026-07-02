import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import UserMenu from './UserMenu';
import MobileMenu from './MobileMenu';
import LanguageSwitcher from './LanguageSwitcher';
import HoverSearchBar from '@/components/search/HoverSearchBar';
import MobileSearchTrigger from '@/components/search/MobileSearchTrigger';
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
        <div className="flex items-center h-[62px] lg:h-[73px] gap-4">
          {/* LEFT: Logo */}
          <div className="flex-1 flex justify-start min-w-0">
            <Link href="/" className="flex items-center group shrink-0" aria-label="Examanet - accueil">
              {/* Mobile: icon only */}
              <Image
                src="/icon-transparent.png"
                alt=""
                width={62}
                height={62}
                className="sm:hidden w-[62px] h-[62px] group-hover:scale-105 transition"
                priority
              />
              {/* Desktop: full logo (icon + wordmark) — single SVG master */}
              <Image
                src="/logo-transparent.png"
                alt="Examanet"
                width={269}
                height={73}
                className="hidden sm:block h-[62px] lg:h-[73px] w-auto group-hover:scale-[1.02] transition-transform"
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
            <MobileSearchTrigger />
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
