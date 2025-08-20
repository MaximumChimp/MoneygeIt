import React, { useEffect } from 'react';
import { View, Image, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    // Simulate loading time before navigating to main app
    const timer = setTimeout(() => {
      navigation.replace('MainTabs');
    }, 2000); // 2 seconds
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#145C84', '#89C3E6']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#145C84" />
      <Image
        source={require('./assets/MONEYGEIT.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
});
