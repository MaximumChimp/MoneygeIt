import React, { useEffect, useState, useContext, useRef } from 'react';
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
import { loadAccounts, saveAccounts } from '../../more/accounts/utils/trackerStorage';
import { db } from '../../../config/firebase-config';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export default function EditAccountScreen({ navigation, route }) {
  const { type } = route.params;
  const { trackerId, trackerName } = useContext(TrackerContext);
  const isShared = trackerId !== 'personal';

  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const debounceRefs = useRef({});

  /** ---------- Load userId & email ---------- */
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const savedId = await AsyncStorage.getItem('userId');
        const savedEmail = await AsyncStorage.getItem('userEmail'); // ensure email saved locally
        setUserId(savedId);
        setUserEmail(savedEmail);
      } catch (err) {
        console.error('Failed to load user data:', err);
      }
    };
    loadUserData();
  }, []);

  /** ---------- Load accounts ---------- */
  useEffect(() => {
    let unsubscribeShared = null;

    const fetchAccounts = async () => {
      if (isShared) {
        const trackerRef = doc(db, 'sharedTrackers', trackerId);
        unsubscribeShared = onSnapshot(trackerRef, snapshot => {
          if (!snapshot.exists()) return;

          const data = snapshot.data();
          // Only allow access if user is in people array or is owner
          const allowed = data.people?.includes(userEmail) || data.ownerId === userId;
          if (!allowed) return setAccounts([]);

          const sharedAccounts = data[type] || [];
          setAccounts(sharedAccounts);
        });
      } else if (userId) {
        const data = await loadAccounts({ userId, trackerId, type, isShared });
        setAccounts(data);
      }
    };

    fetchAccounts();

    return () => {
      if (unsubscribeShared) unsubscribeShared();
    };
  }, [trackerId, type, isShared, userId, userEmail]);

  /** ---------- Handlers ---------- */
  const handleAddField = async () => {
    const newAccount = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      name: '',
      amount: 0,
    };

    if (isShared) {
      try {
        const trackerRef = doc(db, 'sharedTrackers', trackerId);
        const trackerSnap = await getDoc(trackerRef);
        const data = trackerSnap.data();
        const updatedArray = [...(data[type] || []), newAccount];
        await setDoc(trackerRef, { [type]: updatedArray }, { merge: true });
      } catch (err) {
        console.error('Failed to add shared account:', err);
        return Alert.alert('Error', 'Failed to add shared account.');
      }
    }

    setAccounts(prev => [...prev, newAccount]);
  };

  const handleChange = (text, index) => {
    setAccounts(prev => {
      const updated = [...prev];
      updated[index].name = text;
      return updated;
    });

    if (isShared) {
      const account = accounts[index];
      if (debounceRefs.current[account.id]) clearTimeout(debounceRefs.current[account.id]);
      debounceRefs.current[account.id] = setTimeout(async () => {
        try {
          const trackerRef = doc(db, 'sharedTrackers', trackerId);
          const trackerSnap = await getDoc(trackerRef);
          const data = trackerSnap.data();
          const updatedArray = (data[type] || []).map(a =>
            a.id === account.id ? { ...a, name: text } : a
          );
          await setDoc(trackerRef, { [type]: updatedArray }, { merge: true });
        } catch (err) {
          console.error('Failed to update shared account:', err);
        }
      }, 500);
    }
  };

  const handleDelete = async index => {
    const account = accounts[index];

    if (isShared) {
      try {
        const trackerRef = doc(db, 'sharedTrackers', trackerId);
        const trackerSnap = await getDoc(trackerRef);
        const data = trackerSnap.data();
        const updatedArray = (data[type] || []).filter(a => a.id !== account.id);
        await setDoc(trackerRef, { [type]: updatedArray }, { merge: true });
      } catch (err) {
        console.error('Failed to delete shared account:', err);
      }
    }

    setAccounts(prev => prev.filter((_, i) => i !== index));
  };

  /** ---------- Save personal accounts ---------- */
  const handleSave = async () => {
    const filtered = accounts.filter(a => a.name?.trim());
    if (filtered.length === 0)
      return Alert.alert('Validation Error', 'Please add at least one account name.');

    if (!isShared) {
      if (!userId) return Alert.alert('Error', 'No user found. Please log in again.');
      await saveAccounts({ userId, trackerId, type, accounts: filtered, isShared });
    }

    setAccounts(filtered);
    navigation.goBack();
  };

  /** ---------- Render ---------- */
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
          {accounts.map((item, index) => (
            <View key={item.id} style={styles.accountRow}>
              <TextInput
                style={styles.input}
                value={item.name}
                placeholder="Account name"
                onChangeText={text => handleChange(text, index)}
              />
              <TouchableOpacity onPress={() => handleDelete(index)} style={styles.deleteIcon}>
                <Ionicons name="trash-outline" size={20} color="#145C84" />
              </TouchableOpacity>
            </View>
          ))}

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
  accountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderColor: '#ccc' },
  input: { flex: 1, fontSize: 14.5, paddingVertical: 8, paddingHorizontal: 10 },
  deleteIcon: { marginLeft: 12, justifyContent: 'center', alignItems: 'center', padding: 6 },
  addButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  addButtonText: { marginLeft: 6, color: '#145C84', fontSize: 14 },
  fixedSaveContainer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  saveButton: { backgroundColor: '#145C84', padding: 16, width: '100%', borderRadius: 8 },
  saveButtonText: { color: '#F7F2B3', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
});
