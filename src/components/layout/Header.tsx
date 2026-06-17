import Link from 'next/link';
import { GraduationCap, Search } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import UserMenu from './UserMenu';
import MobileMenu from './MobileMenu';
import LanguageSwitcher from './LanguageSwitcher';
import T from '@/components/i18n/T';
import { getDict, getT } from '@/lib/i18n-server';

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
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:scale-105 transition">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="font-extrabold text-lg text-slate-900 leading-none"><T k="common.appName" /></div>
              <div className="text-[10px] text-slate-500 leading-none mt-0.5"><T k="common.appTagline" /></div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            <Link href="/ressources" className="text-sm font-medium text-slate-700 hover:text-primary-600 transition"><T k="nav.resources" /></Link>
            <Link href="/niveaux" className="text-sm font-medium text-slate-700 hover:text-primary-600 transition"><T k="nav.levels" /></Link>
            <Link href="/matieres" className="text-sm font-medium text-slate-700 hover:text-primary-600 transition"><T k="nav.subjects" /></Link>
            <Link href="/professeurs" className="text-sm font-medium text-slate-700 hover:text-primary-600 transition"><T k="nav.teachers" /></Link>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/recherche" className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition">
              <Search className="w-4 h-4" />
            </Link>

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