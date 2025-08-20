// TrackerContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase-config';
import { getAuth } from 'firebase/auth';

export const TrackerContext = createContext();

export const TrackerProvider = ({ children }) => {
  const [trackerId, setTrackerId] = useState('personal');
  const [trackerName, setTrackerName] = useState('Personal Budget Tracker');
  const [sharedTrackers, setSharedTrackers] = useState([]);
  const [isOnline, setIsOnline] = useState(true);

  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;

  /** ---------- Load saved tracker & shared trackers ---------- */
  useEffect(() => {
    (async () => {
      if (!currentUserId) return;

      const storedId = await AsyncStorage.getItem(`selectedTrackerId_${currentUserId}`);
      const storedName = await AsyncStorage.getItem(`selectedTrackerName_${currentUserId}`);
      if (storedId) setTrackerId(storedId);
      if (storedName) setTrackerName(storedName);

      const storedTrackers = await AsyncStorage.getItem('sharedTrackers');
      setSharedTrackers(storedTrackers ? JSON.parse(storedTrackers) : []);
    })();
  }, [currentUserId]);

  /** ---------- Network listener & auto-sync ---------- */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async state => {
      const connected = state.isConnected;
      setIsOnline(connected);

      if (connected) {
        await syncOfflineQueue();
        await syncPendingTrackers();
        await syncPendingAccountsForAll();
      }
    });
    return () => unsubscribe();
  }, [trackerId, currentUserId]);

  /** ---------- Update selected tracker ---------- */
  const updateTracker = async (newId, newName) => {
    setTrackerId(newId);
    setTrackerName(newName);

    if (!currentUserId) return;

    await AsyncStorage.setItem(`selectedTrackerId_${currentUserId}`, newId);
    await AsyncStorage.setItem(`selectedTrackerName_${currentUserId}`, newName);

    const queueKey = `offline_tracker_queue_${currentUserId}`;
    const queueJson = await AsyncStorage.getItem(queueKey);
    const queue = queueJson ? JSON.parse(queueJson) : [];

    if (isOnline && newId !== 'personal') {
      try {
        const userRef = doc(db, 'users', currentUserId);
        await setDoc(
          userRef,
          { selectedTracker: { trackerId: newId, trackerName: newName } },
          { merge: true }
        );
      } catch (err) {
        console.error('⚠️ Failed online, queueing', err);
        queue.push({ trackerId: newId, trackerName: newName });
        await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
      }
    } else if (newId !== 'personal') {
      queue.push({ trackerId: newId, trackerName: newName });
      await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
    }
  };

  /** ---------- Sync offline tracker queue ---------- */
  const syncOfflineQueue = async () => {
    if (!currentUserId) return;
    const queueKey = `offline_tracker_queue_${currentUserId}`;
    const queueJson = await AsyncStorage.getItem(queueKey);
    const queue = queueJson ? JSON.parse(queueJson) : [];

    if (queue.length === 0) return;

    try {
      const userRef = doc(db, 'users', currentUserId);
      for (const item of queue) {
        await setDoc(
          userRef,
          { selectedTracker: { trackerId: item.trackerId, trackerName: item.trackerName } },
          { merge: true }
        );
      }
      await AsyncStorage.removeItem(queueKey);
    } catch (err) {
      console.error('⚠️ Failed to sync offline queue', err);
    }
  };

  /** ---------- Sync all pending shared trackers ---------- */
  const syncPendingTrackers = async () => {
    try {
      const storedData = await AsyncStorage.getItem('sharedTrackers');
      const trackers = storedData ? JSON.parse(storedData) : [];
      const pending = trackers.filter(t => t.pendingSync);

      if (pending.length === 0) return;

      for (const tracker of pending) {
        try {
          const docRef = doc(db, 'sharedTrackers', tracker.id);
          await setDoc(docRef, {
            name: tracker.name,
            people: tracker.people,
            ownerId: tracker.ownerId,
            lastUpdated: tracker.lastUpdated || Date.now(),
          });
          tracker.pendingSync = false;
        } catch (err) {
          console.error('Failed to sync tracker', tracker.name, err);
        }
      }

      await AsyncStorage.setItem('sharedTrackers', JSON.stringify(trackers));
      setSharedTrackers(trackers);
    } catch (err) {
      console.error('⚠️ Failed to sync pending trackers', err);
    }
  };

  /** ---------- Sync all pending accounts for all shared trackers ---------- */
  const syncPendingAccountsForAll = async () => {
    try {
      const storedData = await AsyncStorage.getItem('sharedTrackers');
      const trackers = storedData ? JSON.parse(storedData) : [];
      for (const tracker of trackers) {
        const queueKey = `offline_accounts_queue_${tracker.id}`;
        const queueJson = await AsyncStorage.getItem(queueKey);
        const queue = queueJson ? JSON.parse(queueJson) : [];

        if (queue.length === 0) continue;

        const trackerRef = doc(db, 'sharedTrackers', tracker.id);
        const snap = await getDoc(trackerRef);
        const existingData = snap.exists() ? snap.data() : {};
        const mergedAccounts = { ...existingData.accounts };

        ['Cash', 'Banks', 'E-Wallets'].forEach(type => {
          if (!Array.isArray(mergedAccounts[type])) mergedAccounts[type] = [];
        });

        for (const q of queue) {
          mergedAccounts[q.type] = q.accounts || [q.account];
        }

        await setDoc(trackerRef, { accounts: mergedAccounts }, { merge: true });
        await AsyncStorage.removeItem(queueKey);
      }
    } catch (err) {
      console.error('⚠️ Failed to sync pending accounts', err);
    }
  };

  return (
    <TrackerContext.Provider
      value={{
        trackerId,
        trackerName,
        updateTracker,
        sharedTrackers,
        setSharedTrackers,
        isOnline,
        syncPendingTrackers,
        syncPendingAccountsForAll,
      }}
    >
      {children}
    </TrackerContext.Provider>
  );
};
