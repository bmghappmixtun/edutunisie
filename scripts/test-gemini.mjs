import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// List available models
try {
  const modelInfo = await genAI.getGenerativeModel({ model: 'gemini-1.5-pro' }).generateContent('Reply with: OK');
  console.log('gemini-1.5-pro works:', modelInfo.response.text());
} catch (e) {
  console.log('gemini-1.5-pro failed:', e.message.substring(0, 200));
}

try {
  const modelInfo = await genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }).generateContent('Reply with: OK');
  console.log('gemini-2.0-flash works:', modelInfo.response.text());
} catch (e) {
  console.log('gemini-2.0-flash failed:', e.message.substring(0, 200));
}
