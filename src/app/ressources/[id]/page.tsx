/**
 * Short URL for resources: /ressources/{numericId} (without slug)
 * → 308 redirect to the canonical URL /ressources/{numericId}/{slug}
 *
 * Pattern: Etsy-style listing URLs — the numericId is the stable identifier
 * (never changes), the slug is purely cosmetic for SEO. This means external
 * linkers can use the short form, and we always redirect to the current
 * canonical URL (slug may have been updated).
 *
 * Server-side lookup adds ~50ms but DB has @unique index on numericId.
 */
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ResourceShortUrl({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId) || numericId <= 0) notFound();

  // Only published resources are public (the full page also enforces this).
  const resource = await prisma.resource.findFirst({
    where: { numericId, status: 'PUBLISHED' },
    select: { slug: true },
  });
  if (!resource) notFound();

  // 308 = Permanent redirect (preserves request method + body, SEO-friendly)
  redirect(`/ressources/${numericId}/${resource.slug}`);
}
