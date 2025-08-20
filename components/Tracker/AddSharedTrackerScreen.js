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
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../../config/firebase-config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import uuid from 'react-native-uuid';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';

export default function AddSharedTrackerScreen() {
  const navigation = useNavigation();
  const [trackerName, setTrackerName] = useState('');
  const [peopleInputs, setPeopleInputs] = useState([]);
  const [loggedInEmail, setLoggedInEmail] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const fetchLoggedInEmail = async () => {
      try {
        const email = await AsyncStorage.getItem('userEmail');
        if (email) setLoggedInEmail(email.trim().toLowerCase());
      } catch (error) {
        console.log('Error fetching logged in email:', error);
      }
    };
    fetchLoggedInEmail();
  }, []);
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      if (state.isConnected) {
        syncOfflineTrackers();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddInput = () => {
    setPeopleInputs([{ id: Date.now().toString(), value: '' }, ...peopleInputs]);
  };

  const handleChangePerson = (id, text) => {
    setPeopleInputs(
      peopleInputs.map(input =>
        input.id === id ? { ...input, value: text } : input
      )
    );
  };

  const handleRemoveInput = id => {
    setPeopleInputs(peopleInputs.filter(input => input.id !== id));
  };

  const validateInputs = () => {
    if (!trackerName.trim()) {
      Alert.alert('Invalid Tracker Name!', 'Please enter a tracker name.');
      return false;
    }

    const people = peopleInputs
      .map(input => input.value.trim().toLowerCase())
      .filter(p => p !== '');

    if (people.length === 0) {
      Alert.alert('Invalid Account!', 'Please invite at least one person.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (let email of people) {
      if (!emailRegex.test(email)) {
        Alert.alert('Validation Error', `Invalid email: ${email}`);
        return false;
      }
    }

    const uniqueEmails = new Set(people);
    if (uniqueEmails.size !== people.length) {
      Alert.alert('Validation Error', 'Duplicate email addresses are not allowed.');
      return false;
    }

    if (loggedInEmail && people.includes(loggedInEmail)) {
      Alert.alert('Validation Error', 'You cannot invite your own email address.');
      return false;
    }

    return true;
  };

const handleSave = async () => {
  try {
    // Check if userEmail exists in local storage
    const storedEmail = await AsyncStorage.getItem('userEmail');
    if (!storedEmail) {
      Alert.alert(
        'Please login first',
        'You need to log in before adding a shared tracker.'
      );
      return;
    }

    if (!validateInputs()) return;

    const people = peopleInputs
      .map(input => input.value.trim().toLowerCase())
      .filter(p => p !== '');

    // Use auth.currentUser.uid for Firestore so others can see it
    const authUid = auth.currentUser?.uid;
    if (!authUid) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    // Use AsyncStorage userId for local filtering (in case auth.currentUser is null at app start)
    const storedUserId = await AsyncStorage.getItem('userId');
    if (!storedUserId) {
      Alert.alert('Error', 'Could not determine user ID.');
      return;
    }

    const trackerId = uuid.v4();

    // Tracker to save in Firebase
    const trackerDataFirebase = {
      id: trackerId,
      name: trackerName,
      people,
      ownerId: authUid, // real uid for Firestore
      createdAt: serverTimestamp(),
      synced: true
    };

    // Tracker to save locally
    const trackerDataLocal = {
      ...trackerDataFirebase,
      ownerId: storedUserId, // matches local filtering
      synced: isOnline
    };

    // Save locally first
    const existingTrackers = JSON.parse(
      await AsyncStorage.getItem('sharedTrackers')
    ) || [];
    await AsyncStorage.setItem(
      'sharedTrackers',
      JSON.stringify([trackerDataLocal, ...existingTrackers])
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

    // Save to Firebase if online
    await setDoc(doc(db, 'sharedTrackers', trackerId), trackerDataFirebase);

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
    Toast.show({
      type: 'error',
      text1: 'Sync Failed',
      text2: 'Please try again later.',
      visibilityTime: 3000
    });
  }
};

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 24 }}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Shared Tracker</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Shared</Text>

      <ScrollView style={styles.contentContainer} keyboardShouldPersistTaps="handled">
        {/* Tracker Name */}
        <View style={styles.nameRow}>
          <Text style={styles.label}>Name:</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter tracker name"
            value={trackerName}
            onChangeText={setTrackerName}
          />
        </View>

        {/* Invite People */}
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

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
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
    marginTop: 16,
  },
  saveButtonText: { color: '#F7F2B3', fontSize: 16, fontWeight: '600' },
});
