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
  DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrackerContext } from '../../context/TrackerContext';
import { db } from '../../../config/firebase-config';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';

export default function EditCategoriesScreen({ navigation, route }) {
  const { type } = route.params;
  const { trackerId, trackerName, userId } = useContext(TrackerContext);

  const [categories, setCategories] = useState([]);
  const isGuest = !userId;
  const isShared = trackerId !== 'personal' && !isGuest;

  /** ---------- Load categories ---------- */
  useEffect(() => {
    if (isGuest) {
      const loadGuestCategories = async () => {
        try {
          const key = `guest_${trackerId}_${type}`;
          const raw = await AsyncStorage.getItem(key);
          const guestCats = raw ? JSON.parse(raw) : [];
          setCategories(guestCats);
        } catch (err) {
          console.error('Failed to load guest categories:', err);
        }
      };
      loadGuestCategories();
    } else {
      // Real-time listener for shared tracker
      const categoriesRef = collection(db, 'categories');
      const q = query(categoriesRef, where('trackerId', '==', trackerId), where('type', '==', type));
      const unsubscribe = onSnapshot(q, snapshot => {
        const fetched = snapshot.docs.map(doc => ({ categoryId: doc.id, ...doc.data() }));
        setCategories(fetched);
      }, err => {
        console.error('Failed to listen to categories:', err);
      });

      return () => unsubscribe();
    }
  }, [trackerId, userId]);

  /** ---------- Add new category ---------- */
  const handleAddField = () => {
    const newCat = { categoryId: `temp_${Date.now()}`, name: '' };
    setCategories(prev => [...prev, newCat]);

    if (isGuest) {
      emitGuestUpdate([...categories, newCat]);
    }
  };

  /** ---------- Update category ---------- */
  const handleChange = (value, index) => {
    const updatedCategories = [...categories];
    updatedCategories[index].name = value;
    setCategories(updatedCategories);

    if (isGuest) {
      emitGuestUpdate(updatedCategories);
    }
  };

  /** ---------- Delete category ---------- */
  const handleDelete = async (index) => {
    const catToDelete = categories[index];
    const updatedCategories = categories.filter((_, i) => i !== index);

    try {
      if (isGuest) {
        const key = `guest_${trackerId}_${type}`;
        const raw = await AsyncStorage.getItem(key);
        const guestCats = (raw ? JSON.parse(raw) : []).filter(c => c.categoryId !== catToDelete.categoryId);
        await AsyncStorage.setItem(key, JSON.stringify(guestCats));
        setCategories(guestCats);
        DeviceEventEmitter.emit('guestCategoriesUpdated', { type, updatedCategories: guestCats });
      } else {
        if (catToDelete.categoryId && !catToDelete.categoryId.startsWith('temp_')) {
          await deleteDoc(doc(db, 'categories', catToDelete.categoryId));
        }
        setCategories(updatedCategories);
      }
    } catch (err) {
      console.error('Failed to delete category:', err);
      Alert.alert('Error', 'Could not delete category.');
    }
  };

/** ---------- Save categories ---------- */
const handleSave = async () => {
  const validCategories = categories.filter(c => c.name?.trim());
  if (!validCategories.length) {
    return Alert.alert('Validation Error', 'Please add at least one category.');
  }

  try {
    if (isGuest) {
      // Assign categoryId if missing
      const guestCategoriesWithId = validCategories.map(c => ({
        ...c,
        categoryId: c.categoryId || `temp_${Date.now()}_${Math.random()}`,
      }));

      const key = `guest_${trackerId}_${type}`;
      await AsyncStorage.setItem(key, JSON.stringify(guestCategoriesWithId));
      DeviceEventEmitter.emit('guestCategoriesUpdated', { type, updatedCategories: guestCategoriesWithId });
    } else {
      const collectionRef = collection(db, 'categories');
      for (let cat of validCategories) {
        let docRef;
        if (!cat.categoryId || cat.categoryId.startsWith('temp_')) {
          // New category → Firestore generates ID
          docRef = doc(collectionRef);
          cat.categoryId = docRef.id;
        } else {
          // Existing category
          docRef = doc(db, 'categories', cat.categoryId);
        }

        await setDoc(docRef, {
          userId,
          trackerId,
          name: cat.name.trim(),
          type,
        });
      }
    }

    navigation.goBack();
  } catch (err) {
    console.error('Failed to save categories:', err);
    Alert.alert('Error', 'Failed to save categories.');
  }
};


  /** ---------- Helper for emitting guest updates ---------- */
  const emitGuestUpdate = async (updatedCategories) => {
    try {
      const key = `guest_${trackerId}_${type}`;
      await AsyncStorage.setItem(key, JSON.stringify(updatedCategories));
      DeviceEventEmitter.emit('guestCategoriesUpdated', { type, updatedCategories });
    } catch (err) {
      console.error('Failed to emit guest update:', err);
    }
  };

  const subHeaderText = isGuest
    ? 'Guest Tracker'
    : trackerId === 'personal'
      ? 'Personal Budget Tracker'
      : trackerName || 'Shared Tracker';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit {type} Categories</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <Text style={styles.trackertype}>{subHeaderText}</Text>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {categories.length === 0 ? (
            <View style={styles.fallbackContainer}>
              <Text style={styles.fallbackText}>
                No categories created yet. Tap "Add Category" to get started.
              </Text>
            </View>
          ) : (
            categories.map((item, idx) => (
              <View key={item.categoryId} style={styles.categoryRow}>
                <TextInput
                  style={styles.input}
                  value={item.name}
                  placeholder="Category name"
                  onChangeText={text => handleChange(text, idx)}
                />
                <TouchableOpacity onPress={() => handleDelete(idx)} style={styles.deleteIcon}>
                  <Ionicons name="trash-outline" size={20} color="#145C84" />
                </TouchableOpacity>
              </View>
            ))
          )}

          <TouchableOpacity onPress={handleAddField} style={styles.addButton}>
            <Ionicons name="add-circle-outline" size={20} color="#145C84" />
            <Text style={styles.addButtonText}>Add Category</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.fixedSaveContainer}>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, categories.every(c => !c.name?.trim()) && { backgroundColor: '#EDEDEE' }]}
            disabled={categories.every(c => !c.name?.trim())}
          >
            <Text style={styles.saveButtonText}>Save Categories</Text>
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
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderColor: '#ccc' },
  input: { flex: 1, fontSize: 14.5, paddingVertical: 8, paddingHorizontal: 10 },
  deleteIcon: { marginLeft: 12, justifyContent: 'center', alignItems: 'center', padding: 6 },
  addButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  addButtonText: { marginLeft: 6, color: '#145C84', fontSize: 14 },
  fixedSaveContainer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  saveButton: { backgroundColor: '#145C84', padding: 16, width: '100%', borderRadius: 8 },
  saveButtonText: { color: '#F7F2B3', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  fallbackContainer: { padding: 20, justifyContent: 'center', alignItems: 'center' },
  fallbackText: { fontSize: 14, color: '#999', textAlign: 'center' },
});
