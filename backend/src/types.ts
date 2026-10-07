import type { DecodedIdToken } from 'firebase-admin/auth';

declare global {
  namespace Express {
    interface Request {
      identity?: DecodedIdToken;
      tenant?: { id: string; data: FirebaseFirestore.DocumentData; membership: FirebaseFirestore.DocumentData };
    }
  }
}

export {};
