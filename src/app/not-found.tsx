import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-8xl font-extrabold text-slate-200 mb-4">404</div>
          <h1 className="text-3xl font-extrabold mb-3">Page introuvable</h1>
          <p className="text-slate-500 mb-6">Cette page n'existe pas ou a été déplacée.</p>
          <Link href="/" className="btn-primary">Retour à l'accueil</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
