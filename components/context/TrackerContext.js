import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase-config';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export const TrackerContext = createContext();

export const TrackerProvider = ({ children }) => {
  const [trackerId, setTrackerId] = useState('personal');
  const [trackerName, setTrackerName] = useState('Personal Budget Tracker');
  const [sharedTrackers, setSharedTrackers] = useState([]);
  const [guestTrackers, setGuestTrackers] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isGuest, setIsGuest] = useState(true);

  const mode = trackerId === 'personal' ? 'personal' : 'shared';

  /** ---------- Monitor Firebase auth ---------- */
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        setIsGuest(false);

        // Load saved tracker for logged-in user
        const storedId = await AsyncStorage.getItem(`selectedTrackerId_${user.uid}`);
        const storedName = await AsyncStorage.getItem(`selectedTrackerName_${user.uid}`);

        setTrackerId(storedId || 'personal');
        setTrackerName(storedName || 'Personal Budget Tracker');
      } else {
        setCurrentUserId(null);
        setIsGuest(true);

        // Automatically switch to guest tracker
        const storedGuestId = await AsyncStorage.getItem('guest_selectedTrackerId');
        const storedGuestName = await AsyncStorage.getItem('guest_selectedTrackerName');

        setTrackerId(storedGuestId || 'personal');
        setTrackerName(storedGuestName || 'Guest Tracker');
      }
    });

    return () => unsubscribe();
  }, []);

  /** ---------- Load guest/shared trackers on mount ---------- */
  useEffect(() => {
    (async () => {
      if (isGuest) {
        const storedGuestTrackers = await AsyncStorage.getItem('guest_trackers');
        setGuestTrackers(storedGuestTrackers ? JSON.parse(storedGuestTrackers) : []);
      } else if (currentUserId) {
        const storedSharedTrackers = await AsyncStorage.getItem('sharedTrackers');
        setSharedTrackers(storedSharedTrackers ? JSON.parse(storedSharedTrackers) : []);
      }
    })();
  }, [currentUserId, isGuest]);

  /** ---------- Network listener & auto-sync ---------- */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async state => {
      setIsOnline(state.isConnected);

      if (state.isConnected && !isGuest) {
        await syncOfflineQueue();
        await syncPendingTrackers();
        await syncPendingAccountsForAll();
      }
    });
    return () => unsubscribe();
  }, [trackerId, currentUserId, isGuest]);

  /** ---------- Update selected tracker ---------- */
  const updateTracker = async (newId, newName) => {
    setTrackerId(newId);
    setTrackerName(newName);

    if (isGuest) {
      await AsyncStorage.setItem('guest_selectedTrackerId', newId);
      await AsyncStorage.setItem('guest_selectedTrackerName', newName);
    } else if (currentUserId) {
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
          queue.push({ trackerId: newId, trackerName: newName });
          await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
        }
      } else if (newId !== 'personal') {
        queue.push({ trackerId: newId, trackerName: newName });
        await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
      }
    }
  };

  /** ---------- Add a guest tracker ---------- */
  const addGuestTracker = async tracker => {
    const updated = [...guestTrackers, tracker];
    setGuestTrackers(updated);
    await AsyncStorage.setItem('guest_trackers', JSON.stringify(updated));
  };

  /** ---------- Sync offline tracker queue ---------- */
  const syncOfflineQueue = async () => {
    if (!currentUserId) return;
    const queueKey = `offline_tracker_queue_${currentUserId}`;
    const queueJson = await AsyncStorage.getItem(queueKey);
    const queue = queueJson ? JSON.parse(queueJson) : [];
    if (!queue.length) return;

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

  /** ---------- Sync pending trackers ---------- */
  const syncPendingTrackers = async () => {
    if (isGuest) return;
    try {
      const storedData = await AsyncStorage.getItem('sharedTrackers');
      const trackers = storedData ? JSON.parse(storedData) : [];
      const pending = trackers.filter(t => t.pendingSync);
      if (!pending.length) return;

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

  /** ---------- Sync pending accounts for all shared trackers ---------- */
  const syncPendingAccountsForAll = async () => {
    if (isGuest) return;
    try {
      const storedData = await AsyncStorage.getItem('sharedTrackers');
      const trackers = storedData ? JSON.parse(storedData) : [];
      for (const tracker of trackers) {
        const queueKey = `offline_accounts_queue_${tracker.id}`;
        const queueJson = await AsyncStorage.getItem(queueKey);
        const queue = queueJson ? JSON.parse(queueJson) : [];
        if (!queue.length) continue;

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
        guestTrackers,
        addGuestTracker,
        isOnline,
        syncPendingTrackers,
        syncPendingAccountsForAll,
        userId: currentUserId,
        isGuest,
        mode,
      }}
    >
      {children}
    </TrackerContext.Provider>
  );
};
