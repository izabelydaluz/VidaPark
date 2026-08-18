import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// ─────────────────────────────────────────────
// Credenciais vêm do .env (prefixo EXPO_PUBLIC_ obrigatório no Expo)
// Nunca coloque os valores direto aqui -- sempre via process.env
// ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Evita reinicializar o app se o arquivo for importado mais de uma vez
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth precisa de persistência via AsyncStorage no React Native (fora do Web),
// senão o usuário é deslogado toda vez que o app reinicia.
let auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    // Se o auth já foi inicializado (hot reload), reaproveita a instância
    auth = getAuth(app);
  }
}

const database = getFirestore(app);

export { app, auth, database };

// Re-exporta as funções mais usadas de auth, pra bater com o import
// que o seu Profile.js já faz: `import { auth, signOut, onAuthStateChanged } from "../firebaseConfig"`
export { signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
