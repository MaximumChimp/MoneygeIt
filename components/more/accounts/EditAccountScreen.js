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

export default function EditAccountScreen({ navigation, route }) {
  const account = route?.params?.account || { name: '', type: 'Cash' };
  const { name, type } = account;

const [inputs, setInputs] = useState([]);
const [existingCategories, setExistingCategories] = useState([]);
const [hasChanges, setHasChanges] = useState(false);
useEffect(() => {
  console.log('ROUTE PARAMS:', route?.params);
}, []);

useEffect(() => {
  const loadCategories = async () => {
    try {
      const json = await AsyncStorage.getItem(`categories_${type}`);
      if (json) {
        setExistingCategories(JSON.parse(json));
      }
    } catch (error) {
      console.error('Error loading categories', error);
    }
  };
  loadCategories();
}, [type]);

  const handleAddField = () => {
    setInputs([...inputs, '']);
  };

  const handleChange = (text, index) => {
    const newInputs = [...inputs];
    newInputs[index] = text;
    setInputs(newInputs);
    setHasChanges(true);
  };


  const handleSave = async () => {
    const newItems = inputs.filter((item) => item.trim() !== '');
    const updatedExisting = existingCategories.filter((item) => item.trim() !== '');
    const updated = [...updatedExisting, ...newItems];

    try {
      await AsyncStorage.setItem(`categories_${type}`, JSON.stringify(updated));
      setExistingCategories(updated);
      setInputs([]);
      setHasChanges(false);
      Alert.alert('Success', 'Categories saved!');
      navigation.goBack();
    } catch (error) {
      console.error('Save failed', error);
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
          <Text style={styles.headerTitle}>Edit {name || type} Account</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <Text style={styles.trackertype}>Personal Budget Tracker</Text>
      <Text style={styles.incometext}>{name || type}</Text>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Existing Categories */}
          {existingCategories.length > 0 ? (
            existingCategories.map((item, index) => (
              <TextInput
                key={index}
                style={styles.input}
                value={item}
                onChangeText={(text) => {
                  const updated = [...existingCategories];
                  if (updated[index] !== text) {
                    updated[index] = text;
                    setExistingCategories(updated);
                    setHasChanges(true);
                  }
                }}


              />
            ))
          ) : (
            <Text style={styles.fallback}>No categories added yet.</Text>
          )}


          {/* Input Fields */}
          {inputs.map((value, index) => (
            <TextInput
              key={index}
              placeholder="Enter category name"
              style={styles.input}
              value={value}
              onChangeText={(text) => handleChange(text, index)}
            />
          ))}

          {/* Add Field Button */}
          <TouchableOpacity onPress={handleAddField} style={styles.addButton}>
            <Ionicons name="add-circle-outline" size={20} color="#145C84" />
            <Text style={styles.addButtonText}>Add Category</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Save Button at Bottom */}
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
    fontWeight:"bold",
    color:"#19445C"
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

  categoryRow: {
    borderBottomWidth:1,
    borderBottomColor:"#145C84",
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },

  categoryText: {
    color: '#333',
    fontSize: 14.5,
  },

  content: {
    padding: 16,
    paddingBottom: 32,
  },
});
