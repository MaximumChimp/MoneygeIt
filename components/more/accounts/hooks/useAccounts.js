import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { db } from '../../../../config/firebase-config';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

/**
 * Hook for managing accounts (personal & shared) with offline + online sync.
 * 
 * @param {string} trackerId - Tracker ID (e.g., "personal" or shared tracker)
 * @param {string} userId - Logged-in user ID
 * @param {boolean} isShared - Whether tracker is shared
 */
export function useAccounts(trackerId, userId, isShared = false) {
  const safeTrackerId = trackerId || 'personal';
  const safeUserId = userId || 'localUser';

  const [accounts, setAccounts] = useState({ Cash: [], Banks: [], 'E-Wallets': [] });
  const [isOnline, setIsOnline] = useState(true);

  /** ---------------- Network listener ---------------- */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      if (state.isConnected && safeUserId !== 'localUser') {
        processOfflineQueue();
      }
    });
    return () => unsubscribe();
  }, [safeUserId]);

  /** ---------------- Load accounts from localStorage + Firestore ---------------- */
  const loadAccounts = useCallback(async () => {
    try {
      const key = isShared && safeUserId !== 'localUser'
        ? `all_accounts_${safeUserId}_${safeTrackerId}`
        : `accounts_${safeTrackerId}`;

      const json = await AsyncStorage.getItem(key);
      const localData = json ? JSON.parse(json) : { Cash: [], Banks: [], 'E-Wallets': [] };
      setAccounts(localData);

      // Subscribe to Firestore updates if shared
      if (isShared && safeUserId !== 'localUser' && safeTrackerId !== 'personal') {
        const ref = doc(db, 'sharedTrackers', safeTrackerId);
        const unsubscribe = onSnapshot(ref, snap => {
          if (!snap.exists()) return;
          const remoteData = snap.data();
          const merged = { ...localData };
          ['Cash', 'Banks', 'E-Wallets'].forEach(type => {
            if (Array.isArray(remoteData[type])) merged[type] = remoteData[type];
          });
          setAccounts(merged);
        });
        return () => unsubscribe();
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  }, [safeTrackerId, safeUserId, isShared]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  /** ---------------- Queue offline changes ---------------- */
  const queueOfflineChange = async (type, newAccounts) => {
    if (safeUserId === 'localUser') return;
    try {
      const offlineKey = `offline_${safeTrackerId}`;
      const json = await AsyncStorage.getItem(offlineKey);
      let queue = json ? JSON.parse(json) : [];
      // Replace or add entry for this type
      queue = queue.filter(q => q.type !== type);
      queue.push({ trackerId: safeTrackerId, type, accounts: newAccounts, userId: safeUserId, needsSync: true });
      await AsyncStorage.setItem(offlineKey, JSON.stringify(queue));
    } catch (err) {
      console.error('Failed to queue offline change:', err);
    }
  };

  /** ---------------- Process offline queue to Firestore ---------------- */
  const processOfflineQueue = async () => {
    if (safeUserId === 'localUser') return;
    try {
      const offlineKey = `offline_${safeTrackerId}`;
      const json = await AsyncStorage.getItem(offlineKey);
      if (!json) return;

      const queue = JSON.parse(json);
      for (const item of queue) {
        const ref = doc(db, 'sharedTrackers', item.trackerId);
        const snap = await getDoc(ref);
        const remoteData = snap.exists() ? snap.data() : {};
        remoteData[item.type] = item.accounts;
        remoteData.lastUpdatedBy = item.userId;
        await setDoc(ref, remoteData, { merge: true });
      }

      await AsyncStorage.removeItem(offlineKey);
    } catch (err) {
      console.error('Failed to process offline queue:', err);
    }
  };

  /** ---------------- Save accounts ---------------- */
  const saveAccounts = async (type, newAccounts) => {
    try {
      const updated = { ...accounts, [type]: newAccounts };
      setAccounts(updated);

      // Save locally
      const key = isShared && safeUserId !== 'localUser'
        ? `all_accounts_${safeUserId}_${safeTrackerId}`
        : `accounts_${safeTrackerId}`;
      await AsyncStorage.setItem(key, JSON.stringify(updated));

      // Sync / queue
      if (isShared && safeUserId !== 'localUser') {
        if (isOnline) {
          const ref = doc(db, 'sharedTrackers', safeTrackerId);
          const snap = await getDoc(ref);
          const remoteData = snap.exists() ? snap.data() : {};
          remoteData[type] = newAccounts;
          remoteData.lastUpdatedBy = safeUserId;
          await setDoc(ref, remoteData, { merge: true });
        } else {
          await queueOfflineChange(type, newAccounts);
        }
      }

      DeviceEventEmitter.emit('accountsUpdated', { trackerId: safeTrackerId, type });
    } catch (err) {
      console.error('Failed to save accounts:', err);
    }
  };

  /** ---------------- Delete single account ---------------- */
  const deleteAccount = async (type, accountId) => {
    const updated = accounts[type].filter(acc => acc.id !== accountId);
    await saveAccounts(type, updated);
  };


  return {
  accounts,
  isOnline,
  updateAccountType: saveAccounts, // <-- ensure hook always provides this
  saveAccounts, // optional: keep old name
  deleteAccount,
  loadAccounts,
};

}
