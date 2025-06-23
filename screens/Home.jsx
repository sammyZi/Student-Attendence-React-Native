import React, { useCallback } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
  Text,
  View,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AddName from './addName';
import CardStudent from './CardStudentList';
import CardDetails from './CardDetails';
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import SettingsScreen from './settings';

const Stack = createNativeStackNavigator();

import { useRoute } from '@react-navigation/native';
import EncryptedStorage from 'react-native-encrypted-storage';

const HomeMain = () => {
  const route = useRoute();
  const simulatedUserId = route.params?.simulatedUserId;
  const navigation = useNavigation();

  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);

  const currentUid = auth.currentUser?.uid;

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        if (!currentUid) return;

        try {
          const userDoc = await getDoc(doc(db, 'users', currentUid));
          const adminStatus = userDoc.exists() && userDoc.data().isAdmin;
          setIsAdmin(adminStatus);

          let finalUid = currentUid;

          if (adminStatus) {
            const data = await EncryptedStorage.getItem('simulatedUser');
            if (data) {
              const parsed = JSON.parse(data);
              if (parsed.userId) {
                finalUid = parsed.userId;
              }
            }
          }

          setUserId(finalUid);

          const colRef = collection(db, 'users', finalUid, 'Card_students');
          const snapshot = await getDocs(colRef);
          setTotalStudents(snapshot.size);
        } catch (err) {
          console.error('Error fetching user or students:', err);
        }
      };

      fetchUserData();
    }, [currentUid]),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Right Buttons */}
      <View style={styles.topRightButtons}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={22} color="#4f46e5" />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.helpButton}
          onPress={() => console.log('Help pressed')}
        >
          <Ionicons name="help-circle-outline" size={24} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Balopasna</Text>
        <Text style={styles.headerSubtitle}>Attendence Management System</Text>
      </View>

      <View style={styles.content}>
        {/* Add Student Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.button, styles.primaryButton]}
          onPress={() =>
            navigation.navigate('AddName', {
              simulatedUserId: simulatedUserId || null,
            })
          }
        >
          <View style={styles.buttonContent}>
            <Ionicons name="person-add-outline" size={22} color="white" />
            <Text style={styles.buttonText}>Add New Student</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="white" />
        </TouchableOpacity>

        {/* View Students Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('CardStudent')}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="people-outline" size={22} color="white" />
            <Text style={styles.buttonText}>View All Students</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="white" />
        </TouchableOpacity>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="school-outline" size={28} color="#4f46e5" />
            <Text style={styles.statNumber}>{totalStudents}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const HomeScreen = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeMain"
        component={HomeMain}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddName"
        component={AddName}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CardStudent"
        component={CardStudent}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CardDetails"
        component={CardDetails}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topRightButtons: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    zIndex: 1,
  },
  helpButton: {
    marginLeft: 16,
    padding: 8,
  },
  settingsButton: {
    padding: 8,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    //elevation: 3,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
  },
  secondaryButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    //elevation: 1,
    borderWidth: 0.2,
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
  },
});

export default HomeScreen;
