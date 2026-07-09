import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getInitials } from '@/lib/text-utils';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FloatingUploadButton from '@/components/layout/FloatingUploadButton';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  LayoutDashboard, Upload, FileText, BarChart3, User, Bell, Shield,
  ChevronRight, BookOpen, Settings, Heart, Plus, CheckCircle2
} from 'lucide-react';

// Teacher dashboard pages should never be indexed
export const metadata: Metadata = {
  title: 'Espace enseignant',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') redirect('/');

  // Get counts for the sidebar (in parallel)
  const [
    myResources,
    publishedResources,
    pendingApproval,
    pendingEdits,
    rejectedEdits,
    unreadNotifs,
    libraryCount,
    favoritesCount,
  ] = await Promise.all([
    prisma.resource.count({ where: { teacherId: user.id } }),
    prisma.resource.count({ where: { teacherId: user.id, status: 'PUBLISHED' } }),
    prisma.resource.count({ where: { teacherId: user.id, status: 'PENDING_APPROVAL' } }),
    prisma.resource.count({ where: { teacherId: user.id, editStatus: 'PENDING_EDIT_APPROVAL' } }),
    prisma.resource.count({ where: { teacherId: user.id, editStatus: 'EDIT_REJECTED' } }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    prisma.teacherFile.count({ where: { teacherId: user.id } }),
    prisma.favorite.count({ where: { userId: user.id } }),
  ]);

  const initials = getInitials(user.firstName, user.lastName);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <div className="flex-1 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-[280px_1fr] gap-6">
            {/* ================ SIMPLIFIED SIDEBAR (8 items) ================ */}
            <aside className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto space-y-2">
              {/* ===== Profile card with live counters ===== */}
              <Link
                href="/enseignant/profil"
                className="block bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-md hover:shadow-lg transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-extrabold text-xl flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{user.firstName} {user.lastName}</div>
                    <div className="text-xs text-amber-100 truncate">{user.schoolName || 'Enseignant'}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition" />
                </div>

                {/* Live counters (option 4) */}
                <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-white/20 rounded-md font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {publishedResources} publiées
                  </span>
                  {pendingApproval + pendingEdits > 0 && (
                    <span className="px-2 py-1 bg-white/30 rounded-md font-bold flex items-center gap-1">
                      ⏳ {pendingApproval + pendingEdits} en attente
                    </span>
                  )}
                </div>
              </Link>

              {/* ===== MES RESSOURCES (4 items) ===== */}
              <SidebarGroup title="Mes ressources" icon={BookOpen}>
                <SidebarLink
                  href="/enseignant"
                  icon={LayoutDashboard}
                  label="Tableau de bord"
                  exact
                />
                <SidebarLink
                  href="/enseignant/ressources"
                  icon={FileText}
                  label="Mes ressources"
                  badge={myResources}
                  badgeColor="bg-slate-500"
                />
                <SidebarLink
                  href="/enseignant/bibliotheque"
                  icon={BookOpen}
                  label="Ma bibliothèque"
                  badge={libraryCount}
                  badgeColor="bg-blue-500"
                />
                <SidebarLink
                  href="/enseignant/ajouter"
                  icon={Plus}
                  label="Ajouter"
                  highlight
                />
              </SidebarGroup>

              {/* ===== MON ACTIVITÉ (2 items) ===== */}
              <SidebarGroup title="Mon activité" icon={BarChart3}>
                <SidebarLink
                  href="/enseignant/stats"
                  icon={BarChart3}
                  label="Statistiques"
                />
                <SidebarLink
                  href="/enseignant/notifications"
                  icon={Bell}
                  label="Notifications"
                  badge={unreadNotifs > 0 ? unreadNotifs : undefined}
                  badgeColor="bg-primary-600"
                />
              </SidebarGroup>

              {/* ===== MON COMPTE (3 items) ===== */}
              <SidebarGroup title="Mon compte" icon={User}>
                <SidebarLink
                  href="/enseignant/profil"
                  icon={User}
                  label="Mon profil"
                />
                <SidebarLink
                  href="/enseignant/favoris"
                  icon={Heart}
                  label="Mes favoris"
                  badge={favoritesCount}
                  badgeColor="bg-pink-500"
                />
                <SidebarLink
                  href="/enseignant/parametres"
                  icon={Settings}
                  label="Paramètres"
                />
              </SidebarGroup>

              {user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100 transition"
                >
                  <Shield className="w-4 h-4" /> Administration
                </Link>
              )}
            </aside>

            <main>{children}</main>
          </div>
        </div>
      </div>
      <Footer />

      {/* ===== Floating Action Button (option 3) ===== */}
      <FloatingUploadButton />
    </div>
  );
}

function SidebarGroup({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{title}</span>
      </div>
      <div className="p-2 space-y-0.5">{children}</div>
    </div>
  );
}

function SidebarLink({
  href, icon: Icon, label, exact, badge, badgeColor, highlight
}: {
  href: string;
  icon: any;
  label: string;
  exact?: boolean;
  badge?: number;
  badgeColor?: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
        highlight
          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-md font-bold'
          : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={highlight ? 2.5 : 2} />
      <span className="flex-1 truncate">{label}</span>

      {badge !== undefined && badge > 0 && (
        <span className={`px-1.5 py-0.5 text-white text-[10px] font-bold rounded-full ${badgeColor || 'bg-slate-500'}`}>
          {badge}
        </span>
      )}
    </Link>
  );
}
