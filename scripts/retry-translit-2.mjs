import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
const p = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function transliterate(firstName, lastName) {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
  });
  const prompt = `Tu es un expert des noms arabes. Tu reçois un prénom et un nom de famille en français (translittération d'un nom arabe/tunisien), et tu dois retourner la version arabe authentique. Retourne UNIQUEMENT le JSON avec les champs firstNameAr et lastNameAr.

Prénom: ${firstName}
Nom de famille: ${lastName || '(none)'}

Retourne le JSON:`;
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

const targets = [
  { id: 28, fn: 'Yassine', ln: 'Guezguez' },
  { id: 44, fn: 'AB', ln: 'MARWEN' },
];
for (const t of targets) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await transliterate(t.fn, t.ln);
      console.log(`#${t.id} | ${t.fn} ${t.ln} | AR: ${r.firstNameAr} ${r.lastNameAr || ''}`);
      break;
    } catch (e) {
      console.log(`#${t.id} attempt ${i+1} failed: ${e.message.substring(0, 80)}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}
await p.$disconnect();
