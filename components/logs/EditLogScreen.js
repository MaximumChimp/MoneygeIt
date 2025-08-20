import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function EditLogScreen({ navigation }) {
  const route = useRoute();
  const { id } = route.params ?? {}; // id may be undefined for new
  const isEditing = Boolean(id);

  const [transactionType, setTransactionType] = useState('Income');
  const [amount, setAmount] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, _setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fee, setFee] = useState('');
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('₱');
  const amountInputRef = useRef(null);
  const feeInputRef = useRef(null);

  // keep a ref of selectedCategory so interval doesn't close over stale value
  const selectedCategoryRef = useRef(selectedCategory);
  useEffect(() => { selectedCategoryRef.current = selectedCategory; }, [selectedCategory]);
  // setter wrapper to keep ref and state in sync
  const setSelectedCategory = (val) => {
    selectedCategoryRef.current = val;
    _setSelectedCategory(val);
  };

  const [initialLoadDone, setInitialLoadDone] = useState(false);


  useEffect(() => {
  const interval = setInterval(async () => {
    // your async code
  }, 3000);

  return () => clearInterval(interval); // make sure interval is cleared on unmount
}, [transactionType, isEditing]);

  // Only currency fetch on focus
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

  // single interval to refresh accounts/categories — but don't override user's selection
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const rawAccounts = await AsyncStorage.getItem('accounts');
        if (rawAccounts) {
          const parsed = JSON.parse(rawAccounts);
          setAccounts(prev => JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev);
        }

        const catRaw = await AsyncStorage.getItem('all_categories');
        if (catRaw) {
          const parsed = JSON.parse(catRaw);
          const filtered = parsed?.[transactionType] || [];

          setCategories(prev => JSON.stringify(prev) !== JSON.stringify(filtered) ? filtered : prev);

          // Only set a default if there's no selection AND we are NOT editing an existing transaction
          if (!selectedCategoryRef.current && filtered.length > 0 && !isEditing) {
            setSelectedCategory(filtered[0].name);
            setSelectedSubcategory(filtered[0].subcategories?.[0]?.name || '');
          }
        }
      } catch (err) {
        console.warn('Periodic refresh failed', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [transactionType, isEditing]);


  // Load transaction details by ID (editing)
  useEffect(() => {
    let mounted = true;
    const loadTransactionById = async () => {
      if (!id) {
        // not editing — mark initial load done so effects know
        if (mounted) setInitialLoadDone(true);
        return;
      }

      try {
        const stored = await AsyncStorage.getItem('transactions');
        if (stored) {
          const transactions = JSON.parse(stored);
          const found = transactions.find(t => t.id === id);
          if (found && mounted) {
            setTransactionType(found.type);
            setAmount(found.amount ? found.amount.toString() : '');
            setDate(found.date ? new Date(found.date) : new Date());

            if (found.type === 'Transfer') {
              setFee(found.fee ? found.fee.toString() : '');
              setFromAccount(found.from || '');
              setToAccount(found.to || '');
              // transfer has no categories
              setCategories([]);
              setSelectedCategory('');
              setSelectedSubcategory('');
            } else {
              setSelectedAccount(found.account || '');
              setSelectedCategory(found.category || '');
              setSelectedSubcategory(found.subcategory || '');
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load transaction by id', err);
      } finally {
        if (mounted) setInitialLoadDone(true);
      }
    };

    loadTransactionById();
    return () => { mounted = false; };
  }, [id]);


  // initial accounts load
  useEffect(() => {
    const loadAccounts = async () => {
      const raw = await AsyncStorage.getItem('all_accounts');
      if (raw) {
        const parsed = JSON.parse(raw);

        // If your all_accounts is grouped by type, flatten it here
        // For example, if it's like { Cash: [...], Banks: [...], ... }
        let allAccounts = [];
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          allAccounts = Object.values(parsed).flat();
        } else {
          allAccounts = parsed;
        }

        setAccounts(allAccounts);
      }
    };
    loadAccounts();
  }, []);



  // When transactionType changes, load categories for that type.
  // Don't overwrite user's selection when editing or if they already selected.
useEffect(() => {
  let mounted = true;

  if (transactionType === 'Transfer') {
    setCategories([]);
    setSelectedCategory('');
    setSelectedSubcategory('');
    return;
  }

  const loadData = async () => {
    try {
      const catRaw = await AsyncStorage.getItem('all_categories');
      const parsedCategories = catRaw ? JSON.parse(catRaw) : {};
      const filtered = parsedCategories[transactionType] || [];

      if (!mounted) return;
      setCategories(filtered);

      // Only apply default category if:
      // - We are NOT editing, AND
      // - No category already selected
      if (!isEditing && !selectedCategoryRef.current) {
        if (filtered.length > 0) {
          setSelectedCategory(filtered[0].name);
          setSelectedSubcategory(filtered[0].subcategories?.[0]?.name || '');
        }
        return;
      }

      // If editing, only clear selection if it doesn't exist **and** we finished loading the transaction
      if (
        isEditing &&
        initialLoadDone && // ✅ wait for transaction load
        selectedCategoryRef.current &&
        !filtered.some(c => c.name === selectedCategoryRef.current)
      ) {
        setSelectedCategory('');
        setSelectedSubcategory('');
      }
    } catch (err) {
      console.warn('Failed to load categories on type change', err);
    }
  };

  loadData();
  return () => { mounted = false; };
}, [transactionType, isEditing, initialLoadDone]); // ✅ added initialLoadDone



  
  // Reset fields only when creating new transactions (not editing)
  useEffect(() => {
    if (!isEditing) {
      setAmount('');
      setFee('');
      setFromAccount('');
      setToAccount('');
      setSelectedAccount('');
      // Do NOT forcibly reset selectedCategory/selectedSubcategory here — handled in transactionType effect
      setDate(new Date());
    }
  }, [transactionType, id, isEditing]);


  const getSubcategories = () => {
    const found = categories.find(cat => cat.name === selectedCategory);
    return found?.subcategories?.map(sub => sub.name) || [];
  };


const handleSave = async () => {
  if (!amount || isNaN(parseFloat(amount))) {
    Alert.alert('Missing Field', 'Please enter a valid amount.');
    return;
  }

  const parsedAmount = parseFloat(amount);
  const parsedFee = parseFloat(fee) || 0;

  let updatedTransaction;

  if (transactionType === 'Transfer') {
    if (!fromAccount) {
      Alert.alert('Missing Field', 'Please select a "From" account.');
      return;
    }
    if (!toAccount) {
      Alert.alert('Missing Field', 'Please select a "To" account.');
      return;
    }
    if (fromAccount === toAccount) {
      Alert.alert('Invalid Transfer', 'From and To accounts must be different.');
      return;
    }

    updatedTransaction = {
      id: id || Date.now(),
      type: 'Transfer',
      amount: parsedAmount,
      fee: parsedFee,
      from: fromAccount,
      to: toAccount,
      date: date.toISOString(),
      timestamp: Date.now(),
    };

  } else {
    if (!selectedAccount) {
      Alert.alert('Missing Field', 'Please select an account.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Missing Field', 'Please select a category.');
      return;
    }
    if (!selectedSubcategory) {
      Alert.alert('Missing Field', 'Please select a subcategory.');
      return;
    }

    updatedTransaction = {
      id: id || Date.now(),
      type: transactionType,
      amount: parsedAmount,
      account: selectedAccount,
      category: selectedCategory,
      subcategory: selectedSubcategory,
      date: date.toISOString(),
      timestamp: Date.now(),
    };
  }

  try {
    // Load current transactions
    const stored = await AsyncStorage.getItem('transactions');
    let current = stored ? JSON.parse(stored) : [];

    // Load accounts list to get their IDs
    const rawAccounts = await AsyncStorage.getItem('accounts');
    const accountsList = rawAccounts ? JSON.parse(rawAccounts) : [];

    // Find old transaction for balance revert if editing
    const oldTransaction = isEditing ? current.find(t => t.id === id) : null;

    // Helper to find account object by name
    const findAccountByName = (name) => accountsList.find(acc => acc.name === name);

    // Function to update balance of account by ID and delta amount
    const updateBalance = async (accountId, delta) => {
      const key = `account_amount_${accountId}`;
      const currentBalRaw = await AsyncStorage.getItem(key);
      const currentBal = currentBalRaw ? parseFloat(currentBalRaw) : 0;
      const newBal = currentBal + delta;
      await AsyncStorage.setItem(key, newBal.toString());
    };

    // --- Revert old transaction effect on balances ---
    if (isEditing && oldTransaction) {
      if (oldTransaction.type === 'Transfer') {
        const fromAcc = findAccountByName(oldTransaction.from);
        const toAcc = findAccountByName(oldTransaction.to);
        if (fromAcc && toAcc) {
          // Revert old transfer
          await updateBalance(fromAcc.id, oldTransaction.amount + (oldTransaction.fee || 0));
          await updateBalance(toAcc.id, -oldTransaction.amount);
        }
      } else {
        const acc = findAccountByName(oldTransaction.account);
        if (acc) {
          // Revert old income/expense
          const revertAmount = oldTransaction.type === 'Income' ? -oldTransaction.amount : oldTransaction.amount;
          await updateBalance(acc.id, revertAmount);
        }
      }
    }

    // --- Apply updated transaction effect on balances ---
    if (updatedTransaction.type === 'Transfer') {
      const fromAcc = findAccountByName(updatedTransaction.from);
      const toAcc = findAccountByName(updatedTransaction.to);
      if (fromAcc && toAcc) {
        await updateBalance(fromAcc.id, -(updatedTransaction.amount + (updatedTransaction.fee || 0)));
        await updateBalance(toAcc.id, updatedTransaction.amount);
      }
    } else {
      const acc = findAccountByName(updatedTransaction.account);
      if (acc) {
        const amountDelta = updatedTransaction.type === 'Income' ? updatedTransaction.amount : -updatedTransaction.amount;
        await updateBalance(acc.id, amountDelta);
      }
    }

    // Save transactions list updated with current edit/add
    if (isEditing) {
      current = current.map(t => (t.id === id ? updatedTransaction : t));
    } else {
      current.push(updatedTransaction);
    }
    await AsyncStorage.setItem('transactions', JSON.stringify(current));

    // Reset inputs after save
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
    console.error(error);
  }
};



  const handleDelete = async () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const stored = await AsyncStorage.getItem('transactions');
              if (stored) {
                const current = JSON.parse(stored);
                const updated = current.filter(t => t.id !== id);
                await AsyncStorage.setItem('transactions', JSON.stringify(updated));
              }
              navigation.navigate('MainTabs', { screen: 'Logs' });
            } catch (error) {
              Alert.alert('Error', 'Failed to delete transaction.');
            }
          }
        }
      ]
    );
  };


  return (
    <View style={styles.container}>
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Log</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>
      <View style={styles.tabContainer}>
        {['Income', 'Expenses', 'Transfer'].map(type => (
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

      <View style={styles.amountSection}>
        <TextInput
          key={`amount-input-${currencySymbol}`}
          placeholder={`${currencySymbol || '₱'} 0.00`}
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={amount}
          onChangeText={(text) => {
            const onlyNumbers = text.replace(/[^0-9.]/g, '');
            setAmount(onlyNumbers);
          }}
          style={styles.amountInput}
          onFocus={() => {
            setTimeout(() => {
              amountInputRef.current?.setNativeProps({
                selection: { start: amount.length, end: amount.length }
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
              onChangeText={(text) => {
                const onlyNumbers = text.replace(/[^0-9.]/g, '');
                setFee(onlyNumbers);
              }}
              style={styles.feeInput}
              onFocus={() => {
                setTimeout(() => {
                  feeInputRef.current?.setNativeProps({
                    selection: { start: fee.length, end: fee.length }
                  });
                }, 0);
              }}
              ref={feeInputRef}
            />
          </View>

          <Text style={styles.label}>From</Text>
          <View style={styles.gridWrap}>
            {accounts.map((item) => (
              <TouchableOpacity
                key={item.id || item.name}
                style={[
                  styles.tabButton,
                  fromAccount === item.name && styles.tabButtonActive,
                  { marginRight: 8, marginBottom: 8 },
                ]}
                onPress={() => setFromAccount(item.name)}
              >
                <Text style={[
                  styles.tabText,
                  fromAccount === item.name && styles.tabTextActive,
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>To</Text>
          <View style={styles.gridWrap}>
            {accounts.map((item) => (
              <TouchableOpacity
                key={item.id || item.name}
                style={[
                  styles.tabButton,
                  toAccount === item.name && styles.tabButtonActive,
                  { marginRight: 8, marginBottom: 8 },
                ]}
                onPress={() => setToAccount(item.name)}
              >
                <Text style={[
                  styles.tabText,
                  toAccount === item.name && styles.tabTextActive,
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}


      {transactionType !== 'Transfer' && (
        <>
          <Text style={styles.label}>Account</Text>
          <View style={styles.gridWrap}>
            {accounts.map((item) => (
              <TouchableOpacity
                key={item.id || item.name}
                style={[
                  styles.tabButton,
                  selectedAccount === item.name && styles.tabButtonActive,
                  { marginRight: 8, marginBottom: 8 },
                ]}
                onPress={() => setSelectedAccount(item.name)}
              >
                <Text style={[
                  styles.tabText,
                  selectedAccount === item.name && styles.tabTextActive,
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Category</Text>
          <View style={styles.gridWrap}>
            {categories.map((item) => (
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
                <Text style={[
                  styles.tabText,
                  selectedCategory === item.name && styles.tabTextActive,
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Sub Category</Text>
          <View style={styles.gridWrap}>
            {getSubcategories().map((sub, index) => (
              <TouchableOpacity
                key={`${sub}_${index}`}
                style={[
                  styles.tabButton,
                  selectedSubcategory === sub && styles.tabButtonActive,
                  { marginRight: 8, marginBottom: 8 },
                ]}
                onPress={() => setSelectedSubcategory(sub)}
              >
                <Text style={[
                  styles.tabText,
                  selectedSubcategory === sub && styles.tabTextActive,
                ]}>
                  {sub}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <View style={styles.dateRow}>
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
          <Text style={styles.dateText}>{date.toDateString()}</Text>
        </TouchableOpacity>
      </View>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={date}
        onConfirm={(selectedDate) => {
          setShowDatePicker(false);
          setDate(selectedDate);
        }}
        onCancel={() => setShowDatePicker(false)}
        confirmTextIOS="Confirm"
        cancelTextIOS="Cancel"
      />
      <View style={styles.fixedButtonContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color="#145C84" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* (kept your original styles unchanged) */
  container: { flex: 1, backgroundColor: '#fff', },

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
  pillList: {
    paddingHorizontal: 16,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#DCE4E8',
    borderRadius: 16,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: '#145C84',
  },
  pillText: {
    color: '#444',
    fontSize: 13,
  },
  pillTextActive: {
    color: '#fff',
    fontWeight: 'bold',
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
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },

  saveButton: {
     flex: 1,            // take all remaining space (full width minus delete button)
    backgroundColor: '#145C84',
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
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
    paddingHorizontal: 15
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
  deleteButton: {
    backgroundColor: '#A4C0CF',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    width: 48,          // fixed width so it stays inline and small
    height: 48,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
});
