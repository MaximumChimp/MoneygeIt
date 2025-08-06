import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function AddExpenseScreen({ navigation }) {
  const [transactionType, setTransactionType] = useState('Income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [accounts, setAccounts] = useState([]);

  // Reset to Income every time screen is focused
  useFocusEffect(
    useCallback(() => {
      setTransactionType('Income');
    }, [])
  );

  // Load accounts from AsyncStorage on mount
  useEffect(() => {
    const loadAccounts = async () => {
      const stored = await AsyncStorage.getItem('accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        setAccounts(parsed);
        if (parsed.length > 0) setCategory(parsed[0].name); // Default to first account name
      }
    };
    loadAccounts();
  }, []);

  const uniqueAccounts = accounts.filter(
    (acc, index, self) => index === self.findIndex((a) => a.name === acc.name)
  );

  const handleSave = async () => {
    if (!amount) {
      Alert.alert('Missing Field', 'Please enter an amount.');
      return;
    }

    const newTransaction = {
      type: transactionType,
      description: '',
      amount: parseFloat(amount),
      category: category || 'Uncategorized',
      timestamp: Date.now(),
    };

    try {
      const stored = await AsyncStorage.getItem('expenses');
      const current = stored ? JSON.parse(stored) : [];
      await AsyncStorage.setItem('expenses', JSON.stringify([...current, newTransaction]));

      setAmount('');
      setCategory('');
      navigation.navigate('Logs');
    } catch (error) {
      Alert.alert('Error', 'Failed to save transaction.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Log</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['Income', 'Expense', 'Transfer'].map(type => (
          <TouchableOpacity
            key={type}
            onPress={() => setTransactionType(type)}
            style={[
              styles.tabButton,
              transactionType === type && styles.tabButtonActive
            ]}
          >
            <Text style={[
              styles.tabText,
              transactionType === type && styles.tabTextActive
            ]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Amount input */}
      <View style={styles.amountSection}>
        <TextInput
          placeholder="₱0.00"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={amount}
          onChangeText={(text) => {
            const onlyNumbers = text.replace(/[^0-9.]/g, '');
            setAmount(onlyNumbers);
            }}
          style={styles.amountInput}
        />
        <Text style={styles.amountLabel}>Amount</Text>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    height: 100,
    width: '100%',
    backgroundColor: '#145C84',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A4C0CF',
  },

  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 12,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 28,
    backgroundColor: '#D6DEE3',
    borderRadius: 4
  },
  tabButtonActive: {
    backgroundColor: '#89C3E6',
  },
  tabText: {
    fontSize: 14,
    color: '#707C83',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },

  amountSection: {
    alignItems: 'center',
    marginTop: 15,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#B4BCC0',
    width: '60%',
    textAlign: 'center',
    paddingBottom: 6,
  },
  amountLabel: {
    fontSize: 16,
    color: '#386681',
    marginTop: 8,
    textAlign: 'center',
  },

  saveButton: {
    position: 'absolute',
    bottom: 50,
    left: 30,
    right: 30,
    backgroundColor: '#145C84',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: {
    color: '#F7F2B3',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
