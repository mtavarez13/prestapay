import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const credential = serviceAccount ? cert(JSON.parse(serviceAccount)) : applicationDefault();
const app = getApps()[0] ?? initializeApp({ credential, projectId: process.env.FIREBASE_PROJECT_ID || 'prestamo-27ccb' });
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app, process.env.FIRESTORE_DATABASE_ID || '(default)');
