import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth,db} from '../../config/firebase-config';
import { getDoc, doc,collection } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UserProfileScreen({ navigation, route }) {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState(route?.params?.prefillEmail || '');
  const [password, setPassword] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Prevent multiple redirects
  const [redirected, setRedirected] = useState(false);

  const firebaseLoginErrors = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !redirected) {
        setRedirected(true); // ensure redirect happens only once
        navigation.replace('UserAccountScreen');
      } else {
        if (route?.params?.showLogin) setShowLogin(true);
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [redirected]);

  if (checkingAuth)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#145C84" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );

  const toggleLoginView = () => setShowLogin(!showLogin);

const handleEmailLogin = async () => {
  if (!email || !password) {
    Alert.alert('Error', 'Please enter email and password');
    return;
  }

  setLoading(true);
  try {
    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const uid = userCredential.user.uid;

    // Fetch user document from Firestore
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();

      // Save email and Firestore UID locally
      await AsyncStorage.setItem('userEmail', userData.email);
      await AsyncStorage.setItem('userId', userData.uid);

      // --- Immediately read stored data ---
      const storedUserId = await AsyncStorage.getItem('userId');
      const storedUserEmail = await AsyncStorage.getItem('userEmail');
      console.log('Stored userId:', storedUserId);
      console.log('Stored userEmail:', storedUserEmail);
    }

    setShowLogin(false);
    setPassword('');

    // Do NOT navigate here to prevent double redirect
    // Let onAuthStateChanged in UserProfileScreen handle navigation

  } catch (error) {
    Alert.alert('Login Failed', firebaseLoginErrors[error.code] || error.message);
  } finally {
    setLoading(false);
  }
};


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} style={{ width: 24 }}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Profile</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <Text style={styles.trackertype}>Personal Budget Tracker</Text>

      <View style={styles.loginButtons}>
        <TouchableOpacity
          style={styles.googleButton}
          onPress={() =>
            Alert.alert(showLogin ? 'Google Sign In' : 'Google Sign Up', 'Coming soon')
          }
        >
          <Image
            source={require('../../assets/img/google.png')}
            style={styles.googleIcon}
            resizeMode="contain"
          />
          <Text style={styles.googleButtonText}>
            {showLogin ? 'Sign In with Google' : 'Signup with Google'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.ORtext}>or</Text>

        {showLogin ? (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[
                  styles.input,
                  { borderBottomColor: isEmailFocused ? '#6FB5DB' : '#D9D9D9' },
                ]}
                value={email}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[
                    styles.input,
                    { borderBottomColor: isPasswordFocused ? '#6FB5DB' : '#D9D9D9' },
                  ]}
                  value={password}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                />
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
              </View>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && { opacity: 0.6 }]}
              onPress={handleEmailLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#F7F2B3" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            <View style={styles.alreadyAccountContainer}>
              <Text style={styles.alreadyAccountText}>No account yet?</Text>
              <Text style={styles.clickHereLine}>
                Click{' '}
                <Text style={styles.clickHereText} onPress={toggleLoginView}>
                  here
                </Text>{' '}
                instead
              </Text>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.MoneygeitRegister}
              onPress={() => navigation?.navigate?.('RegisterScreen')}
            >
              <Text style={styles.MoneygeitRegisterText}>Register to Moneyge It</Text>
            </TouchableOpacity>

            <View style={styles.alreadyAccountContainer}>
              <Text style={styles.alreadyAccountText}>Already have an account?</Text>
              <Text style={styles.clickHereLine}>
                Click{' '}
                <Text style={styles.clickHereText} onPress={toggleLoginView}>
                  here
                </Text>{' '}
                instead
              </Text>
            </View>
          </>
        )}
      </View>
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
  trackertype: {
    fontWeight: 'bold',
    color: '#6FB5DB',
    fontSize: 14,
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#EDEDEE',
    marginBottom: 15,
  },
  loginButtons: { paddingHorizontal: 40, marginTop: 30 },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBFDFF',
    paddingVertical: 14,
    borderRadius: 4,
    justifyContent: 'center',
    elevation: 4,
    position: 'relative',
  },
  googleIcon: { width: 24, height: 24, position: 'absolute', left: 16, top: '50%' },
  googleButtonText: { flex: 1, textAlign: 'center', color: '#19445C', fontSize: 14, paddingHorizontal: 24 },
  ORtext: { textAlign: 'center', fontSize: 14, marginVertical: 20 },
  MoneygeitRegisterText: {
    backgroundColor: '#D9D9D9',
    paddingVertical: 14,
    color: '#707C83',
    fontSize: 14,
    textAlign: 'center',
    borderRadius: 4,
  },
  alreadyAccountContainer: { marginTop: 24, alignItems: 'center' },
  alreadyAccountText: { fontSize: 14, color: '#19445C', marginBottom: 6 },
  clickHereLine: { fontSize: 14, color: '#19445C' },
  clickHereText: { color: '#6FB5DB', fontWeight: 'bold', textDecorationLine: 'underline' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, color: '#19445C', marginBottom: 6 },
  input: { borderBottomWidth: 1, paddingVertical: 8, fontSize: 14, color: '#000' },
  loginButton: { backgroundColor: '#145C84', paddingVertical: 14, borderRadius: 4, marginTop: 12 },
  loginButtonText: { color: '#F7F2B3', fontSize: 16, textAlign: 'center', fontWeight: '600' },
});
