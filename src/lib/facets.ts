/**
 * Shared Facets type for resource filtering
 * Used by /api/ressources route and /ressources page + FilterShell client component
 */
export interface Facets {
  byType: Record<string, number>;
  byTrimestre: Record<string, number>;
  byYear: Record<string, number>;
  byLanguage: Record<string, number>;
  byClass: Record<string, number>;
  bySection: Record<string, number>;
  bySubject: Record<string, number>;
  withCorrection: number;
}

export interface RessourcesResponse {
  resources: any[];
  total: number;
  totalPages: number;
  currentPage: number;
  facets: Facets;
}
