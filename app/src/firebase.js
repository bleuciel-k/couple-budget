// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBXKZpe6JpWWwVVNWlb8kbKlJ7snSwWyQg",
    authDomain: "couple-budget-ebaea.firebaseapp.com",
    projectId: "couple-budget-ebaea",
    storageBucket: "couple-budget-ebaea.firebasestorage.app",
    messagingSenderId: "303521412377",
    appId: "1:303521412377:web:a9c1d73aceeb91c4fb4188",
    measurementId: "G-0PZL2LBGHT"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const authPersistencePromise = setPersistence(auth, browserLocalPersistence);
export const db = getFirestore(app);

export const analyticsPromise = isSupported().then((supported) =>
  supported ? getAnalytics(app) : null
);
