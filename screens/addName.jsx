import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  TextInput,
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Modal,
  ScrollView,
} from 'react-native';
import {db, auth} from './firebase';
import {collection, doc, setDoc, getDocs} from 'firebase/firestore';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';

const AddNameScreen = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cardId, setCardId] = useState('');
  const [gender, setGender] = useState(null);
  const [standard, setStandard] = useState(null);
  const [isGenderModalVisible, setGenderModalVisible] = useState(false);
  const [isStandardModalVisible, setStandardModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const navigation = useNavigation();
  const route = useRoute();
  const { simulatedUserId } = route.params || {};

  const showModal = message => {
    setModalMessage(message);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!cardId.trim() || !name.trim() || !phone.trim() || !gender || !standard) {
      showModal('Please fill all fields!');
      return;
    }

    if (!/^\d+$/.test(cardId)) {
      showModal('Card ID must be numeric!');
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      showModal('Phone number must be exactly 10 digits!');
      return;
    }

    const currentUser = auth.currentUser;
    const uid = simulatedUserId || currentUser?.uid;

    if (!uid) {
      showModal('User not authenticated');
      return;
    }

    const cardStudentsRef = collection(db, 'users', uid, 'Card_students');

    try {
      const querySnapshot = await getDocs(cardStudentsRef);
      const duplicate = querySnapshot.docs.find(
        doc =>
          doc.id === cardId ||
          doc.data().name.trim().toLowerCase() === name.trim().toLowerCase(),
      );

      if (duplicate) {
        showModal('This card ID or name already exists!');
        return;
      }

      const studentData = {
        cardNumber: cardId,
        name,
        phone,
        gender,
        standard,
        createdAt: new Date(),
      };

      await setDoc(doc(db, `users/${uid}/Card_students/${cardId}`), studentData);

      showModal('Student added successfully!');
      setCardId('');
      setName('');
      setPhone('');
      setGender(null);
      setStandard(null);
    } catch (error) {
      console.error('Error saving data:', error);
      showModal('Failed to save data');
    }
  };

useEffect(() => {
  const fetchNextCardId = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      const snap = await getDocs(collection(db, 'users', uid, 'Card_students'));
      const cardNumbers = snap.docs.map(doc => parseInt(doc.id)).filter(n => !isNaN(n));
      const nextId = (Math.max(...cardNumbers, 0) + 1).toString();
      setCardId(nextId);
    } catch (err) {
      console.error('Error fetching card IDs:', err);
    }
  };

  fetchNextCardId();
}, []);


  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#4f46e5" />
        </TouchableOpacity>
        <Text style={styles.title}>Add New Student</Text>
        <View style={{width: 24}} /> {/* Spacer */}
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Card ID */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Card ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter card number"
            placeholderTextColor={'gray'}
            value={cardId}
            onChangeText={setCardId}
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>

        {/* Name */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter student name"
            placeholderTextColor={'gray'}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Phone */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter parent's phone"
            placeholderTextColor={'gray'}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={10}
          />
        </View>

        {/* Gender Dropdown */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Gender</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setGenderModalVisible(true)}
          >
            <Text style={[styles.dropdownText, !gender && styles.placeholder]}>
              {gender || 'Select gender'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Standard Dropdown */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Class/Grade</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setStandardModalVisible(true)}
          >
            <Text style={[styles.dropdownText, !standard && styles.placeholder]}>
              {standard || 'Select class/grade'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          style={styles.submitButton}
        >
          <Text style={styles.submitButtonText}>Save Student</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Success/Error Modal */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Ionicons 
              name={modalMessage.includes('successfully') ? "checkmark-circle" : "alert-circle"} 
              size={48} 
              color={modalMessage.includes('successfully') ? "#10b981" : "#ef4444"} 
            />
            <Text style={styles.modalTitle}>
              {modalMessage.includes('successfully') ? 'Success!' : 'Notice'}
            </Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Gender Selection Modal */}
      <Modal
        transparent
        visible={isGenderModalVisible}
        animationType="fade"
        onRequestClose={() => setGenderModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.selectionModalContent}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            {['Male', 'Female', 'Other'].map(item => (
              <TouchableOpacity
                key={item}
                style={styles.modalOption}
                onPress={() => {
                  setGender(item);
                  setGenderModalVisible(false);
                }}
              >
                <Text style={styles.modalOptionText}>{item}</Text>
                {gender === item && (
                  <Ionicons name="checkmark" size={20} color="#4f46e5" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Standard Selection Modal */}
      <Modal
        transparent
        visible={isStandardModalVisible}
        animationType="fade"
        onRequestClose={() => setStandardModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.selectionModalContent}>
            <Text style={styles.modalTitle}>Select Class/Grade</Text>
            <ScrollView>
              {[
                'Mini KG', 'Jr KG', 'Sr KG', 
                'Grade 1', 'Grade 2', 'Grade 3', 
                'Grade 4', 'Grade 5', 'Grade 6',
                'Grade 7', 'Grade 8', 'Grade 9', 
                'Grade 10'
              ].map(item => (
                <TouchableOpacity
                  key={item}
                  style={styles.modalOption}
                  onPress={() => {
                    setStandard(item);
                    setStandardModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                  {standard === item && (
                    <Ionicons name="checkmark" size={20} color="#4f46e5" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
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
    padding: 16,
    paddingBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dropdownText: {
    fontSize: 16,
    color: '#1e293b',
  },
  placeholder: {
    color: 'gray',
  },
  submitButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  selectionModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  modalMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1e293b',
  },
});

export default AddNameScreen;