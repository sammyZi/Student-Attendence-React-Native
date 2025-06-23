import { StyleSheet, Text, View, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const Settings = () => {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (err) {
      setError(err.message);
      console.error("Sign out error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Settings</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => setModalVisible(true)}
          disabled={loading}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="log-out-outline" size={24} color="#ff3b30" />
          </View>
          <Text style={styles.settingText}>Sign Out</Text>
          {loading && <ActivityIndicator size="small" color="#ff3b30" style={styles.loadingIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={20} color="#ff3b30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Sign Out Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="log-out-outline" size={32} color="#ff3b30" />
              <Text style={styles.modalTitle}>Confirm Sign Out</Text>
            </View>
            
            <Text style={styles.modalText}>Are you sure you want to sign out of your account?</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setError('');
                }}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSignOut}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Sign Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    //paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  content: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: '#1c1c1e',
  },
  loadingIndicator: {
    marginRight: 10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 20,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    marginTop: 20,
  },
  errorText: {
    marginLeft: 10,
    color: '#ff3b30',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 10,
    color: '#1c1c1e',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#636366',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f2f2f7',
    marginRight: 10,
  },
  confirmButton: {
    backgroundColor: '#ff3b30',
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#007aff',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default Settings;