/**
 * GET /api/teacher/community/files
 *
 * Browse the teacher community's shared original files (DOCX, PDF, etc.)
 * Excludes the current teacher's own files.
 *
 * Returns all TeacherFile records that:
 *   - Have a valid PDF (pdfUrl set) — so they can be browsed as resources
 *   - Belong to other teachers (for inspiration / reuse)
 *   - Optional filters: search, classId, subjectId, type, format
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Réservé aux enseignants' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || undefined;
  const classId = searchParams.get('classId') || undefined;
  const subjectId = searchParams.get('subjectId') || undefined;
  const type = searchParams.get('type') || undefined;
  const format = searchParams.get('format') || undefined;

  const where: any = {
    teacherId: { not: user.id },          // exclude own files
    pdfUrl: { not: null },                // only successfully converted/shared
    conversionStatus: 'SUCCESS',          // only usable originals
  };
  if (classId) where.classId = classId;
  if (subjectId) where.subjectId = subjectId;
  if (type) where.type = type;
  if (format) where.originalFormat = format;
  if (search) {
    where.OR = [
      { fileName: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { tags: { contains: search, mode: 'insensitive' } },
    ];
  }

  const files = await prisma.teacherFile.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      class: { select: { id: true, nameFr: true, nameAr: true } },
      section: { select: { id: true, nameFr: true, nameAr: true } },
      subject: { select: { id: true, nameFr: true, nameAr: true, color: true, icon: true } },
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          schoolName: true,
          governorate: true,
          isVerifiedTeacher: true,
        },
      },
    },
  });

  // Enrich with the linked resource (if the file was published)
  const resourceIds = files.map((f) => f.resourceId).filter(Boolean) as string[];
  const resources = resourceIds.length
    ? await prisma.resource.findMany({
        where: { id: { in: resourceIds } },
        select: {
          id: true,
          slug: true,
          title: true,
          viewsCount: true,
          downloadsCount: true,
          favoritesCount: true,
          avgRating: true,
          ratingCount: true,
        },
      })
    : [];
  const resourcesById = Object.fromEntries(resources.map((r) => [r.id, r]));

  return NextResponse.json({
    files: files.map((f) => ({
      ...f,
      linkedResource: f.resourceId ? resourcesById[f.resourceId] : null,
    })),
    total: files.length,
  });
}