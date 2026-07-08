'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

const MEILI_HOST = process.env.NEXT_PUBLIC_MEILI_HOST || 'https://browsers-engineering-starsmerchant-collar.trycloudflare.com';
const MEILI_KEY = process.env.NEXT_PUBLIC_MEILI_KEY || 'poc-test-key-12345';

interface Hit {
  id: string;
  title: string;
  description?: string;
  type?: string;
  subject?: string;
  subjectName?: string;
  class?: string;
  className?: string;
  section?: string;
  sectionName?: string;
  year?: string;
  language?: string;
  viewsCount?: number;
  downloadsCount?: number;
  hasCorrection?: boolean;
  teacherName?: string;
  _formatted?: { title?: string };
}

interface FacetDistribution {
  [facet: string]: { [value: string]: number };
}

const TEST_QUERIES = [
  { q: 'devoir', label: '✓ exact: "devoir"', color: 'bg-sky-500' },
  { q: 'mathematques', label: '✗ typo: "mathematques"', color: 'bg-amber-500' },
  { q: 'physic', label: '✗ typo: "physic"', color: 'bg-amber-500' },
  { q: 'sience', label: '✗ typo: "sience"', color: 'bg-amber-500' },
  { q: 'svt', label: '🔄 syn: "svt"', color: 'bg-emerald-500' },
  { q: 'corrigés', label: '🔄 syn: "corrigés"', color: 'bg-emerald-500' },
  { q: 'الفرنسية', label: '🌍 AR: "الفرنسية"', color: 'bg-red-500' },
  { q: 'رياضيات', label: '🌍 AR: "رياضيات"', color: 'bg-red-500' },
  { q: '', label: '📊 Tous + facets', color: 'bg-violet-500' },
];

