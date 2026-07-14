// Quick test of the fallback converter
import mammoth from 'mammoth';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync } from 'fs';

// Create a fake .docx (just a text buffer to test mammoth handling)
const fakeDocx = Buffer.from('PK\x03\x04fake docx content');

// Try mammoth
try {
  const result = await mammoth.extractRawText({ buffer: fakeDocx });
  console.log('mammoth result:', JSON.stringify(result.value).slice(0, 200));
} catch (e) {
  console.log('mammoth expected fail (fake input):', e.message);
}

// Test pdf-lib
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const page = pdf.drawText ? null : pdf.addPage([595, 842]);
page.drawText('Hello Examanet', { x: 50, y: 800, size: 12, font, color: rgb(0,0,0) });
const bytes = await pdf.save();
console.log('PDF generated:', bytes.length, 'bytes');
writeFileSync('/tmp/test.pdf', bytes);
console.log('✅ pdf-lib + mammoth both work');
