import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';


// Prevent Expo from hiding splash automatically 
SplashScreen.hide()

// Import your screens
import LogsScreen from './components/screens/LogsScreen';
import AnalyticsScreen from './components/screens/AnalyticsScreen';
import AddExpenseScreen from './components/screens/AddExpenseScreen';
import AccountsScreen from './components/screens/AccountsScreen';
import MoreScreen from './components/screens/MoreScreen';
import AccountDetailScreen from './components/more/accounts/AccountDetailScreen';
import EditAccountScreen from './components/more/accounts/EditAccountScreen';
import SetupAccountScreen from './components/more/accounts/SetupAccountScreen';
import CategoriesScreen from './components/more/categories/categoriesScreen';
import EditCategoriesScreen from './components/more/categories/EditCategoriesScreen';
import SubcategoriesScreen from './components/more/categories/SubCategoriesScreen';
import CurrencyScreen from './components/more/currency/currencyScreen';
import EditLogScreen from './components/logs/EditLogScreen';
import UserProfileScreen from './components/UserProfile/UserProfileScreen';
import RegisterScreen from './components/Authentication/RegisterScreen';
import ChangeNameScreen from './components/Authentication/ChangenameScreen';
import UserAccountScreen from './components/Authentication/UserAccountScreen';
import CloudSyncScreen from './components/sync/CloudSyncScreen';
import TrackerScreen from './components/Tracker/TrackerScreen';
import AddSharedTrackerScreen from './components/Tracker/AddSharedTrackerScreen';
import EditSharedTrackerScreen from './components/Tracker/EditSharedTrackerScreen';
import { TrackerProvider } from './components/context/TrackerContext';
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
                  <Ionicons name="add" size={32} color="#F5F5F5" />
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

// Custom SplashScreen Component
function CustomSplash({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(async () => {
      await SplashScreen.hideAsync();
      navigation.replace('MainTabs');
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#145C84', '#145C84']}
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#145C84" />
      <Image
        source={require('./assets/MONEYGEIT_ICON.png')}
        style={{ width: 200, height: 200 }}
        resizeMode="contain"
      />
    </LinearGradient>
  );
}

export default function App() {
  return (
    <TrackerProvider>
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={CustomSplash} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="EditLogScreen" component={EditLogScreen} />
        <Stack.Screen name="AccountDetailScreen" component={AccountDetailScreen} />
        <Stack.Screen name="EditAccountScreen" component={EditAccountScreen} />
        <Stack.Screen name="SetupAccountScreen" component={SetupAccountScreen} />
        <Stack.Screen name="CategoriesScreen" component={CategoriesScreen} />
        <Stack.Screen name="EditCategoriesScreen" component={EditCategoriesScreen} />
        <Stack.Screen name="SubcategoriesScreen" component={SubcategoriesScreen} />
        <Stack.Screen name="CurrencyScreen" component={CurrencyScreen} />
        <Stack.Screen name="UserProfileScreen" component={UserProfileScreen} />
        <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
        <Stack.Screen name="ChangeNameScreen" component={ChangeNameScreen} />
        <Stack.Screen name="UserAccountScreen" component={UserAccountScreen} />
        <Stack.Screen name="CloudSyncScreen" component={CloudSyncScreen} />
        <Stack.Screen name="TrackerScreen" component={TrackerScreen} />
        <Stack.Screen name="AddSharedTrackerScreen" component={AddSharedTrackerScreen} />
        <Stack.Screen name="EditSharedTrackerScreen" component={EditSharedTrackerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
    </TrackerProvider>
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
    borderColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
