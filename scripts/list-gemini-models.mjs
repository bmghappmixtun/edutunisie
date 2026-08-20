import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Direct fetch to list models
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
const res = await fetch(url);
const data = await res.json();
console.log('Models:');
for (const m of (data.models || []).slice(0, 15)) {
  console.log(' -', m.name, '|', (m.supportedGenerationMethods || []).join(','));
}
