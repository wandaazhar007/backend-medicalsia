import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// FIREBASE_PRIVATE_KEY is stored with escaped newlines in .env, unescape before use.
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export default admin;
