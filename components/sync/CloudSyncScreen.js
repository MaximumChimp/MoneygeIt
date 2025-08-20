import React, { useState,useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../../config/firebase-config'; // make sure db is Firestore

export default function CloudSyncScreen({ navigation }) {
  const [syncing, setSyncing] = useState(false);


useEffect(() => {
    const loadAccounts = async () => {
      try {
        const storedAccounts = await AsyncStorage.getItem('all_accounts');
        const parsedAccounts = storedAccounts ? JSON.parse(storedAccounts) : {};
        console.log('Accounts loaded from AsyncStorage:', parsedAccounts);
      } catch (error) {
        console.error('Error loading accounts:', error);
      }
    };

    // Load accounts on mount
    loadAccounts();
  }, []);
  // Merge helper function by id + updatedAt
const mergeByIdAndUpdatedAt = (local, cloud) => {
  const map = new Map();

  // Add cloud accounts first
  cloud.forEach(item => {
    map.set(item.id, item);
  });

  // Add or override with local accounts if newer
  local.forEach(item => {
    const cloudItem = map.get(item.id);
    const localUpdatedAt = item.updatedAt || Date.now();
    const cloudUpdatedAt = cloudItem?.updatedAt || 0;

    if (!cloudItem || localUpdatedAt >= cloudUpdatedAt) {
      map.set(item.id, { ...item, updatedAt: localUpdatedAt });
    }
  });

  return Array.from(map.values());
};

const cloudSync = async () => {
  try {
    setSyncing(true);
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('No logged-in user');

    // 1️⃣ Download cloud accounts
    const accountsSnap = await getDocs(collection(db, 'users', uid, 'accounts'));
    const cloudAccounts = accountsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2️⃣ Get local accounts
    const localAccountsObj = JSON.parse(await AsyncStorage.getItem('all_accounts') || '{}');

    // Flatten local accounts but preserve original type
    const localAccounts = [];
    for (const type in localAccountsObj) {
      (localAccountsObj[type] || []).forEach(acc => {
        localAccounts.push({
          ...acc,
          type: acc.type || type,        // preserve type
          updatedAt: acc.updatedAt || Date.now()
        });
      });
    }

    console.log('Local Accounts:', localAccounts);

    // 3️⃣ Merge cloud + local safely
    const mergedAccounts = mergeByIdAndUpdatedAt(localAccounts, cloudAccounts);

    // 4️⃣ Regroup accounts by type for local storage
    const groupedAccounts = {};
    mergedAccounts.forEach(acc => {
      const key = acc.type || 'Unknown';
      if (!groupedAccounts[key]) groupedAccounts[key] = [];
      groupedAccounts[key].push(acc);
    });

    // 5️⃣ Save merged accounts to local storage
    await AsyncStorage.setItem('all_accounts', JSON.stringify(groupedAccounts));
    console.log('Merged Accounts saved locally:', groupedAccounts);

    // 6️⃣ Upload merged accounts to cloud
    const batch = writeBatch(db);
    mergedAccounts.forEach(acc => {
      const docRef = doc(db, 'users', uid, 'accounts', acc.id);
      batch.set(docRef, { ...acc, updatedAt: Date.now() }, { merge: true });
    });
    await batch.commit();

    setSyncing(false);
    Alert.alert('Cloud Sync', 'Accounts synced successfully!');
  } catch (error) {
    console.error('Cloud sync accounts error:', error);
    setSyncing(false);
    Alert.alert('Cloud Sync Error', error.message);
  }
};






  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 24 }}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cloud Sync</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {/* Sub-header */}
      <Text style={styles.subHeader}>Personal Budget Tracker</Text>

      <View style={styles.contentContainer}>
        <Text style={styles.infoText}>
          During cloud syncing, data currently saved in the cloud will be downloaded to your device. Then, the data in your device will be uploaded to the cloud.
        </Text>

        <TouchableOpacity
          style={styles.syncButton}
          onPress={cloudSync}
          disabled={syncing}
        >
          <Text style={styles.syncButtonText}>Start Syncing</Text>
        </TouchableOpacity>
      </View>

      {/* Full-screen overlay banner */}
      {syncing && (
        <View style={styles.fullScreenBanner}>
          <LottieView
            source={require('../../assets/svg/SyncData.json')} // your Lottie JSON file
            autoPlay
            loop
            style={{ width: 150, height: 150 }}
          />
          <Text style={styles.fullScreenBannerText}>Syncing... Please wait</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  headerBackground: {
    height: 100,
    width: '100%',
    backgroundColor: '#145C84',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#A4C0CF' },

  subHeader: {
    fontWeight: 'bold',
    color: '#6FB5DB',
    fontSize: 14,
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#EDEDEE',
    marginBottom: 20,
  },
  contentContainer: { flex: 1, paddingHorizontal: 30 },
  infoText: { fontSize: 14, color: '#19445C', textAlign: 'center', marginBottom: 30 },
  syncButton: {
    backgroundColor: '#145C84',
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  syncButtonText: { color: '#F7F2B3', fontSize: 16, fontWeight: '600' },

  fullScreenBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#145C84',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  fullScreenBannerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
  },
});
