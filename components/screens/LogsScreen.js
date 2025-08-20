import React, { useEffect, useState,useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect,useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { Ionicons } from '@expo/vector-icons';
export default function LogsScreen() {
  const navigation = useNavigation();
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [filter, setFilter] = useState('Daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [history, setHistory] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [currencySymbol, setCurrencySymbol] = useState('₱');
  
  useFocusEffect(
    React.useCallback(() => {
      setFilter('Daily');
      setSelectedDate(new Date());
    }, [])
  );

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

useFocusEffect(
  useCallback(() => {
    const fetchHistory = async () => {
      const stored = await AsyncStorage.getItem('transactions');
      if (stored) {
        const parsed = JSON.parse(stored);
        const sorted = parsed.sort((a, b) => b.timestamp - a.timestamp);
        setHistory(sorted);
        applyFilter(sorted, filter, selectedDate); // filter right after fetching
      }
    };
    fetchHistory();
  }, [filter, selectedDate])
);
useEffect(() => {
  applyFilter(history, filter, selectedDate);
}, [filter, selectedDate, history]);

  useEffect(() => {
    const fetchExpenses = async () => {
      const stored = await AsyncStorage.getItem('expenses');
      if (stored) {
        const parsed = JSON.parse(stored);
        setExpenses(parsed);
        applyFilter(parsed, filter, selectedDate);
      }
    };

    fetchExpenses();
    const interval = setInterval(fetchExpenses, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilter(expenses, filter, selectedDate);
  }, [filter, selectedDate]);

const applyFilter = (data, range, baseDate) => {
  const now = baseDate || new Date();
  const filtered = data.filter((item) => {
    const itemDate = item.date ? new Date(item.date) : null;
    if (!itemDate) return false;

    switch (range) {
      case 'Daily':
        return itemDate.toDateString() === now.toDateString();
      case 'Weekly': {
        const itemWeek = getWeekNumber(itemDate);
        const selectedWeek = getWeekNumber(now);
        return itemWeek === selectedWeek && itemDate.getFullYear() === now.getFullYear();
      }

      case 'Monthly':
        return (
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getFullYear() === now.getFullYear()
        );
      case 'Yearly':
        return itemDate.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  });
  setFilteredTransactions(filtered.reverse());
};

const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

const formatDateLabel = (filterType, date) => {
  if (!date) return '';

  switch (filterType) {
    case 'Daily':
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    case 'Weekly':
      const weekNum = getWeekNumber(date);
      return `Week ${weekNum}, ${date.getFullYear()}`;
    case 'Monthly':
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
    case 'Yearly':
      return `${date.getFullYear()}`;
    default:
      return date.toLocaleDateString();
  }
};
useEffect(() => {
  setSelectedDate(new Date());
}, [filter]);

const handlePrevDate = () => {
  const newDate = new Date(selectedDate);
  switch (filter) {
    case 'Daily':
      newDate.setDate(newDate.getDate() - 1);
      break;
    case 'Weekly':
      newDate.setDate(newDate.getDate() - 7);
      break;
    case 'Monthly':
      newDate.setMonth(newDate.getMonth() - 1);
      break;
    case 'Yearly':
      newDate.setFullYear(newDate.getFullYear() - 1);
      break;
    default:
      newDate.setDate(newDate.getDate() - 1);
  }
  setSelectedDate(newDate);
};

 const handleNextDate = () => {
  const newDate = new Date(selectedDate);
  switch (filter) {
    case 'Daily':
      newDate.setDate(newDate.getDate() + 1);
      break;
    case 'Weekly':
      newDate.setDate(newDate.getDate() + 7);
      break;
    case 'Monthly':
      newDate.setMonth(newDate.getMonth() + 1);
      break;
    case 'Yearly':
      newDate.setFullYear(newDate.getFullYear() + 1);
      break;
    default:
      newDate.setDate(newDate.getDate() + 1);
  }
  setSelectedDate(newDate);
};
const renderItem = ({ item }) => {
    let amountColor = "#888";
    if (item.type === "Income") amountColor = "#0076CA";
    else if (item.type === "Expenses") amountColor = "#E98898";
    else if (item.type === "Transfer") amountColor = "#999999"; // neutral gray

    return (
      <TouchableOpacity
         onPress={() => navigation.navigate('EditLogScreen', { id: item.id })}
      >
        <View style={styles.card}>
          <View style={styles.left}>
            {item.type === "Transfer" ? (
              <>
                <Text style={styles.category}>
                  Transfer from: {item.from || 'N/A'}
                </Text>
                <Text style={styles.subcategory}>
                  Transfer to: {item.to || 'N/A'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.subcategory}>{item.subcategory}</Text>
              </>
            )}
          </View>

          <View style={styles.right}>
            <Text style={[styles.transactionAmount, { color: amountColor }]}>
              {currencySymbol} {Number(item.amount).toFixed(2)}
            </Text>
            <Text style={styles.date}>
              {new Date(item.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };




  const filters = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

const calculateTotal = (type) => {
  let income = 0;
  let expense = 0;
  let transfer = 0;

  filteredTransactions.forEach((item) => {
    if (item.type.toLowerCase() === 'income') {
      income += Number(item.amount);
    } else if (item.type.toLowerCase() === 'expenses') {
      expense += Number(item.amount);
    } else if (item.type.toLowerCase() === 'transfer') {
      transfer += Number(item.amount);
    }
  });

  switch (type) {
    case 'income':
      return income.toFixed(2);
    case 'expense':
      return expense.toFixed(2);
    case 'transfer':
      return transfer.toFixed(2);
    case 'total':
      return (income - expense).toFixed(2);
    default:
      return '0.00';
  }
};



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <Text style={styles.headerText}>Logs</Text>
      </View>
      <Text style={styles.subHeader}>Personal Budget Tracker</Text>
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.activeFilterBtn]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Always show date row */}
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={handlePrevDate} style={{ marginHorizontal: 10 }}>
          <Ionicons name="chevron-back-outline" size={24} color="#145C84" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setShowPicker(true)}>
          <Text style={styles.dateText}>
          {formatDateLabel(filter, selectedDate)}
        </Text>

        </TouchableOpacity>

        <TouchableOpacity onPress={handleNextDate} style={{ marginHorizontal: 10 }}>
          <Ionicons name="chevron-forward-outline" size={24} color="#145C84" />
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowPicker(false);
            if (date) {
              setSelectedDate(date);
            }
          }}
        />
      )}

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: '#CFE7DC' }]}>Income</Text>
          <Text style={[styles.summaryValue, { color: '#CFE7DC' }]}>
            {currencySymbol} {calculateTotal('income')}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: '#FFB8B8' }]}>Expenses</Text>
          <Text style={[styles.summaryValue, { color: '#E98898' }]}>
            {currencySymbol} {calculateTotal('expense')}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: '#FFF7C2' }]}>Total</Text>
          <Text style={[styles.summaryValue, { color: '#F7F2B3' }]}>
            {currencySymbol} {calculateTotal('total')}
          </Text>
        </View>
      </View>

      {history.length === 0 ? (
        <Text style={styles.fallbackText}>No transactions in your history yet.</Text>
      ) : (
        <FlatList
          contentContainerStyle={{ paddingTop: 10 }}
          data={filteredTransactions}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff',
   },
  headerBackground: {
    height: 100,
    width: '100%',
    backgroundColor: '#145C84',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A4C0CF',
  },
  subHeader: {
  fontSize: 14,
  fontWeight: '600',
  color: '#6FB5DB',
  textAlign: 'center',
  paddingVertical: 10,
  backgroundColor: '#EDEDEE',
  marginBottom: 15,
},
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 15,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  activeFilterBtn: {
    backgroundColor: '#89C3E6',
  },
  filterText: {
    fontSize: 14,
    color: '#707C83',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    gap: 10,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#145C84',
  },
   fallbackText: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    marginLeft: 26,
  },

  desc: {
    fontSize: 16,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryCard: {
    backgroundColor: '#145C84',
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    marginVertical: 10,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FBFDFF',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  left: {
    flexDirection: 'column',
  },
  transactionAmount:{
    fontSize:15
  },  
  category: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  subcategory: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 13,
    color: '#B4BCC0',
    marginTop: 2,
  },
});
