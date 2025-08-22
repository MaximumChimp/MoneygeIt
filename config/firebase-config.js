import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBslqdBSE0FlmgkA3wNKLy8yTZzQDMo_XM",
  authDomain: "moneygeit.firebaseapp.com",
  projectId: "moneygeit",
  storageBucket: "moneygeit.appspot.com",
  messagingSenderId: "629140419689",
  appId: "1:629140419689:web:432f3da5dd288ff0f99ef8"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth with React Native persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// ✅ Firestore with offline persistence enabled
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// Storage
export const storage = getStorage(app);
