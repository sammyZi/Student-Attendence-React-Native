import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  View,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { db, auth } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import EncryptedStorage from 'react-native-encrypted-storage';

const StudentListScreen = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const route = useRoute();
  const navigation = useNavigation();

  const getEffectiveUid = async () => {
  const currentUser = auth.currentUser;
  let uid = currentUser?.uid;

  try {
    const stored = await EncryptedStorage.getItem('simulatedUser');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.userId) {
        uid = parsed.userId;
        //setSimulatedUserId(parsed.userId);
      }
    }
  } catch (err) {
    console.error('Failed to load simulated user ID:', err);
  }

  return uid;
};

const fetchStudents = async () => {
  const uid = await getEffectiveUid();

  if (!uid) {
    console.error('User not authenticated');
    return [];
  }

  try {
    const userStudentsRef = collection(db, 'users', uid, 'Card_students');
    const querySnapshot = await getDocs(userStudentsRef);
    
    const students = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    students.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    return students;
  } catch (error) {
    console.error('Error loading student data:', error);
    return [];
  }
};


const handleLoadData = async () => {
  setLoading(true);
  const studentsData = await fetchStudents();
  setStudents(studentsData);
  setFilteredStudents(studentsData);
  setLoading(false);
};

const onRefresh = async () => {
  setRefreshing(true);
  const studentsData = await fetchStudents();
  setStudents(studentsData);
  setFilteredStudents(studentsData);
  setRefreshing(false);
};

useFocusEffect(
  useCallback(() => {
    handleLoadData();
  }, []) // no need to depend on simulatedUserId anymore
);


  const handleNavigateToDetail = (item) => {
  if (item?.cardNumber) {
    navigation.navigate('CardDetails', {
      cardId: item.cardNumber,
    });
  } else {
    Alert.alert('Error', 'Invalid card number');
  }
};

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text) {
      const filteredData = students.filter((student) =>
        student.name.toLowerCase().includes(text.toLowerCase()) ||
        student.cardNumber.includes(text)
      );
      setFilteredStudents(filteredData);
    } else {
      setFilteredStudents(students);
    }
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.studentItem}
      onPress={() => handleNavigateToDetail(item)}
      activeOpacity={0.7}
    >
      <View style={styles.studentInfo}>
        <View style={styles.cardIdContainer}>
          <Ionicons name="card" size={18} color="#4f46e5" />
          <Text style={styles.studentIdText}>{item.cardNumber}</Text>
        </View>
        <Text style={styles.studentNameText}>{item.name}</Text>
        <View style={styles.studentDetails}>
          <Text style={styles.studentDetailText}>{item.standard}</Text>
          <Text style={styles.studentDetailText}>{item.gender}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#4f46e5" />
        </TouchableOpacity>
        <Text style={styles.title}>Students List</Text>
        <View style={{width: 24}} /> {/* Spacer */}
      </View>

      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.container}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search students..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={handleSearch}
              clearButtonMode="while-editing"
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#4f46e5" style={styles.loader} />
          ) : filteredStudents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No students found</Text>
              {searchQuery ? (
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              ) : (
                <Text style={styles.emptySubtext}>Add students to get started</Text>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredStudents}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#4f46e5']}
                  tintColor="#4f46e5"
                />
              }
            />
          )}
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1e293b',
  },
  loader: {
    marginTop: 40,
  },
  listContainer: {
    paddingBottom: 16,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    //elevation: 2,
  },
  studentInfo: {
    flex: 1,
  },
  cardIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  studentIdText: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '600',
    marginLeft: 6,
  },
  studentNameText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
    marginBottom: 4,
  },
  studentDetails: {
    flexDirection: 'row',
  },
  studentDetailText: {
    fontSize: 13,
    color: '#64748b',
    marginRight: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#334155',
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
});

export default StudentListScreen;