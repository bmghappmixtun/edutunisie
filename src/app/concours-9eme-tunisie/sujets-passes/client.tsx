'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Download, FileText, CheckCircle, Star, Filter, Search, X,
  ChevronDown, Calendar, BookOpen,
} from 'lucide-react';

type ConcoursFile = {
  key: string;
  url: string;
  size: number;
  source?: string;
  note?: string;
};

type YearGroup = {
  year: number;
  voies: {
    [voie: string]: {
      [subject: string]: {
        sujet?: ConcoursFile;
        corrige?: ConcoursFile;
        sujetPlusCorrige?: ConcoursFile;
      };
    };
  };
};

const SUBJECT_META: Record<string, { name: string; icon: string; color: string }> = {
  math: { name: 'Mathématiques', icon: '📐', color: 'bg-blue-100 text-blue-700' },
  arabe: { name: 'Arabe', icon: '📚', color: 'bg-amber-100 text-amber-700' },
  francais: { name: 'Français', icon: '📖', color: 'bg-rose-100 text-rose-700' },
  svt: { name: 'SVT', icon: '🧬', color: 'bg-emerald-100 text-emerald-700' },
  physique: { name: 'Physique', icon: '⚛️', color: 'bg-purple-100 text-purple-700' },
  anglais: { name: 'Anglais', icon: '🌍', color: 'bg-cyan-100 text-cyan-700' },
  histoire: { name: 'Histoire-Géo', icon: '🏛️', color: 'bg-violet-100 text-violet-700' },
};

