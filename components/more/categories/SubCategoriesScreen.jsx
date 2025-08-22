import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { TrackerContext } from '../../context/TrackerContext';
import { db } from '../../../config/firebase-config';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export default function SubcategoriesScreen({ navigation, route }) {
  const { categoryId, categoryName, parentType, saveGuestCategories } = route.params;
  const { trackerId, userId } = useContext(TrackerContext);
  const isGuest = !userId;

  const [subcategories, setSubcategories] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  /** ---------- Load Guest Subcategories ---------- */
  const loadGuestSubcategories = async () => {
    try {
      const key = `guest_${trackerId || 'personal'}_${parentType}`;
      const raw = await AsyncStorage.getItem(key);
      const categories = raw ? JSON.parse(raw) : [];
      const parent = categories.find(c => c.categoryId === categoryId);
      setSubcategories(parent?.subcategories || []);
    } catch (err) {
      console.error('Failed to load guest subcategories:', err);
    }
  };

  /** ---------- Load Firestore Subcategories ---------- */
  const loadFirestoreSubcategories = () => {
    if (!categoryId) return;
    const docRef = doc(db, 'categories', categoryId);
    return onSnapshot(
      docRef,
      snapshot => {
        const data = snapshot.data();
        setSubcategories(data?.subcategories || []);
      },
      err => console.error('Firestore listener error:', err)
    );
  };

  /** ---------- Initialize subcategories ---------- */
  useEffect(() => {
    if (isGuest) {
      loadGuestSubcategories();
      const listener = DeviceEventEmitter.addListener('guestCategoriesUpdated', ({ type, updatedCategories }) => {
        if (type === parentType) {
          const parent = updatedCategories.find(c => c.categoryId === categoryId);
          if (parent?.subcategories) setSubcategories(parent.subcategories);
        }
      });
      return () => listener.remove();
    } else {
      const unsubscribe = loadFirestoreSubcategories();
      return () => unsubscribe && unsubscribe();
    }
  }, [categoryId, trackerId, userId]);

  /** ---------- Add Subcategory ---------- */
  const handleAddField = () => {
    setSubcategories(prev => [
      ...prev,
      { id: Date.now().toString() + Math.random().toString(36).substring(2, 8), name: '' },
    ]);
    setHasChanges(true);
  };

  /** ---------- Update Subcategory ---------- */
  const handleChange = (text, index) => {
    setSubcategories(prev => {
      const updated = [...prev];
      updated[index].name = text;
      return updated;
    });
    setHasChanges(true);
  };

  /** ---------- Delete Subcategory ---------- */
  const handleDelete = (index) => {
    Alert.alert('Delete Subcategory', 'Are you sure you want to delete this subcategory?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedSubs = subcategories.filter((_, idx) => idx !== index);
          setSubcategories(updatedSubs);
          setHasChanges(true);

          try {
            if (isGuest) {
              const key = `guest_${trackerId || 'personal'}_${parentType}`;
              const raw = await AsyncStorage.getItem(key);
              const categories = raw ? JSON.parse(raw) : [];
              const updatedCategories = categories.map(cat =>
                cat.categoryId === categoryId ? { ...cat, subcategories: updatedSubs } : cat
              );
              await AsyncStorage.setItem(key, JSON.stringify(updatedCategories));
              DeviceEventEmitter.emit('guestCategoriesUpdated', { type: parentType, updatedCategories });
              if (saveGuestCategories) saveGuestCategories(parentType, updatedCategories);
            } else {
              const docRef = doc(db, 'categories', categoryId);
              await setDoc(docRef, { subcategories: updatedSubs }, { merge: true });
            }
          } catch (err) {
            console.error('Failed to delete subcategory:', err);
            Alert.alert('Error', 'Failed to delete subcategory.');
          }
        },
      },
    ]);
  };

  /** ---------- Save Subcategories ---------- */
  const handleSave = async () => {
    const cleaned = subcategories
      .filter(item => item.name.trim())
      .map(item => ({ id: item.id, name: item.name.trim() }));

    try {
      if (isGuest) {
        const key = `guest_${trackerId || 'personal'}_${parentType}`;
        const raw = await AsyncStorage.getItem(key);
        const categories = raw ? JSON.parse(raw) : [];
        const updatedCategories = categories.map(cat =>
          cat.categoryId === categoryId ? { ...cat, subcategories: cleaned } : cat
        );
        await AsyncStorage.setItem(key, JSON.stringify(updatedCategories));
        DeviceEventEmitter.emit('guestCategoriesUpdated', { type: parentType, updatedCategories });
        if (saveGuestCategories) saveGuestCategories(parentType, updatedCategories);
      } else {
        const docRef = doc(db, 'categories', categoryId);
        await setDoc(docRef, { subcategories: cleaned }, { merge: true });
      }

      setSubcategories(cleaned);
      setHasChanges(false);
      Alert.alert('Success', 'Subcategories saved!');
      navigation.goBack();
    } catch (err) {
      console.error('Save failed:', err);
      Alert.alert('Error', 'Failed to save subcategories.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{categoryName} Subcategories</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <Text style={styles.trackertype}>{isGuest ? 'Guest Tracker' : 'Budget Tracker'}</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          {subcategories.length > 0 ? (
            subcategories.map((item, index) => (
              <View key={item.id} style={styles.subcategoryRow}>
                <TextInput
                  style={styles.input}
                  value={item.name}
                  placeholder="Enter subcategory name"
                  onChangeText={text => handleChange(text, index)}
                />
                <TouchableOpacity onPress={() => handleDelete(index)} style={styles.deleteIcon} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="trash-outline" size={20} color="#145C84" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.fallback}>No subcategories added yet.</Text>
          )}

          <TouchableOpacity onPress={handleAddField} style={styles.addButton}>
            <Ionicons name="add-circle-outline" size={20} color="#145C84" />
            <Text style={styles.addButtonText}>Add Subcategory</Text>
          </TouchableOpacity>
        </ScrollView>

        {hasChanges && (
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save Subcategories</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerBackground: { height: 100, width: '100%', backgroundColor: '#145C84', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 12 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#A4C0CF' },
  trackertype: { fontWeight: 'bold', color: '#6FB5DB', fontSize: 14, textAlign: 'center', padding: 10, backgroundColor: '#EDEDEE', marginBottom: 15 },
  fallback: { textAlign: 'center', color: '#888', fontStyle: 'italic', marginVertical: 10 },
  input: { flex: 1, fontSize: 14.5, paddingVertical: 6, paddingHorizontal: 0, borderBottomWidth: 0 },
  subcategoryRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#ccc', marginBottom: 12, paddingVertical: 6 },
  deleteIcon: { marginLeft: 8, paddingVertical: 6 },
  addButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  addButtonText: { marginLeft: 6, color: '#145C84', fontSize: 14 },
  saveButton: { backgroundColor: '#145C84', padding: 16, borderRadius: 0 },
  saveButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  content: { padding: 16, paddingBottom: 32 },
});
