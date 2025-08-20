import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { VictoryPie } from 'victory-native';


const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [dailyAvg, setDailyAvg] = useState(0);
  const [selectedTab, setSelectedTab] = useState('Income');
  const [selectedFilter, setSelectedFilter] = useState('Daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [categoryData, setCategoryData] = useState([]);
  const [displayCategoryData, setDisplayCategoryData] = useState([]);
  const categoryColors = [
    '#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F',
    '#EDC949', '#AF7AA1', '#FF9DA7', '#9C755F', '#BAB0AC',
  ];

useFocusEffect(
  useCallback(() => {
    const fetchAnalytics = async () => {
      try {
        // Immediately clear or reset display to trigger animation
        setDisplayCategoryData([]);

        const stored = await AsyncStorage.getItem('transactions');
        const parsed = stored ? JSON.parse(stored) : [];

        // Filter by selected tab (Income/Expenses)
        const filteredByType = parsed.filter(item => item.type === selectedTab);

        // Filter by date
        const filteredByDate = applyDateFilter(filteredByType, selectedFilter, currentDate);
        setExpenses(filteredByDate);

        // Total amount
        const totalSpent = filteredByDate.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        setTotal(totalSpent);

        // Daily average calculation
        const uniqueDays = [...new Set(filteredByDate.map(item => {
          return item.date ? new Date(item.date).toDateString() : 'unknown';
        }))];
        const dayCount = uniqueDays.includes('unknown') ? filteredByDate.length : uniqueDays.length || 1;
        setDailyAvg(totalSpent / dayCount);

        // Totals per category
        const catTotalsMap = {};
        filteredByDate.forEach(item => {
          const cat = item.category || 'Others';
          if (!catTotalsMap[cat]) catTotalsMap[cat] = 0;
          catTotalsMap[cat] += parseFloat(item.amount);
        });

        const catTotalsArr = Object.entries(catTotalsMap)
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount);

        // Set category data for logic and animation
        setCategoryData(catTotalsArr);

        // Trigger pie chart animation
       setDisplayCategoryData([...catTotalsArr]);

      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      }
    };

    fetchAnalytics();
  }, [selectedTab, selectedFilter, currentDate])
);



function applyDateFilter(items, filter, date) {
  return items.filter(item => {
    if (!item.date) return false;
    const itemDate = new Date(item.date);

    switch (filter) {
      case 'Daily':
        return (
          itemDate.getDate() === date.getDate() &&
          itemDate.getMonth() === date.getMonth() &&
          itemDate.getFullYear() === date.getFullYear()
        );
      case 'Weekly': {
        const getWeek = (d) => {
          const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          const dayNum = target.getUTCDay() || 7;
          target.setUTCDate(target.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
          return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
        };
        return (
          itemDate.getFullYear() === date.getFullYear() &&
          getWeek(itemDate) === getWeek(date)
        );
      }
      case 'Monthly':
        return (
          itemDate.getMonth() === date.getMonth() &&
          itemDate.getFullYear() === date.getFullYear()
        );
      case 'Yearly':
        return itemDate.getFullYear() === date.getFullYear();
      default:
        return true;
    }
  });
}


  function getFormattedDate(filter, date) {
    switch (filter) {
      case 'Daily':
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      case 'Weekly': {
        const getWeek = (d) => {
          const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          const dayNum = target.getUTCDay() || 7;
          target.setUTCDate(target.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
          return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
        };
        return `Week ${getWeek(date)} ${date.getFullYear()}`;
      }
      case 'Monthly':
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
        });
      case 'Yearly':
        return date.getFullYear().toString();
      default:
        return '';
    }
  }

