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

  const sections = [
    {
      title: 'Manage',
      data: [
        { label: 'Categories', icon: 'grid-outline', screen: 'CategoriesScreen' },
        { label: 'Accounts', icon: 'wallet-outline', screen: 'AccountDetailScreen' },
        { label: 'Tracker', icon: 'stats-chart-outline', screen: 'TrackerScreen' },
      ],
    },
    {
      title: 'Profile',
      data: [
        { label: 'User Profile', icon: 'person-outline', screen: 'UserProfileScreen' },
      ],
    },
    {
      title: 'System Configuration',
      data: [
        { label: 'Currency', icon: 'cash-outline', screen: 'CurrencyScreen' },
        { label: 'Cloud Sync', icon: 'cloud-upload-outline', screen: 'CloudSyncScreen' },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <Text style={styles.headerText}>More</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.grid}>
              {section.data.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.card}
                  onPress={() => navigation.navigate(option.screen)}
                >
                  <Ionicons name={option.icon} size={28} color="#145C84" />
                  <Text style={styles.label}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
    alignItems: 'center',
    paddingBottom: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A4C0CF',
  },

  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#145C84',
    marginBottom: 12,
  },

grid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'flex-start', // ✅ Align items starting from the left
  rowGap: 16,
  columnGap: '4%', // Optional: space between cards
},

  card: {
    width: '30%',
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
    fontSize: 13.5,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});
