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

export default function EditCategoriesScreen({ navigation, route }) {
  const { type, categories: passedCategories } = route.params;
  const [categories, setCategories] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const loadCategoriesByType = async () => {
      try {
        const json = await AsyncStorage.getItem('all_categories');
        const grouped = json ? JSON.parse(json) : {};
        const current = grouped[type] || [];
        setCategories(current);
      } catch (error) {
        console.error('Failed to load grouped categories:', error);
      }
    };

    loadCategoriesByType();
  }, [type]);

  const handleAddField = () => {
    setCategories([
      ...categories,
      {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 8),
        name: '',
        amount: 0,
      },
    ]);
    setHasChanges(true);
  };

  const handleChange = (text, index) => {
    const newCategories = [...categories];
    newCategories[index] = {
      ...newCategories[index],
      name: text,
    };
    setCategories(newCategories);
    setHasChanges(true);
  };

  const handleSave = async () => {
    const cleaned = categories
      .filter(item => item.name.trim() !== '')
      .map(item => ({
        id: item.id || Date.now().toString() + Math.random().toString(36).substring(2, 8),
        name: item.name.trim(),
        amount: item.amount || 0,
      }));

    try {
      const json = await AsyncStorage.getItem('all_categories');
      const existing = json ? JSON.parse(json) : {};

      const updated = {
        ...existing,
        [type]: cleaned,
      };

      await AsyncStorage.setItem('all_categories', JSON.stringify(updated));

      setCategories(cleaned);
      setHasChanges(false);
      Alert.alert('Success', 'Categories saved!');
      navigation.goBack();
    } catch (error) {
      console.error('Save failed', error);
      Alert.alert('Error', 'Failed to save categories.');
    }
  };

   const handleDelete = (indexToDelete) => {
    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this category?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedCategories = categories.filter(
                (_, idx) => idx !== indexToDelete
              );
              setCategories(updatedCategories);
              setHasChanges(true);

              // Update AsyncStorage immediately
              const json = await AsyncStorage.getItem('all_categories');
              const existing = json ? JSON.parse(json) : {};
              existing[type] = updatedCategories;
              await AsyncStorage.setItem('all_categories', JSON.stringify(existing));
            } catch (error) {
              console.error('Failed to delete category:', error);
              Alert.alert('Error', 'Failed to delete the category.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

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

      <Text style={styles.trackertype}>Personal Budget Tracker</Text>
      <Text style={styles.incometext}>{type}</Text>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {categories.length > 0 ? (
            categories.map((item, index) => (
              <View key={item.id || index} style={styles.categoryRow}>
                <TextInput
                  style={styles.input}
                  value={item.name}
                  placeholder="Enter category name"
                  onChangeText={(text) => handleChange(text, index)}
                />
                <TouchableOpacity
                  onPress={() => handleDelete(index)}
                  style={styles.deleteIcon}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={20} color="#145C84" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.fallback}>No categories added yet.</Text>
          )}

          <TouchableOpacity onPress={handleAddField} style={styles.addButton}>
            <Ionicons name="add-circle-outline" size={20} color="#145C84" />
            <Text style={styles.addButtonText}>Add Category</Text>
          </TouchableOpacity>
        </ScrollView>

        {hasChanges && (
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save Categories</Text>
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

  incometext: {
    backgroundColor: '#EDEDEE',
    padding: 10,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#19445C',
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
  
categoryRow: {
  flexDirection: 'row',
  alignItems: 'center',
  borderBottomWidth: 1,
  borderColor: '#ccc',
  marginBottom: 12,
  paddingVertical: 6,      
},

input: {
  flex: 1,
  fontSize: 14.5,
  paddingVertical: 6,      
  paddingHorizontal: 0,     
  borderBottomWidth: 0,    
},

deleteIcon: {
  marginLeft: 8,
  paddingVertical: 6,      
},


});
