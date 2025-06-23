import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, Modal,
  TouchableOpacity, ActivityIndicator, TouchableWithoutFeedback, Animated, Easing,
} from 'react-native';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, deleteDoc,getDocs,collection, updateDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import EncryptedStorage from 'react-native-encrypted-storage';
import { deleteField } from 'firebase/firestore';



const standards = ['Mini KG', 'Jr KG', 'Sr KG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
const genders = ['Male', 'Female', 'Other'];

const CustomModal = ({ visible, title, message, onClose, buttonText = 'OK' }) => {
  const [scaleValue] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();
    } else {
      scaleValue.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalBox, { transform: [{ scale: scaleValue }] }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
              </View>
              <View style={styles.modalContent}>
                <Text style={styles.modalMessage}>{message}</Text>
              </View>
              <TouchableOpacity 
                onPress={onClose} 
                style={styles.modalButton} 
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonText}>{buttonText}</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const CardDetailsScreen = () => {

   const [cardData, setCardData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [standardModalVisible, setStandardModalVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [customModal, setCustomModal] = useState({ visible: false, title: '', message: '' });
  const [fadeAnim] = useState(new Animated.Value(0));
  const [cardScale] = useState(new Animated.Value(1));
  const [buttonScale] = useState(new Animated.Value(1));

  
  const route = useRoute();
  const navigation = useNavigation();
  const { cardId } = route.params;

  const [userId, setUserId] = useState(null);

  useEffect(() => {
  const resolveUserId = async () => {
    const currentUser = auth.currentUser;
    let uidToUse = currentUser?.uid;

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const isAdmin = userDoc.exists() && userDoc.data().isAdmin;

      if (isAdmin) {
        const stored = await EncryptedStorage.getItem('simulatedUser');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.userId) uidToUse = parsed.userId;
        }
      }

      setUserId(uidToUse);
    } catch (error) {
      console.error('Failed to determine user ID:', error);
    }
  };

  resolveUserId();
}, []);



 

  useEffect(() => {
  const fetchCardData = async () => {
    if (!userId) return;

    try {
      const docRef = doc(db, 'users', userId, 'Card_students', cardId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCardData(docSnap.data());
        setEditData(docSnap.data());
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      } else {
        setCustomModal({
          visible: true,
          title: 'Error',
          message: 'Card not found',
        });
        setTimeout(() => navigation.goBack(), 1500);
      }
    } catch (err) {
      console.error("Error fetching card:", err);
    }

    setLoading(false);
  };

  if (userId) fetchCardData();
}, [userId, cardId]);


  const animatePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const animatePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const validateFields = async () => {
  const { name, standard, cardNumber, phone, gender } = editData;

  if (!/^\d+$/.test(cardNumber)) {
    setCustomModal({
      visible: true,
      title: 'Error',
      message: 'Card Number must be numeric.',
    });
    return false;
  }

  // Get correct UID (simulated or current)
  let uidToUse = auth.currentUser.uid;
  try {
    const userDoc = await getDoc(doc(db, 'users', uidToUse));
    const isAdmin = userDoc.exists() && userDoc.data().isAdmin;

    if (isAdmin) {
      const stored = await EncryptedStorage.getItem('simulatedUser');
      if (stored) {
        const { userId } = JSON.parse(stored);
        if (userId) uidToUse = userId;
      }
    }
  } catch (e) {
    console.error("Error checking admin/simulated user:", e);
    return false;
  }

  // Check for duplicate card number
  if (cardNumber !== cardId) {
    const checkRef = doc(db, 'users', uidToUse, 'Card_students', cardNumber);
    const checkSnap = await getDoc(checkRef);
    if (checkSnap.exists()) {
      setCustomModal({
        visible: true,
        title: 'Error',
        message: 'Card number already taken.',
      });
      return false;
    }
  }

  if (!/^\d{10}$/.test(phone)) {
    setCustomModal({
      visible: true,
      title: 'Error',
      message: 'Phone number must be exactly 10 digits.',
    });
    return false;
  }

  if (!standards.includes(standard)) {
    setCustomModal({
      visible: true,
      title: 'Error',
      message: 'Invalid standard selected.',
    });
    return false;
  }

  if (!genders.includes(gender)) {
    setCustomModal({
      visible: true,
      title: 'Error',
      message: 'Invalid gender selected.',
    });
    return false;
  }

  return true;
};


  const handleEdit = async () => {
  if (!userId) return;

  if (isEditing) {
    if (!(await validateFields())) return;

    Animated.sequence([
      Animated.timing(cardScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const newCardId = editData.cardNumber;

    if (newCardId !== cardId) {
      await deleteDoc(doc(db, 'users', userId, 'Card_students', cardId));
    }

    await setDoc(doc(db, 'users', userId, 'Card_students', newCardId), editData);
    setCardData(editData);
    setIsEditing(false);
    setCustomModal({
      visible: true,
      title: 'Success',
      message: 'Card updated successfully',
    });
  } else {
    setIsEditing(true);
  }
};


const handleDelete = async () => {
  try {
    const user = auth.currentUser;
    if (!userId || !user?.email) return;

    const credential = EmailAuthProvider.credential(user.email, password);

    await reauthenticateWithCredential(user, credential).catch(() => {
      throw new Error('Authentication failed. Please check your password.');
    });

    await deleteDoc(doc(db, 'users', userId, 'Card_students', cardId.toString()));

    const sBookRef = collection(db, 'users', userId, 'S_Book');
    const sBookSnapshot = await getDocs(sBookRef);
    const updatePromises = [];

    for (const dateDoc of sBookSnapshot.docs) {
      const attendanceDocRef = doc(db, 'users', userId, 'S_Book', dateDoc.id);
      updatePromises.push(
        updateDoc(attendanceDocRef, {
          [`attendance.${cardId}`]: deleteField(), 
        })
      );
    }

    await Promise.all(updatePromises);

    setDeleteModalVisible(false);
    setCustomModal({
      visible: true,
      title: 'Deleted',
      message: 'Success',
    });
    setTimeout(() => navigation.goBack(), 1500);

  } catch (error) {
    console.error('Delete error:', error);
    setCustomModal({
      visible: true,
      title: 'Error',
      message: error.message || 'Failed to delete. Check password and try again.',
    });
  }
};

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading Student Details</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* <StatusBar
                barStyle="dark-content"
                backgroundColor="transparent"
                translucent
              /> */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#6C63FF" />
          </TouchableOpacity>
          <Text style={styles.title}>{cardData?.name || 'Student Details'}</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, isEditing && styles.editableInput]}
                editable={isEditing}
                value={editData.name}
                onChangeText={(text) => setEditData({ ...editData, name: text })}
                placeholder="Student name"
                placeholderTextColor="#A0A0A0"
              />
              <Ionicons name="person-outline" size={20} color="#6C63FF" style={styles.inputIcon} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Grade/Standard</Text>
            <TouchableOpacity
              disabled={!isEditing}
              onPress={() => setStandardModalVisible(true)}
              style={[styles.selectBox, isEditing && styles.editableSelectBox]}
            >
              <Text style={styles.selectText}>{editData.standard || 'Select Standard'}</Text>
              <Ionicons name="chevron-down-outline" size={18} color="#6C63FF" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Card Number</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, isEditing && styles.editableInput]}
                editable={isEditing}
                keyboardType="numeric"
                value={editData.cardNumber}
                onChangeText={(text) => setEditData({ ...editData, cardNumber: text })}
                placeholder="Card number"
                placeholderTextColor="#A0A0A0"
              />
              <Ionicons name="card-outline" size={20} color="#6C63FF" style={styles.inputIcon} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, isEditing && styles.editableInput]}
                editable={isEditing}
                keyboardType="phone-pad"
                maxLength={10}
                value={editData.phone}
                onChangeText={(text) => setEditData({ ...editData, phone: text })}
                placeholder="Phone number"
                placeholderTextColor="#A0A0A0"
              />
              <Ionicons name="call-outline" size={20} color="#6C63FF" style={styles.inputIcon} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <TouchableOpacity
              disabled={!isEditing}
              onPress={() => setGenderModalVisible(true)}
              style={[styles.selectBox, isEditing && styles.editableSelectBox]}
            >
              <Text style={styles.selectText}>{editData.gender || 'Select Gender'}</Text>
              <Ionicons name="chevron-down-outline" size={18} color="#6C63FF" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.buttonContainer}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.button, isEditing ? styles.saveButton : styles.editButton]}
              onPress={handleEdit}
              onPressIn={animatePressIn}
              onPressOut={animatePressOut}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isEditing ? "checkmark-circle-outline" : "create-outline"} 
                size={20} 
                color="#FFF" 
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>{isEditing ? 'Save Changes' : 'Edit Details'}</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={() => setDeleteModalVisible(true)}
              onPressIn={animatePressIn}
              onPressOut={animatePressOut}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="trash-outline" 
                size={20} 
                color="#FFF" 
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Delete Card</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Standard Selection Modal */}
      <Modal visible={standardModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setStandardModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalListBox}>
                <Text style={styles.modalTitle}>Select Standard</Text>
                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                  {standards.map((item) => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => {
                        setEditData({ ...editData, standard: item });
                        setStandardModalVisible(false);
                      }}
                      style={styles.modalItem}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.modalItemText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  onPress={() => setStandardModalVisible(false)}
                  style={styles.modalCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Gender Selection Modal */}
      <Modal visible={genderModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setGenderModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalListBox}>
                <Text style={styles.modalTitle}>Select Gender</Text>
                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                  {genders.map((item) => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => {
                        setEditData({ ...editData, gender: item });
                        setGenderModalVisible(false);
                      }}
                      style={styles.modalItem}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.modalItemText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  onPress={() => setGenderModalVisible(false)}
                  style={styles.modalCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setDeleteModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalListBox}>
                <Text style={styles.modalTitle}>Confirm Deletion</Text>
                <Text style={styles.modalMessage}>This action cannot be undone. Please enter your password to confirm.</Text>
                
                <View style={styles.passwordInputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#6C63FF" style={styles.passwordIcon} />
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter password"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    placeholderTextColor="#A0A0A0"
                    autoFocus
                  />
                </View>
                
                <View style={styles.modalButtonGroup}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setDeleteModalVisible(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmDeleteButton]}
                    onPress={handleDelete}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Custom Modal for Errors/Success */}
      <CustomModal
        visible={customModal.visible}
        title={customModal.title}
        message={customModal.message}
        onClose={() => setCustomModal({ visible: false, title: '', message: '' })}
      />
      
    </Animated.View>

    
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    //paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C63FF',
    fontFamily: 'sans-serif-medium',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
  },
  backButtonPlaceholder: {
    width: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
    fontFamily: 'sans-serif-medium',
    padding:7,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
    fontFamily: 'sans-serif-medium',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingLeft: 48,
    paddingRight: 16,
    fontSize: 16,
    color: '#2D3748',
    backgroundColor: '#F8FAFC',
    fontFamily: 'sans-serif',
  },
  editableInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#6C63FF',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
  },
  editableSelectBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#6C63FF',
  },
  selectText: {
    fontSize: 16,
    color: '#2D3748',
    fontFamily: 'sans-serif',
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editButton: {
    backgroundColor: '#6C63FF',
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
    fontFamily: 'sans-serif-medium',
  },
  buttonIcon: {
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
    fontFamily: 'sans-serif-medium',
    marginTop:15,
  },
  modalContent: {
    padding: 20,
  },
  modalMessage: {
    fontSize: 16,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'sans-serif',
  },
  modalButton: {
    padding: 16,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'sans-serif-medium',
  },
  modalListBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '70%',
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalItemText: {
    fontSize: 16,
    color: '#2D3748',
    fontFamily: 'sans-serif',
  },
  modalCancel: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C63FF',
    fontFamily: 'sans-serif-medium',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
    position: 'relative',
  },
  passwordIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingLeft: 48,
    paddingRight: 16,
    fontSize: 16,
    color: '#2D3748',
    backgroundColor: '#F8FAFC',
    fontFamily: 'sans-serif',
  },
  modalButtonGroup: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  confirmDeleteButton: {
    backgroundColor: '#EF4444',
  },
});

export default CardDetailsScreen;