import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function MoreScreen() {
  const navigation = useNavigation();

  const options = [
    { label: 'Categories', icon: 'grid-outline', screen: 'CategoriesScreen' },
    { label: 'Accounts', icon: 'wallet-outline', screen: 'AccountsScreen' },
    { label: 'Currency', icon: 'cash-outline', screen: 'CurrencyScreen' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <Text style={styles.headerText}>More</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            onPress={() => navigation.navigate(option.screen)}
          >
            <Ionicons name={option.icon} size={28} color="#145C84" />
            <Text style={styles.label}>{option.label}</Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    paddingBottom: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A4C0CF',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 20,
  },

  card: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    elevation: 2,
  },
  label: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});
