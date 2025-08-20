import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { auth, db } from '../../config/firebase-config';
import { doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import uuid from 'react-native-uuid';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';

export default function EditTrackerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const trackerId = route.params?.trackerId; // pass trackerId when navigating

  const [trackerName, setTrackerName] = useState('');
  const [peopleInputs, setPeopleInputs] = useState([]);
  const [loggedInEmail, setLoggedInEmail] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [existingTracker, setExistingTracker] = useState(null);

  // Fetch logged in email
  useEffect(() => {
    const fetchLoggedInEmail = async () => {
      const email = await AsyncStorage.getItem('userEmail');
      if (email) setLoggedInEmail(email.trim().toLowerCase());
    };
    fetchLoggedInEmail();
  }, []);

  // Fetch tracker by ID from local storage
  useEffect(() => {
    const loadTracker = async () => {
      if (!trackerId) return;
      const storedTrackers = JSON.parse(await AsyncStorage.getItem('sharedTrackers')) || [];
      const tracker = storedTrackers.find(t => t.id === trackerId);
      if (tracker) {
        setExistingTracker(tracker);
        setTrackerName(tracker.name);
        setPeopleInputs(tracker.people.map(p => ({ id: uuid.v4(), value: p })));
      }
    };
    loadTracker();
  }, [trackerId]);

  // Network status & offline sync
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      if (state.isConnected) syncOfflineTrackers();
    });
    return () => unsubscribe();
  }, []);

  const handleAddInput = () => {
    setPeopleInputs([{ id: Date.now().toString(), value: '' }, ...peopleInputs]);
  };

  const handleChangePerson = (id, text) => {
    setPeopleInputs(
      peopleInputs.map(input => (input.id === id ? { ...input, value: text } : input))
    );
  };

  const handleRemoveInput = id => {
    setPeopleInputs(peopleInputs.filter(input => input.id !== id));
  };

