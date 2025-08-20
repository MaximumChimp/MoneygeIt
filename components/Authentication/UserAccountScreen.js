import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../config/firebase-config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UserAccountScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const uid = firebaseUser.uid;
      const email = firebaseUser.email?.trim().toLowerCase();

      console.log('Storing to AsyncStorage:', { userId: uid, userEmail: email });

      try {
        const keyValuePairs = [['userId', uid]];
        if (email) keyValuePairs.push(['userEmail', email]);
        if (keyValuePairs.length > 0) await AsyncStorage.multiSet(keyValuePairs);
      } catch (e) {
        console.warn('Failed to cache userId/userEmail', e);
      }

      // Display name logic...
      const checkDisplayName = () => {
        const fullName = firebaseUser.displayName
          ? toPascalCase(firebaseUser.displayName)
          : null;

        if (fullName) {
          setUser({
            fullName,
            photoUrl: firebaseUser.photoURL || null,
            initials: getInitials(fullName),
          });
          setLoading(false);
        } else {
          setTimeout(checkDisplayName, 100);
        }
      };
      checkDisplayName();
    } else {
      console.log('User is signed out. Clearing AsyncStorage.');
      // Logout cleanup logic...
    }
  });

  return () => unsubscribe();
}, []);





  const toPascalCase = (str) => {
    if (!str) return '';
    return str
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getInitials = (fullName) => {
    if (!fullName) return '';
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0][0].toUpperCase();
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  };

  const handleChangeName = () => {
    if (auth.currentUser) {
      navigation.navigate('ChangeNameScreen', { userId: auth.currentUser.uid });
    } else {
      Alert.alert('Error', 'No user is logged in');
    }
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'Change Password screen coming soon');
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      // Grab userId before it disappears so we can clear per-user keys too
      const storedUserId = await AsyncStorage.getItem('userId');

      await signOut(auth);
      setUser(null);

      // Clean up local keys
      const keys = ['userId', 'userEmail', 'sharedTrackers'];
      if (storedUserId) {
        keys.push(
          `selectedTrackerId_${storedUserId}`,
          `selectedTrackerName_${storedUserId}`
        );
      }
      await AsyncStorage.multiRemove(keys);

      navigation.replace('UserProfileScreen');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out');
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#145C84" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );

  if (!user)
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 50 }}>No user logged in</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => {
              if (auth.currentUser) {
                navigation.replace('MainTabs', { screen: 'More' });
              } else {
                navigation.goBack();
              }
            }}
            style={{ width: 24 }}
          >
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>User Profile</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {/* Sub-header */}
      <Text style={styles.subHeader}>Personal Budget Tracker</Text>

      {loggingOut && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#145C84" />
          <Text style={{ marginTop: 10, color: '#145C84' }}>Logging out...</Text>
        </View>
      )}

      <View style={styles.profileContainer}>
        {user.photoUrl ? (
          <Image source={{ uri: user.photoUrl }} style={styles.userImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>{user.initials || ''}</Text>
          </View>
        )}

        <Text style={styles.fullName}>{user.fullName || ''}</Text>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.button} onPress={handleChangeName}>
            <Text style={styles.buttonText}>Change Name</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
            <Text style={styles.buttonText}>Change Password</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  profileContainer: { alignItems: 'center', marginTop: 50 },
  userImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 20 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#A4C0CF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  avatarInitials: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  fullName: { fontSize: 20, fontWeight: '700', color: '#19445C', marginBottom: 30 },
  actionButtons: { width: '80%', marginBottom: 30 },
  button: { paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: '#386681', fontSize: 16 },
  logoutContainer: { width: '80%' },
  logoutButton: { backgroundColor: '#EDEDEE', paddingVertical: 14, borderRadius: 4 },
  logoutText: { color: '#145C84', fontWeight: '600', textAlign: 'center', fontSize: 16 },
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
  subHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6FB5DB',
    textAlign: 'center',
    paddingVertical: 10,
    backgroundColor: '#EDEDEE',
    marginBottom: 15,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
});
