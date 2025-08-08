import React, { useState, useEffect, useRef,useCallback  } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation,useFocusEffect  } from '@react-navigation/native';

export default function AccountsScreen() {
  const [grouped, setGrouped] = useState({
    Cash: [],
    Banks: [],
    'E-Wallets': [],
  });
  const [totalAssets, setTotalAssets] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState('₱');
  const [expandedTypes, setExpandedTypes] = useState({
    Cash: false,
    Banks: false,
    'E-Wallets': false,
  });

  const navigation = useNavigation();
  const pollingRef = useRef(null);


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


  const fetchGroupedAccounts = async () => {
    try {
      const stored = await AsyncStorage.getItem('all_accounts');
      const parsed = stored ? JSON.parse(stored) : {};

      const types = ['Cash', 'Banks', 'E-Wallets'];
      const groupedByType = { Cash: [], Banks: [], 'E-Wallets': [] };

      for (const type of types) {
        const accounts = (parsed[type] || []).filter(acc => acc && acc.id);

        const accountsWithBalance = await Promise.all(
          accounts.map(async acc => {
            const balanceStr = await AsyncStorage.getItem(`account_amount_${acc.id}`);
            const balance = parseFloat(balanceStr) || 0;
            return { ...acc, balance };
          })
        );

        groupedByType[type] = accountsWithBalance;
      }

      setGrouped(groupedByType);

      const allAccounts = Object.values(groupedByType).flat();
      const total = allAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
      setTotalAssets(total);
    } catch (err) {
      console.error('Failed to fetch grouped accounts:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchGroupedAccounts();

    // Poll every 1 second for changes
    pollingRef.current = setInterval(fetchGroupedAccounts, 1000);

    return () => clearInterval(pollingRef.current);
  }, []);

  const renderTypeSection = (type, items) => {
    const expanded = expandedTypes[type];
    const visibleItems = expanded ? items : items.slice(0, 3);
    const typeTotal = items.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);

    return (
      <View style={styles.typeSection}>
        <View style={styles.typeHeaderRow}>
          <View style={styles.typeHeader}>
            <Text style={styles.typeTitle}>{type}</Text>
            <Text style={styles.typeTotal}>{currencySymbol} {typeTotal.toFixed(2)}</Text>
          </View>
        </View>

        {visibleItems.length > 0 ? (
          visibleItems.map((item, idx) => (
            <View key={idx} style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              <Text
                style={[
                  styles.balance,
                  parseFloat(item.balance) < 0 && { color: '#E98898' },
                ]}
              >
                {currencySymbol} {parseFloat(item.balance).toFixed(2)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.fallbackText}>No {type} accounts added yet.</Text>
        )}

        {items.length > 3 && (
          <Text
            onPress={() =>
              setExpandedTypes(prev => ({
                ...prev,
                [type]: !prev[type],
              }))
            }
            style={styles.toggleText}
          >
            {expanded ? 'Show less ▲' : 'Show more ▼'}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <Text style={styles.headerText}>Accounts</Text>
      </View>

      <View style={styles.totalAssetsCard}>
        <Text style={styles.totalAssetsLabel}>Total Assets</Text>
        <Text style={styles.totalAssetsValue}>{currencySymbol} {totalAssets.toFixed(2)}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchGroupedAccounts} />
        }
      >
        {renderTypeSection('Cash', grouped.Cash)}
        {renderTypeSection('Banks', grouped.Banks)}
        {renderTypeSection('E-Wallets', grouped['E-Wallets'])}
      </ScrollView>
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
  totalAssetsCard: {
    backgroundColor: '#145C84',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalAssetsLabel: {
    fontSize: 16,
    color: '#F7F2B3',
  },
  totalAssetsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#91D1FF',
  },
  typeSection: {
    marginBottom: 16,
  },
  typeHeaderRow: {
    backgroundColor: '#EDEDEE',
    padding: 12,
    marginBottom: 8,
  },
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeTitle: {
    fontSize: 16,
    color: '#19445C',
  },
  typeTotal: {
    fontSize: 16,
    color: '#0076CA',
  },
  card: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 14,
  },
  balance: {
    fontSize: 14,
    color: '#0076CA',
  },
  fallbackText: {
    fontStyle: 'italic',
    color: '#999',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  toggleText: {
    textAlign: 'center',
    color: '#0076CA',
    marginTop: 6,
  },
});
