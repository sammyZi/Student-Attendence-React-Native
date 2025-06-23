import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  useWindowDimensions,
  Pressable,
  RefreshControl,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, getDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const Circle = memo(({ item, index, handleSingleTap, handleDoubleTap, handleLongPress, cardNumber }) => {
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .onEnd(() => runOnJS(handleSingleTap)(index));

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onEnd(() => runOnJS(handleDoubleTap)(index));

  const longPress = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => runOnJS(handleLongPress)(index));

  const gesture = Gesture.Exclusive(longPress, doubleTap, singleTap);

  return (
    <GestureDetector gesture={gesture}>
      <Pressable>
        <View style={[styles.circle, { backgroundColor: getCircleColor(item) }]}>
          <Text style={styles.circleText}>{cardNumber}</Text>
        </View>
      </Pressable>
    </GestureDetector>
  );
});

const AttendanceScreen = () => {
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [savedLogs, setSavedLogs] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showInvalidDateModal, setShowInvalidDateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dateToDelete, setDateToDelete] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { width } = useWindowDimensions();
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      loadStudents();
      loadAttendanceLogs();
    }
  }, [user]);

  const loadStudents = async () => {
  if (!user) {
    console.error('User not authenticated');
    return;
  }
  try {
    const userStudentsRef = collection(db, 'users', user.uid, 'Card_students');
    const querySnapshot = await getDocs(userStudentsRef);
    let studentsData = querySnapshot.docs.map(doc => ({
      cardNumber: doc.id,
    }));

    // ✅ Sort by numeric cardNumber
    studentsData = studentsData.sort((a, b) => parseInt(a.cardNumber) - parseInt(b.cardNumber));

    setStudents(studentsData);
    setAttendance(Array(studentsData.length).fill('none'));
  } catch (error) {
    console.error('Error loading students:', error);
    setErrorMessage('Failed to load students. Please try again.');
  }
};


  const handleSingleTap = useCallback((index) => {
    setAttendance((prevAttendance) => {
      const updated = [...prevAttendance];
      if (updated[index] !== 'present') {
        updated[index] = 'present';
      }
      return updated;
    });
  }, []);

  const handleDoubleTap = useCallback((index) => {
    setAttendance((prev) => {
      const updated = [...prev];
      updated[index] = 'none';
      return updated;
    });
  }, []);

  const handleLongPress = useCallback((index) => {
    setAttendance((prev) => {
      const updated = [...prev];
      const cycle = ['cardHome', 'diffLocation'];
      const currentIndex = cycle.indexOf(updated[index]);
      updated[index] = cycle[(currentIndex + 1) % cycle.length] || 'cardHome';
      return updated;
    });
  }, []);

  useEffect(() => {
    if (selectedDate && savedLogs) {
      const dateKey = selectedDate.toDateString();
      setAttendance(savedLogs[dateKey] || Array(students.length).fill('none'));
    }
  }, [selectedDate, savedLogs]);

  const handleDateChange = async (event, date) => {
    setShowDatePicker(false);
    if (date && date.getDay() === 0) {
      await loadAttendanceLogs(date);
      setSelectedDate(date);
    } else {
      setShowInvalidDateModal(true);
    }
  };

  const convertToNumeric = (statusArray, studentsList) => {
  const result = {};
  statusArray.forEach((status, index) => {
    const cardNumber = studentsList[index]?.cardNumber;
    if (!cardNumber) return;

    switch (status) {
      case 'present':
        result[cardNumber] = 1;
        break;
      case 'cardHome':
        result[cardNumber] = 2;
        break;
      case 'diffLocation':
        result[cardNumber] = 3;
        break;
      default:
        result[cardNumber] = 0;
    }
  });
  return result;
};


  const convertToStatus = (attendanceObject, studentsList) => {
  return studentsList.map((student) => {
    const num = attendanceObject?.[student.cardNumber] ?? 0;
    switch (num) {
      case 1:
        return 'present';
      case 2:
        return 'cardHome';
      case 3:
        return 'diffLocation';
      default:
        return 'none';
    }
  });
};


  const saveAttendance = async () => {
  if (!user) {
    console.error('User not authenticated');
    setErrorMessage('Please log in to save attendance.');
    return;
  }
  try {
    const dateKey = selectedDate.toDateString();
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateId = `${year}-${month}-${day}`;

    const numericAttendance = convertToNumeric(attendance, students);
    const userDocRef = doc(db, 'users', user.uid);
    const attendanceDocRef = doc(userDocRef, 'S_Book', dateId);
    await setDoc(attendanceDocRef, { attendance: numericAttendance });

    const newLog = { ...savedLogs, [dateKey]: [...attendance] };
    setSavedLogs(newLog);
    setShowSuccessModal(true);
    setErrorMessage(null);
  } catch (error) {
    console.error('Error saving attendance:', error);
    setErrorMessage('Failed to save attendance. Please try again.');
  }
};


  const loadAttendanceLogs = async () => {
  if (!user) {
    console.error('User not authenticated');
    return;
  }

  try {
    setRefreshing(true);

    // ✅ Ensure students are loaded before processing logs
    const userStudentsRef = collection(db, 'users', user.uid, 'Card_students');
    const studentSnap = await getDocs(userStudentsRef);
    let studentsList = studentSnap.docs.map(doc => ({
      cardNumber: doc.id,
    }));

    studentsList = studentsList.sort((a, b) => parseInt(a.cardNumber) - parseInt(b.cardNumber));
    setStudents(studentsList);

    const userDocRef = doc(db, 'users', user.uid);
    const sBookCollectionRef = collection(userDocRef, 'S_Book');
    const querySnapshot = await getDocs(sBookCollectionRef);

    const logs = {};
    querySnapshot.forEach((docSnap) => {
      const docId = docSnap.id;
      const date = new Date(docId);
      if (!isNaN(date.getTime())) {
        const dateKey = date.toDateString();
        const attendanceObj = docSnap.data().attendance;
        const statusArray = convertToStatus(attendanceObj, studentsList);
        logs[dateKey] = statusArray;
      } else {
        console.warn(`Invalid date format in Firestore document ID: ${docId}`);
      }
    });

    setSavedLogs(logs);

    const dateKey = selectedDate.toDateString();
    setAttendance(logs[dateKey] || Array(studentsList.length).fill('none'));
  } catch (error) {
    console.error('Error loading logs:', error);
    setErrorMessage('Failed to load attendance logs. Please try again.');
  } finally {
    setRefreshing(false);
  }
};



  const deleteLog = useCallback((date) => {
    setDateToDelete(date);
    setShowDeleteModal(true);
  }, []);

  const confirmDeleteLog = async () => {
    if (!user || !dateToDelete) {
      console.error('User not authenticated or no date selected for deletion');
      setShowDeleteModal(false);
      setErrorMessage('Please log in or select a date to delete.');
      return;
    }
    setShowDeleteModal(false);
    setShowPasswordModal(true);
  };

  const verifyPasswordAndDelete = async () => {
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsDeleting(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      const match = dateToDelete.match(/(\w+\s+\w+\s+\d+\s+\d+)/);
      if (!match) {
        throw new Error(`Invalid date format for deletion: ${dateToDelete}`);
      }
      const dateStr = match[0];
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) {
        throw new Error(`Failed to parse date: ${dateToDelete}`);
      }
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const dateId = `${year}-${month}-${day}`;

      const userDocRef = doc(db, 'users', user.uid);
      const attendanceDocRef = doc(userDocRef, 'S_Book', dateId);
      const docSnap = await getDoc(attendanceDocRef);
      if (!docSnap.exists()) {
        throw new Error(`Document does not exist at users/${user.uid}/S_Book/${dateId}.`);
      }
      await deleteDoc(attendanceDocRef);

      const updatedLogs = { ...savedLogs };
      delete updatedLogs[dateToDelete];
      setSavedLogs(updatedLogs);

      if (selectedDate.toDateString() === dateToDelete) {
        setAttendance(Array(students.length).fill('none'));
      }

      setShowPasswordModal(false);
      setShowSuccessModal(true);
      setErrorMessage(null);
      setPassword('');
    } catch (error) {
      console.error('Error during deletion:', error);
      setErrorMessage(`Failed to delete: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPassword('');
  };

  const onRefresh = useCallback(async () => {
  if (user) {
    await loadStudents(); 
    await loadAttendanceLogs(); 
  }
}, [user]);


  const closeInvalidDateModal = () => setShowInvalidDateModal(false);
  const closeDeleteModal = () => setShowDeleteModal(false);
  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setDateToDelete(null);
  };
  const closeErrorModal = () => setErrorMessage(null);

  const numColumns = Math.floor(width / 60);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {!editMode && (
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.buttonText}>{selectedDate.toDateString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={saveAttendance}
            >
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={() => setEditMode(true)}
            >
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        {!editMode && (
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2ecc71' }]} />
              <Text style={styles.legendText}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3498db' }]} />
              <Text style={styles.legendText}>Card at Home</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#f1c40f' }]} />
              <Text style={styles.legendText}>Diff Location</Text>
            </View>
          </View>
        )}

        {editMode ? (
          <View style={styles.editContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setEditMode(false)}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.editTitle}>Attendance Logs</Text>
            {Object.keys(savedLogs).length === 0 ? (
              <Text style={styles.noLogsText}>No logs found.</Text>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#3b82f6']}
                    tintColor="#3b82f6"
                  />
                }
              >
                {Object.entries(savedLogs).map(([date], index) => (
                  <View key={date} style={styles.logItem}>
                    <Text style={styles.logDate}>{date}</Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteLog(date)}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
                tintColor="#3b82f6"
              />
            }
          >
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {students.map((student, index) => (
                <Circle
                  key={student.cardNumber}
                  item={attendance[index] || 'none'}
                  index={index}
                  handleSingleTap={handleSingleTap}
                  handleDoubleTap={handleDoubleTap}
                  handleLongPress={handleLongPress}
                  cardNumber={student.cardNumber}
                />
              ))}
            </View>
          </ScrollView>
        )}

        <Modal
          animationType="fade"
          transparent
          visible={showInvalidDateModal}
          onRequestClose={closeInvalidDateModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Invalid Date</Text>
              <Text style={styles.modalText}>Please select a Sunday.</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={closeInvalidDateModal}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={showDeleteModal}
          onRequestClose={closeDeleteModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Confirm Deletion</Text>
              <Text style={styles.modalText}>
                Are you sure you want to delete attendance for {dateToDelete}?
              </Text>
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeDeleteModal}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButtonModal]}
                  onPress={confirmDeleteLog}
                >
                  <Text style={styles.modalButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={showPasswordModal}
          onRequestClose={closePasswordModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Verify Password</Text>
              <Text style={styles.modalText}>
                Please enter your password to confirm deletion of attendance for {dateToDelete}
              </Text>
              <TextInput
                style={styles.passwordInput}
                secureTextEntry
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={'black'}
              />
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closePasswordModal}
                  disabled={isDeleting}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButtonModal]}
                  onPress={verifyPasswordAndDelete}
                  disabled={isDeleting}
                >
                  <Text style={styles.modalButtonText}>
                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={showSuccessModal}
          onRequestClose={closeSuccessModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Success</Text>
              <Text style={styles.modalText}>
                {dateToDelete
                  ? 'Attendance log deleted successfully.'
                  : 'Attendance saved successfully!'}
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={closeSuccessModal}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={!!errorMessage}
          onRequestClose={closeErrorModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Error</Text>
              <Text style={styles.modalText}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={closeErrorModal}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const getCircleColor = (status) => {
  switch (status) {
    case 'present': return '#2ecc71';
    case 'cardHome': return '#3498db';
    case 'diffLocation': return '#f1c40f';
    default: return '#bdc3c7';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    //marginTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  button: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  editButton: {
    backgroundColor: '#8b5cf6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  listContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 6,
  },
  circleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  editContainer: {
    flex: 1,
    paddingTop: 16,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#3b82f6',
    fontSize: 18,
    fontWeight: '600',
  },
  editTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginVertical: 16,
  },
  noLogsText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 24,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 4,
  },
  logDate: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
    padding: 10,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginVertical: 4,
    textAlign:'center'
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    alignItems:'center',
    textAlign:'center'
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    flex: 1,
    
  },
  deleteButtonModal: {
    backgroundColor: '#ef4444',
    flex: 1,
  },
  passwordInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    backgroundColor: '#fff',
    color:'black'
  },
});

export default AttendanceScreen;