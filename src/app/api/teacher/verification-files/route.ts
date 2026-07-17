import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/storage';
import { detectFormat } from '@/lib/document-converter';
import { sendAdminVerificationFilesEmail } from '@/lib/email';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_FILES = 5;
const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/pdf', // .pdf
];
const ALLOWED_EXTENSIONS = ['docx', 'doc', 'pdf'];

/**
 * GET /api/teacher/verification-files
 * Returns the teacher's currently uploaded verification files
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (user.role !== 'TEACHER')
    return NextResponse.json({ error: 'Réservé aux enseignants' }, { status: 403 });

  const files = await prisma.teacherVerificationFile.findMany({
    where: { teacherId: user.id },
    orderBy: { uploadedAt: 'desc' },
  });

  // Also fetch the request info
  const teacher = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      status: true,
      verificationFilesRequestedAt: true,
      verificationFilesNote: true,
      verificationFilesReceivedAt: true,
    },
  });

  return NextResponse.json({
    files,
    request: {
      status: teacher?.status,
      requestedAt: teacher?.verificationFilesRequestedAt,
      note: teacher?.verificationFilesNote,
      receivedAt: teacher?.verificationFilesReceivedAt,
      maxFiles: MAX_FILES,
      remaining: Math.max(0, MAX_FILES - files.length),
    },
  });
}

/**
 * POST /api/teacher/verification-files
 * Upload a verification file (max 5 total)
 *
 * Body: multipart/form-data with:
 * - file: the file (docx, doc, pdf)
 * - type: COURSE | HOMEWORK | EXERCISE | REVISION | EXAM | OTHER
 * - description: optional
 * - year: optional (2024, 2023...)
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (user.role !== 'TEACHER')
    return NextResponse.json({ error: 'Réservé aux enseignants' }, { status: 403 });

  // Check the teacher has been asked for files
  const teacher = await prisma.user.findUnique({
    where: { id: user.id },
    select: { status: true, verificationFilesRequestedAt: true },
  });
  if (teacher?.status !== 'PENDING_FILE_VERIFICATION') {
    return NextResponse.json(
      { error: "Vous n'êtes pas en attente de vérification de fichiers." },
      { status: 400 },
    );
  }

  // Check max files
  const existingCount = await prisma.teacherVerificationFile.count({
    where: { teacherId: user.id },
  });
  if (existingCount >= MAX_FILES) {
    return NextResponse.json(
      { error: `Vous avez déjà atteint la limite de ${MAX_FILES} fichiers.` },
      { status: 400 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e) {
    return NextResponse.json(
      { error: 'Format invalide (multipart/form-data requis)' },
      { status: 400 },
    );
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
  }

  // Validate file
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Le fichier dépasse la taille maximale (${MAX_FILE_SIZE / 1024 / 1024} MB).` },
      { status: 400 },
    );
  }

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Format non supporté. Formats acceptés : .docx, .doc, .pdf' },
      { status: 400 },
    );
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const format = detectFormat(file.name, file.type);

  // Upload to storage
  const safeName = file.name.replace(/[^a-zA-Z0-9.-_]/g, '_').slice(0, 100);
  const key = `verification/${user.id}/${nanoid(10)}-${safeName}`;
  const { url: fileUrl } = await uploadFile(key, fileBuffer, file.type);

  // Save to DB
  const verificationFile = await prisma.teacherVerificationFile.create({
    data: {
      teacherId: user.id,
      fileName: file.name,
      originalFormat: ext,
      fileKey: key,
      fileUrl,
      fileSize: file.size,
      type: (formData.get('type') as string) || null,
      description: (formData.get('description') as string) || null,
      year: (formData.get('year') as string) || null,
      trimester: (formData.get('trimester') as string) || null,
    },
  });

  // Update user's count + status
  const newCount = existingCount + 1;
  const allReceived = newCount >= MAX_FILES;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationFilesCount: newCount,
      // If all 5 files received, mark receivedAt
      ...(allReceived ? { verificationFilesReceivedAt: new Date() } : {}),
    },
  });

  // Notify admin (email) — fetch all files + admin user
  try {
    const [allFiles, admins] = await Promise.all([
      prisma.teacherVerificationFile.findMany({
        where: { teacherId: user.id },
        orderBy: { uploadedAt: 'desc' },
        take: 10,
      }),
      prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true },
      }),
    ]);
    const adminBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://examanet.com';
    for (const admin of admins) {
      if (!admin.email) continue;
      // Send email on each new file (digest) — but especially when 5/5 complete
      await sendAdminVerificationFilesEmail({
        to: admin.email,
        teacher: {
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
        },
        files: allFiles.map((f) => ({
          fileName: f.fileName,
          fileSize: f.fileSize,
          fileUrl: f.fileUrl,
          type: f.type,
          uploadedAt: f.uploadedAt.toISOString(),
        })),
        count: newCount,
        total: MAX_FILES,
        adminUrl: `${adminBaseUrl}/admin/approbations`,
      });
    }
  } catch (emailErr) {
    console.error('Failed to send admin verification email:', emailErr);
    // Don't fail the request — file was uploaded successfully
  }

  return NextResponse.json({
    success: true,
    file: verificationFile,
    remaining: Math.max(0, MAX_FILES - newCount),
    message:
      newCount >= MAX_FILES
        ? `🎉 Tous vos fichiers sont reçus ! L'équipe va les examiner sous 48h.`
        : `Fichier ${newCount}/${MAX_FILES} reçu.`,
  });
}

/**
 * DELETE /api/teacher/verification-files?id=xxx
 * Delete a verification file (only if not yet reviewed)
 */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  const file = await prisma.teacherVerificationFile.findUnique({ where: { id } });
  if (!file || file.teacherId !== user.id) {
    return NextResponse.json({ error: 'Non trouvé' }, { status: 404 });
  }
  if (file.reviewedByAdmin) {
    return NextResponse.json(
      { error: 'Ce fichier a déjà été examiné, suppression impossible.' },
      { status: 400 },
    );
  }

  await prisma.teacherVerificationFile.delete({ where: { id } });
  // Decrement count
  const newCount = await prisma.teacherVerificationFile.count({ where: { teacherId: user.id } });
  await prisma.user.update({
    where: { id: user.id },
    data: { verificationFilesCount: newCount, verificationFilesReceivedAt: null },
  });

  return NextResponse.json({ success: true, remaining: MAX_FILES - newCount });
}
