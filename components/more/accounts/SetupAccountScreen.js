import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { TrackerContext } from '../../context/TrackerContext';

export default function SetupAccountScreen({ navigation, route }) {
  const { account, type } = route?.params || {};
  const { trackerId, trackerName, isOnline, syncPendingAccounts } = useContext(TrackerContext);

  const passedName = account?.name || '';
  const [selectedType, setSelectedType] = useState(type || 'Cash');
  const [name, setName] = useState(passedName);
  const [amount, setAmount] = useState(account?.amount?.toString() || '');
  const [currencySymbol, setCurrencySymbol] = useState('₱');
  const types = ['Cash', 'Banks', 'E-Wallets'];

  const accountId = account?.id || `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  useEffect(() => {
    const fetchCurrencySymbol = async () => {
      try {
        const savedCurrency = await AsyncStorage.getItem('selectedCurrency');
        if (savedCurrency) {
          const parsed = JSON.parse(savedCurrency);
          setCurrencySymbol(parsed.symbol);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCurrencySymbol();

    const unsubscribe = NetInfo.addEventListener(state => {
      // Optional: can also trigger a re-sync if needed
    });
    return () => unsubscribe();
  }, []);

  /** ---------- Save account ---------- */
  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Validation', 'Please enter an account name.');
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return Alert.alert('Validation', 'Please enter a valid amount.');

    const trimmedName = name.trim();
    const accountData = {
      id: accountId,
      name: trimmedName,
      amount: parsedAmount,
      createdAt: account?.createdAt || new Date(),
    };

    try {
      // ---------- AsyncStorage ----------
      const accountsKey = `accounts_${trackerId}`;
      const accountsJson = await AsyncStorage.getItem(accountsKey);
      const accountsByType = accountsJson
        ? JSON.parse(accountsJson)
        : { Cash: [], Banks: [], 'E-Wallets': [] };

      // Remove old account from all types
      Object.keys(accountsByType).forEach(typeKey => {
        accountsByType[typeKey] = (accountsByType[typeKey] || []).filter(acc => acc.id !== accountId);
      });

      // Add to selected type
      accountsByType[selectedType] = [...(accountsByType[selectedType] || []), accountData];
      await AsyncStorage.setItem(accountsKey, JSON.stringify(accountsByType));

      // ---------- Offline queue for shared trackers ----------
      if (trackerId !== 'personal') {
        const queueKey = `offline_accounts_queue_${trackerId}`;
        const queueJson = await AsyncStorage.getItem(queueKey);
        const queue = queueJson ? JSON.parse(queueJson) : [];

        // Remove old queued account if exists
        const filteredQueue = queue.filter(q => q.account.id !== accountId);
        filteredQueue.push({ type: selectedType, account: accountData });
        await AsyncStorage.setItem(queueKey, JSON.stringify(filteredQueue));

        // Attempt immediate sync if online
        if (isOnline) await syncPendingAccounts();
      }

      Alert.alert('Success', 'Account saved!');
      navigation.goBack();
    } catch (err) {
      console.error('Error saving account:', err);
      Alert.alert('Error', 'Failed to save the account.');
    }
  };

  /** ---------- Delete account ---------- */
  const handleDelete = async () => {
    if (!account?.id) return;

    Alert.alert('Delete Account', 'Are you sure you want to delete this account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const accountsKey = `accounts_${trackerId}`;
            const accountsJson = await AsyncStorage.getItem(accountsKey);
            const accountsByType = accountsJson
              ? JSON.parse(accountsJson)
              : { Cash: [], Banks: [], 'E-Wallets': [] };

            Object.keys(accountsByType).forEach(typeKey => {
              accountsByType[typeKey] = (accountsByType[typeKey] || []).filter(acc => acc.id !== account.id);
            });

            await AsyncStorage.setItem(accountsKey, JSON.stringify(accountsByType));

            if (trackerId !== 'personal') {
              const queueKey = `offline_accounts_queue_${trackerId}`;
              const queueJson = await AsyncStorage.getItem(queueKey);
              const queue = queueJson ? JSON.parse(queueJson) : [];
              const filteredQueue = queue.filter(q => q.account.id !== account.id);
              await AsyncStorage.setItem(queueKey, JSON.stringify(filteredQueue));

              if (isOnline) await syncPendingAccounts();
            }

            Alert.alert('Deleted', 'Account deleted successfully.');
            navigation.goBack();
          } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to delete account.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Set up {selectedType}</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <Text style={styles.trackertype}>{trackerName}</Text>

      <View style={styles.content}>
        <Text style={styles.groupLabel}>Group</Text>
        <View style={styles.tabContainer}>
          {types.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, selectedType === t && styles.selectedTab]}
              onPress={() => setSelectedType(t)}
            >
              <Text style={[styles.tabText, selectedType === t && styles.selectedTabText]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Enter account name" style={styles.bottomInput} />

        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountInputWrapper}>
          <Text style={styles.currencyIcon}>{currencySymbol}</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
            style={styles.amountInput}
          />
        </View>

        <View style={styles.buttonsRow}>
          {account?.id && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color="#145C84" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerBackground: { height: 100, width: '100%', backgroundColor: '#145C84', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 12 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#A4C0CF' },
  trackertype: { fontWeight: 'bold', color: '#6FB5DB', fontSize: 14, textAlign: 'center', padding: 10, backgroundColor: '#EDEDEE', marginBottom: 15 },
  content: { paddingHorizontal: 16 },
  groupLabel: { fontSize: 14, fontWeight: 'bold', color: '#386681', marginBottom: 8 },
  tabContainer: { flexDirection: 'row', marginBottom: 20 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4, backgroundColor: '#eee', marginRight: 10 },
  selectedTab: { backgroundColor: '#89C3E6' },
  tabText: { fontSize: 14, color: '#333' },
  selectedTabText: { color: '#EBF8FF', fontWeight: 'bold' },
  label: { fontSize: 14, color: '#386681', marginBottom: 6, fontWeight: 'bold' },
  bottomInput: { borderBottomWidth: 1, borderBottomColor: '#ccc', paddingVertical: 8, marginBottom: 20 },
  amountInputWrapper: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ccc', marginBottom: 20 },
  currencyIcon: { fontSize: 16, marginRight: 6, color: '#333' },
  amountInput: { flex: 1, paddingVertical: 8 },
  buttonsRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  deleteButton: { backgroundColor: '#A4C0CF', padding: 10, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12, width: 48, height: 48, flexShrink: 0 },
  saveButton: { flex: 1, backgroundColor: '#145C84', paddingVertical: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  saveText: { color: '#F7F2B3', fontWeight: '600', fontSize: 16 },
});
