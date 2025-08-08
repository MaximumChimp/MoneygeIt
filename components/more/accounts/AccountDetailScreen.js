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

export default function AccountDetailScreen({ navigation }) {
  const accountTypes = ['Cash', 'Banks', 'E-Wallets'];
  const [categoriesByType, setCategoriesByType] = useState({
    Cash: [],
    Banks: [],
    'E-Wallets': [],
  });

  
useEffect(() => {
  const autoDeleteUnusedAccounts = async () => {
    try {
      const categoriesJson = await AsyncStorage.getItem('all_accounts');
      const allCategories = categoriesJson ? JSON.parse(categoriesJson) : {};

      const activeIds = Object.values(allCategories)
        .flat()
        .filter(acc => acc && acc.id)
        .map(acc => `account_amount_${acc.id}`);

      const allKeys = await AsyncStorage.getAllKeys();
      const amountKeys = allKeys.filter(key => key.startsWith('account_amount_'));

      const keysToDelete = amountKeys.filter(key => !activeIds.includes(key));

      if (keysToDelete.length > 0) {
        await AsyncStorage.multiRemove(keysToDelete);
        console.log('Auto-deleted unused account_amount keys:', keysToDelete);
      }
    } catch (err) {
      console.error('Error auto-deleting unused accounts:', err);
    }
  };

  autoDeleteUnusedAccounts();
}, []);
  useEffect(() => {
    const loadAllCategories = async () => {
      try {
        const categoriesJson = await AsyncStorage.getItem('all_accounts');
        const allCategories = categoriesJson ? JSON.parse(categoriesJson) : {};
        
        const grouped = {
          Cash: (allCategories.Cash || []).filter(acc => acc && acc.id),
          Banks: (allCategories.Banks || []).filter(acc => acc && acc.id),
          'E-Wallets': (allCategories['E-Wallets'] || []).filter(acc => acc && acc.id),
        };

        setCategoriesByType(grouped);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadAllCategories);
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
                onPress={() =>
                  navigation.navigate('EditAccountScreen', {
                    type,
                    accounts: categoriesByType[type],
                  })
                }
              >
                <Ionicons name="create-outline" size={20} color="#145C84" />
              </TouchableOpacity>
            </View>

            {categoriesByType[type]?.length === 0 ? (
              <Text style={styles.fallbackText}>No accounts yet.</Text>
            ) : (
              categoriesByType[type].map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={styles.accountItem}
                  onPress={() =>
                    navigation.navigate('SetupAccountScreen', {
                      account: acc,
                      type: acc.type || type,
                    })
                  }
                >
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountText}>{acc.name || 'Unnamed'}</Text>
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
    fontWeight: 'bold',
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

  accountInfo: {
    flexDirection: 'column',
  },

  accountText: {
    fontSize: 14,
    color: '#386681',
  },

  accountAmount: {
    fontSize: 13,
    color: '#888',
  },
});
