import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Screens
import LogsScreen from './components/screens/LogsScreen';
import AnalyticsScreen from './components/screens/AnalyticsScreen';
import AddExpenseScreen from './components/screens/AddExpenseScreen';
import AccountsScreen from './components/screens/AccountsScreen';
import MoreScreen from './components/screens/MoreScreen';
import AccountDetailScreen from './components/more/accounts/AccountDetailScreen';
import EditAccountScreen from './components/more/accounts/EditAccountScreen';
import SetupAccountScreen from './components/more/accounts/SetupAccountScreen';
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarShowLabel: false,
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
          let iconName, label;

          if (route.name === 'Logs') {
            iconName = focused ? 'reader' : 'reader-outline';
            label = 'Logs';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
            label = 'Analytics';
          } else if (route.name === 'Accounts') {
            iconName = focused ? 'wallet' : 'wallet-outline';
            label = 'Accounts';
          } else if (route.name === 'More') {
            iconName = 'ellipsis-horizontal-outline';
            label = 'More';
          }

          if (route.name === 'Add') return null;

          return (
            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name={iconName} size={23} color={color} />
              <Text
                style={{ fontSize: 12, color, width: 60, textAlign: 'center' }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {label}
              </Text>
            </View>
          );
        },
        tabBarStyle: {
          backgroundColor: '#145C84',
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#F7F2B3',
        tabBarInactiveTintColor: '#F5F5F5',
      })}
    >
      <Tab.Screen name="Logs" component={LogsScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen
        name="Add"
        component={AddExpenseScreen}
        options={{
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              style={styles.cutoutButtonWrapper}
              activeOpacity={0.9}
            >
              <View style={styles.cutoutButton}>
                <View style={styles.innerCircle}>
                  <Ionicons name="add" size={32} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="AccountDetailScreen" component={AccountDetailScreen} />
        <Stack.Screen name='EditAccountScreen' component={EditAccountScreen}/>
        <Stack.Screen name='SetupAccountScreen' component={SetupAccountScreen}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  cutoutButtonWrapper: {
    top: -35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cutoutButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#145C84',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#FFFFFF',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    position: 'relative',
  },
  innerCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#145C84',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
