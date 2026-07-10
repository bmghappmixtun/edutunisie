import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const revalidate = 3600; // Refresh every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
  
  // Static pages
  // Helper: add AR alternates to sitemap entries
  const arAlternates = (url: string) => ({
    url,
    alternates: {
      languages: {
        'fr-TN': url,
        'ar-TN': url.replace(baseUrl, baseUrl + '/ar'),
        'x-default': url,
      },
    },
  });

  const staticPages: MetadataRoute.Sitemap = [
    arAlternates(baseUrl),
    arAlternates(`${baseUrl}/a-propos`),
    arAlternates(`${baseUrl}/contact`),
    arAlternates(`${baseUrl}/cgu`),
    arAlternates(`${baseUrl}/matieres`),
    arAlternates(`${baseUrl}/niveaux`),
    arAlternates(`${baseUrl}/college`),
    arAlternates(`${baseUrl}/concours-9eme-tunisie`),
    arAlternates(`${baseUrl}/concours-9eme-tunisie/sujets-passes`),
    arAlternates(`${baseUrl}/bac`),
    arAlternates(`${baseUrl}/bac/archives`),
    arAlternates(`${baseUrl}/professeurs`),
    arAlternates(`${baseUrl}/faq`),
    arAlternates(`${baseUrl}/recherche`),
    arAlternates(`${baseUrl}/referentiel-national`),
  ].map((entry, i) => ({
    ...entry,
    lastModified: i === 0 ? new Date() : undefined,
    changeFrequency: ['daily', 'monthly', 'monthly', 'yearly', 'weekly', 'weekly', 'daily', 'daily', 'daily', 'weekly', 'monthly', 'monthly', 'monthly', 'daily'][i] as any,
    priority: [1.0, 0.5, 0.5, 0.3, 0.8, 0.8, 0.9, 0.9, 0.8, 0.7, 0.6, 0.5, 0.5][i],
  }));
  
  // Subjects (matieres)
  const subjects = await prisma.subject.findMany({
    select: { slug: true },
  });
  const subjectPages: MetadataRoute.Sitemap = subjects.map(s => ({
    url: `${baseUrl}/matieres/${s.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Classes (niveaux)
  const classes = await prisma.class.findMany({
    select: { slug: true },
  });
  const classPages: MetadataRoute.Sitemap = classes.map(c => ({
    url: `${baseUrl}/niveaux/${c.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Teachers (top 200 by resource count)
  const teachers = await prisma.user.findMany({
    where: { uploadedFiles: { some: {} } },
    select: { id: true },
    take: 200,
  });
  const teacherPages: MetadataRoute.Sitemap = teachers.map(t => ({
    url: `${baseUrl}/professeurs/${t.id}`,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));
  
  // Resources - ALL published (Google accepts up to 50k per file)
  // We currently have ~15k so 1 file is enough
  const resources = await prisma.resource.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true, type: true, viewsCount: true, downloadsCount: true },
    orderBy: { updatedAt: 'desc' },
  });
  const resourcePages: MetadataRoute.Sitemap = resources.map(r => {
    // Quality-based priority: popular resources get higher priority
    const popularity = (r.viewsCount || 0) + (r.downloadsCount || 0) * 3;
    const priority = popularity > 1000 ? 0.8 : popularity > 100 ? 0.7 : 0.6;
    const changeFrequency: 'daily' | 'weekly' | 'monthly' =
      popularity > 500 ? 'daily' : popularity > 50 ? 'weekly' : 'monthly';
    return {
      url: `${baseUrl}/ressources/${r.slug}`,
      lastModified: r.updatedAt,
      changeFrequency,
      priority,
    };
  });
  
  return [...staticPages, ...subjectPages, ...classPages, ...teacherPages, ...resourcePages];
}