export function ConcoursSujetsClient({
  yearGroups,
  allYearGroups,
  totalFiles,
}: {
  yearGroups: YearGroup[];
  allYearGroups: YearGroup[];
  totalFiles: number;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [voieFilter, setVoieFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [openYears, setOpenYears] = useState<Set<number>>(new Set([yearGroups[0]?.year]));

  // Available subjects (from data)
  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();
    for (const yg of allYearGroups) {
      for (const subjects2 of Object.values(yg.voies)) {
        for (const subject of Object.keys(subjects2)) {
          subjects.add(subject);
        }
      }
    }
    return Array.from(subjects).sort();
  }, [allYearGroups]);

  // Apply client-side filters
  const filteredGroups = useMemo(() => {
    return yearGroups
      .map((yg) => {
        if (yearFilter && yg.year !== parseInt(yearFilter, 10)) return null;
        const filteredVoies: any = {};
        for (const [voie, subjects] of Object.entries(yg.voies)) {
          if (voieFilter && voie !== voieFilter) continue;
          const filteredSubjects: any = {};
          for (const [subject, files] of Object.entries(subjects)) {
            if (subjectFilter && subject !== subjectFilter) continue;
            const filtered: any = { ...files };
            if (typeFilter === 'sujet' && !files.sujet) delete filtered.sujet;
            if (typeFilter === 'corrige' && !files.corrige && !files.sujetPlusCorrige) {
              delete filtered.corrige;
              delete filtered.sujetPlusCorrige;
            }
            if (Object.keys(filtered).length === 0) continue;
            if (searchQuery) {
              const searchStr = `${yg.year} ${subject} ${voie} ${Object.keys(filtered).join(' ')}`.toLowerCase();
              if (!searchStr.includes(searchQuery.toLowerCase())) continue;
            }
            filteredSubjects[subject] = filtered;
          }
          if (Object.keys(filteredSubjects).length > 0) {
            filteredVoies[voie] = filteredSubjects;
          }
        }
        if (Object.keys(filteredVoies).length === 0) return null;
        return { ...yg, voies: filteredVoies };
      })
      .filter((yg): yg is YearGroup => yg !== null);
  }, [yearGroups, yearFilter, subjectFilter, voieFilter, typeFilter, searchQuery]);

  const totalFiltered = filteredGroups.reduce((s, yg) =>
    s + Object.values(yg.voies).reduce((ss, subjects) =>
      ss + Object.values(subjects).reduce((sss, files) =>
        sss + (files.sujet ? 1 : 0) + (files.corrige ? 1 : 0) + (files.sujetPlusCorrige ? 1 : 0),
        0,
      ),
      0,
    ),
    0,
  );

  const toggleYear = (year: number) => {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const expandAll = () => setOpenYears(new Set(filteredGroups.map((yg) => yg.year)));
  const collapseAll = () => setOpenYears(new Set());

  const clearFilters = () => {
    setSearchQuery('');
    setYearFilter('');
    setSubjectFilter('');
    setVoieFilter('');
    setTypeFilter('');
  };

  const hasActiveFilters = searchQuery || yearFilter || subjectFilter || voieFilter || typeFilter;

  return (
    <>
      {/* ========== FILTER BAR ========== */}
      <section className="sticky top-20 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                placeholder="Rechercher (ex: math 2024, svt 2020, corrigé...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-sm"
              />
            </div>

            {/* Year filter */}
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 focus:border-primary-400 outline-none text-sm bg-white"
            >
              <option value="">Toutes années</option>
              {allYearGroups.map((yg) => (
                <option key={yg.year} value={yg.year}>{yg.year}</option>
              ))}
            </select>

            {/* Subject filter */}
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 focus:border-primary-400 outline-none text-sm bg-white"
            >
              <option value="">Toutes matières</option>
              {availableSubjects.map((s) => (
                <option key={s} value={s}>
                  {SUBJECT_META[s]?.icon} {SUBJECT_META[s]?.name || s}
                </option>
              ))}
            </select>

            {/* Voie filter */}
            <select
              value={voieFilter}
              onChange={(e) => setVoieFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 focus:border-primary-400 outline-none text-sm bg-white"
            >
              <option value="">Toutes voies</option>
              <option value="general">🎓 Générale</option>
              <option value="technique">🔧 Technique</option>
            </select>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 focus:border-primary-400 outline-none text-sm bg-white"
            >
              <option value="">Sujets + Corrigés</option>
              <option value="sujet">Sujets seulement</option>
              <option value="corrige">Corrigés seulement</option>
            </select>
          </div>

          {/* Result count + actions */}
          <div className="flex items-center justify-between gap-3 mt-3">
            <div className="text-sm text-slate-600">
              {hasActiveFilters ? (
                <>
                  <strong className="text-primary-600">{totalFiltered}</strong> résultat{totalFiltered > 1 ? 's' : ''} sur {totalFiles} fichiers
                </>
              ) : (
                <>
                  <strong className="text-primary-600">{totalFiles}</strong> fichiers au total — {yearGroups.length} années couvertes
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                >
                  <X className="w-3 h-3" /> Réinitialiser
                </button>
              )}
              <button
                onClick={expandAll}
                className="text-xs text-primary-600 hover:text-primary-700 font-semibold px-2 py-1"
              >
                Tout ouvrir
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={collapseAll}
                className="text-xs text-primary-600 hover:text-primary-700 font-semibold px-2 py-1"
              >
                Tout fermer
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========== LIST ========== */}
      <section className="py-8 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Aucun fichier trouvé</h3>
              <p className="text-slate-600 mb-4">
                Aucun sujet ou corrigé ne correspond à tes critères. Essaie de modifier les filtres.
              </p>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition text-sm font-semibold"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGroups.map((yg) => {
                const isOpen = openYears.has(yg.year);
                const yearFileCount = Object.values(yg.voies).reduce((s, subjects) =>
                  s + Object.values(subjects).reduce((ss, files) =>
                    ss + (files.sujet ? 1 : 0) + (files.corrige ? 1 : 0) + (files.sujetPlusCorrige ? 1 : 0),
                    0,
                  ),
                  0,
                );

                return (
                  <details
                    key={yg.year}
                    open={isOpen}
                    className="group bg-white rounded-2xl border border-slate-200 hover:border-primary-300 transition shadow-sm"
                  >
                    <summary
                      onClick={(e) => { e.preventDefault(); toggleYear(yg.year); }}
                      className="cursor-pointer p-5 flex items-center justify-between gap-3 list-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 font-extrabold text-lg flex items-center justify-center">
                          {String(yg.year).slice(-2)}
                        </div>
                        <div>
                          <div className="font-bold text-lg text-slate-900">Concours 9ème {yg.year}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            {yearFileCount} fichier{yearFileCount > 1 ? 's' : ''} disponible{yearFileCount > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </summary>

                    <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(yg.voies).flatMap(([voie, subjects]) =>
                          Object.entries(subjects).map(([subject, files]) => {
                            const meta = SUBJECT_META[subject] || { name: subject, icon: '📄', color: 'bg-slate-100 text-slate-700' };
                            return (
                              <div
                                key={`${voie}-${subject}`}
                                className="flex flex-col gap-2 bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-primary-200 transition"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">{meta.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-slate-900">{meta.name}</div>
                                    <div className="text-xs text-slate-500 capitalize">
                                      Voie {voie === 'general' ? 'générale' : 'technique'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  {files.sujet && (
                                    <a
                                      href={files.sujet.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-between gap-2 bg-white border border-blue-200 text-blue-700 rounded-lg px-3 py-2 hover:bg-blue-50 hover:border-blue-300 transition text-xs font-semibold"
                                    >
                                      <span className="flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5" /> Sujet
                                      </span>
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {files.corrige && (
                                    <a
                                      href={files.corrige.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-between gap-2 bg-white border border-emerald-200 text-emerald-700 rounded-lg px-3 py-2 hover:bg-emerald-50 hover:border-emerald-300 transition text-xs font-semibold"
                                    >
                                      <span className="flex items-center gap-1.5">
                                        <CheckCircle className="w-3.5 h-3.5" /> Corrigé
                                      </span>
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {files.sujetPlusCorrige && (
                                    <a
                                      href={files.sujetPlusCorrige.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-between gap-2 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 text-amber-800 rounded-lg px-3 py-2 hover:from-amber-100 hover:to-yellow-100 transition text-xs font-bold"
                                    >
                                      <span className="flex items-center gap-1.5">
                                        <Star className="w-3.5 h-3.5 fill-amber-500" /> Sujet + Corrigé
                                      </span>
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
