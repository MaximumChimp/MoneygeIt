import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RadioButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { TrackerContext } from '../../components/context/TrackerContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../config/firebase-config';

export default function TrackersScreen() {
  const navigation = useNavigation();
  const {
    trackerId,
    updateTracker,
    isOnline,
    sharedTrackers,
    setSharedTrackers,
    syncPendingTrackers,
  } = useContext(TrackerContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentUserId = auth.currentUser?.uid;
  const currentUserEmail = auth.currentUser?.email;

  const isGuest = !currentUserId;

  /** ---------- Personal Tracker ---------- */
  const personalTracker = {
    id: 'personal',
    name: isGuest ? 'Guest Tracker' : 'Personal Budget Tracker',
  };

  /** ---------- Fetch shared trackers ---------- */
  const fetchSharedTrackers = async () => {
    setLoading(true);
    try {
      if (isGuest || !currentUserEmail || !currentUserId || !isOnline) {
        setSharedTrackers([]);
        return;
      }

      if (typeof syncPendingTrackers === 'function') await syncPendingTrackers();

      const trackersRef = collection(db, 'sharedTrackers');
      const ownerQuery = query(trackersRef, where('ownerId', '==', currentUserId));
      const sharedQuery = query(trackersRef, where('people', 'array-contains', currentUserEmail));

      const ownerSnap = await getDocs(ownerQuery);
      const ownerTrackers = ownerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const sharedSnap = await getDocs(sharedQuery);
      const sharedTrackersList = sharedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const uniqueTrackers = [...new Map([...ownerTrackers, ...sharedTrackersList].map(t => [t.id, t])).values()];
      setSharedTrackers(uniqueTrackers);
    } catch (err) {
      console.error('Failed to fetch shared trackers:', err);
      setSharedTrackers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /** ---------- Initial load ---------- */
  useEffect(() => {
    if (!trackerId) updateTracker(personalTracker.id, personalTracker.name);
    fetchSharedTrackers();
  }, []);

  /** ---------- Sync when going online ---------- */
  useEffect(() => {
    if (isOnline && !isGuest) fetchSharedTrackers();
  }, [isOnline]);

  /** ---------- Select tracker ---------- */
  const handleSelectTracker = tracker => {
    if (!isGuest && !isOnline && tracker.id !== 'personal') {
      return alert('No Internet: Cannot select a shared tracker.');
    }
    updateTracker(tracker.id, tracker.name);
  };

  const SkeletonItem = () => <View style={styles.skeletonItem} />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 24 }}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tracker</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchSharedTrackers();
            }}
          />
        }
      >
        <View style={styles.section}>
          {/* Personal Tracker */}
          <Text style={styles.sectionTitle}>Personal</Text>
          <View style={styles.sharedTrackerRow}>
            <TouchableOpacity style={styles.sharedTrackerItem} onPress={() => handleSelectTracker(personalTracker)}>
              <RadioButton
                value={personalTracker.id}
                status={trackerId === personalTracker.id ? 'checked' : 'unchecked'}
                color="#145C84"
              />
              <Text style={styles.sharedTrackerText}>{personalTracker.name}</Text>
            </TouchableOpacity>
          </View>

          {/* Shared Trackers Section */}
          <Text style={styles.sectionTitle}>Shared</Text>

          {isGuest ? (
            <Text style={[styles.fallbackText]}>
              Log in to add shared trackers.
            </Text>
          ) : loading && sharedTrackers.length === 0 ? (
            <>
              <SkeletonItem />
              <SkeletonItem />
              <SkeletonItem />
            </>
          ) : sharedTrackers.length > 0 && isOnline ? (
            sharedTrackers.map(tracker => (
              <View key={tracker.id} style={styles.sharedTrackerRow}>
                <TouchableOpacity
                  style={styles.sharedTrackerItem}
                  onPress={() => handleSelectTracker(tracker)}
                >
                  <RadioButton
                    value={tracker.id}
                    status={trackerId === tracker.id ? 'checked' : 'unchecked'}
                    color="#145C84"
                  />
                  <Text style={styles.sharedTrackerText}>{tracker.name}</Text>
                </TouchableOpacity>
                {tracker.ownerId === currentUserId && (
                  <Ionicons name="create-outline" size={20} color="#386681" />
                )}
              </View>
            ))
          ) : (
            <Text style={styles.fallbackText}>
              {isOnline
                ? 'No shared trackers found.'
                : 'No internet connection. Shared trackers are unavailable.'}
            </Text>
          )}

          {!isGuest && (
            <TouchableOpacity
              style={styles.sharedTrackerRow}
              onPress={() => navigation.navigate('AddSharedTrackerScreen')}
            >
              <View style={styles.sharedTrackerItem}>
                <Ionicons name="add-circle-outline" size={24} color="#386681" />
                <Text style={[styles.sharedTrackerText, { marginLeft: 8 }]}>Add Shared Tracker</Text>
              </View>
            </TouchableOpacity>
          )}
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
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    paddingVertical: 10,
    color: '#386681',
    backgroundColor: '#EDEDEE',
    width: '100%',
    textAlign: 'left',
    paddingHorizontal: 16,
  },
  sharedTrackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sharedTrackerItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sharedTrackerText: { fontSize: 14, color: '#386681' },
  skeletonItem: { height: 20, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 12 },
  fallbackText: { paddingHorizontal: 25, paddingVertical: 10, color: '#888' },
});
