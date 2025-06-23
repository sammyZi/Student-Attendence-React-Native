import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  SafeAreaView,
  Modal,
  Animated,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Orientation from 'react-native-orientation-locker';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('success');
  const [fadeAnim] = useState(new Animated.Value(0));

  // Lock to portrait when this screen is mounted
  useEffect(() => {
    Orientation.lockToPortrait(); // ✅ Lock portrait only for this screen
    return () => {
      Orientation.unlockAllOrientations(); // ✅ Unlock on leaving the screen
    };
  }, []);

  const showModal = (message, type = 'error') => {
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  const handleLogin = () => {
    if (!email || !password) {
      showModal('Please enter both email and password');
      return;
    }
    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        showModal('Logged in successfully', 'success');
        setTimeout(() => {
          hideModal();
        }, 1500);
      })
      .catch((error) => {
        showModal(error.message, 'error');
      });
  };

  return (
    <KeyboardAvoidingView style={styles.background}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.titleContainer}>
          <Image source={require('../assests/mandir.png')} // Update with your image path
        style={styles.splashImage}
        resizeMode="contain"/>
          <Text style={styles.title}>Balopasna</Text>
        </View>
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputContainer}>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                style={styles.passwordInput}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={24}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        </View>

        <Modal
          animationType="none"
          transparent={true}
          visible={modalVisible}
          onRequestClose={hideModal}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      scale: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.modalHeader,
                  modalType === 'success'
                    ? styles.modalHeaderSuccess
                    : styles.modalHeaderError,
                ]}
              >
                <Text style={styles.modalTitle}>
                  {modalType === 'success' ? 'Success' : 'Error'}
                </Text>
              </View>
              <View style={styles.modalBody}>
                <Text style={styles.modalMessage}>{modalMessage}</Text>
              </View>
              <TouchableOpacity style={styles.modalButton} onPress={hideModal}>
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? 0 : 0,
  },
  container: {
    flex: 1,
  },
  titleContainer: {
    //paddingTop: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  formContainer: {
    flex: 1,
    marginTop: 40,
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  input: {
    padding: 15,
    fontSize: 16,
    color: '#1F2937',
    borderRadius: 10,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  splashImage: {
    width: 260, // Adjust as needed
    height: 260, // Adjust as needed
    //marginBottom: 30,
  },
  loginText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 15,
    alignItems: 'center',
  },
  modalHeaderSuccess: {
    backgroundColor: '#10B981',
  },
  modalHeaderError: {
    backgroundColor: '#EF4444',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
    alignItems: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
