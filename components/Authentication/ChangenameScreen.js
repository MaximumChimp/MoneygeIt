import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase-config';

export default function ChangeNameScreen({ navigation, route }) {
  const { userId } = route.params;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isFocused, setIsFocused] = useState({ first: false, last: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        Alert.alert('Error', 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please enter both first and last name');
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`,
      });

      Alert.alert('Success', `Name updated to ${firstName} ${lastName}`);
      navigation.goBack();
    } catch (error) {
      console.error('Error updating name:', error);
      Alert.alert('Error', 'Failed to update name');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#145C84" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 24 }}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Full Name</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {/* Sub-header */}
      <Text style={styles.subHeader}>Personal Budget Tracker</Text>

      {/* Input Fields */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={[
            styles.input,
            { borderBottomColor: isFocused.first ? '#6FB5DB' : '#D9D9D9' },
          ]}
          value={firstName}
          onChangeText={setFirstName}
          onFocus={() => setIsFocused({ ...isFocused, first: true })}
          onBlur={() => setIsFocused({ ...isFocused, first: false })}
          placeholder="Enter your first name"
        />

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={[
            styles.input,
            { borderBottomColor: isFocused.last ? '#6FB5DB' : '#D9D9D9' },
          ]}
          value={lastName}
          onChangeText={setLastName}
          onFocus={() => setIsFocused({ ...isFocused, last: true })}
          onBlur={() => setIsFocused({ ...isFocused, last: false })}
          placeholder="Enter your last name"
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
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
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A4C0CF',
    flex: 1,
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6FB5DB',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 10,
    backgroundColor: '#EDEDEE',
  },
  inputContainer: { marginTop: 20, paddingHorizontal: 20 },
  label: { fontSize: 14, color: '#19445C', marginBottom: 6 },
  input: {
    borderBottomWidth: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: '#000',
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#145C84',
    paddingVertical: 14,
    borderRadius: 4,
    marginTop: 20,
    marginHorizontal: 20,
  },
  saveButtonText: {
    color: '#F7F2B3',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
});
