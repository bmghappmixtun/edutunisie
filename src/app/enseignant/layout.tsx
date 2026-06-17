import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { LayoutDashboard, Upload, FileText, BarChart3, Shield } from 'lucide-react';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion');
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') redirect('/');

  const initials = (user.firstName?.[0] || user.email[0]).toUpperCase() + (user.lastName?.[0] || '').toUpperCase();
  const navItems = [
    { href: '/enseignant', icon: LayoutDashboard, label: 'Tableau de bord' },
    { href: '/enseignant/ressources', icon: FileText, label: 'Mes ressources' },
    { href: '/enseignant/ajouter', icon: Upload, label: 'Ajouter une ressource' },
    { href: '/enseignant/stats', icon: BarChart3, label: 'Statistiques' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <div className="flex-1 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-[260px_1fr] gap-8">
            <aside>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 overflow-hidden sticky top-24">
                <div className="p-5 bg-gradient-to-br from-amber-500 to-amber-600 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center text-white font-extrabold text-2xl mb-2">
                    {initials}
                  </div>
                  <div className="font-bold text-white">{user.firstName} {user.lastName}</div>
                  <div className="text-xs text-amber-100">{user.schoolName}</div>
                  <div className="mt-2 inline-block px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full">👨‍🏫 Enseignant{user.isVerifiedTeacher ? ' ✓' : ''}</div>
                </div>
                <nav className="p-2">
                  {navItems.map(item => (
                    <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-amber-100 text-sm font-medium text-amber-800 transition">
                      <item.icon className="w-4 h-4" /> {item.label}
                    </Link>
                  ))}
                  {user.role === 'ADMIN' && (
                    <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-100 text-sm font-semibold text-red-700 transition">
                      <Shield className="w-4 h-4" /> Administration
                    </Link>
                  )}
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
