import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, Clock, Mail, User, Globe } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AdminErrorsPage() {
  const errors = await prisma.errorLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const stats = await prisma.errorLog.groupBy({
    by: ['severity'],
    _count: { _all: true },
    where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });

  const total = stats.reduce((acc, s) => acc + s._count._all, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Erreurs</h1>
            <p className="text-sm text-slate-600 mt-1">
              {total} erreur{total > 1 ? 's' : ''} dans les dernières 24h
            </p>
          </div>
          <Link
            href="/admin"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            ← Retour admin
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'].map((sev) => {
            const count = stats.find((s) => s.severity === sev)?._count._all || 0;
            const colors: any = {
              DEBUG: 'bg-slate-100 text-slate-700',
              INFO: 'bg-blue-100 text-blue-700',
              WARNING: 'bg-amber-100 text-amber-700',
              ERROR: 'bg-red-100 text-red-700',
              CRITICAL: 'bg-red-200 text-red-900',
            };
            return (
              <div key={sev} className={`${colors[sev]} rounded-lg p-3 text-center`}>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs uppercase tracking-wide">{sev}</div>
              </div>
            );
          })}
        </div>

        {/* Errors list */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {errors.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">Aucune erreur récente</p>
              <p className="text-sm mt-1">Le système fonctionne normalement</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {errors.map((err) => {
                const sevColor: any = {
                  DEBUG: 'bg-slate-100 text-slate-700',
                  INFO: 'bg-blue-100 text-blue-700',
                  WARNING: 'bg-amber-100 text-amber-700',
                  ERROR: 'bg-red-100 text-red-700',
                  CRITICAL: 'bg-red-200 text-red-900',
                };
                return (
                  <li key={err.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <code className="text-xs font-mono font-bold text-slate-900">
                            {err.reference}
                          </code>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${sevColor[err.severity]}`}>
                            {err.severity}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                            {err.source}
                          </span>
                          {err.emailSent && (
                            <span title="Email envoyé" className="text-green-600">
                              <Mail className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-900 mb-2 break-words">
                          {err.message}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          {err.url && (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              <code className="truncate max-w-[300px]">{err.url}</code>
                            </span>
                          )}
                          {err.userEmail && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {err.userEmail}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {err.createdAt.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
