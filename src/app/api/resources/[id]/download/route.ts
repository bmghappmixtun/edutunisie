import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  const ip = req.headers.get('x-forwarded-for') || 'visitor';

  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });

  await prisma.download.create({ data: { resourceId: id, userId: user?.id, ipAddress: ip } });
  await prisma.resource.update({ where: { id }, data: { downloadsCount: { increment: 1 } } });

  // For demo, return a sample PDF URL
  return NextResponse.json({ url: '/sample-pdf.pdf', fileName: resource.title + '.pdf' });
}
