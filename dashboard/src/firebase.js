/**
 * SheShield Dashboard — Firebase Client
 * Uses the existing nariraksha-ai project.
 * NEVER import firebase-admin or service accounts here.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nariraksha-ai.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nariraksha-ai",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nariraksha-ai.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "105800727017200557676",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

// Check if required keys are present
export const firebaseReady =
  Boolean(firebaseConfig.apiKey) && Boolean(firebaseConfig.appId);

let app, db, auth;

if (firebaseReady) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

export { db, auth };