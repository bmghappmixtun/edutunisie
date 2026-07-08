import { Meilisearch } from 'meilisearch';
const meili = new Meilisearch({ host: 'http://127.0.0.1:7700', apiKey: 'poc-test-key-12345' });
const idx = meili.index('resources');

const tests = [
  // [query, description]
  ['mathematques', '✗ TYPO (mathematques → mathématiques)'],
  ['mathematik', '✗ TYPO anglais (mathematik → mathématiques)'],
  ['physic', '✗ TYPO (physic → physique)'],
  ['sience', '✗ TYPO (sience → science)'],
  ['math', '🔄 SYNONYME (math → mathématiques)'],
  ['svt', '🔄 SYNONYME (svt → sciences naturelles)'],
  ['1as', '🔄 SYNONYME (1as → 1ère secondaire)'],
  ['corrigés', '🔄 SYNONYME (corrigés → correction)'],
  ['devoir', '🔄 SYNONYME (devoir → devoirs)'],
  ['devoir bac', '✓ EXACTE'],
  ['contrôle', '✓ EXACTE'],
  ['رياضيات', '🌍 ARABE'],
  ['الفرنسية', '🌍 ARABE'],
];

for (const [query, desc] of tests) {
  const t0 = Date.now();
  const r = await idx.search(query, { limit: 3, attributesToHighlight: ['title'] });
  const t = Date.now() - t0;
  console.log(`\n${desc}`);
  console.log(`  Query: "${query}" → ${r.estimatedTotalHits} résultats en ${t}ms`);
  r.hits.slice(0, 3).forEach((h, i) => {
    const highlighted = h._formatted?.title || h.title;
    console.log(`  ${i+1}. ${highlighted.slice(0, 90)}`);
    console.log(`     [${h.subjectName || h.subject}/${h.className || h.class}/${h.type}]`);
  });
}

// Test facets
console.log('\n\n=== FACETS ===');
const r = await idx.search('', {
  facets: ['type', 'subject', 'class', 'year', 'language'],
  limit: 0,
});
console.log('byType:', JSON.stringify(r.facetDistribution?.type));
console.log('byClass:', JSON.stringify(r.facetDistribution?.class));
console.log('byYear:', JSON.stringify(r.facetDistribution?.year));

// Test filter
console.log('\n=== FILTER + SEARCH ===');
const r2 = await idx.search('devoir', {
  filter: ['class = 3eme-secondaire', 'type = HOMEWORK'],
  limit: 2,
});
console.log(`"devoir" + 3AS + HOMEWORK → ${r2.estimatedTotalHits} résultats`);
r2.hits.forEach(h => console.log(`  - ${h.title.slice(0, 80)}`));

