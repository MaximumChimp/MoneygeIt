import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AuthenticationScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('authCompleted').then(value => {
      if (value === 'true') {
        setIsAuthenticated(true);
        // Navigate immediately if already authenticated/skipped
        navigation.replace('MainTabs');
      }
      setLoading(false);
    });
  }, [navigation]);

  const onGoogleLogin = async () => {
    setLoading(true);
    setTimeout(async () => {
      setUserInfo({ name: 'Google User' });
      await AsyncStorage.setItem('authCompleted', 'true');
      setIsAuthenticated(true);
      setLoading(false);
      navigation.replace('MainTabs');
    }, 1500);
  };

  const onEmailLogin = async () => {
    setLoading(true);
    setTimeout(async () => {
      setUserInfo({ name: 'Email User' });
      await AsyncStorage.setItem('authCompleted', 'true');
      setIsAuthenticated(true);
      setLoading(false);
      navigation.replace('MainTabs');
    }, 1500);
  };

  const onContinueWithoutAccount = async () => {
    await AsyncStorage.setItem('authCompleted', 'true');
    setIsAuthenticated(true);
    navigation.replace('MainTabs');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome! Choose Login Method</Text>
        <TouchableOpacity style={styles.button} onPress={onGoogleLogin}>
          <Text style={styles.buttonText}>Login with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={onEmailLogin}>
          <Text style={styles.buttonText}>Login with Email</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.skipButton]}
          onPress={onContinueWithoutAccount}
        >
          <Text style={[styles.buttonText, styles.skipButtonText]}>
            Continue without account
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // This render will almost never show because we navigate away on auth
  return (
    <View style={styles.center}>
      <Text style={{ fontSize: 22 }}>Main App Screen</Text>
      <Text>Welcome, {userInfo ? userInfo.name : 'Guest'}!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4285F4',
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 18,
  },
  skipButton: {
    backgroundColor: '#aaa',
  },
  skipButtonText: {
    color: '#333',
  },
});
