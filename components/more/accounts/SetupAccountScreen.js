import React, { useState,useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SetupAccountScreen({ navigation, route }) {
  const { account } = route?.params || {};
 const passedName = route?.params?.account?.name || '';
  const [selectedType, setSelectedType] = useState(route?.params?.type || 'Cash');
  const [name, setName] = useState(passedName);
  const [amount, setAmount] = useState(account?.amount?.toString() || '');

  const types = ['Cash', 'Banks', 'E-Wallets'];
    useEffect(() => {
    const fetchAmount = async () => {
        try {
        if (account?.name) {
            const storedAmount = await AsyncStorage.getItem(`account_amount_${account.name}`);
            if (storedAmount) {
            setAmount(storedAmount);
            }
        }
        } catch (err) {
        console.error('Failed to fetch amount:', err);
        }
    };

    fetchAmount();
    }, []);


const handleSave = async () => {
  if (!name.trim()) {
    Alert.alert('Validation', 'Please enter an account name.');
    return;
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) {
    Alert.alert('Validation', 'Please enter a valid amount.');
    return;
  }

  const trimmedName = name.trim();
  const accountData = {
    name: trimmedName,
    amount: parsedAmount,
    type: selectedType,
  };

  try {
    const existing = await AsyncStorage.getItem('accounts');
    let parsed = existing ? JSON.parse(existing) : [];

    // Check if this is an update (editing an existing account)
    const isEditing = !!account;
    let oldName = account?.name;

    if (isEditing) {
      // Remove the old entry
      parsed = parsed.filter(acc => acc.name !== oldName);

      // If name has changed, remove old amount key
      if (oldName !== trimmedName) {
        await AsyncStorage.removeItem(`account_amount_${oldName}`);
      }
    }

    // Add updated/new account
    parsed.push(accountData);

    // Save updated list
    await AsyncStorage.setItem('accounts', JSON.stringify(parsed));

    // Save the amount under the new name
    await AsyncStorage.setItem(`account_amount_${trimmedName}`, amount);

    Alert.alert('Success', 'Account saved!');
    navigation.goBack();
  } catch (err) {
    console.error('Error saving account', err);
    Alert.alert('Error', 'Something went wrong.');
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
          <Text style={styles.headerTitle}>Set up {selectedType}</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {/* Sub-header */}
      <Text style={styles.trackertype}>Personal Budget Tracker</Text>

      <View style={styles.content}>
        {/* Tab Label */}
        <Text style={styles.groupLabel}>Group</Text>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          {types.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.tab,
                selectedType === type && styles.selectedTab,
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedType === type && styles.selectedTabText,
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Name Field */}
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Enter account name"
          style={styles.bottomInput}
        />

       {/* Amount Field */}
        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountInputWrapper}>
        <Text style={styles.currencyIcon}>₱</Text>
        <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
            style={styles.amountInput}
        />
        </View>


        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>
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

  content: {
    paddingHorizontal: 16,
  },

  groupLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#386681',
    marginBottom: 8,
  },

  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },

  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: '#eee',
    marginRight: 10,
  },

  selectedTab: {
    backgroundColor: '#89C3E6',
  },

  tabText: {
    fontSize: 14,
    color: '#333',
  },

  selectedTabText: {
    color: '#EBF8FF',
    fontWeight: 'bold',
  },

  label: {
    fontSize: 14,
    color: '#386681',
    marginBottom: 6,
    fontWeight: 'bold',
  },

  bottomInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 8,
    marginBottom: 20,
  },

  saveButton: {
    backgroundColor: '#145C84',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  saveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  amountInputWrapper: {
  flexDirection: 'row',
  alignItems: 'center',
  borderBottomWidth: 1,
  borderBottomColor: '#ccc',
  marginBottom: 20,
},

currencyIcon: {
  fontSize: 16,
  marginRight: 6,
  color: '#333',
},

amountInput: {
  flex: 1,
  paddingVertical: 8,
},

});
