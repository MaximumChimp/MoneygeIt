import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AccountDetailScreen({ route, navigation }) {
  const accountTypes = ['Cash', 'Banks', 'E-Wallets'];
  const [accountsByType, setAccountsByType] = useState({
    Cash: [],
    Banks: [],
    'E-Wallets': [],
  });

useEffect(() => {
  const loadAllAccounts = async () => {
    try {
      const json = await AsyncStorage.getItem('accounts');
      const allAccounts = json ? JSON.parse(json) : [];

      const grouped = {
        Cash: [],
        Banks: [],
        'E-Wallets': [],
      };

      for (const acc of allAccounts) {
        if (grouped[acc.type]) {
          grouped[acc.type].push(acc);
        } else {
          // fallback in case of unexpected type
          grouped[acc.type] = [acc];
        }
      }

      console.log('Grouped accounts by type:', grouped);
      setAccountsByType(grouped);
    } catch (error) {
      console.error('Error loading accounts', error);
    }
  };

  const unsubscribe = navigation.addListener('focus', loadAllAccounts);
  return unsubscribe;
}, [navigation]);



  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Accounts</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {/* Tracker Type Label */}
      <Text style={styles.trackertype}>Personal Budget Tracker</Text>

      {/* Content */}
     <ScrollView contentContainerStyle={styles.content}>
  {accountTypes.map((type) => (
    <View key={type} style={styles.typeSection}>
      <View style={styles.typeRow}>
        <Text style={styles.typeText}>{type}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('EditAccountScreen', { type })}
        >
          <Ionicons name="create-outline" size={20} color="#145C84" />
        </TouchableOpacity>
      </View>

      {accountsByType[type]?.length === 0 ? (
        <Text style={styles.fallbackText}>No accounts yet.</Text>
      ) : (
        accountsByType[type].map((acc, idx) => (
  <TouchableOpacity
    key={typeof acc === 'object' && acc?.id ? acc.id : `${type}_${idx}`}
    style={styles.accountItem}
    onPress={() =>
      navigation.navigate('SetupAccountScreen', {
        account: typeof acc === 'string' ? { name: acc } : acc,
        type,
      })
    }
  >
    <View style={styles.accountInfo}>
          <Text style={styles.accountText}>
            {typeof acc === 'string' ? acc : acc?.name || 'Unnamed'}
          </Text>
          {typeof acc === 'object' && acc?.amount != null && (
            <Text style={styles.amountText}>
              ₱{parseFloat(acc.amount || 0).toFixed(2)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    ))

      )}
    </View>
  ))}
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

  content: {},

  typeSection: {
    marginBottom: 16,
    width: '100%',
  },

  typeRow: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  typeText: {
    fontSize: 14,
    color: '#19445C',
    fontWeight:"bold"
  },

  fallbackText: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    marginLeft: 16,
  },

  accountItem: {
    marginTop: 8,
    marginLeft: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },

  accountText: {
    fontSize: 14,
    color: '#386681',
  },
});
