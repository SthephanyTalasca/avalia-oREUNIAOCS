// api/firebase.js — Firebase Admin SDK (compartilhado por todos os endpoints)
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
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