const validateInputs = () => {
  const errors = [];

  if (!trackerName.trim()) {
    errors.push('Please enter a tracker name.');
  }

  const people = peopleInputs
    .map(i => i.value.trim().toLowerCase())
    .filter(p => p !== '');

  if (people.length === 0) {
    errors.push('Invite at least one person to access this tracker.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = people.filter(email => !emailRegex.test(email));
  if (invalidEmails.length > 0) {
    errors.push(`Invalid email address${invalidEmails.length > 1 ? 'es' : ''}: ${invalidEmails.join(', ')}`);
  }

  const uniqueEmails = new Set(people);
  if (uniqueEmails.size !== people.length) {
    errors.push('Duplicate email addresses are not allowed.');
  }

  if (loggedInEmail && people.includes(loggedInEmail)) {
    errors.push('You cannot invite your own email address.');
  }

  if (errors.length > 0) {
    Alert.alert(
      'Attention Required',
      errors.join('\n'),
      [{ text: 'OK', style: 'default' }]
    );
    return false;
  }

  return true;
};


  const handleSave = async () => {
    if (!validateInputs()) return;

    const people = peopleInputs.map(i => i.value.trim().toLowerCase()).filter(p => p !== '');
    const id = existingTracker?.id || uuid.v4();

    const authUid = auth.currentUser?.uid;
    const storedUserId = await AsyncStorage.getItem('userId');

    const trackerDataFirebase = {
      id,
      name: trackerName,
      people,
      ownerId: authUid,
      createdAt: serverTimestamp(),
      synced: true
    };

    const trackerDataLocal = {
      ...trackerDataFirebase,
      ownerId: storedUserId,
      synced: isOnline
    };

    try {
      const existingTrackers = JSON.parse(await AsyncStorage.getItem('sharedTrackers')) || [];
      const filteredTrackers = existingTrackers.filter(t => t.id !== id);
      await AsyncStorage.setItem(
        'sharedTrackers',
        JSON.stringify([trackerDataLocal, ...filteredTrackers])
      );

      if (!isOnline) {
        Toast.show({
          type: 'info',
          text1: 'Offline Mode',
          text2: 'Tracker saved locally. It will sync automatically once online.'
        });
        navigation.goBack();
        return;
      }

      await setDoc(doc(db, 'sharedTrackers', id), trackerDataFirebase);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Tracker saved successfully.'
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error saving tracker:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not save tracker. Try again.'
      });
    }
  };

  const syncOfflineTrackers = async () => {
    try {
      const localTrackers = JSON.parse(await AsyncStorage.getItem('sharedTrackers')) || [];
      const unsynced = localTrackers.filter(t => !t.synced);

      for (const tracker of unsynced) {
        await setDoc(doc(db, 'sharedTrackers', tracker.id), {
          ...tracker,
          createdAt: serverTimestamp(),
          synced: true
        });
      }

      if (unsynced.length > 0) {
        Toast.show({
          type: 'success',
          text1: 'Sync Complete',
          text2: `${unsynced.length} tracker(s) synced to the cloud.`,
          visibilityTime: 3000
        });

        const updated = localTrackers.map(t => ({ ...t, synced: true }));
        await AsyncStorage.setItem('sharedTrackers', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Error syncing trackers:', error);
    }
  };

  const handleDelete = async () => {
    if (!existingTracker) return;

    Alert.alert(
      'Delete Tracker',
      'Are you sure you want to delete this tracker?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const localTrackers = JSON.parse(await AsyncStorage.getItem('sharedTrackers')) || [];
              const updated = localTrackers.filter(t => t.id !== existingTracker.id);
              await AsyncStorage.setItem('sharedTrackers', JSON.stringify(updated));

              if (isOnline) {
                await deleteDoc(doc(db, 'sharedTrackers', existingTracker.id));
              }

              Toast.show({
                type: 'success',
                text1: 'Deleted',
                text2: 'Tracker deleted successfully.'
              });

              navigation.goBack();
            } catch (error) {
              console.error('Error deleting tracker:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Could not delete tracker.'
              });
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 24 }}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Tracker</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Shared</Text>

      <ScrollView style={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.nameRow}>
          <Text style={styles.label}>Name:</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter tracker name"
            value={trackerName}
            onChangeText={setTrackerName}
          />
        </View>

        <Text style={styles.sectionSubTitle}>Invite people</Text>
        <View style={styles.addPersonRow}>
          {peopleInputs.map(input => (
            <View key={input.id} style={styles.personInputRow}>
              <TouchableOpacity onPress={() => handleRemoveInput(input.id)}>
                <Ionicons name="remove-outline" size={20} color="#145C84" />
              </TouchableOpacity>
              <TextInput
                style={styles.personInputLeft}
                placeholder="Enter Email Address"
                value={input.value}
                onChangeText={text => handleChangePerson(input.id, text)}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.addButtonRow} onPress={handleAddInput}>
            <Ionicons name="add-circle-outline" size={24} color="#145C84" />
            <Text style={styles.addPeopleText}>Add People who has access</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          {existingTracker && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={24} color="#145C84" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.saveButton, { flex: 1, marginLeft: existingTracker ? 8 : 0 }]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
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
  contentContainer: { flex: 1, padding: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#386681',
    marginTop: 16,
    backgroundColor: '#EDEDEE',
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  label: { fontSize: 14, color: '#386681', marginRight: 4 },
  input: {
    flex: 1,
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#386681',
    paddingVertical: 0,
    color: '#145C84',
  },
  sectionSubTitle: { fontSize: 14, fontWeight: '600', color: '#386681', marginBottom: 8 },
  addPersonRow: { marginBottom: 24 },
  addButtonRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  addPeopleText: { marginLeft: 8, fontSize: 14, color: '#386681' },
  personInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#386681',
    marginBottom: 8,
    paddingVertical: 4,
  },
  personInputLeft: {
    flex: 1,
    fontSize: 14,
    color: '#145C84',
    marginLeft: 8,
    paddingVertical: 4,
  },
  saveButton: {
    backgroundColor: '#145C84',
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 0,
    flex: 1,
  },
  saveButtonText: { color: '#F7F2B3', fontSize: 16, fontWeight: '600' },
  deleteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#A4C0CF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#145C84',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
