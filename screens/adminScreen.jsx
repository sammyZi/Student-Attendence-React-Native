import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import EncryptedStorage from 'react-native-encrypted-storage';

// ✅ HomeScreen for navigation
import HomeScreen from './Home';

function AdminScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const userList = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.isAdmin) {
            userList.push({
              id: doc.id, // UID
              name: data.name || 'No Name',
              email: data.email || 'No Email',
            });
          }
        });

        setUsers(userList);
      } catch (error) {
        console.error('Failed to load users', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsers();
  }, []);

  const handleUserSelect = async (userId) => {
  try {
    await EncryptedStorage.setItem(
      'simulatedUser',
      JSON.stringify({
        userId,
        isAdmin: true,
      })
    );
    navigation.navigate('Home'); // No params needed
  } catch (error) {
    console.error('Failed to store simulatedUser:', error);
  }
};


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select a User to Simulate</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleUserSelect(item.id)}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <Text style={styles.email}>{item.id}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}


const Stack = createNativeStackNavigator();

export default function AdminWithHomeNavigator() {
  return (
    
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#4f46e5',
  },
  card: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    marginBottom: 12,
    borderRadius: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
