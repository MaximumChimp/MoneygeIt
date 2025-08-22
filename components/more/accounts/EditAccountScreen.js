import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrackerContext } from '../../context/TrackerContext';
import { db } from '../../../config/firebase-config';
import { collection, doc, setDoc, getDocs,deleteDoc } from 'firebase/firestore';
import { DeviceEventEmitter } from 'react-native';
export default function EditAccountScreen({ navigation, route }) {
  const { type } = route.params;
  const { trackerId, trackerName, userId } = useContext(TrackerContext);

  const [accounts, setAccounts] = useState([]);
  const isShared = trackerId !== 'personal';
  const isGuest = !userId && !isShared;

  /** ---------- Load accounts ---------- */
  useEffect(() => {
    const loadAccounts = async () => {
      if (isGuest) {
        // Guest account from AsyncStorage
        const key = `guest_${trackerId}_${type}`;
        const raw = await AsyncStorage.getItem(key);
        setAccounts(raw ? JSON.parse(raw) : []);
      } else if (userId || isShared) {
        // Fetch from Firestore
        const path = isShared
          ? collection(db, 'sharedTrackers', trackerId, type)
          : collection(db, 'users', userId, 'trackers', trackerId, type);

        const snapshot = await getDocs(path);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAccounts(fetched);
      }
    };

    loadAccounts();
  }, [trackerId, type, userId, isShared, isGuest]);

  /** ---------- Add new account ---------- */
  const handleAddField = () => {
    setAccounts(prev => [
      ...prev,
      { id: `temp_${Date.now()}`, name: '', amount: 0 },
    ]);
  };

  /** ---------- Update account ---------- */
  const handleChange = (field, value, index) => {
    setAccounts(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  /** ---------- Delete account ---------- */
const handleDelete = async (index) => {
  const accountToDelete = accounts[index];

  try {
    if (isGuest) {
      // Remove from AsyncStorage
      const key = `guest_${trackerId}_${type}`;
      const raw = await AsyncStorage.getItem(key);
      let guestAccounts = raw ? JSON.parse(raw) : [];
      guestAccounts = guestAccounts.filter(a => a.id !== accountToDelete.id);
      await AsyncStorage.setItem(key, JSON.stringify(guestAccounts));

      // Emit update for other screens
      DeviceEventEmitter.emit('guestAccountsUpdated', {
        type,
        updatedAccounts: guestAccounts,
      });

      // Remove from local state
      setAccounts(prev => prev.filter((_, i) => i !== index));

    } else {
      // Remove from Firestore
      const collectionPath = isShared
        ? ['sharedTrackers', trackerId, type]
        : ['users', userId, 'trackers', trackerId, type];

      const docRef = doc(db, ...collectionPath, accountToDelete.id);
      await deleteDoc(docRef);

      // Remove from local state
      setAccounts(prev => prev.filter((_, i) => i !== index));
    }

  } catch (err) {
    console.error('Failed to delete account:', err);
    Alert.alert('Error', 'Could not delete account.');
  }
};

  /** ---------- Save accounts ---------- */
const handleSave = async () => {
  const validAccounts = accounts.filter(a => a.name?.trim());

  if (validAccounts.length === 0) {
    return Alert.alert('Validation Error', 'Please add at least one account.');
  }

  try {
    if (isGuest) {
      const key = `guest_${trackerId}_${type}`;
      await AsyncStorage.setItem(key, JSON.stringify(validAccounts));

      // Emit event so other screens update automatically
      DeviceEventEmitter.emit('guestAccountsUpdated', {
        type,
        updatedAccounts: validAccounts,
      });
    } else {
      const collectionPath = isShared
        ? ['sharedTrackers', trackerId, type]
        : ['users', userId, 'trackers', trackerId, type];

      for (const account of validAccounts) {
        const accountRef = doc(db, ...collectionPath, account.id || `${Date.now()}`);
        await setDoc(accountRef, {
          name: account.name.trim(),
          amount: account.amount ?? 0,
        });
      }
    }

    navigation.goBack();
  } catch (err) {
    console.error('Failed to save accounts:', err);
    Alert.alert('Error', 'Failed to save accounts.');
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit {type} Account</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {trackerName && <Text style={styles.trackertype}>{trackerName}</Text>}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
<ScrollView contentContainerStyle={styles.content}>
  {accounts.length === 0 ? (
    <View style={styles.fallbackContainer}>
      <Text style={styles.fallbackText}>
        No accounts created yet. Tap "Add Account" to get started.
      </Text>
    </View>
  ) : (
    accounts.map((item, idx) => (
      <View key={item.id} style={styles.accountRow}>
        <TextInput
          style={styles.input}
          value={item.name}
          placeholder="Account name"
          onChangeText={text => handleChange('name', text, idx)}
        />
        <TouchableOpacity onPress={() => handleDelete(idx)} style={styles.deleteIcon}>
          <Ionicons name="trash-outline" size={20} color="#145C84" />
        </TouchableOpacity>
      </View>
    ))
  )}

  <TouchableOpacity onPress={handleAddField} style={styles.addButton}>
    <Ionicons name="add-circle-outline" size={20} color="#145C84" />
    <Text style={styles.addButtonText}>Add Account</Text>
  </TouchableOpacity>
</ScrollView>


        <View style={styles.fixedSaveContainer}>
          <TouchableOpacity
            onPress={handleSave}
            style={[
              styles.saveButton,
              accounts.every(a => !a.name?.trim()) && { backgroundColor: '#EDEDEE' },
            ]}
            disabled={accounts.every(a => !a.name?.trim())}
          >
            <Text style={styles.saveButtonText}>Save Account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  content: { padding: 16, paddingBottom: 32 },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  input: { flex: 1, fontSize: 14.5, paddingVertical: 8, paddingHorizontal: 10 },
  deleteIcon: { marginLeft: 12, justifyContent: 'center', alignItems: 'center', padding: 6 },
  addButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  addButtonText: { marginLeft: 6, color: '#145C84', fontSize: 14 },
  fixedSaveContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  saveButton: { backgroundColor: '#145C84', padding: 16, width: '100%', borderRadius: 8 },
  saveButtonText: { color: '#F7F2B3', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  fallbackContainer: {
  padding: 20,
  paddingTop:4,
  justifyContent: 'center',
  alignItems: 'center',
},
fallbackText: {
  fontSize: 14,
  color: '#999',
  textAlign: 'center',
},

});
