'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, LogIn, UserPlus } from 'lucide-react';

export default function MobileMenu({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const isTeacher = user?.role === 'TEACHER';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
      >
        <Menu className="w-6 h-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <span className="font-extrabold text-lg">Menu</span>
              <button onClick={() => setOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {user ? (
              <div className="p-4 bg-gradient-to-br from-primary-50 to-white">
                <div className="font-bold">{user.firstName} {user.lastName}</div>
                <div className="text-xs text-slate-500">{user.email}</div>
              </div>
            ) : (
              <div className="p-4 grid grid-cols-2 gap-2 border-b border-slate-100">
                <Link href="/connexion" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold">
                  <LogIn className="w-4 h-4" /> Connexion
                </Link>
                <Link href="/inscription" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold">
                  <UserPlus className="w-4 h-4" /> Inscription
                </Link>
              </div>
            )}

            <nav className="p-2">
              <Link href="/ressources" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-slate-50 rounded-lg font-medium">Ressources</Link>
              <Link href="/college" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-slate-50 rounded-lg font-medium">Collège</Link>
              <Link href="/concours-9eme-tunisie" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-amber-50 rounded-lg font-medium bg-amber-50/50">🎯 Concours 9ème</Link>
              <Link href="/niveaux" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-slate-50 rounded-lg font-medium">Niveaux</Link>
              <Link href="/matieres" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-slate-50 rounded-lg font-medium">Matières</Link>
              <Link href="/professeurs" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-slate-50 rounded-lg font-medium">Professeurs</Link>
              <Link href="/faq" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-slate-50 rounded-lg font-medium">FAQ</Link>

              {user && (
                <>
                  <div className="border-t border-slate-100 my-2"></div>
                  <Link href="/mon-compte" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-slate-50 rounded-lg font-medium">Mon compte</Link>
                  <Link href="/mon-compte/favoris" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-slate-50 rounded-lg font-medium">Mes favoris</Link>
                  {(isTeacher || isAdmin) && (
                    <Link href="/enseignant" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-amber-50 text-amber-700 rounded-lg font-medium">Espace enseignant</Link>
                  )}
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-red-50 text-red-600 rounded-lg font-medium">Administration</Link>
                  )}
                  <form action="/api/auth/logout" method="POST">
                    <button type="submit" className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 rounded-lg font-medium">Se déconnecter</button>
                  </form>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
