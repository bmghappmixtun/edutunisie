import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import T from '@/components/i18n/T';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-8xl font-extrabold text-slate-200 mb-4">404</div>
          <h1 className="text-3xl font-extrabold mb-3"><T k="errors.notFound" /></h1>
          <p className="text-slate-500 mb-6"><T k="errors.notFoundDesc" /></p>
          <Link href="/" className="btn-primary"><T k="errors.backHome" /></Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}