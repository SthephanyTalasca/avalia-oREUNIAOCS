// api/firebase.js — Firebase Admin SDK (compartilhado por todos os endpoints)
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var não definida');

  // Tenta parse direto. Se falhar (newlines reais no JSON), substitui e tenta de novo.
  let sa;
  try {
    sa = JSON.parse(raw);
  } catch (_) {
    try {
      sa = JSON.parse(raw.replace(/\r/g, '').replace(/\n/g, '\\n'));
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT JSON inválido: ' + e.message);
    }
  }

  // Garante que o private_key tem newlines reais (não o texto literal \n)
  if (sa.private_key) {
    sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  }

  try {
    initializeApp({ credential: cert(sa) });
  } catch (e) {
    throw new Error('Firebase initializeApp falhou: ' + e.message);
  }
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
