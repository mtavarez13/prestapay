import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// La configuración web de Firebase identifica la app cliente y es pública por
// diseño. Los secretos administrativos permanecen exclusivamente en el API.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyC6vh9ixzy5DG2f9KRMZVp4gq5gQWguUBA',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'prestamo-27ccb.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'prestamo-27ccb',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'prestamo-27ccb.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1098192394227',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1098192394227:web:d881805c5ea00974836486',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
