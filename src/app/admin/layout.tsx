import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { Shield, Users, FileText, BarChart3, CheckCircle, Flag } from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  if (user.role !== 'ADMIN') redirect('/');

  const navItems = [
    { href: '/admin', icon: BarChart3, label: 'Dashboard' },
    { href: '/admin/utilisateurs', icon: Users, label: 'Utilisateurs' },
    { href: '/admin/ressources', icon: FileText, label: 'Ressources' },
    { href: '/admin/approbations', icon: CheckCircle, label: 'Approbations', badge: 'pending' },
    { href: '/admin/moderation', icon: Flag, label: 'Modération' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <div className="flex-1 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-[260px_1fr] gap-8">
            <aside>
              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border border-red-200 overflow-hidden sticky top-24">
                <div className="p-5 bg-gradient-to-br from-red-500 to-rose-600 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-2">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <div className="font-bold text-white">{user.firstName} {user.lastName}</div>
                  <div className="text-xs text-red-100 mt-1">🛡️ Administrateur</div>
                </div>
                <nav className="p-2">
                  {navItems.map(item => (
                    <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-100 text-sm font-medium text-red-800 transition">
                      <item.icon className="w-4 h-4" /> {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </aside>
            <main>{children}</main>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
