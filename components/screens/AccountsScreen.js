import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AccountsScreen() {
  const [accounts, setAccounts] = useState([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [grouped, setGrouped] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState({
  Cash: false,
  Banks: false,
  'E-wallets': false,
});

  const fetchAccounts = useCallback(async () => {
    try {
      setRefreshing(true);
      const stored = await AsyncStorage.getItem('accounts');
      const parsed = stored ? JSON.parse(stored) : [];

      const total = parsed.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
      setTotalAssets(total);
      setAccounts(parsed);

      const groupedByType = {
        Cash: [],
        Banks: [],
        'E-wallets': [],
      };

      parsed.forEach((acc) => {
        const type = acc.type || 'Cash';
        if (groupedByType[type]) {
          groupedByType[type].push(acc);
        }
      });

      setGrouped(groupedByType);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

const renderTypeSection = (type, items) => {
  const expanded = expandedTypes[type];
  const visibleItems = expanded ? items : items.slice(0, 3);
  const typeTotal = items.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

  return (
    <View style={styles.typeSection}>
      <View style={styles.typeHeaderRow}>
        <View style={styles.typeHeader}>
          <Text style={styles.typeTitle}>{type}</Text>
          <Text style={styles.typeTotal}>₱ {typeTotal.toFixed(2)}</Text>
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
              ₱ {parseFloat(item.balance).toFixed(2)}
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
        <Text style={styles.totalAssetsValue}>₱ {totalAssets.toFixed(2)}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchAccounts} />
        }
      >
        {renderTypeSection('Cash', grouped.Cash || [])}
        {renderTypeSection('Banks', grouped.Banks || [])}
        {renderTypeSection('E-wallets', grouped['E-wallets'] || [])}
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
    fontSize: 16 
  },
  balance: { 
    fontSize: 16, 
    color: '#0076CA' 
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
