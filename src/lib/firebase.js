import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBslqdBSE0FlmgkA3wNKLy8yTZzQDMo_XM",
  authDomain: "moneygeit.firebaseapp.com",
  projectId: "moneygeit",
  storageBucket: "moneygeit.firebasestorage.app",
  messagingSenderId: "629140419689",
  appId: "1:629140419689:web:432f3da5dd288ff0f99ef8"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// RN-safe Auth initialization
let auth;
try {
  auth = getAuth(app);
} catch {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
