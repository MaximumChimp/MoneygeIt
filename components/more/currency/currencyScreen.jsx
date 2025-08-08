import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import getSymbolFromCurrency from 'currency-symbol-map';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CurrencyScreen({ navigation }) {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const isOfflineAlertShown = useRef(false); 

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        'https://v6.exchangerate-api.com/v6/772b8458edfd487894ee68fc/codes'
      );
      const data = await res.json();

      if (data?.supported_codes) {
        const formatted = data.supported_codes.map(([code, name]) => ({
          code,
          name,
          symbol: getSymbolFromCurrency(code) || '',
        }));

        const philippinesFirst = [
          ...formatted.filter(item => item.code === 'PHP'),
          ...formatted.filter(item => item.code !== 'PHP'),
        ];

        setCurrencies(philippinesFirst);

        await AsyncStorage.setItem('currencies_cache', JSON.stringify(philippinesFirst));
        isOfflineAlertShown.current = false;
      }
    } catch (err) {
      console.error('Error fetching currencies:', err);

      try {
        const cached = await AsyncStorage.getItem('currencies_cache');
        if (cached) {
          setCurrencies(JSON.parse(cached));
          if (!isOfflineAlertShown.current) {
            Alert.alert("Offline Mode", "Showing last saved currency list.");
            isOfflineAlertShown.current = true;
          }
        } else {
          if (!isOfflineAlertShown.current) {
            Alert.alert("No Internet", "Please connect to the internet to load currencies.");
            isOfflineAlertShown.current = true;
          }
        }
      } catch (storageErr) {
        console.error("Error loading cached currencies:", storageErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();

    const unsubscribe = NetInfo.addEventListener(state => {
      if (!state.isConnected && !isOfflineAlertShown.current) {
        Alert.alert("Offline", "Showing last saved data.");
        isOfflineAlertShown.current = true;
      } else if(state.isConnected) {
        // Reset alert flag when back online
        isOfflineAlertShown.current = false;
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredCurrencies = currencies.filter(
    item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase())
  );

  const displayedCurrencies = filteredCurrencies.slice(0, 10);

  const handleSelectCurrency = async (item) => {
    Alert.alert(
      "Confirm Currency",
      `Use ${item.name} (${item.symbol}) as your currency?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await AsyncStorage.setItem('selectedCurrency', JSON.stringify(item));
              navigation.goBack();
            } catch (error) {
              console.error("Error saving currency:", error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#A4C0CF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Currencies</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {/* Tracker Type Label */}
      <Text style={styles.trackertype}>Personal Budget Tracker</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#666" style={{ marginRight: 6 }} />
        <TextInput
          placeholder="Search by country or code..."
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#145C84" style={{ marginTop: 20 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {displayedCurrencies.map(item => (
            <TouchableOpacity
              key={item.code}
              style={styles.currencyItem}
              onPress={() => handleSelectCurrency(item)}
            >
              <Text style={styles.currencyName}>{item.name}</Text>
              <Text style={styles.currencySymbol}>{item.symbol}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F7F9',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  currencyItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  currencyName: {
    fontSize: 14,
    color: '#145C84',
    flexShrink: 1,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#386681',
  },
});
