import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  DeviceEventEmitter,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { TrackerContext } from '../context/TrackerContext';
import NetInfo from "@react-native-community/netinfo";
import {
  collection, doc, getDocs, query, where, setDoc, addDoc
} from "firebase/firestore";
import { db } from "../../config/firebase-config";

export default function AddExpenseScreen({ navigation }) {
  const { trackerId, trackerName, userId, mode, isGuest, isShared } = useContext(TrackerContext);
  const [currentTrackerName, setCurrentTrackerName] = useState(trackerName || 'Guest Tracker');

  const [transactionType, setTransactionType] = useState('Income');
  const [amount, setAmount] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fee, setFee] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('₱');
  const accountTypes = ["Cash", "Banks", "E-Wallets"];
  const [isConnected, setIsConnected] = useState(true);
  const amountInputRef = useRef(null);
  const feeInputRef = useRef(null);

  // Account IDs
  const [selectedAccountId, setSelectedAccountId] = useState(''); // Income/Expense
  const [fromAccountId, setFromAccountId] = useState('');         // Transfer From
  const [toAccountId, setToAccountId] = useState('');             // Transfer To

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected && state.isInternetReachable);
    });
    return () => unsubscribe();
  }, []);

  // Load currency
  useEffect(() => {
    AsyncStorage.getItem('selectedCurrency')
      .then((res) => {
        if (res) setCurrencySymbol(JSON.parse(res).symbol || '₱');
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('currencyChanged', (newCurrency) => {
      setCurrencySymbol(newCurrency.symbol);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setCurrentTrackerName(trackerName || 'Guest Tracker');
  }, [trackerName]);

  // Refresh accounts & categories
  const refreshData = useCallback(async () => {
    try {
      let allAccounts = [];

      /** ---------- ACCOUNTS ---------- */
      for (const type of accountTypes) {
        if (isGuest) {
          const key = `guest_${trackerId}_${type}`;
          const json = await AsyncStorage.getItem(key);
          const accountsOfType = json ? JSON.parse(json) : [];
          allAccounts.push(...accountsOfType.map(acc => ({ ...acc, type })));
        } else if (userId) {
          const pathBase = mode === 'personal'
            ? ['users', userId, 'trackers', trackerId]
            : ['sharedTrackers', trackerId];

          const ref = collection(db, ...pathBase, type);
          const snapshot = await getDocs(ref);
          let liveAccounts = snapshot.docs.map(d => ({ id: d.id, ...d.data(), type }));

          allAccounts.push(...liveAccounts);
        }
      }
      setAccounts(allAccounts);

      /** ---------- CATEGORIES + SUBCATEGORIES ---------- */
      if (transactionType !== 'Transfer') {
        if (isGuest) {
          const key = `guest_${trackerId}_${transactionType}`;
          const raw = await AsyncStorage.getItem(key);
          const guestCategories = (raw ? JSON.parse(raw) : []).map(cat => ({
            ...cat,
            id: cat.categoryId || `temp_${Date.now()}_${Math.random()}`,
            subcategories: Array.isArray(cat.subcategories) ? cat.subcategories : [],
          }));
          setCategories(guestCategories);

          if (!selectedCategory && guestCategories.length > 0) {
            setSelectedCategory(guestCategories[0].name);
            setSelectedSubcategory(guestCategories[0].subcategories?.[0]?.name || '');
          }
        } else {
          const categoriesRef = collection(db, 'categories');
          const q = query(categoriesRef,
            where('trackerId', '==', trackerId),
            where('type', '==', transactionType)
          );
          const snapshot = await getDocs(q);

          const categoriesWithSubs = await Promise.all(
            snapshot.docs.map(async (docSnap) => {
              const category = { id: docSnap.id, ...docSnap.data() };
              try {
                const subRef = collection(db, 'categories', docSnap.id, 'subcategories');
                const subSnap = await getDocs(subRef);
                category.subcategories = !subSnap.empty
                  ? subSnap.docs.map(sub => ({ id: sub.id, ...sub.data() }))
                  : Array.isArray(category.subcategories) ? category.subcategories : [];
              } catch {
                category.subcategories = Array.isArray(category.subcategories)
                  ? category.subcategories
                  : [];
              }
              return category;
            })
          );

          setCategories(categoriesWithSubs);

          if (!selectedCategory && categoriesWithSubs.length > 0) {
            setSelectedCategory(categoriesWithSubs[0].name);
            setSelectedSubcategory(categoriesWithSubs[0].subcategories?.[0]?.name || '');
          }
        }
      } else {
        setCategories([]);
        setSelectedCategory('');
        setSelectedSubcategory('');
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  }, [trackerId, userId, mode, transactionType, selectedCategory, selectedSubcategory, isGuest]);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  useEffect(() => {
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, [refreshData]);

  useEffect(() => {
    setAmount('');
    setFee('');
    setFromAccountId('');
    setToAccountId('');
    setSelectedAccountId('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setDate(new Date());
  }, [transactionType]);

  const getSubcategories = () => {
    const found = categories.find((cat) => cat.name === selectedCategory);
    return found?.subcategories?.map((sub) => sub.name) || [];
  };

  // ---------------- SAVE TRANSACTION ----------------
const handleSave = async () => {
  // console.log('handleSave called');
  console.log('amount:', amount, 'fee:', fee, 'transactionType:', transactionType, 'date:', date);

  if (!amount || isNaN(parseFloat(amount))) {
    console.log('Invalid amount');
    return Alert.alert("Missing Field", "Please enter a valid amount.");
  }

  const parsedAmount = Number(amount);
  const parsedFee = Number(fee) || 0;
  console.log('parsedAmount:', parsedAmount, 'parsedFee:', parsedFee);

  // Lookup accounts from IDs
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const fromAccount = accounts.find(a => a.id === fromAccountId);
  const toAccount = accounts.find(a => a.id === toAccountId);
  // console.log('selectedAccount:', selectedAccount);
  // console.log('fromAccount:', fromAccount);
  // console.log('toAccount:', toAccount);

  try {
    const timestamp = Date.now();
    let newTransaction = {
      id: timestamp,
      type: transactionType,
      amount: parsedAmount,
      fee: parsedFee,
      date: date.toISOString(),
      timestamp,
    };
    //console.log('Initial newTransaction:', newTransaction);

    // ---------- Helper to update account ----------
    const updateAccount = async (account, value) => {
      //console.log('updateAccount called for:', account, 'new value:', value);
      if (!account?.id || !account?.type) return;

      if (isGuest) {
        const key = `guest_${trackerId}_${account.type}`;
        const json = await AsyncStorage.getItem(key);
        const accList = json ? JSON.parse(json) : [];
        const idx = accList.findIndex(a => a.id === account.id);
        if (idx !== -1) {
          accList[idx].amount = value;
          await AsyncStorage.setItem(key, JSON.stringify(accList));
          //console.log('Guest account updated:', accList[idx]);
        }
      } else {
        // Firestore path for shared or personal tracker
        const collectionPath = mode ==="shared"
          ? ['sharedTrackers', trackerId, account.type]
          : ['users', userId, 'trackers', trackerId, account.type];
        console.log('userid',userId)
        console.log('mode',mode)
        console.log('PATH:',collectionPath)
        const accountRef = doc(db, ...collectionPath, account.id);
        await setDoc(accountRef, { amount: value }, { merge: true });
        //console.log('Firestore account updated at path:', [...collectionPath, account.id], 'new amount:', value);
      }
    };

    // ---------- Handle TRANSFER ----------
    if (transactionType === "Transfer") {
      console.log('Handling Transfer');
      
      if (!fromAccount || !toAccount) {
        console.log('Missing From/To account');
        return Alert.alert("Missing Field", "Please select both From and To accounts.");
      }

      if (fromAccount.id === toAccount.id) {
        console.log('From and To accounts are the same');
        return Alert.alert("Invalid Transfer", "From and To accounts must be different.");
      }

      // Save full account info in the transaction
      newTransaction = { 
        ...newTransaction,
        from: { id: fromAccount.id, name: fromAccount.name, type: fromAccount.type },
        to: { id: toAccount.id, name: toAccount.name, type: toAccount.type }
      };

      console.log('Transfer newTransaction:', newTransaction);

      // Update account balances
      await updateAccount(fromAccount, (fromAccount.amount || 0) - (parsedAmount + parsedFee));
      await updateAccount(toAccount, (toAccount.amount || 0) + parsedAmount);
    }

    // ---------- Handle INCOME / EXPENSE ----------
    else {
      console.log('Handling Income/Expense');
      if (!selectedAccount || !selectedCategory || !selectedSubcategory) {
        console.log('Missing account/category/subcategory');
        return Alert.alert("Missing Field", "Please fill in all required fields.");
      }

      newTransaction = {
        ...newTransaction,
        account: selectedAccount.id,
        category: selectedCategory,
        subcategory: selectedSubcategory,
      };
      console.log('Income/Expense newTransaction:', newTransaction);

      const delta = transactionType === "Income"
        ? parsedAmount - parsedFee
        : -(parsedAmount + parsedFee);
      console.log('Delta to apply to account:', delta);

      await updateAccount(selectedAccount, (selectedAccount.amount || 0) + delta);
    }

    // ---------- Save transaction ----------
    if (isGuest) {
      const key = `guest_${trackerId}_transactions`;
      const stored = await AsyncStorage.getItem(key);
      const current = stored ? JSON.parse(stored) : [];
      await AsyncStorage.setItem(key, JSON.stringify([...current, newTransaction]));
      console.log('Transaction saved to guest storage:', newTransaction);
    } else {
      const pathBase = mode ==="shared"
        ? ['sharedTrackers', trackerId, 'transactions']
        : ['users', userId, 'trackers', trackerId, 'transactions'];

      const transactionsRef = collection(db, ...pathBase);
      await addDoc(transactionsRef, newTransaction);
      console.log('Transaction saved to Firestore at path:', pathBase, 'data:', newTransaction);
    }

    // ---------- Reset form ----------
    console.log('Resetting form');
    setAmount('');
    setFee('');
    setFromAccountId('');
    setToAccountId('');
    setSelectedAccountId('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setDate(new Date());

    await refreshData();
    console.log('Data refreshed, navigating to Logs');
    navigation.navigate("MainTabs", { screen: "Logs" });

  } catch (err) {
    console.error("Save error:", err);
    Alert.alert("Error", "Failed to save transaction.");
  }
};





  // ------------------- RENDER -------------------
return (
  <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>New Log</Text>
    </View>
    {currentTrackerName && <Text style={styles.subHeader}>{currentTrackerName}</Text>}

    {/* Tabs */}
    <View style={styles.tabContainer}>
      {['Income', 'Expenses', 'Transfer'].map((type) => (
        <TouchableOpacity
          key={type}
          onPress={() => setTransactionType(type)}
          style={[styles.tabButton, transactionType === type && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, transactionType === type && styles.tabTextActive]}>
            {type}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Amount */}
      <View style={styles.amountSection}>
        <TextInput
          key={`amount-input-${currencySymbol}`}
          placeholder={`${currencySymbol || '₱'} 0.00`}
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={amount}
          onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
          style={styles.amountInput}
          ref={amountInputRef}
        />
        <Text style={styles.amountLabel}>Amount</Text>
      </View>

    {/* Transfer Fields */}
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
            onChangeText={(text) => setFee(text.replace(/[^0-9.]/g, ''))}
            style={styles.feeInput}
            ref={feeInputRef}
          />
        </View>

        <Text style={styles.label}>From</Text>
        {(!isConnected && !isGuest) ? (
          <Text style={styles.fallbackText}>No internet connection. Accounts are unavailable.</Text>
        ) : (
          <View style={styles.gridWrap}>
            {accounts.map(acc => (
              <TouchableOpacity
                key={acc.id}
                style={[styles.tabButton, fromAccountId === acc.id && styles.tabButtonActive, { marginRight: 8, marginBottom: 8 }]}
                onPress={() => setFromAccountId(acc.id)}
              >
                <Text style={[styles.tabText, fromAccountId === acc.id && styles.tabTextActive]}>{acc.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>To</Text>
        {(!isConnected && !isGuest) ? (
          <Text style={styles.fallbackText}>No internet connection. Accounts are unavailable.</Text>
        ) : (
          <View style={styles.gridWrap}>
            {accounts.map(acc => (
              <TouchableOpacity
                key={acc.id}
                style={[styles.tabButton, toAccountId === acc.id && styles.tabButtonActive, { marginRight: 8, marginBottom: 8 }]}
                onPress={() => setToAccountId(acc.id)}
              >
                <Text style={[styles.tabText, toAccountId === acc.id && styles.tabTextActive]}>{acc.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </>
    )}


      {/* Income/Expense Fields */}
      {transactionType !== 'Transfer' && (
        <>
          <Text style={styles.label}>Account</Text>
          {(!isConnected && !isGuest) ? (
            <Text style={styles.fallbackText}>No internet connection. Accounts are unavailable.</Text>
          ) : (
            <View style={styles.gridWrap}>
              {accounts.map(acc => (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.tabButton, selectedAccountId === acc.id && styles.tabButtonActive, { marginRight: 8, marginBottom: 8 }]}
                  onPress={() => setSelectedAccountId(acc.id)}
                >
                  <Text style={[styles.tabText, selectedAccountId === acc.id && styles.tabTextActive]}>{acc.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Category</Text>
          {(!isConnected && !isGuest) ? (
            <Text style={styles.fallbackText}>No internet connection. Categories are unavailable.</Text>
          ) : (
            <View style={styles.gridWrap}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id || cat.name}
                  style={[styles.tabButton, selectedCategory === cat.name && styles.tabButtonActive, { marginRight: 8, marginBottom: 8 }]}
                  onPress={() => {
                    setSelectedCategory(cat.name);
                    setSelectedSubcategory(cat.subcategories?.[0]?.name || '');
                  }}
                >
                  <Text style={[styles.tabText, selectedCategory === cat.name && styles.tabTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Sub Category</Text>
          {(!isConnected && !isGuest) ? (
            <Text style={styles.fallbackText}>No internet connection. Subcategories are unavailable.</Text>
          ) : (
            <View style={styles.gridWrap}>
              {getSubcategories().map((sub, idx) => (
                <TouchableOpacity
                  key={`${sub}_${idx}`}
                  style={[styles.tabButton, selectedSubcategory === sub && styles.tabButtonActive, { marginRight: 8, marginBottom: 8 }]}
                  onPress={() => setSelectedSubcategory(sub)}
                >
                  <Text style={[styles.tabText, selectedSubcategory === sub && styles.tabTextActive]}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      {/* Date */}
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
        maximumDate={new Date()}
        onConfirm={(d) => {
          setShowDatePicker(false);
          setDate(d);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </ScrollView>

    {/* Save Button */}
    <View style={styles.fixedButtonContainer}>
      <TouchableOpacity
        style={[styles.saveButton, (!isConnected && !isGuest) && { backgroundColor: '#ccc' }]}
        onPress={handleSave}
        disabled={!isConnected && !isGuest}
      >
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
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#A4C0CF' },
  subHeader: {
    fontWeight: 'bold',
    color: '#6FB5DB',
    fontSize: 14,
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#EDEDEE',
    marginBottom: 15,
    borderRadius: 6,
    width:'100%'
  },
  tabContainer: { flexDirection: 'row', justifyContent: 'space-evenly', paddingVertical: 12 },
  tabButton: { paddingVertical: 8, paddingHorizontal: 28, backgroundColor: '#D6DEE3', borderRadius: 4 },
  tabButtonActive: { backgroundColor: '#89C3E6' },
  tabText: { fontSize: 14, color: '#707C83' },
  tabTextActive: { color: '#fff', fontWeight: 'bold' },
  amountSection: { alignItems: 'center' },
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
  amountLabel: { fontSize: 16, color: '#386681', marginTop: 8, textAlign: 'center' },
  label: { fontSize: 14, color: '#555', marginTop: 20, marginLeft: 20, marginBottom: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
  dateButton: { borderBottomWidth: 1, borderBottomColor: '#ccc', paddingVertical: 6, marginLeft: 20, minWidth: 150 },
  dateText: { fontSize: 16, color: '#333' },
  fixedButtonContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingHorizontal: 30, paddingBottom: Platform.OS === 'ios' ? 30 : 20, borderTopWidth: 1, borderTopColor: '#eee' },
  saveButton: { position: 'absolute', bottom: 50, left: 30, right: 30, backgroundColor: '#145C84', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  saveText: { color: '#F7F2B3', fontSize: 16, fontWeight: 'bold' },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', paddingHorizontal: 15 },
  feeRow: { flexDirection: 'row', alignItems: 'flex-end' },
  feeInput: { borderBottomWidth: 1, borderBottomColor: '#ccc', paddingVertical: 6, marginLeft: 15, fontSize: 16, color: '#333', minWidth: 50, textAlign: 'right' },
  fallbackText: { fontSize: 13, color: '#999', marginTop: 8, marginLeft: 16 },
});
