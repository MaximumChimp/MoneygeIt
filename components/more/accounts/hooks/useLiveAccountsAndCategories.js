// hooks/useLiveAccountsAndCategories.js
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../../../config/firebase-config';

const categoriesByType = {
  Expense: 'expense_categories',
  Income: 'income_categories',
};

export default function useLiveAccountsAndCategories({
  trackerId,
  userId,
  mode,
  isGuest,
  transactionType,
  accountTypes,
}) {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let unsubscribers = [];

    const fetchData = async () => {
      try {
        const allAccounts = [];

        // ---------- Guest/local accounts ----------
        for (const type of accountTypes) {
          const key = `guest_${trackerId}_${type}`;
          const json = await AsyncStorage.getItem(key);
          const accountsOfType = json ? JSON.parse(json) : [];
          allAccounts.push(...accountsOfType.map(acc => ({ ...acc, type })));
        }

        // ---------- Firestore accounts ----------
        if (!isGuest && userId) {
          const pathBase =
            mode === 'personal'
              ? ['users', userId, 'trackers', trackerId]
              : ['sharedTrackers', trackerId];

          accountTypes.forEach(type => {
            const ref = collection(db, ...pathBase, type);
            const unsub = onSnapshot(ref, async snap => {
              let liveAccounts = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                type,
              }));

              // Merge queued offline actions
              const queueKey = `offlineQueue_${trackerId}_${type}`;
              const queueJson = await AsyncStorage.getItem(queueKey);
              const queue = queueJson ? JSON.parse(queueJson) : [];

              queue.forEach(item => {
                if (item.action === 'add') liveAccounts.push(item.payload);
                if (item.action === 'update') {
                  const idx = liveAccounts.findIndex(a => a.id === item.payload.id);
                  if (idx !== -1)
                    liveAccounts[idx] = { ...liveAccounts[idx], ...item.payload };
                }
                if (item.action === 'delete') {
                  liveAccounts = liveAccounts.filter(
                    a => a.id !== item.payload.id
                  );
                }
              });

              setAccounts(prev => {
                // merge guest + live
                const filteredGuest = allAccounts.filter(acc => acc.type !== type);
                return [...filteredGuest, ...liveAccounts];
              });
            });

            unsubscribers.push(unsub);
          });
        } else {
          setAccounts(allAccounts);
        }

        // ---------- Categories ----------
        if (transactionType !== 'Transfer') {
          const catRaw = await AsyncStorage.getItem('all_categories');
          const parsedCategories = catRaw ? JSON.parse(catRaw) : {};
          const filtered = parsedCategories[transactionType] || [];
          setCategories(filtered);
        } else {
          setCategories([]);
        }
      } catch (err) {
        console.error('useLiveAccountsAndCategories error:', err);
      }
    };

    fetchData();

    return () => {
      unsubscribers.forEach(unsub => unsub && unsub());
    };
  }, [trackerId, userId, mode, transactionType, isGuest]);

  return { accounts, categories };
}
