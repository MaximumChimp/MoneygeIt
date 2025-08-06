import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AnalyticsScreen() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [dailyAvg, setDailyAvg] = useState(0);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const stored = await AsyncStorage.getItem('expenses');
      const parsed = stored ? JSON.parse(stored) : [];

      setExpenses(parsed);

      const totalSpent = parsed.reduce((sum, item) => sum + parseFloat(item.amount), 0);
      setTotal(totalSpent);

      const uniqueDays = [...new Set(parsed.map((item) => {
        return item.timestamp ? new Date(item.timestamp).toDateString() : 'unknown';
      }))];

      const dayCount = uniqueDays.includes('unknown') ? parsed.length : uniqueDays.length || 1;
      setDailyAvg(totalSpent / dayCount);
    };

    fetchAnalytics();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <Text style={styles.headerText}>Analytics</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Total Spending:</Text>
        <Text style={styles.value}>₱ {total.toFixed(2)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Daily Average:</Text>
        <Text style={styles.value}>₱ {dailyAvg.toFixed(2)}</Text>
      </View>
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
  card: {
    backgroundColor: '#f1f1f1',
    padding: 20,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 20,
  },
  label: {
    fontSize: 18,
    color: '#333',
  },
  value: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0076CA',
    marginTop: 8,
  },
});
