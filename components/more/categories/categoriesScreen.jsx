import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrackerContext } from '../../context/TrackerContext';
import { db } from '../../../config/firebase-config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';

export default function CategoriesScreen({ navigation }) {
  const { trackerId, trackerName, userId } = useContext(TrackerContext);
  const isGuest = !userId;

  const categoryTypes = ['Income', 'Expenses'];
  const [categoriesByType, setCategoriesByType] = useState({ Income: [], Expenses: [] });
  const [loadingByType, setLoadingByType] = useState({ Income: true, Expenses: true });

  /** ---------- Load categories ---------- */
  const loadCategories = async (type) => {
    setLoadingByType(prev => ({ ...prev, [type]: true }));

    if (isGuest) {
      try {
        const key = `guest_${trackerId || 'personal'}_${type}`;
        const raw = await AsyncStorage.getItem(key);
        const guestCategories = (raw ? JSON.parse(raw) : []).map(cat => ({
          ...cat,
          id: cat.categoryId || `temp_${Date.now()}_${Math.random()}`,
          subcategories: Array.isArray(cat.subcategories) ? cat.subcategories : [],
        }));

        setCategoriesByType(prev => ({ ...prev, [type]: guestCategories }));
      } catch (err) {
        console.error(`Failed to load ${type} categories (guest):`, err);
        setCategoriesByType(prev => ({ ...prev, [type]: [] }));
      } finally {
        setLoadingByType(prev => ({ ...prev, [type]: false }));
      }
    } else {
      const categoriesRef = collection(db, 'categories');
      const q = query(categoriesRef, where('trackerId', '==', trackerId), where('type', '==', type));
      return onSnapshot(q, snapshot => {
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCategoriesByType(prev => ({ ...prev, [type]: fetched }));
        setLoadingByType(prev => ({ ...prev, [type]: false }));
      });
    }
  };

  /** ---------- Guest category updates listener ---------- */
  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('guestCategoriesUpdated', ({ type, updatedCategories }) => {
      if (isGuest && type in categoriesByType) {
        const normalized = updatedCategories.map(cat => ({
          ...cat,
          id: cat.categoryId || `temp_${Date.now()}_${Math.random()}`,
          subcategories: Array.isArray(cat.subcategories) ? cat.subcategories : [],
        }));
        setCategoriesByType(prev => ({ ...prev, [type]: normalized }));
      }
    });
    return () => listener.remove();
  }, [categoriesByType, isGuest]);

  /** ---------- Load categories on focus ---------- */
  useFocusEffect(
    useCallback(() => {
      categoryTypes.forEach(type => loadCategories(type));
    }, [trackerId, userId])
  );

  /** ---------- Subheader ---------- */
  const subHeaderText = isGuest
    ? 'Guest Tracker'
    : trackerId === 'personal'
      ? 'Personal Budget Tracker'
      : trackerName || 'Shared Tracker';

  /** ---------- Save guest categories helper ---------- */
  const saveGuestCategories = async (type, updatedCategories) => {
    try {
      const key = `guest_${trackerId || 'personal'}_${type}`;
      await AsyncStorage.setItem(key, JSON.stringify(updatedCategories));
      DeviceEventEmitter.emit('guestCategoriesUpdated', { type, updatedCategories });
    } catch (err) {
      console.error('Failed to save guest categories', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Categories</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <Text style={styles.trackertype}>{subHeaderText}</Text>

      <ScrollView contentContainerStyle={styles.content}>
        {categoryTypes.map(type => (
          <View key={type} style={styles.typeSection}>
            {/* Section header */}
            <View style={styles.typeRow}>
              <Text style={styles.typeText}>{type}</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('EditCategoriesScreen', {
                    type,
                    categories: categoriesByType[type],
                    saveGuestCategories,
                  })
                }
              >
                <Ionicons name="create-outline" size={20} color="#145C84" />
              </TouchableOpacity>
            </View>

            {loadingByType[type] ? (
              <ActivityIndicator size="small" color="#145C84" style={{ marginTop: 12, marginLeft: 16 }} />
            ) : categoriesByType[type]?.length === 0 ? (
              <Text style={styles.fallbackText}>No categories yet.</Text>
            ) : (
              categoriesByType[type].map(cat => (
                <View key={cat.id} style={styles.accountItem}>
                  <View style={styles.accountRow}>
                    <Text style={styles.accountText}>{cat.name || 'Unnamed'}</Text>

                    {/* Navigate to SubcategoriesScreen */}
                    <TouchableOpacity
                      onPress={() => {
                        navigation.navigate('SubcategoriesScreen', {
                          categoryId: cat.id,
                          categoryName: cat.name,
                          parentType: type,
                          saveGuestCategories,
                        });
                      }}
                    >
                      <Ionicons name="create-outline" size={18} color="#386681" />
                    </TouchableOpacity>
                  </View>

                  {/* Display subcategories */}
                  {Array.isArray(cat.subcategories) && cat.subcategories.length > 0 && (
                    <View style={styles.subcategoryList}>
                      {cat.subcategories.map(sub => (
                        <View key={sub.id || sub.name} style={styles.subcategoryRow}>
                          <Text style={styles.subcategoryText}>{sub.name || 'Unnamed'}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerBackground: { height: 100, width: '100%', backgroundColor: '#145C84', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 12 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#A4C0CF' },
  trackertype: { fontWeight: 'bold', color: '#6FB5DB', fontSize: 14, textAlign: 'center', padding: 10, backgroundColor: '#EDEDEE', marginBottom: 15 },
  content: {},
  typeSection: { marginBottom: 16, width: '100%' },
  typeRow: { backgroundColor: '#f2f2f2', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeText: { fontSize: 14, color: '#19445C', fontWeight: 'bold' },
  fallbackText: { fontSize: 14, color: '#999', marginTop: 8, marginLeft: 16 },
  accountItem: { marginTop: 8, marginLeft: 16, paddingVertical: 6, borderRadius: 6 },
  accountText: { fontSize: 14, color: '#386681' },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16 },
  subcategoryList: { marginLeft: 16, marginTop: 4 },
  subcategoryRow: { marginVertical: 2 },
  subcategoryText: { fontSize: 14, color: '#386681' }, // same as category
});
