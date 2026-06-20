import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  LayoutDashboard, Upload, FileText, BarChart3, User, MessageSquare, Bell, Shield,
  ChevronRight, BookOpen, HelpCircle, Library, Users
} from 'lucide-react';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') redirect('/');

  // Get counts for the sidebar
  const [myResources, pendingEdits, rejectedEdits, unreadNotifs, libraryCount, communityCount] = await Promise.all([
    prisma.resource.count({ where: { teacherId: user.id } }),
    prisma.resource.count({ where: { teacherId: user.id, editStatus: 'PENDING_EDIT_APPROVAL' } }),
    prisma.resource.count({ where: { teacherId: user.id, editStatus: 'EDIT_REJECTED' } }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    prisma.teacherFile.count({ where: { teacherId: user.id } }),
    prisma.teacherFile.count({ where: { teacherId: { not: user.id }, pdfUrl: { not: null }, conversionStatus: 'SUCCESS' } }),
  ]);

  const initials = (user.firstName?.[0] || user.email[0]).toUpperCase() + (user.lastName?.[0] || '').toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <div className="flex-1 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-[280px_1fr] gap-6">
            {/* ================ UNIFIED SIDEBAR ================ */}
            <aside className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto space-y-2">
              {/* Profile card */}
              <Link href="/enseignant/profil" className="block bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-md hover:shadow-lg transition group">
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
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 bg-white/20 rounded-full font-bold">👨‍🏫 Enseignant{user.isVerifiedTeacher ? ' ✓' : ''}</span>
                  {!user.isVerifiedTeacher && <span className="text-amber-100">non vérifié</span>}
                </div>
              </Link>

              {/* === CONTENU (mes ressources) === */}
              <SidebarGroup title="Mes ressources" icon={BookOpen}>
                <SidebarLink href="/enseignant" icon={LayoutDashboard} label="Tableau de bord" exact />
                <SidebarLink href="/enseignant/ressources" icon={FileText} label="Toutes mes ressources" badge={myResources} />
                <SidebarLink
                  href="/enseignant/ressources?status=PUBLISHED"
                  icon={FileText}
                  label="Publiées"
                  dotClass="bg-emerald-500"
                />
                <SidebarLink
                  href="/enseignant/ressources?status=PENDING_APPROVAL"
                  icon={FileText}
                  label="En attente"
                  dotClass="bg-amber-500"
                />
                {rejectedEdits > 0 && (
                  <SidebarLink
                    href="/enseignant/ressources?editStatus=EDIT_REJECTED"
                    icon={FileText}
                    label="Modifications refusées"
                    badge={rejectedEdits}
                    badgeColor="bg-red-500"
                  />
                )}
                {pendingEdits > 0 && (
                  <SidebarLink
                    href="/enseignant/ressources?editStatus=PENDING_EDIT_APPROVAL"
                    icon={FileText}
                    label="Modifs en attente"
                    badge={pendingEdits}
                    badgeColor="bg-amber-500"
                  />
                )}
                <SidebarLink href="/enseignant/ajouter" icon={Upload} label="Ajouter une ressource" highlight />
                <SidebarLink href="/enseignant/bibliotheque" icon={Library} label="Ma bibliothèque" badge={libraryCount} badgeColor="bg-blue-500" />
                <SidebarLink href="/enseignant/communaute" icon={Users} label="Communauté" badge={communityCount} badgeColor="bg-emerald-500" highlightText="Partage" />
              </SidebarGroup>

              {/* === ACTIVITÉ === */}
              <SidebarGroup title="Activité" icon={BarChart3}>
                <SidebarLink href="/enseignant/stats" icon={BarChart3} label="Statistiques" />
                <SidebarLink href="/enseignant/analytics" icon={BarChart3} label="Analytics détaillées" />
                <SidebarLink href="/messages" icon={MessageSquare} label="Messages" />
                <SidebarLink
                  href="/mon-compte/notifications"
                  icon={Bell}
                  label="Notifications"
                  badge={unreadNotifs > 0 ? unreadNotifs : undefined}
                  badgeColor="bg-primary-600"
                />
              </SidebarGroup>

              {/* === COMPTE === */}
              <SidebarGroup title="Mon compte" icon={User}>
                <SidebarLink href="/mon-compte" icon={User} label="Profil général" />
                <SidebarLink href="/enseignant/profil" icon={User} label="Profil enseignant" />
                <SidebarLink href="/mon-compte/parametres" icon={User} label="Paramètres" />
                <SidebarLink href="/mon-compte/favoris" icon={BookOpen} label="Mes favoris" />
                <SidebarLink href="/a-propos" icon={HelpCircle} label="À propos" />
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
  href, icon: Icon, label, exact, badge, badgeColor, dotClass, highlight, highlightText
}: {
  href: string;
  icon: any;
  label: string;
  exact?: boolean;
  badge?: number;
  badgeColor?: string;
  dotClass?: string;
  highlight?: boolean;
  highlightText?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
        highlight
          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-md'
          : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {dotClass && <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />}
      <span className="flex-1 truncate">{label}</span>
      {highlightText && (
        <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-amber-400 text-amber-900 rounded">{highlightText}</span>
      )}
      {badge !== undefined && badge > 0 && (
        <span className={`px-1.5 py-0.5 text-white text-[10px] font-bold rounded-full ${badgeColor || 'bg-slate-500'}`}>
          {badge}
        </span>
      )}
    </Link>
  );
}
