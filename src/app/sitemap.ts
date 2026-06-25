import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const revalidate = 3600; // Refresh every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/a-propos`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/cgu`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/matieres`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/niveaux`, changeFrequency: 'weekly', priority: 0.8 },
  ];
  
  // Subjects (matieres)
  const subjects = await prisma.subject.findMany({
    select: { slug: true, updatedAt: true },
  });
  const subjectPages: MetadataRoute.Sitemap = subjects.map(s => ({
    url: `${baseUrl}/matieres/${s.slug}`,
    lastModified: s.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));
  
  // Classes (niveaux)
  const classes = await prisma.class.findMany({
    select: { slug: true, updatedAt: true },
  });
  const classPages: MetadataRoute.Sitemap = classes.map(c => ({
    url: `${baseUrl}/niveaux/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));
  
  // Resources - top 1000 (sitemap.xml limits)
  const resources = await prisma.resource.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true, type: true },
    orderBy: { updatedAt: 'desc' },
    take: 1000,
  });
  const resourcePages: MetadataRoute.Sitemap = resources.map(r => ({
    url: `${baseUrl}/ressources/${r.slug}`,
    lastModified: r.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));
  
  return [...staticPages, ...subjectPages, ...classPages, ...resourcePages];
}
