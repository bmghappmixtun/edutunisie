import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getVisitorIpFromRequest, isBotOrPlaceholder } from '@/lib/visitor';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  const ip = getVisitorIpFromRequest(req);
  const ua = req.headers.get('user-agent');
  const skipTracking = isBotOrPlaceholder(ip, ua);

  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });

  // Determine which file to serve (PDF or original)
  const wantsOriginal = req.nextUrl.searchParams.get('original') === '1' ||
    new URL(req.url).searchParams.get('original') === '1';

  if (wantsOriginal && resource.originalFileKey) {
    // Only verified TEACHERs and ADMINs can download original Office files
    if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Les fichiers originaux Office sont réservés à la communauté des enseignants' },
        { status: 403 }
      );
    }

    if (!skipTracking) {
      await prisma.download.create({ data: { resourceId: id, userId: user.id, ipAddress: ip} });
    }
    return NextResponse.json({
      url: resource.fileUrl.replace(/\.pdf$/i, '').includes('.') ? resource.originalFileKey || resource.fileUrl : resource.originalFileKey,
      fileName: resource.originalFileName || resource.title,
      original: true,
      format: resource.originalFormat,
    });
  }

  if (!skipTracking) {
    await prisma.download.create({ data: { resourceId: id, userId: user?.id, ipAddress: ip} });
    await prisma.resource.update({ where: { id }, data: { downloadsCount: { increment: 1 } } });
  }

  return NextResponse.json({ url: resource.fileUrl, fileName: resource.title + '.pdf' });
}

/**
 * GET endpoint for direct download (also supports ?original=1)
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  const wantsOriginal = req.nextUrl.searchParams.get('original') === '1';
  const ip = getVisitorIpFromRequest(req);
  const ua = req.headers.get('user-agent');
  const skipTracking = isBotOrPlaceholder(ip, ua);

  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });

  if (wantsOriginal) {
    // Only TEACHERs and ADMINs can download original Office files
    if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Réservé aux enseignants' },
        { status: 403 }
      );
    }
    if (!resource.originalFileKey) {
      return NextResponse.json({ error: 'Pas d\'original' }, { status: 404 });
    }

    if (!skipTracking) {
      await prisma.download.create({ data: { resourceId: id, userId: user.id, ipAddress: ip} });
    }

    // Redirect to the original file URL
    const libFile = await prisma.teacherFile.findFirst({
      where: { resourceId: id },
      select: { fileUrl: true, fileName: true },
    });
    if (libFile) {
      return NextResponse.redirect(libFile.fileUrl);
    }
    return NextResponse.json({ error: 'Fichier original introuvable' }, { status: 404 });
  }

  // Default: redirect to PDF
  if (!skipTracking) {
    await prisma.download.create({ data: { resourceId: id, userId: user?.id, ipAddress: ip} });
    await prisma.resource.update({ where: { id }, data: { downloadsCount: { increment: 1 } } });
  }
  return NextResponse.redirect(resource.fileUrl);
}