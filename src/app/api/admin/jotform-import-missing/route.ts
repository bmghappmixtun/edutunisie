export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { properSlugify } from '@/lib/slugify';
import { convertDocxToPdf } from '@/lib/document-converter';

const JOTFORM_KEY = process.env.JOTFORM_API_KEY || '7312267369dbfc1c06dab2cf7cba4dc1';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const matches: any[] = body.matches || [];
    if (matches.length === 0) {
      return NextResponse.json({ error: 'Aucun match fourni' }, { status: 400 });
    }
    
    // Pre-fetch subjects and classes
    const [subjects, classes] = await Promise.all([
      prisma.subject.findMany(),
      prisma.class.findMany({ include: { level: true } }),
    ]);
    const subjectBySlug = new Map(subjects.map((s: any) => [s.slug, s]));
    const classBySlug = new Map(classes.map((c: any) => [c.slug, c]));
    
    const imported: any[] = [];
    const errors: any[] = [];
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    
    for (const m of matches) {
      const sub = m.sub;
      const user = m.user;
      for (let i = 0; i < (sub.file_urls || []).length; i++) {
        const fileUrl = sub.file_urls[i];
        const fileName = sub.file_names?.[i] || fileUrl.split('/').pop() || 'file';
        try {
          // Check if already imported
          const existing = await prisma.resource.findFirst({
            where: { originalFileName: fileName, teacherId: user.id },
          });
          if (existing) {
            imported.push({ numericId: existing.numericId, fileName, skipped: true });
            continue;
          }
          
          // Download from Jotform
          const dlRes = await fetch(fileUrl);
          if (!dlRes.ok) {
            errors.push({ fileName, error: `Download failed: ${dlRes.status}` });
            continue;
          }
          const buffer = Buffer.from(await dlRes.arrayBuffer());
          
          // Upload original to Vercel Blob
          const subId = sub.submission_id || 'unknown';
          const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
          const origKey = `teacher-library/${user.id}/jotform/${subId}-${safeName}-orig-${Math.random().toString(36).substring(2, 10)}.${safeName.split('.').pop()}`;
          const origBlob = await put(origKey, buffer, { access: 'public', addRandomSuffix: false });
          
          // Detect format and convert if needed
          const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf';
          const isOffice = ['docx', 'doc', 'odt', 'pptx', 'xlsx'].includes(ext);
          let pdfBuffer: Buffer | null = null;
          let pdfKey = origBlob.pathname;
          let pdfBlob = { url: origBlob.url, pathname: origBlob.pathname };
          let format = ext;
          let fileSize = buffer.length;
          if (isOffice) {
            try {
              pdfBuffer = await convertDocxToPdf(buffer, fileName);
              if (pdfBuffer) {
                const pdfName = fileName.replace(/\.(docx?|odt|pptx|xlsx)$/i, '.pdf');
                const pdfKeyPath = origKey.replace(/-orig-/, '-').replace(/\.(docx?|odt|pptx|xlsx)$/i, '.pdf');
                pdfBlob = await put(pdfKeyPath, pdfBuffer, { access: 'public', addRandomSuffix: false });
                pdfKey = pdfBlob.pathname;
                format = 'pdf';
                fileSize = pdfBuffer.length;
              }
            } catch (e: any) {
              console.log(`PDF conversion failed for ${fileName}: ${e.message}`);
            }
          }
          
          // Create TeacherFile
          const tf = await prisma.teacherFile.create({
            data: {
              teacherId: user.id,
              fileName: pdfKey.split('/').pop() || fileName,
              originalFileName: fileName,
              fileKey: pdfKey,
              fileUrl: pdfBlob.url,
              fileSize,
              mimeType: format === 'pdf' ? 'application/pdf' : 'application/octet-stream',
              format,
              status: 'PUBLISHED',
              approvedById: admin?.id,
              approvedAt: new Date(),
              uploadedAt: new Date(),
              notes: `Jotform 2880314284 #${subId} (${sub.created_at || '?'})`,
            },
          });
          
          // Map subject
          const matiereRaw = (sub.matiere || '').toLowerCase();
          let subjectSlug = 'mathematiques';
          const matiereMap: Record<string, string> = {
            'math': 'mathematiques', 'mathématiques': 'mathematiques', 'mathematiques': 'mathematiques',
            'physique': 'physique', 'sciences physiques': 'physique',
            'svt': 'svt', 'sciences de la vie et de la terre': 'svt',
            'arabe': 'arabe', 'francais': 'francais', 'français': 'francais',
            'anglais': 'anglais', 'histoire': 'histoire', 'geographie': 'geographie',
            'philosophie': 'philosophie', 'informatique': 'algo-prog',
            'algorithmique': 'algo-prog', 'algorithme et programmation': 'algo-prog',
            'technologie': 'technologie', 'gestion': 'eco-gestion', 'economie': 'eco-gestion',
            'sport': 'sport', 'etude de texte': 'etude-texte', 'chimie': 'physique',
          };
          if (matiereMap[matiereRaw]) subjectSlug = matiereMap[matiereRaw];
          if (matiereRaw === 'math') subjectSlug = 'mathematiques';
          
          let subject = subjectBySlug.get(subjectSlug);
          if (!subject) {
            // Auto-create
            const subjectNames: Record<string, [string, string]> = {
              'mathematiques': ['Mathématiques', 'الرياضيات'],
              'physique': ['Physique', 'الفيزياء'],
              'algo-prog': ['Algorithme et programmation', 'الخوارزميات'],
            };
            const [nFr, nAr] = subjectNames[subjectSlug] || [matiereRaw, matiereRaw];
            subject = await prisma.subject.create({
              data: {
                slug: subjectSlug,
                nameFr: nFr,
                nameAr: nAr,
                order: 999,
              },
            });
            subjectBySlug.set(subjectSlug, subject);
          }
          
          // Map class
          const classeRaw = (sub.classe || '').toLowerCase();
          let classSlug = '1ere-secondaire';
          if (classeRaw.includes('1ère') || classeRaw.includes('1ere') || classeRaw.includes('1as')) classSlug = '1ere-secondaire';
          else if (classeRaw.includes('2ème') || classeRaw.includes('2eme') || classeRaw.includes('2as')) classSlug = '2eme-secondaire';
          else if (classeRaw.includes('3ème') || classeRaw.includes('3eme') || classeRaw.includes('3as')) classSlug = '3eme-secondaire';
          else if (classeRaw.includes('4ème') || classeRaw.includes('4eme') || classeRaw.includes('4as') || classeRaw.includes('bac')) classSlug = '4eme-secondaire';
          
          const classe = classBySlug.get(classSlug);
          
          // Map section
          const sectionRaw = (sub.section || '').toLowerCase();
          let section = null;
          if (sectionRaw) {
            const allSections = await prisma.section.findMany();
            section = allSections.find(s => 
              s.nameFr.toLowerCase().includes(sectionRaw) || 
              s.slug.includes(sectionRaw.replace(/\s+/g, '-'))
            ) || null;
          }
          
          // Map type
          const typeRaw = (sub.type || '').toLowerCase();
          let resType = 'COURSE';
          if (typeRaw.includes('devoir corrigé')) resType = 'CORRECTION';
          else if (typeRaw.includes('devoir')) resType = 'DEVOIR';
          else if (typeRaw.includes('série') && typeRaw.includes('exercice')) resType = 'EXERCISE';
          else if (typeRaw.includes('série corrigée')) resType = 'CORRECTION';
          else if (typeRaw.includes('cours')) resType = 'COURSE';
          else if (typeRaw.includes('tp')) resType = 'TP';
          else if (typeRaw.includes('examen')) resType = 'EXAM';
          
          // Build title
          const newType = resType === 'DEVOIR' && sub.n ? `Devoir N°${String(sub.n).replace('N°', '')}` : 
                          resType === 'CORRECTION' && sub.n ? `Devoir Corrigé N°${String(sub.n).replace('N°', '')}` :
                          resType === 'EXERCISE' && sub.n ? `Série d'exercices N°${String(sub.n).replace('N°', '')}` :
                          ({ COURSE: 'Cours', DEVOIR: 'Devoir', EXERCISE: "Série d'exercices", CORRECTION: 'Devoir Corrigé', TP: 'TP', EXAM: 'Examen' }[resType] || 'Document');
          
          const classeName = classe?.nameFr || '1ère année secondaire';
          const sectionName = section?.nameFr || '';
          
          const parts = [newType];
          if (sub.sujet) parts.push(sub.sujet);
          if (classeName) parts.push(classeName);
          if (sectionName) parts.push(sectionName);
          const title = parts.join(' - ') + (sub.annee ? ` (${sub.annee})` : '');
          
          const slug = properSlugify(title);
          
          // Create Resource
          const r = await prisma.resource.create({
            data: {
              title,
              slug,
              description: '',
              type: resType as any,
              status: 'PUBLISHED',
              fileKey: pdfKey,
              fileUrl: pdfBlob.url,
              fileSize,
              teacherId: user.id,
              subjectId: subject.id,
              classId: classe?.id,
              sectionId: section?.id,
              language: 'fr',
              year: sub.annee || '2025-2026',
              approvedById: admin?.id,
              approvedAt: new Date(),
              publishedAt: new Date(),
              originalFileKey: origBlob.pathname,
              originalFileName: fileName,
              originalFormat: ext,
              originalFileSize: buffer.length,
              libraryFileId: tf.id,
              descriptionSource: 'jotform-import',
            },
          });
          
          imported.push({
            numericId: r.numericId,
            title: r.title,
            slug: r.slug,
            fileName,
            teacher: `${user.firstName} ${user.lastName}`,
          });
        } catch (e: any) {
          errors.push({ fileName, error: e.message });
        }
      }
    }
    
    return NextResponse.json({ imported, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
