// utils/trackerStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

/**
 * Load accounts from local storage for personal or shared trackers
 */
export const loadAccounts = async ({ userId, trackerId, type, isShared }) => {
  try {
    const key = isShared ? `accounts_${trackerId}` : `personal_accounts_${userId}`;
    const json = await AsyncStorage.getItem(key);
    const data = json ? JSON.parse(json) : {};
    return data[type] || [];
  } catch (err) {
    console.error('Failed to load accounts', err);
    return [];
  }
};

/**
 * Save accounts locally and queue updates for shared trackers
 * Emits 'accountsUpdated' event for personal trackers for realtime offline updates
 */
export const saveAccounts = async ({ userId, trackerId, type, accounts, isShared }) => {
  try {
    // Ensure all accounts have unique IDs
    const normalizedAccounts = accounts.map(a => ({
      ...a,
      id: a.id || `${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
    }));

    // Save locally
    const key = isShared ? `accounts_${trackerId}` : `personal_accounts_${userId}`;
    const offlineJson = await AsyncStorage.getItem(key);
    const offlineData = offlineJson ? JSON.parse(offlineJson) : {};
    offlineData[type] = normalizedAccounts;
    await AsyncStorage.setItem(key, JSON.stringify(offlineData));

    // Emit event for personal tracker to update UI in real-time
    if (!isShared) {
      DeviceEventEmitter.emit('accountsUpdated');
    }

    // Queue shared tracker updates for background sync
    if (isShared) {
      const queueKey = `offline_accounts_queue_${trackerId}`;
      const queueJson = await AsyncStorage.getItem(queueKey);
      const queue = queueJson ? JSON.parse(queueJson) : [];

      const idx = queue.findIndex(q => q.type === type);
      if (idx >= 0) queue[idx] = { type, accounts: normalizedAccounts };
      else queue.push({ type, accounts: normalizedAccounts });

      await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
    }
  } catch (err) {
    console.error('Failed to save accounts', err);
  }
};
