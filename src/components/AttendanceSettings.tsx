import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useBackgroundAttendance } from '../hooks/useBackgroundAttendance';

export const AttendanceSettings: React.FC = () => {
  const {
    isBackgroundTaskRegistered,
    backgroundFetchStatus,
    statusText,
    startBackgroundAttendance,
    stopBackgroundAttendance,
    testAttendanceCheck,
  } = useBackgroundAttendance();

  const [isLoading, setIsLoading] = useState(false);

  const handleToggleBackgroundAttendance = async () => {
    setIsLoading(true);
    try {
      if (isBackgroundTaskRegistered) {
        const stopped = await stopBackgroundAttendance();
        if (stopped) {
          Alert.alert('Success', 'Background attendance disabled');
        } else {
          Alert.alert('Error', 'Failed to disable background attendance');
        }
      } else {
        const started = await startBackgroundAttendance();
        if (started) {
          Alert.alert('Success', 'Background attendance enabled');
        } else {
          Alert.alert('Error', 'Failed to enable background attendance');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAttendance = async () => {
    setIsLoading(true);
    try {
      const success = await testAttendanceCheck();
      if (success) {
        Alert.alert('Success', 'Test attendance check completed');
      } else {
        Alert.alert('Error', 'Test attendance check failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Test failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auto Attendance Settings</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Background Fetch Status:</Text>
        <Text style={styles.statusValue}>{statusText}</Text>
      </View>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Auto Attendance:</Text>
        <Text style={[
          styles.statusValue,
          { color: isBackgroundTaskRegistered ? '#4CAF50' : '#F44336' }
        ]}>
          {isBackgroundTaskRegistered ? 'Enabled' : 'Disabled'}
        </Text>
      </View>

      <Text style={styles.description}>
        When enabled, your attendance will be automatically marked at 10:00 AM 
        (Mon-Fri) if you're at the designated location.
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isBackgroundTaskRegistered ? '#F44336' : '#4CAF50',
            opacity: isLoading ? 0.6 : 1,
          }
        ]}
        onPress={handleToggleBackgroundAttendance}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isBackgroundTaskRegistered ? 'Disable' : 'Enable'} Auto Attendance
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.testButton]}
        onPress={handleTestAttendance}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#2196F3" />
        ) : (
          <Text style={[styles.buttonText, { color: '#2196F3' }]}>
            Test Attendance Check
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Important Notes:</Text>
        <Text style={styles.infoText}>
          • Background tasks may be limited by iOS/Android battery optimization
        </Text>
        <Text style={styles.infoText}>
          • Keep the app installed and occasionally open it to maintain background privileges
        </Text>
        <Text style={styles.infoText}>
          • Location permissions must be granted for this feature to work
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  testButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#856404',
  },
  infoText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 5,
  },
});