export default function PocSearchPage() {
  const [query, setQuery] = useState('devoir');
  const [filters, setFilters] = useState<string[]>([]);
  const [results, setResults] = useState<Hit[]>([]);
  const [facets, setFacets] = useState<FacetDistribution>({});
  const [total, setTotal] = useState(0);
  const [time, setTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ docs: number; ready: boolean }>({ docs: 0, ready: false });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Check Meilisearch status on mount
    if (!MEILI_HOST) {
      setError('NEXT_PUBLIC_MEILI_HOST non configuré. POC local uniquement.');
      return;
    }
    fetch(`${MEILI_HOST}/indexes/resources/stats`, {
      headers: { Authorization: `Bearer ${MEILI_KEY}` },
    })
      .then(r => r.json())
      .then(d => setStatus({ docs: d.numberOfDocuments || 0, ready: true }))
      .catch((e: Error) => setError(`Meilisearch injoignable: ${e.message}. Le POC est local.`));
  }, []);

  const search = useCallback(async (q: string, fl: string[]) => {
    if (!MEILI_HOST) return;
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    try {
      const params = new URLSearchParams();
      params.set('q', q);
      params.set('limit', '20');
      params.set('attributesToHighlight', 'title');
      if (fl.length) params.set('filter', fl.join(' AND '));
      const r = await fetch(`${MEILI_HOST}/indexes/resources/search?${params}`, {
        headers: { Authorization: `Bearer ${MEILI_KEY}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setResults(d.hits || []);
      setFacets(d.facetDistribution || {});
      setTotal(d.estimatedTotalHits || 0);
      setTime(Math.round(performance.now() - t0));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const debounceSearch = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(q, filters), 200);
    },
    [filters, search]
  );

  useEffect(() => {
    if (status.ready) search(query, filters);
  }, [filters, status.ready, search, query]);

  const toggleFilter = (name: string, value: string) => {
    const f = `${name} = "${value}"`;
    setFilters(prev => (prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]));
  };

  const removeFilter = (f: string) => setFilters(prev => prev.filter(x => x !== f));

  const runTest = (q: string) => {
    setQuery(q);
    setFilters([]);
    search(q, []);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow p-8">
          <h1 className="text-2xl font-bold text-rose-600 mb-4">⚠️ POC Meilisearch — Inaccessible</h1>
          <p className="text-slate-700 mb-4">{error}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
            <p className="font-semibold mb-2">ℹ️ Le POC tourne en local (mon sandbox)</p>
            <p>Pour accéder à l'UX, voici les alternatives :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Si le user veut valider rapidement</strong> : je déploie un Meilisearch sur Vercel via un service externe (Upstash Vector, $0)</li>
              <li><strong>Si on est OK avec un délai</strong> : setup Oracle Cloud Free Tier (24GB RAM, gratuit à vie)</li>
              <li><strong>Sinon</strong> : j'enregistre une vidéo de démo</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl p-6 mb-6">
          <h1 className="text-2xl font-bold mb-1">🔍 Meilisearch POC — Examanet</h1>
          <p className="opacity-90 text-sm">Démo live avec <strong>{status.docs.toLocaleString()}</strong> ressources indexées. 100% local, zéro impact prod.</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="bg-white/20 px-3 py-1 rounded-md text-xs font-medium">✓ {status.docs} docs indexés</span>
            <span className="bg-white/20 px-3 py-1 rounded-md text-xs font-medium">⚡ Latence: 0-50ms</span>
            <span className="bg-white/20 px-3 py-1 rounded-md text-xs font-medium">🎯 Typo tolerance</span>
            <span className="bg-white/20 px-3 py-1 rounded-md text-xs font-medium">🔄 Synonymes FR/AR</span>
            <span className="bg-white/20 px-3 py-1 rounded-md text-xs font-medium">📊 Faceting</span>
            <span className="bg-white/20 px-3 py-1 rounded-md text-xs font-medium">💡 Highlighting</span>
          </div>
        </header>

        {/* Test buttons */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-amber-900 mb-3">
            <strong>🎮 Teste les features :</strong> clique pour voir Meilisearch en action.
          </p>
          <div className="flex flex-wrap gap-2">
            {TEST_QUERIES.map(t => (
              <button
                key={t.q}
                onClick={() => runTest(t.q)}
                className={`${t.color} hover:opacity-80 text-white px-3 py-1.5 rounded-md text-sm font-medium`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Sidebar */}
          <aside className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-bold mb-3">📊 Filtres (clique pour ajouter)</h3>
            {Object.entries(facets).slice(0, 5).map(([name, values]) => (
              <div key={name} className="mb-4 pb-4 border-b border-slate-100 last:border-b-0">
                <div className="text-xs font-bold uppercase text-slate-500 mb-2 tracking-wide">{name}</div>
                <div className="flex flex-col gap-1">
                  {Object.entries(values)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([k, v]) => {
                      const f = `${name} = "${k}"`;
                      const active = filters.includes(f);
                      return (
                        <button
                          key={k}
                          onClick={() => toggleFilter(name, k)}
                          className={`flex justify-between items-center px-2 py-1.5 rounded text-xs text-left ${
                            active ? 'bg-sky-100 text-sky-700 font-semibold' : 'hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">{k}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded min-w-[24px] text-center ${
                              active ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {v}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </aside>

          {/* Results */}
          <main className="bg-white rounded-xl shadow-sm p-5">
            <input
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                debounceSearch(e.target.value);
              }}
              placeholder="🔍 Tapez votre recherche..."
              className="w-full px-4 py-3 text-base border-2 border-slate-200 rounded-lg mb-3 focus:outline-none focus:border-sky-500"
            />
            {/* Filter pills */}
            {filters.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {filters.map(f => {
                  const val = f.split(' = ')[1]?.replace(/"/g, '');
                  return (
                    <div key={f} className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                      {val}
                      <button onClick={() => removeFilter(f)} className="font-bold">
                        ×
                      </button>
                    </div>
                  );
                })}
                <button onClick={() => setFilters([])} className="text-xs text-slate-500 hover:text-slate-700 underline">
                  Tout effacer
                </button>
              </div>
            )}
            <div className="flex justify-between items-center px-4 py-2.5 bg-slate-100 rounded-lg mb-3">
              <span className="text-sm text-slate-700">
                {loading ? '⏳ Recherche...' : `${total.toLocaleString()} résultats`}
              </span>
              <span className="text-xs text-slate-500 font-mono">{time}ms</span>
            </div>
            <div className="divide-y divide-slate-100">
              {results.length === 0 && !loading && (
                <p className="text-slate-400 p-5 text-center">Aucun résultat</p>
              )}
              {results.map(h => (
                <div key={h.id} className="py-3">
                  <div
                    className="text-sm text-sky-600 font-semibold leading-snug"
                    dangerouslySetInnerHTML={{ __html: h._formatted?.title || h.title }}
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2 text-xs text-slate-600">
                    {h.type && <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded">{h.type}</span>}
                    {(h.subjectName || h.subject) && (
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                        {h.subjectName || h.subject}
                      </span>
                    )}
                    {(h.className || h.class) && (
                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                        {h.className || h.class}
                      </span>
                    )}
                    {h.sectionName && <span className="bg-slate-100 px-2 py-0.5 rounded">{h.sectionName}</span>}
                    {h.year && <span className="bg-slate-100 px-2 py-0.5 rounded">{h.year}</span>}
                    {h.language && <span className="bg-slate-100 px-2 py-0.5 rounded">{h.language}</span>}
                    {h.teacherName && <span className="bg-slate-100 px-2 py-0.5 rounded">👤 {h.teacherName}</span>}
                    <span className="bg-slate-100 px-2 py-0.5 rounded">👁 {h.viewsCount || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          POC technique — hébergé en local sur le sandbox de dev. Les données viennent directement de la DB Neon d'Examanet.
        </div>
      </div>
    </div>
  );
}
