import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker'; // <-- Make sure to install this
import { Ionicons } from '@expo/vector-icons';

export default function LogsScreen() {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [filter, setFilter] = useState('Daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setFilter('Daily');
      setSelectedDate(new Date());
    }, [])
  );

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
      const itemDate = item.timestamp ? new Date(item.timestamp) : null;
      if (!itemDate) return false;

      switch (range) {
        case 'Daily':
          return itemDate.toDateString() === now.toDateString();
        case 'Weekly':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          return itemDate >= startOfWeek;
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
    setFilteredExpenses(filtered.reverse());
  };

  const handlePrevDate = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDate = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.desc}>{item.description}</Text>
      <Text style={styles.amount}>₱ {item.amount}</Text>
    </View>
  );

  const filters = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

  const calculateTotal = (type) => {
    let income = 0;
    let expense = 0;

    filteredExpenses.forEach((item) => {
      if (item.type === 'income') {
        income += Number(item.amount);
      } else {
        expense += Number(item.amount);
      }
    });

    switch (type) {
      case 'income':
        return income.toFixed(2);
      case 'expense':
        return expense.toFixed(2);
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
            {selectedDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
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
            ₱ {calculateTotal('income')}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: '#FFB8B8' }]}>Expenses</Text>
          <Text style={[styles.summaryValue, { color: '#E98898' }]}>
            ₱ {calculateTotal('expense')}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: '#FFF7C2' }]}>Total</Text>
          <Text style={[styles.summaryValue, { color: '#F7F2B3' }]}>
            ₱ {calculateTotal('total')}
          </Text>
        </View>
      </View>

      {filteredExpenses.length === 0 ? (
        <Text style={styles.empty}>No transactions in your history yet.</Text>
      ) : (
        <FlatList
          contentContainerStyle={{ paddingTop: 10 }}
          data={filteredExpenses}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
        />
      )}
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
    alignItems: 'center',
    paddingBottom: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A4C0CF',
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
  empty: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 50,
  },
  card: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 5,
    borderLeftColor: '#ff7b00',
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
});
