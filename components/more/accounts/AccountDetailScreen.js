import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrackerContext } from '../../context/TrackerContext';
import { loadAccounts } from '../accounts/utils/trackerStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../../config/firebase-config';
import { doc, onSnapshot } from 'firebase/firestore';

export default function AccountDetailScreen({ navigation }) {
  const accountTypes = ['Cash', 'Banks', 'E-Wallets'];
  const { trackerId, trackerName, isOnline, syncPendingAccounts, updateTracker } =
    useContext(TrackerContext);
  const isShared = trackerId !== 'personal';

  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [accounts, setAccounts] = useState({});
  const [currentTrackerName, setCurrentTrackerName] = useState(trackerName);
  const [loading, setLoading] = useState(true);
  const sharedUnsubRef = useRef(null);

  /** ---------- Load userId & email ---------- */
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const savedUserId = await AsyncStorage.getItem('userId');
        const savedEmail = await AsyncStorage.getItem('userEmail');
        setUserId(savedUserId);
        setUserEmail(savedEmail);
      } catch (err) {
        console.error('Failed to load user data:', err);
      }
    };
    loadUserData();
  }, []);

  /** ---------- Merge helper ---------- */
  const mergeAccounts = (lists) => {
    const map = new Map();
    lists.flat().forEach((acc) => map.set(acc.id, acc));
    return Array.from(map.values());
  };

  /** ---------- Unified refresh & pending sync ---------- */
  const refreshAccounts = async () => {
    if (!trackerId || !userId) return;
    setLoading(true);

    try {
      const updatedAccounts = {};

      for (const type of accountTypes) {
        let tasks = [];

        if (trackerId === 'personal') {
          // Load personal accounts
          tasks.push(loadAccounts({ userId, trackerId, type, isShared: false }));
          // Pending personal edits
          tasks.push(
            AsyncStorage.getItem(`pendingAccounts_${type}_${trackerId}`).then((raw) =>
              raw ? JSON.parse(raw) : []
            )
          );
        } else {
          // Shared tracker: load cached shared accounts only
          tasks.push(
            AsyncStorage.getItem(`sharedTracker_${trackerId}`).then((raw) => {
              const cached = raw ? JSON.parse(raw) : {};
              return cached[type] || [];
            })
          );
        }

        const results = await Promise.all(tasks);
        updatedAccounts[type] = mergeAccounts(results);

        // Remove pending if online (only for personal)
        if (trackerId === 'personal' && isOnline) {
          await AsyncStorage.removeItem(`pendingAccounts_${type}_${trackerId}`);
        }
      }

      setAccounts(updatedAccounts);

      // Save shared tracker locally and sync pending shared updates
      if (isShared && isOnline) {
        await AsyncStorage.setItem(
          `sharedTracker_${trackerId}`,
          JSON.stringify(updatedAccounts)
        );

        if (typeof syncPendingAccounts === 'function') await syncPendingAccounts();
      }
    } catch (err) {
      console.error('Failed to refresh accounts:', err);
      setAccounts({});
    } finally {
      setLoading(false);
    }
  };

  /** ---------- Real-time listener for shared tracker ---------- */
  useEffect(() => {
    if (!isShared || !trackerId || !isOnline || !userEmail || !userId) return;

    const trackerRef = doc(db, 'sharedTrackers', trackerId);
    if (sharedUnsubRef.current) sharedUnsubRef.current();

    sharedUnsubRef.current = onSnapshot(trackerRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data();
      const allowed = data.people?.includes(userEmail) || data.ownerId === userId;
      if (!allowed) {
        setAccounts({});
        return;
      }

      // Update tracker name dynamically
      if (data.name && data.name !== currentTrackerName) {
        setCurrentTrackerName(data.name);
        updateTracker(trackerId, data.name);
      }

      // Shared accounts only
      const updatedAccounts = {};
      accountTypes.forEach((type) => {
        updatedAccounts[type] = data[type] || [];
      });

      setAccounts(updatedAccounts);
      AsyncStorage.setItem(`sharedTracker_${trackerId}`, JSON.stringify(updatedAccounts));
    });

    return () => sharedUnsubRef.current && sharedUnsubRef.current();
  }, [trackerId, userId, userEmail, isOnline, isShared, currentTrackerName]);

  /** ---------- Offline updates listener ---------- */
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('accountsUpdated', refreshAccounts);
    return () => subscription.remove();
  }, [userId, trackerId]);

  /** ---------- Initial load ---------- */
  useEffect(() => {
    refreshAccounts();
  }, [trackerId, userId, userEmail, isOnline]);

  /** ---------- Navigation ---------- */
  const handleEditAccount = (type) => navigation.navigate('EditAccountScreen', { type });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Accounts</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {currentTrackerName && <Text style={styles.trackertype}>{currentTrackerName}</Text>}

      <ScrollView contentContainerStyle={styles.content}>
        {accountTypes.map((type) => (
          <View key={type} style={styles.typeSection}>
            <View style={styles.typeRow}>
              <Text style={styles.typeText}>{type}</Text>
              <TouchableOpacity onPress={() => handleEditAccount(type)}>
                <Ionicons name="create-outline" size={20} color="#145C84" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <>
                <View style={styles.skeletonItem} />
                <View style={styles.skeletonItem} />
              </>
            ) : (accounts[type] || []).length === 0 ? (
              <Text style={styles.fallbackText}>No accounts yet.</Text>
            ) : (
              accounts[type].map((acc) => (
                <View key={acc.id} style={styles.accountItem}>
                  <Text style={styles.accountText}>{acc.name}</Text>
                </View>
              ))
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerBackground: {
    height: 100,
    backgroundColor: '#145C84',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#A4C0CF' },
  trackertype: {
    fontWeight: 'bold',
    color: '#6FB5DB',
    fontSize: 14,
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#EDEDEE',
    marginBottom: 15,
  },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  typeSection: { marginBottom: 16, width: '100%' },
  typeRow: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeText: { fontSize: 14, color: '#19445C', fontWeight: 'bold' },
  fallbackText: { fontSize: 13, color: '#999', marginTop: 8, marginLeft: 16 },
  accountItem: { marginTop: 8, marginLeft: 16, paddingVertical: 6, borderRadius: 6 },
  accountText: { fontSize: 14, color: '#386681' },
  skeletonItem: { height: 20, backgroundColor: '#E0E0E0', marginHorizontal: 16, marginVertical: 6, borderRadius: 4 },
});
