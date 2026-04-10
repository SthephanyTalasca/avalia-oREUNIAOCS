// api/firebase.js — Firebase Admin SDK (compartilhado por todos os endpoints)
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  // Vercel converte \n em newlines reais dentro de strings JSON (inválido).
  // Percorre char a char e re-escapa newlines apenas dentro de string literals.
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  let fixed = '', inStr = false, esc = false;
  for (const ch of raw) {
    if (esc)             { fixed += ch; esc = false; }
    else if (ch === '\\') { fixed += ch; esc = true; }
    else if (ch === '"')  { fixed += ch; inStr = !inStr; }
    else if (inStr && ch === '\n') { fixed += '\\n'; }
    else if (inStr && ch === '\r') { /* descarta \r */ }
    else                 { fixed += ch; }
  }
  initializeApp({ credential: cert(JSON.parse(fixed)) });
}

export const db = getFirestore();
export { FieldValue };

// Converte QuerySnapshot em array, normalizando Timestamps para ISO string
export function docsToArray(snapshot) {
  return snapshot.docs.map(doc => {
    const data = doc.data();
    if (data.created_at?.toDate) data.created_at = data.created_at.toDate().toISOString();
    if (data.updated_at?.toDate) data.updated_at = data.updated_at.toDate().toISOString();
    return { id: doc.id, ...data };
  });
}
