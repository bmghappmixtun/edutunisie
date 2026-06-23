import { renderNewEditPendingEmail } from './src/lib/email-templates.ts';
import fs from 'fs';
const html = renderNewEditPendingEmail(
  'Mohamed Gharbi',
  'Devoir de Synthèse N°2 - Sciences physiques - 3ème Technique (2025-2026) Mr Mesrati Ali',
  'title',
  'https://examanet.com/admin/ressources/editions',
  true,
  'Le titre est trop court. Veuillez ajouter la classe et l année.'
);
fs.writeFileSync('tests/e2e/screenshots/admin-resubmit-email.html', html);
console.log('HTML written:', html.length, 'chars');
