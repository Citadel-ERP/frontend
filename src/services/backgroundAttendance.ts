import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/config';

const BACKGROUND_ATTENDANCE_TASK = 'BACKGROUND_ATTENDANCE_TASK';
const TOKEN_2_KEY = 'token_2';

// Define the background task
TaskManager.defineTask(BACKGROUND_ATTENDANCE_TASK, async () => {
  try {
    console.log('Background attendance task started');
    
    // Check if it's the right time (10:00 AM - 11:00 AM, Mon-Fri)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Check if it's Monday to Friday (1-5) and between 10:00-11:00 AM
    const isWeekday = currentDay >= 1 && currentDay <= 5;
    const isWorkingHour = currentHour ===10 || (currentHour === 11 && currentMinutes === 0);
    
    if (!isWeekday || !isWorkingHour) {
      console.log('Not the right time for attendance check');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Get stored token
    const token = await AsyncStorage.getItem(TOKEN_2_KEY);
    if (!token) {
      console.log('No token found');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    
    // Request location permission and get current location
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Location permission denied');
      // Try to get background location permission
      const bgStatus = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus.status !== 'granted') {
        console.log('Background location permission denied');
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    }
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
    });
    
    // Make API call to mark attendance
    const response = await fetch(`${BACKEND_URL}/core/markAutoAttendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Attendance marked successfully:', result);
      
      // Store last attendance check time
      await AsyncStorage.setItem('lastAttendanceCheck', now.toISOString());
      
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.log('Failed to mark attendance:', response.status);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    
  } catch (error) {
    console.error('Background attendance task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const BackgroundAttendanceService = {
  // Register the background task
  async registerBackgroundTask(): Promise<boolean> {
    try {
      // Check if the task is already registered
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_ATTENDANCE_TASK);
      
      if (!isRegistered) {
        // Register background fetch task
        await BackgroundFetch.registerTaskAsync(BACKGROUND_ATTENDANCE_TASK, {
          minimumInterval: 15 * 60, // 15 minutes
          stopOnTerminate: false, // Continue when app is terminated
          startOnBoot: true, // Start when device boots
        });
        console.log('Background attendance task registered successfully');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to register background task:', error);
      return false;
    }
  },
  
  // Unregister the background task
  async unregisterBackgroundTask(): Promise<boolean> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_ATTENDANCE_TASK);
      
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_ATTENDANCE_TASK);
        console.log('Background attendance task unregistered successfully');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to unregister background task:', error);
      return false;
    }
  },
  
  // Check background fetch status
  async getBackgroundFetchStatus(): Promise<BackgroundFetch.BackgroundFetchStatus> {
    return await BackgroundFetch.getStatusAsync();
  },
  
  // Manual attendance check (for testing)
  async manualAttendanceCheck(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_2_KEY);
      if (!token) {
        console.log('No token found for manual check');
        return false;
      }
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied for manual check');
        return false;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const response = await fetch(`${BACKEND_URL}/core/markAutoAttendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          latitude: location.coords.latitude.toString(),
          longitude: location.coords.longitude.toString(),
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Manual attendance marked successfully:', result);
        return true;
      } else {
        console.log('Failed to mark manual attendance:', response.status);
        return false;
      }
      
    } catch (error) {
      console.error('Manual attendance check error:', error);
      return false;
    }
  },

  // Check if user is authenticated (has token)
  async isUserAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_2_KEY);
      return !!token;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }
};