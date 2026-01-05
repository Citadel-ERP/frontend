// services/backgroundLocationTracking.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import { BACKEND_URL } from '../config/config';

const RANDOM_LOCATION_TASK = 'random-location-check';

// Define the random location tracking task
TaskManager.defineTask(RANDOM_LOCATION_TASK, async () => {
  try {
    console.log('🎯 Random location check triggered');
    
    // Check if it's within working hours (8 AM - 11 AM, Mon-Fri)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hours = now.getHours();
    
    // Check if it's Monday-Friday (1-5)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('⏭️ Weekend - skipping location capture');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Check if between 8 AM and 11 AM (8, 9, 10 hours only)
    if (hours < 8 || hours >= 11) {
      console.log(`⏭️ Outside working hours (${hours}:00) - skipping`);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Get token
    const token = await AsyncStorage.getItem('token_2');
    if (!token) {
      console.log('❌ No token found');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    
    // Check with backend for leave/holiday status
    const statusResponse = await fetch(`${BACKEND_URL}/core/checkWorkStatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    
    if (!statusResponse.ok) {
      console.log('❌ Failed to check work status');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    
    const statusData = await statusResponse.json();
    console.log('📊 Work status response:', statusData);
    
    // If backend returns data: false, it means user has leave or it's a holiday
    if (statusData.data === false) {
      console.log('⏭️ User has leave or holiday - skipping location');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    
    console.log('📍 Location captured:', {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    });
    
    // Send location to backend
    const locationResponse = await fetch(`${BACKEND_URL}/core/saveLocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
      }),
    });
    
    if (locationResponse.ok) {
      console.log('✅ Location sent to backend successfully');
      
      // Store last tracked time
      await AsyncStorage.setItem(
        'last_location_tracked',
        new Date().toISOString()
      );
      
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.log('❌ Failed to send location to backend');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
    
  } catch (error) {
    console.error('❌ Error in random location task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export class BackgroundLocationService {
  static async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing background location service...');
      
      // Request background location permissions
      const { status: foregroundStatus } = 
        await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.log('❌ Foreground location permission denied');
        return false;
      }
      
      const { status: backgroundStatus } = 
        await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.log('❌ Background location permission denied');
        return false;
      }
      
      console.log('✅ Location permissions granted');
      
      // Check if task is already registered
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        RANDOM_LOCATION_TASK
      );
      
      if (isRegistered) {
        console.log('✅ Task already registered');
        return true;
      }
      
      // Register background fetch task with 15-minute interval
      // Note: iOS enforces minimum 15 minutes, Android can be more frequent
      await BackgroundFetch.registerTaskAsync(RANDOM_LOCATION_TASK, {
        minimumInterval: 15 * 60, // 15 minutes in seconds
        stopOnTerminate: false, // Continue after app is closed
        startOnBoot: true, // Start when device boots
      });
      
      console.log('✅ Background location service initialized (15-min interval)');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize location service:', error);
      return false;
    }
  }
  
  /**
   * Stop background location tracking
   */
  static async stop(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(RANDOM_LOCATION_TASK);
      console.log('🛑 Background location service stopped');
    } catch (error) {
      console.error('❌ Error stopping location service:', error);
    }
  }
  
  /**
   * Check if service is running
   */
  static async isRunning(): Promise<boolean> {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        RANDOM_LOCATION_TASK
      );
      
      return (
        status === BackgroundFetch.BackgroundFetchStatus.Available &&
        isRegistered
      );
    } catch (error) {
      console.error('❌ Error checking service status:', error);
      return false;
    }
  }
  
  /**
   * Manually trigger location capture (for testing)
   */
  static async captureLocationNow(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('token_2');
      if (!token) {
        console.log('❌ No token found');
        return;
      }
      
      // Check work status
      const statusResponse = await fetch(`${BACKEND_URL}/core/checkWorkStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      
      if (!statusResponse.ok) {
        throw new Error('Failed to check work status');
      }
      
      const statusData = await statusResponse.json();
      console.log('📊 Manual check - Work status:', statusData);
      
      // Check if data is false (holiday/leave exists)
      if (statusData.data === false) {
        console.log('⏭️ User has leave or holiday - skipping location capture');
        return;
      }
      
      // Get location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      console.log('📍 Manual location captured:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      
      // Send to backend
      const response = await fetch(`${BACKEND_URL}/core/saveLocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: new Date().toISOString(),
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Location captured and sent:', result);
        
        // Store last tracked time
        await AsyncStorage.setItem(
          'last_location_tracked',
          new Date().toISOString()
        );
      } else {
        console.log('❌ Failed to send location');
      }
    } catch (error) {
      console.error('❌ Error capturing location:', error);
    }
  }
  
  /**
   * Get last tracked location info
   */
  static async getLastTrackedInfo(): Promise<{
    timestamp: string | null;
    isRunning: boolean;
  }> {
    const timestamp = await AsyncStorage.getItem('last_location_tracked');
    const isRunning = await this.isRunning();
    
    return { timestamp, isRunning };
  }
}