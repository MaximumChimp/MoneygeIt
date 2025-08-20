import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../config/firebase-config';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp,getDoc} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const firebaseErrorMessages = {
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
  };

  // In RegisterScreen

const handleRegister = async () => {
  if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
    Alert.alert('Validation', 'Please fill in all fields');
    return;
  }

  setLoading(true);

  try {
    // Create user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    const uid = userCredential.user.uid;

    // Update display name
    await updateProfile(userCredential.user, {
      displayName: `${firstName.trim()} ${lastName.trim()}`,
    });

    // Save user info to Firestore
    await setDoc(doc(db, 'users', uid), {
      uid,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName: `${firstName.trim()} ${lastName.trim()}`,
      email: email.trim(),
      createdAt: serverTimestamp(),
    });

    // Retrieve user document to get Firestore userId
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      await AsyncStorage.setItem('userEmail', userData.email);
      await AsyncStorage.setItem('userId', userData.uid); // Firestore UID
    }

    // Navigate safely to UserAccountScreen
    navigation.replace('UserAccountScreen');

  } catch (error) {
    console.error('Registration error:', error);
    Alert.alert('Error', firebaseErrorMessages[error.code] || error.message);
  } finally {
    setLoading(false);
  }
};



  const getBorderColor = (inputName) =>
    focusedInput === inputName ? '#6FB5DB' : '#D9D9D9';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 24 }}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <Text style={styles.trackertype}>Personal Budget Tracker</Text>

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.contentContainer}>
          {[
            { label: 'First Name', value: firstName, setter: setFirstName, key: 'firstName', placeholder: 'Enter first name', autoCapitalize: 'words' },
            { label: 'Last Name', value: lastName, setter: setLastName, key: 'lastName', placeholder: 'Enter last name', autoCapitalize: 'words' },
            { label: 'Email Address', value: email, setter: setEmail, key: 'email', placeholder: 'Enter email', keyboardType: 'email-address', autoCapitalize: 'none', textContentType: 'emailAddress' },
            { label: 'Password', value: password, setter: setPassword, key: 'password', placeholder: 'Enter password', secureTextEntry: !showPassword, textContentType: 'password' }
          ].map((field) => (
            <View style={styles.inputGroup} key={field.key}>
              <Text style={styles.label}>{field.label}</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[styles.input, { borderBottomColor: getBorderColor(field.key) }]}
                  value={field.value}
                  onChangeText={field.setter}
                  placeholder={field.placeholder}
                  autoCapitalize={field.autoCapitalize}
                  keyboardType={field.keyboardType}
                  secureTextEntry={field.secureTextEntry}
                  textContentType={field.textContentType}
                  onFocus={() => setFocusedInput(field.key)}
                  onBlur={() => setFocusedInput(null)}
                />
                {field.key === 'password' && (
                  <TouchableOpacity
                    style={{ position: 'absolute', right: 0, top: 10 }}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#707C83"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.registerButton, loading && { opacity: 0.6 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#F7F2B3" />
            ) : (
              <Text style={styles.registerButtonText}>Register</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A4C0CF',
  },
  trackertype: {
    fontWeight: 'bold',
    color: '#6FB5DB',
    fontSize: 14,
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#EDEDEE',
    marginBottom: 15,
  },
  contentContainer: {
    padding: 20,
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#19445C',
    marginBottom: 6,
  },
  input: {
    borderBottomWidth: 1,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333',
  },
  registerButton: {
    backgroundColor: '#145C84',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  registerButtonText: {
    color: '#F7F2B3',
    fontSize: 16,
    fontWeight: '700',
  },
});
