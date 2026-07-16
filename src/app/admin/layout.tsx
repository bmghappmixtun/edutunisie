import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Shield, Users, FileText, BarChart3, CheckCircle, Flag, Edit3, BookOpen, Settings, MessageSquare, TrendingUp, Key } from 'lucide-react';

// Admin pages should never be indexed
export const metadata: Metadata = {
  title: 'Administration',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  if (user.role !== 'ADMIN') redirect('/');

  // Get live counts for badges
  const [pendingApprovals, pendingEdits, pendingReports, newUsers] = await Promise.all([
    prisma.resource.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.resource.count({ where: { editStatus: 'PENDING_EDIT_APPROVAL' } }),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { role: { in: ['TEACHER', 'STUDENT'] }, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
  ]);

  const navItems: any[] = [
    { group: 'Vue d\'ensemble' },
    { href: '/admin', icon: BarChart3, label: 'Dashboard' },
    { href: '/admin/analytics', icon: TrendingUp, label: 'Analytics' },

    { group: 'Contenu' },
    { href: '/admin/ressources', icon: FileText, label: 'Toutes les ressources' },
    { href: '/admin/approbations', icon: CheckCircle, label: 'Approbations', badge: pendingApprovals, badgeColor: 'bg-amber-500' },
    { href: '/admin/ressources/editions', icon: Edit3, label: 'Éditions en attente', badge: pendingEdits, badgeColor: 'bg-blue-500' },
    { href: '/admin/moderation', icon: Flag, label: 'Modération', badge: pendingReports, badgeColor: 'bg-red-500' },

    { group: 'Communauté' },
    { href: '/admin/utilisateurs', icon: Users, label: 'Utilisateurs', badge: newUsers, badgeColor: 'bg-emerald-500' },
    { href: '/admin/catalog', icon: BookOpen, label: 'Catalogue (matières/niveaux)' },
    { href: '/admin/messages', icon: MessageSquare, label: 'Messages' },

    { group: 'Configuration' },
    { href: '/admin/parametres', icon: Settings, label: 'Paramètres' },
    { href: '/admin/fournisseurs', icon: Key, label: 'Fournisseurs & API' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 overflow-x-hidden">
      <Header />
      <div className="flex-1 pt-20 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-[280px_1fr] gap-6 overflow-x-hidden">
            <aside className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto space-y-2">
              {/* Profile card */}
              <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-4 text-white shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{user.firstName} {user.lastName}</div>
                    <div className="text-xs text-red-100">🛡️ Administrateur</div>
                  </div>
                </div>
                {(pendingApprovals + pendingEdits + pendingReports) > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/20 text-xs text-red-100">
                    {pendingApprovals + pendingEdits + pendingReports} action{pendingApprovals + pendingEdits + pendingReports > 1 ? 's' : ''} en attente
                  </div>
                )}
              </div>

              {/* Nav groups */}
              {(() => {
                let currentGroup: string | null = null;
                return navItems.map((item, idx) => {
                  if (item.group) {
                    currentGroup = item.group;
                    return (
                      <div key={`g-${idx}`} className="px-3 pt-3 pb-1 text-xs font-bold text-slate-400 uppercase tracking-wide">
                        {item.group}
                      </div>
                    );
                  }
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 transition"
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className={`px-1.5 py-0.5 text-white text-[10px] font-bold rounded-full ${item.badgeColor || 'bg-slate-500'}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                });
              })()}
            </aside>

            <main>{children}</main>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
