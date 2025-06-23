import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Image,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Animated,
  AppState,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './screens/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/Home';
import SearchScreen from './screens/SBook';
import ProfileScreen from './screens/Profile';
import AdminScreen from './screens/adminScreen';
import EncryptedStorage from 'react-native-encrypted-storage';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Screen fade animation wrapper
const AnimatedScreenWrapper = ({ children }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  return <Animated.View style={{ flex: 1, opacity: fadeAnim }}>{children}</Animated.View>;
};

// Wrapped screen components
const HomeWithFade = () => (
  <AnimatedScreenWrapper>
    <HomeScreen />
  </AnimatedScreenWrapper>
);
const SearchWithFade = () => (
  <AnimatedScreenWrapper>
    <SearchScreen />
  </AnimatedScreenWrapper>
);
const ProfileWithFade = () => (
  <AnimatedScreenWrapper>
    <ProfileScreen />
  </AnimatedScreenWrapper>
);

// Bottom tab navigator for normal users
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: {
          borderTopWidth: 0,
          paddingBottom: 10,
          height: 60,
        },
        tabBarActiveTintColor: '#FF6A00',
        tabBarInactiveTintColor: 'black',
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home-outline';
          else if (route.name === 'S Book') iconName = 'book-outline';
          else if (route.name === 'B Book') iconName = 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarButton: (props) => (
          <TouchableOpacity {...props} activeOpacity={1} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeWithFade} options={{ headerShown: false }} />
      <Tab.Screen name="S Book" component={SearchWithFade} options={{ headerShown: false }} />
      <Tab.Screen name="B Book" component={ProfileWithFade} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

// Single-screen stack navigator for admins
function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminScreen} />
    </Stack.Navigator>
  );
}

// Splash screen while checking auth
function SplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <Image
        source={require('./assests/om.png')}
        style={styles.splashImage}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#FF6A00" style={styles.indicator} />
    </View>
  );
}

// Main app
export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clearSimulatedUser = async () => {
      try {
        await EncryptedStorage.removeItem('simulatedUser');
        console.log('Simulated user cleared on app close');
      } catch (e) {
        console.log('Error clearing simulated user:', e);
      }
    };

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        clearSimulatedUser();
      }
    });

    return () => subscription.remove(); // cleanup listener
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setIsAdmin(userDoc.data().isAdmin === true);
        }
      }
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <SplashScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          isAdmin ? (
            <Stack.Screen name="Admin" component={AdminNavigator} />
          ) : (
            <Stack.Screen name="Main" component={TabNavigator} />
          )
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Styles
const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  splashImage: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  indicator: {
    marginTop: 20,
  },
});
