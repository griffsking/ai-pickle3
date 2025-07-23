import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBrv0ehrAnBiN8bGLeHDya_JLcjaIixPRo",
  authDomain: "ai-pickle.firebaseapp.com",
  projectId: "ai-pickle",
  storageBucket: "ai-pickle.firebasestorage.app",
  messagingSenderId: "284797240601",
  appId: "1:284797240601:web:9fa565dc75d5cfad623188",
  measurementId: "G-Q1LRCX2VQ8"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const functions = getFunctions(firebaseApp);

module.exports = { db, functions };