import type { FirebaseApp } from 'firebase/app';
import type { Analytics } from 'firebase/analytics';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

export const app: FirebaseApp;
export const auth: Auth;
export const authPersistencePromise: Promise<void>;
export const db: Firestore;
export const analyticsPromise: Promise<Analytics | null>;
