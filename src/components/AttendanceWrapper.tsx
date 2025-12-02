import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize } from '../styles/theme';
import { BACKEND_URL } from '../config/config';
import Attendance from './attendance/Attendance';

// Conditional import for expo-secure-store (not available on web)
let SecureStore: any = null;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

interface AttendanceWrapperProps {
  onBack: () => void;
  attendanceKey: number;
}

const AttendanceWrapper: React.FC<AttendanceWrapperProps> = ({ onBack, attendanceKey }) => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    verifyDevice();
  }, []);

  const verifyDevice = async () => {
    const isWeb = Platform.OS === 'web';

    // If web, show not permitted message
    if (isWeb) {
      setErrorMessage(
        'You are not permitted to access the attendance module from this device.\n\n' +
        'The attendance feature is only available on the mobile application.\n\n' +
        'If you have changed your device recently, reinstalled the application, or cleared app data, ' +
        'kindly raise a reconfiguration request on the HR portal and then reconfigure the device from the app (not from browser).'
      );
      setIsVerifying(false);
      return;
    }

    try {
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('token_2');
      
      if (!token) {
        setErrorMessage('Authentication token not found. Please login again.');
        setIsVerifying(false);
        return;
      }

      // Get device_id from SecureStore
      let deviceId: string | null = null;
      if (SecureStore) {
        deviceId = await SecureStore.getItemAsync('device_id');
      }

      if (!deviceId) {
        setErrorMessage(
          'Device ID not found.\n\n' +
          'This may happen if:\n' +
          '• You have recently installed the app\n' +
          '• You have cleared app data\n' +
          '• Your device has been reset\n\n' +
          'Please raise a reconfiguration request on the HR portal and reconfigure your device from Settings.'
        );
        setIsVerifying(false);
        return;
      }

      // Verify device ID with backend
      const response = await fetch(`${BACKEND_URL}/core/verifyDeviceId`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          device_id: deviceId,
        }),
      });

      if (response.status === 200) {
        // Device verified successfully
        setIsAuthorized(true);
      } else if (response.status === 403) {
        const data = await response.json();
        setErrorMessage(
          'You are not permitted to access the attendance section on this device.\n\n' +
          'This may happen if:\n' +
          '• You have changed your device recently\n' +
          '• You have reinstalled the application\n' +
          '• You have cleared app data\n\n' +
          'Please raise a reconfiguration request on the HR portal and then reconfigure the device from Settings (not from browser).'
        );
      } else {
        setErrorMessage('Failed to verify device. Please try again later.');
      }
    } catch (error) {
      console.error('Device verification error:', error);
      setErrorMessage('An error occurred while verifying your device. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const ErrorIcon = ({ size = 80 }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 4,
          borderColor: colors.error,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 4,
            height: size * 0.35,
            backgroundColor: colors.error,
            borderRadius: 2,
            marginBottom: 6,
          }}
        />
        <View
          style={{
            width: 6,
            height: 6,
            backgroundColor: colors.error,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );

  if (isVerifying) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.verifyingText}>Verifying device...</Text>
        </View>
      </View>
    );
  }

  if (!isAuthorized) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <ErrorIcon />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // If authorized, show the actual Attendance component
  return <Attendance key={attendanceKey} onBack={onBack} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  verifyingText: {
    marginTop: 16,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.error,
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});

export default AttendanceWrapper;