const handleDateChange = (direction) => {
  let newDate = new Date(currentDate);

  switch (selectedFilter) {
    case 'Daily':
      newDate.setDate(currentDate.getDate() + (direction === 'left' ? -1 : 1));
      break;
    case 'Weekly':
      newDate.setDate(currentDate.getDate() + (direction === 'left' ? -7 : 7));
      break;
    case 'Monthly':
      newDate.setMonth(currentDate.getMonth() + (direction === 'left' ? -1 : 1));
      break;
    case 'Yearly':
      newDate.setFullYear(currentDate.getFullYear() + (direction === 'left' ? -1 : 1));
      break;
  }

  setCurrentDate(newDate);

  // Optional: Immediately reset displayCategoryData to empty or previous value to trigger animation
  setDisplayCategoryData([]);
};


  const filters = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
  };

  const pieDataSeries = categoryData.length > 0
    ? categoryData.map((item, index) => ({
        value: item.amount,
        color: categoryColors[index % categoryColors.length],
      }))
    : [];

  const renderCategoryItem = ({ item, index }) => {
    const totalAmountForPercent = categoryData.reduce((acc, cur) => acc + cur.amount, 0);
    const percent = totalAmountForPercent > 0 ? (item.amount / totalAmountForPercent) * 100 : 0;
    const percentColor = '#386681'; // blue for percent
    const amountColor = selectedTab === 'Expenses' ? '#E98898' /* red */ : '#0076CA'; // red or blue

    return (
      <View style={styles.categoryRow}>
        <Text style={[styles.categoryPercent, { color: percentColor }]}>
          {percent.toFixed(1)}%
        </Text>

        <Text style={[styles.categoryName, { marginLeft: 11 }]}>
          {item.category}
        </Text>

        <Text style={[styles.categoryAmount, { color: amountColor, marginLeft: -10 }]}>
          ₱{item.amount.toFixed(2)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBackground}>
        <Text style={styles.headerText}>Analytics</Text>
      </View>

      <View style={styles.subHeaderContainer}>
        <Text style={styles.subHeader}>Personal Budget Tracker</Text>
      </View>

      <View style={styles.tabContainer}>
        {['Income', 'Expenses'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.selectedTab]}
            onPress={() => handleTabChange(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.selectedTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.filterContainer}>
        {filters.map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterTab, selectedFilter === filter && styles.selectedFilterTab]}
            onPress={() => {
              setSelectedFilter(filter);
            }}
          >
            <Text style={[styles.filterText, selectedFilter === filter && styles.selectedFilterText]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.dateNavigationContainer}>
        <TouchableOpacity onPress={() => handleDateChange('left')} style={styles.arrowButton}>
          <Ionicons name="chevron-back" size={24} color="#145C84" />
        </TouchableOpacity>

        <Text style={styles.dateDisplayText}>{getFormattedDate(selectedFilter, currentDate)}</Text>

        <TouchableOpacity onPress={() => handleDateChange('right')} style={styles.arrowButton}>
          <Ionicons name="chevron-forward" size={24} color="#145C84" />
        </TouchableOpacity>
      </View>

      <View style={styles.totalBar}>
        <Text style={styles.totalLabel}>
          {selectedTab === 'Income' ? 'Total Income' : 'Total Expenses'}
        </Text>
        <Text style={[styles.totalAmount, { color: selectedTab === 'Expenses' ? '#E98898' : '#EBF8FF' }]}>
          ₱ {total.toFixed(2)}
        </Text>
      </View>

      {/* Pie chart using react-native-pie-chart */}
      <View style={[styles.pieChartContainer, { width: screenWidth, height: 220 }]}>
        {pieDataSeries.length > 0 ? (
        <VictoryPie
          key={`${selectedTab}_${selectedFilter}_${currentDate.toDateString()}`}
          data={displayCategoryData.map(item => ({ x: item.category, y: item.amount }))}
          colorScale={categoryColors}
          labelRadius={({ radius }) => radius + 20}
          style={{ labels: { fill: '#555', fontSize: 12, fontWeight: '600' } }}
          width={screenWidth}
          height={220}
          animate={{ duration: 800, easing: 'cubicInOut' }}
        />
        ) : (
          <Text style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>
            No data available
          </Text>
        )}
      </View>


      {/* <View style={styles.legendContainer}>
        {categoryData.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View
              style={[
                styles.legendColorBox,
                { backgroundColor: categoryColors[index % categoryColors.length] },
              ]}
            />
            <Text style={styles.legendText}>{item.category}</Text>
          </View>
        ))}
      </View> */}


      {/* Categories List */}
      <FlatList
        data={categoryData}
        keyExtractor={(item, idx) => idx.toString()}
        renderItem={renderCategoryItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>
            No categories to display.
          </Text>
        }
      />
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
  subHeaderContainer: {
    width: '100%',
    backgroundColor: '#EDEDEE',
    paddingVertical: 10,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subHeader: {
    fontWeight: 'bold',
    color: '#6FB5DB',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#D6DEE3',
    marginHorizontal: 5,
    alignItems: 'center',
  },
  selectedTab: {
    backgroundColor: '#89C3E6',
  },
  tabText: {
    fontSize: 14,
    color: '#707C83',
  },
  selectedTabText: {
    color: '#EBF8FF',
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 6,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#D6DEE3',
    marginHorizontal: 3,
    alignItems: 'center',
  },
  selectedFilterTab: {
    backgroundColor: '#89C3E6',
  },
  filterText: {
    fontSize: 13,
    color: '#707C83',
  },
  selectedFilterText: {
    color: '#EBF8FF',
    fontWeight: '600',
  },
  dateNavigationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop:10,
    marginHorizontal: 20,
    marginBottom: 15,
  },
  arrowButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  dateDisplayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#145C84',
    textAlign: 'center',
    minWidth: 120,
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    backgroundColor: '#145C84',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 16,
    color: '#F7F2B3',
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pieChartContainer: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryPercent: {
    flex: 0.15,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryName: {
    flex: 0.65,
    fontSize: 14,
    color: '#386681',
    textAlign: 'left',
  },
  categoryAmount: {
    flex: 0.2,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  legendContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
  marginHorizontal: 20,
  marginBottom: 20,
},

legendItem: {
  flexDirection: 'row',
  alignItems: 'center',
  marginHorizontal: 8,
  marginVertical: 4,
},

legendColorBox: {
  width: 16,
  height: 16,
  borderRadius: 4,
  marginRight: 6,
},

legendText: {
  fontSize: 14,
  color: '#333',
},

});
