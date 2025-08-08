import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function SubcategoriesScreen({ navigation, route }) {
  const { parentCategory, parentType } = route.params;
  const [subcategories, setSubcategories] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  const storageKey = `subcategories_${parentCategory.id}`;

  useEffect(() => {
  const loadSubcategories = async () => {
    try {
      const allData = await AsyncStorage.getItem('all_categories');
      const parsed = allData ? JSON.parse(allData) : {};

      const categories = parsed[parentType] || [];
      const parent = categories.find((cat) => cat.id === parentCategory.id);

      setSubcategories(parent?.subcategories || []);
    } catch (error) {
      console.error('Failed to load subcategories:', error);
    }
  };

  loadSubcategories();
}, []);


  const handleAddField = () => {
    setSubcategories([
      ...subcategories,
      {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
        name: '',
      },
    ]);
    setHasChanges(true);
  };

  const handleChange = (text, index) => {
    const newSubs = [...subcategories];
    newSubs[index] = {
      ...newSubs[index],
      name: text,
    };
    setSubcategories(newSubs);
    setHasChanges(true);
  };

const handleSave = async () => {
  const cleaned = subcategories
    .filter(item => item.name.trim() !== '')
    .map(item => ({
      id: item.id || Date.now().toString() + Math.random().toString(36).substring(2, 8),
      name: item.name.trim(),
    }));

  try {
    // 1. Load all categories
    const allData = await AsyncStorage.getItem('all_categories');
    const parsed = allData ? JSON.parse(allData) : {};

    // 2. Update the correct category inside the correct type group
    const updatedCategories = (parsed[parentType] || []).map(cat => {
      if (cat.id === parentCategory.id) {
        return {
          ...cat,
          subcategories: cleaned,
        };
      }
      return cat;
    });

    // 3. Save it back
    await AsyncStorage.setItem(
      'all_categories',
      JSON.stringify({
        ...parsed,
        [parentType]: updatedCategories,
      })
    );

    setSubcategories(cleaned);
    setHasChanges(false);
    Alert.alert('Success', 'Subcategories saved!');
    navigation.goBack();
  } catch (error) {
    console.error('Save failed', error);
    Alert.alert('Error', 'Failed to save subcategories.');
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
          <Text style={styles.headerTitle}>{parentCategory.name} Subcategories</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <Text style={styles.trackertype}>Personal Budget Tracker</Text>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {subcategories.length > 0 ? (
            subcategories.map((item, index) => (
              <TextInput
                key={item.id || index}
                style={styles.input}
                value={item.name}
                placeholder="Enter subcategory name"
                onChangeText={(text) => handleChange(text, index)}
              />
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

  fallback: {
    textAlign: 'center',
    color: '#888',
    fontStyle: 'italic',
    marginVertical: 10,
  },

  input: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 8,
    marginBottom: 12,
    fontSize: 14.5,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  addButtonText: {
    marginLeft: 6,
    color: '#145C84',
    fontSize: 14,
  },

  saveButton: {
    backgroundColor: '#145C84',
    padding: 16,
    borderRadius: 0,
  },

  saveButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },

  content: {
    padding: 16,
    paddingBottom: 32,
  },
});
