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

export default function CategoriesScreen({ navigation }) {
  const categoryTypes = ['Income', 'Expenses'];
  const [categoriesByType, setCategoriesByType] = useState({
    Income: [],
    Expenses: [],
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await AsyncStorage.getItem('all_categories');
        const all = data ? JSON.parse(data) : {};

        const grouped = {
          Income: (all.Income || []).filter(cat => cat && cat.id),
          Expenses: (all.Expenses || []).filter(cat => cat && cat.id),
        };

        setCategoriesByType(grouped);
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadCategories);
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
          <Text style={styles.headerTitle}>Categories</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {/* Label */}
      <Text style={styles.trackertype}>Personal Budget Tracker</Text>

      {/* Content */}
<ScrollView contentContainerStyle={styles.content}>
  {categoryTypes.map((type) => (
    <View key={type} style={styles.typeSection}>
      {/* Section header with edit button */}
      <View style={styles.typeRow}>
        <Text style={styles.typeText}>{type}</Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('EditCategoriesScreen', {
              type,
              categories: categoriesByType[type],
            })
          }
        >
          <Ionicons name="create-outline" size={20} color="#145C84" />
        </TouchableOpacity>
      </View>

      {/* Categories list */}
      {categoriesByType[type]?.length === 0 ? (
        <Text style={styles.fallbackText}>No categories yet.</Text>
      ) : (
        categoriesByType[type].map((cat) => (
          <View key={cat.id} style={styles.accountItem}>
            {/* Parent category */}
            <View style={styles.accountRow}>
              <Text style={styles.accountText}>{cat.name || 'Unnamed'}</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('SubcategoriesScreen', {
                    parentCategory: cat,
                    parentType: type,
                  })
                }
              >
                <Ionicons name="create-outline" size={18} color="#386681" />
              </TouchableOpacity>
            </View>

            {/* Subcategories (indented) */}
            {Array.isArray(cat.subcategories) && cat.subcategories.length > 0 && (
              <View style={styles.subcategoryList}>
                {cat.subcategories.map((sub) => (
                  <Text key={sub.id || sub.name} style={styles.subcategoryText}>
                    {sub.name || 'Unnamed'}
                  </Text>
                ))}
              </View>
            )}
          </View>
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
  accountRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingRight: 16,
},
subcategoryList: {
  marginLeft: 24,
  marginTop: 4,
},

subcategoryText: {
  fontSize: 13,
  color: '#5C7B8A',
  paddingVertical: 2,
},

});
