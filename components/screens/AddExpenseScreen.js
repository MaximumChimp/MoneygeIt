import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

export default function AddExpenseScreen({ navigation }) {
  const [transactionType, setTransactionType] = useState('Income');
  const [amount, setAmount] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fee, setFee] = useState('');
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('₱');
  const amountInputRef = useRef(null);
  const feeInputRef = useRef(null);

  // Unified refresh function to load accounts & categories
const refreshData = useCallback(async () => {
  try {
    // Load grouped accounts from 'all_accounts'
    const rawGroupedAccounts = await AsyncStorage.getItem('all_accounts');
    const groupedAccounts = rawGroupedAccounts ? JSON.parse(rawGroupedAccounts) : {};

    // Flatten grouped accounts into a single array
    const parsedAccounts = Object.values(groupedAccounts).flat();

    setAccounts(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(parsedAccounts)) {
        return parsedAccounts;
      }
      return prev;
    });

    // Load categories based on transaction type
    if (transactionType !== 'Transfer') {
      const catRaw = await AsyncStorage.getItem('all_categories');
      const parsedCategories = catRaw ? JSON.parse(catRaw) : {};
      const filtered = parsedCategories[transactionType] || [];

      setCategories(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(filtered)) {
          return filtered;
        }
        return prev;
      });

      // Update selected category & subcategory if empty or changed
      if (!selectedCategory && filtered.length > 0) {
        setSelectedCategory(filtered[0].name);
        setSelectedSubcategory(filtered[0].subcategories?.[0]?.name || '');
      } else if (filtered.length > 0) {
        // Check if current selectedCategory exists in new filtered categories
        const catExists = filtered.some(cat => cat.name === selectedCategory);
        if (!catExists) {
          setSelectedCategory(filtered[0].name);
          setSelectedSubcategory(filtered[0].subcategories?.[0]?.name || '');
        } else {
          // Check if subcategory exists for selected category
          const cat = filtered.find(cat => cat.name === selectedCategory);
          if (
            selectedSubcategory &&
            !cat.subcategories?.some(sub => sub.name === selectedSubcategory)
          ) {
            setSelectedSubcategory(cat.subcategories?.[0]?.name || '');
          }
        }
      } else {
        setSelectedCategory('');
        setSelectedSubcategory('');
      }
    } else {
      // For Transfer type clear categories
      setCategories([]);
      setSelectedCategory('');
      setSelectedSubcategory('');
    }
  } catch (error) {
    console.error('Error refreshing data:', error);
  }
}, [transactionType, selectedCategory, selectedSubcategory]);


  // Refresh when screen focused
  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  // Polling every 3 seconds to detect changes while screen is active
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 3000);

    return () => clearInterval(interval);
  }, [refreshData]);

  // Reset form on transaction type change
  useEffect(() => {
    setAmount('');
    setFee('');
    setFromAccount('');
    setToAccount('');
    setSelectedAccount('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setDate(new Date());
  }, [transactionType]);

  // Load currency symbol once on focus
  useFocusEffect(
    useCallback(() => {
      const fetchCurrencySymbol = async () => {
        try {
          const savedCurrency = await AsyncStorage.getItem('selectedCurrency');
          if (savedCurrency) {
            const parsed = JSON.parse(savedCurrency);
            setCurrencySymbol(parsed.symbol);
          }
        } catch (err) {
          console.error('Failed to fetch currency symbol:', err);
        }
      };
      fetchCurrencySymbol();
    }, [])
  );

  const getSubcategories = () => {
    const found = categories.find(cat => cat.name === selectedCategory);
    return found?.subcategories?.map(sub => sub.name) || [];
  };

  const handleSave = async () => {
    if (!amount) {
      Alert.alert('Missing Field', 'Please enter an amount.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    const parsedFee = parseFloat(fee) || 0;
    let newTransaction;

    if (transactionType === 'Transfer') {
      if (!fromAccount || !toAccount) {
        Alert.alert('Missing Field', 'Please select both From and To accounts.');
        return;
      }
      if (fromAccount === toAccount) {
        Alert.alert('Invalid Transfer', 'From and To accounts must be different.');
        return;
      }

      newTransaction = {
        id: Date.now(),
        type: 'Transfer',
        amount: parsedAmount,
        fee: parsedFee,
        from: fromAccount,
        to: toAccount,
        date: date.toISOString(),
        timestamp: Date.now(),
      };

      const fromAccObj = accounts.find(acc => acc.name === fromAccount);
      const toAccObj = accounts.find(acc => acc.name === toAccount);

      if (fromAccObj && toAccObj) {
        const fromKey = `account_amount_${fromAccObj.id}`;
        const toKey = `account_amount_${toAccObj.id}`;
        const fromBal = parseFloat(await AsyncStorage.getItem(fromKey)) || 0;
        const toBal = parseFloat(await AsyncStorage.getItem(toKey)) || 0;

        await AsyncStorage.setItem(fromKey, (fromBal - parsedAmount - parsedFee).toString());
        await AsyncStorage.setItem(toKey, (toBal + parsedAmount).toString());
      }

    } else {
      if (!selectedAccount || !selectedCategory || !selectedSubcategory) {
        Alert.alert('Missing Field', 'Please fill in all required fields.');
        return;
      }

      newTransaction = {
        id: Date.now(),
        type: transactionType,
        amount: parsedAmount,
        account: selectedAccount,
        category: selectedCategory,
        subcategory: selectedSubcategory,
        date: date.toISOString(),
        timestamp: Date.now(),
      };

      const accObj = accounts.find(acc => acc.name === selectedAccount);
      if (accObj) {
        const accKey = `account_amount_${accObj.id}`;
        const currentBal = parseFloat(await AsyncStorage.getItem(accKey)) || 0;

        if (transactionType === 'Income') {
          await AsyncStorage.setItem(accKey, (currentBal + parsedAmount).toString());
        } else if (transactionType === 'Expenses') {
          await AsyncStorage.setItem(accKey, (currentBal - parsedAmount).toString());
        }
      }
    }

    try {
      const stored = await AsyncStorage.getItem('transactions');
      const current = stored ? JSON.parse(stored) : [];
      await AsyncStorage.setItem('transactions', JSON.stringify([...current, newTransaction]));

      setAmount('');
      setFee('');
      setFromAccount('');
      setToAccount('');
      setSelectedAccount('');
      setSelectedCategory('');
      setSelectedSubcategory('');

      navigation.navigate('MainTabs', { screen: 'Logs' });
    } catch (error) {
      Alert.alert('Error', 'Failed to save transaction.');
    }
  };

return (
  <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>New Log</Text>
    </View>
    <View style={styles.tabContainer}>
      {['Income', 'Expenses', 'Transfer'].map(type => (
        <TouchableOpacity
          key={type}
          onPress={() => setTransactionType(type)}
          style={[
            styles.tabButton,
            transactionType === type && styles.tabButtonActive,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              transactionType === type && styles.tabTextActive,
            ]}
          >
            {type}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    <View style={styles.amountSection}>
      <TextInput
        key={`amount-input-${currencySymbol}`}
        placeholder={`${currencySymbol || '₱'} 0.00`}
        placeholderTextColor="#999"
        keyboardType="numeric"
        value={amount}
        onChangeText={text => {
          const onlyNumbers = text.replace(/[^0-9.]/g, '');
          setAmount(onlyNumbers);
        }}
        style={styles.amountInput}
        onFocus={() => {
          setTimeout(() => {
            amountInputRef.current?.setNativeProps({
              selection: { start: amount.length, end: amount.length },
            });
          }, 0);
        }}
        ref={amountInputRef}
      />
      <Text style={styles.amountLabel}>Amount</Text>
    </View>

    {transactionType === 'Transfer' && (
      <>
        <View style={styles.feeRow}>
          <Text style={styles.label}>Fee</Text>
          <TextInput
            key={`fee-input-${currencySymbol}`}
            placeholder={`${currencySymbol || '₱'} 0.00`}
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={fee}
            onChangeText={text => {
              const onlyNumbers = text.replace(/[^0-9.]/g, '');
              setFee(onlyNumbers);
            }}
            style={styles.feeInput}
            onFocus={() => {
              setTimeout(() => {
                feeInputRef.current?.setNativeProps({
                  selection: { start: fee.length, end: fee.length },
                });
              }, 0);
            }}
            ref={feeInputRef}
          />
        </View>

        <Text style={styles.label}>From</Text>
        <View style={styles.gridWrap}>
          {accounts && accounts.length > 0 ? (
            accounts.map(item => (
              <TouchableOpacity
                key={item.id || item.name}
                style={[
                  styles.tabButton,
                  fromAccount === item.name && styles.tabButtonActive,
                  { marginRight: 8, marginBottom: 8 },
                ]}
                onPress={() => setFromAccount(item.name)}
              >
                <Text
                  style={[
                    styles.tabText,
                    fromAccount === item.name && styles.tabTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.fallbackText}>No accounts available</Text>
          )}
        </View>

        <Text style={styles.label}>To</Text>
        <View style={styles.gridWrap}>
          {accounts && accounts.length > 0 ? (
            accounts.map(item => (
              <TouchableOpacity
                key={item.id || item.name}
                style={[
                  styles.tabButton,
                  toAccount === item.name && styles.tabButtonActive,
                  { marginRight: 8, marginBottom: 8 },
                ]}
                onPress={() => setToAccount(item.name)}
              >
                <Text
                  style={[
                    styles.tabText,
                    toAccount === item.name && styles.tabTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.fallbackText}>No accounts available</Text>
          )}
        </View>
      </>
    )}

    {transactionType !== 'Transfer' && (
      <>
        {/* Account */}
        <Text style={styles.label}>Account</Text>
        <View style={styles.gridWrap}>
          {accounts && accounts.length > 0 ? (
            accounts.map(item => (
              <TouchableOpacity
                key={item.id || item.name}
                style={[
                  styles.tabButton,
                  selectedAccount === item.name && styles.tabButtonActive,
                  { marginRight: 8, marginBottom: 8 },
                ]}
                onPress={() => setSelectedAccount(item.name)}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedAccount === item.name && styles.tabTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.fallbackText}>No accounts available</Text>
          )}
        </View>

        <Text style={styles.label}>Category</Text>
        <View style={styles.gridWrap}>
          {categories && categories.length > 0 ? (
            categories.map(item => (
              <TouchableOpacity
                key={item.id || item.name}
                style={[
                  styles.tabButton,
                  selectedCategory === item.name && styles.tabButtonActive,
                  { marginRight: 8, marginBottom: 8 },
                ]}
                onPress={() => {
                  setSelectedCategory(item.name);
                  setSelectedSubcategory(item.subcategories?.[0]?.name || '');
                }}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedCategory === item.name && styles.tabTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.fallbackText}>No categories available</Text>
          )}
        </View>

        <Text style={styles.label}>Sub Category</Text>
        <View style={styles.gridWrap}>
          {getSubcategories().length > 0 ? (
            getSubcategories().map((sub, index) => (
              <TouchableOpacity
                key={`${sub}_${index}`}
                style={[
                  styles.tabButton,
                  selectedSubcategory === sub && styles.tabButtonActive,
                  { marginRight: 8, marginBottom: 8 },
                ]}
                onPress={() => setSelectedSubcategory(sub)}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedSubcategory === sub && styles.tabTextActive,
                  ]}
                >
                  {sub}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.fallbackText}>No subcategories available</Text>
          )}
        </View>
      </>
    )}

    <View style={styles.dateRow}>
      <Text style={styles.label}>Date</Text>
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={styles.dateButton}
      >
        <Text style={styles.dateText}>{date.toDateString()}</Text>
      </TouchableOpacity>
    </View>

    <DateTimePickerModal
      isVisible={showDatePicker}
      mode="date"
      date={date}
      onConfirm={selectedDate => {
        setShowDatePicker(false);
        setDate(selectedDate);
      }}
      onCancel={() => setShowDatePicker(false)}
      confirmTextIOS="Confirm"
      cancelTextIOS="Cancel"
    />

    <View style={styles.fixedButtonContainer}>
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </View>
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
    borderRadius: 4,
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

  label: {
    fontSize: 14,
    color: '#555',
    marginTop: 20,
    marginLeft: 20,
    marginBottom: 6,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  dateButton: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 6,
    marginLeft: 20,
    minWidth: 150,
  },

  dateText: {
    fontSize: 16,
    color: '#333',
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
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
  },
  saveText: {
    color: '#F7F2B3',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    paddingHorizontal: 15,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  feeInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 6,
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
    minWidth: 50,
    textAlign: 'right',
  },
  fallbackText: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    marginLeft: 16,
  },

});
