// Firebase client SDK — autenticação no browser (separado do Admin SDK do backend)
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            'AIzaSyBkC8n5mzSPZnHwXf5d-jNdZvy-esPkD8Q',
  authDomain:        'gen-lang-client-0237314662.firebaseapp.com',
  projectId:         'gen-lang-client-0237314662',
  storageBucket:     'gen-lang-client-0237314662.firebasestorage.app',
  messagingSenderId: '279936452839',
  appId:             '1:279936452839:web:8a7e6824724c49388eba42',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
