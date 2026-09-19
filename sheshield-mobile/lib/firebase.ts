/**
 * SheShield Mobile — Firebase Client (JS SDK, Expo-compatible)
 * Uses the same sheshield-1778b project as the dashboard.
 * NEVER import firebase-admin or service-account here.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Prevent duplicate initialization during hot-reload in Expo Go
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase JS SDK handles auth state natively via its own storage
export const auth = getAuth(app);
export const db = getFirestore(app);
export { app };
