// api/firebase.js — Firebase Admin SDK (compartilhado por todos os endpoints)
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({ credential: cert(sa) });
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
