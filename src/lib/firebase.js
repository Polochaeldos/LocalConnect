// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDVx1evWRGQv6Ik-Uu-3_551mfmuyM4BUE",
  authDomain: "localconnect-4d689.firebaseapp.com",
  projectId: "localconnect-4d689",
  storageBucket: "localconnect-4d689.firebasestorage.app",
  messagingSenderId: "417565510943",
  appId: "1:417565510943:web:fdf815cb96efed619ff42a",
  measurementId: "G-HVT6Y5K29M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics (only on client side)
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;
