import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/config';
import { Platform } from 'react-native';

const BACKGROUND_ATTENDANCE_TASK = 'BACKGROUND_ATTENDANCE_TASK';
const GEOFENCING_TASK = 'OFFICE_GEOFENCING_TASK';
const TOKEN_2_KEY = 'token_2';
const OFFICE_LOCATION_KEY = 'office_location';
const LAST_ATTENDANCE_KEY = 'last_attendance_marked';

// ============================================================================
// CORE ATTENDANCE MARKING FUNCTION (Used by all methods)
// ============================================================================
async function markAttendance(latitude: number, longitude: number): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_2_KEY);
    if (!token) {
      console.log('❌ No token found for attendance marking');
      return false;
    }

    // Check if already marked today
    const lastMarked = await AsyncStorage.getItem(LAST_ATTENDANCE_KEY);
    if (lastMarked) {
      const lastDate = new Date(lastMarked);
      const today = new Date();
      if (
        lastDate.getDate() === today.getDate() &&
        lastDate.getMonth() === today.getMonth() &&
        lastDate.getFullYear() === today.getFullYear()
      ) {
        console.log('✅ Attendance already marked today');
        return true; // Already marked today
      }
    }

    console.log('📍 Marking attendance at:', { latitude, longitude });

    const response = await fetch(`${BACKEND_URL}/core/markAutoAttendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Attendance marked successfully:', result);

      // Store last attendance mark time
      await AsyncStorage.setItem(LAST_ATTENDANCE_KEY, new Date().toISOString());

      return true;
    } else {
      console.log('❌ Failed to mark attendance:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error marking attendance:', error);
    return false;
  }
}

// ============================================================================
// HELPER: Check if within working hours
// ============================================================================
function isWithinWorkingHours(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  // Monday to Friday (1-5)
  const isWeekday = currentDay >= 1 && currentDay <= 5;

  // Between 9:00 AM and 12:00 PM (flexible 3-hour window)
  const isWorkingHour = currentHour >= 9 && currentHour < 12;

  return isWeekday && isWorkingHour;
}

// ============================================================================
// METHOD 1: BACKGROUND FETCH TASK
// ============================================================================
TaskManager.defineTask(BACKGROUND_ATTENDANCE_TASK, async () => {
  try {
    console.log('🔄 Background fetch task started');

    // Check if within working hours
    if (!isWithinWorkingHours()) {
      console.log('⏰ Outside working hours, skipping');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Get current location with background permission
    let location;
    try {
      location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        mayShowUserSettingsDialog: false,
      });
    } catch (locError) {
      console.log('❌ Could not get location in background:', locError);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // Mark attendance
    const success = await markAttendance(
      location.coords.latitude,
      location.coords.longitude
    );

    return success
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.Failed;

  } catch (error) {
    console.error('❌ Background fetch task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ============================================================================
// METHOD 2: GEOFENCING TASK
// ============================================================================
TaskManager.defineTask(GEOFENCING_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('❌ Geofencing error:', error);
    return;
  }

  if (data.eventType === Location.GeofencingEventType.Enter) {
    console.log('🏢 User entered office geofence!');

    // Check if within working hours
    if (!isWithinWorkingHours()) {
      console.log('⏰ Outside working hours, skipping geofence attendance');
      return;
    }

    // Get current location
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      await markAttendance(
        location.coords.latitude,
        location.coords.longitude
      );
    } catch (locError) {
      console.error('❌ Could not get location for geofencing:', locError);
    }
  }
});

// ============================================================================
// BACKGROUND ATTENDANCE SERVICE
// ============================================================================
export const BackgroundAttendanceService = {

  // Initialize all background methods
  async initializeAll(): Promise<{
    backgroundFetch: boolean;
    geofencing: boolean;
  }> {
    const results = {
      backgroundFetch: false,
      geofencing: false,
    };

    // Check authentication
    const isAuthenticated = await this.isUserAuthenticated();
    if (!isAuthenticated) {
      console.log('❌ User not authenticated, skipping initialization');
      return results;
    }

    // Initialize background fetch
    results.backgroundFetch = await this.registerBackgroundTask();

    // Initialize geofencing
    results.geofencing = await this.setupGeofencing();

    console.log('📊 Initialization results:', results);
    return results;
  },

  // Register background fetch task
  async registerBackgroundTask(): Promise<boolean> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_ATTENDANCE_TASK);

      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_ATTENDANCE_TASK, {
          minimumInterval: 15 * 60, // 15 minutes (minimum allowed)
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log('✅ Background fetch task registered');
      } else {
        console.log('ℹ️ Background fetch task already registered');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to register background task:', error);
      return false;
    }
  },

  // Setup geofencing around office location
  // Setup geofencing around office location
  async setupGeofencing(): Promise<boolean> {
    try {
      // Request background location permission
      const { status } = await Location.requestBackgroundPermissionsAsync();

      if (status !== 'granted') {
        console.log('❌ Background location permission not granted');
        return false;
      }

      // Get office location from storage
      const officeLocationStr = await AsyncStorage.getItem(OFFICE_LOCATION_KEY);
      if (!officeLocationStr) {
        console.log('⚠️ No office location set, skipping geofencing');
        return false;
      }

      const officeLocation = JSON.parse(officeLocationStr);

      // Check if geofencing is already running by getting registered tasks
      const tasks = await TaskManager.getRegisteredTasksAsync();
      const isGeofencingRunning = tasks.some(task => task.taskName === GEOFENCING_TASK);

      if (isGeofencingRunning) {
        console.log('ℹ️ Geofencing already running, updating with new location');

        // Stop existing geofencing first
        try {
          await Location.stopGeofencingAsync(GEOFENCING_TASK);
          console.log('✅ Existing geofencing stopped');
        } catch (stopError) {
          console.log('⚠️ Could not stop existing geofencing, continuing...');
        }
      }

      // Start geofencing with a slight delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      await Location.startGeofencingAsync(GEOFENCING_TASK, [
        {
          latitude: officeLocation.latitude,
          longitude: officeLocation.longitude,
          radius: officeLocation.radius || 150,
          notifyOnEnter: true,
          notifyOnExit: false,
        },
      ]);

      console.log('✅ Geofencing started for office location');
      return true;

    } catch (error) {
      console.error('❌ Failed to setup geofencing:', error);

      // If it's specifically a TaskNotFoundException, handle it gracefully
      if (error.message && error.message.includes('TaskNotFoundException')) {
        console.log('ℹ️ Task not found, this is normal during first setup');
        return false;
      }

      return false;
    }
  },

  // Save office location for geofencing
  async setOfficeLocation(
    latitude: number,
    longitude: number,
    radius: number = 150
  ): Promise<boolean> {
    try {
      await AsyncStorage.setItem(
        OFFICE_LOCATION_KEY,
        JSON.stringify({ latitude, longitude, radius })
      );

      // Restart geofencing with new location
      await this.setupGeofencing();

      console.log('✅ Office location saved and geofencing updated');
      return true;
    } catch (error) {
      console.error('❌ Failed to save office location:', error);
      return false;
    }
  },

  // Get current office location
  async getOfficeLocation(): Promise<{
    latitude: number;
    longitude: number;
    radius: number;
  } | null> {
    try {
      const officeLocationStr = await AsyncStorage.getItem(OFFICE_LOCATION_KEY);
      if (!officeLocationStr) return null;
      return JSON.parse(officeLocationStr);
    } catch (error) {
      console.error('❌ Failed to get office location:', error);
      return null;
    }
  },

  // Unregister background fetch task
  async unregisterBackgroundTask(): Promise<boolean> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_ATTENDANCE_TASK);

      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_ATTENDANCE_TASK);
        console.log('✅ Background fetch task unregistered');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to unregister background task:', error);
      return false;
    }
  },

  // Stop geofencing
  async stopGeofencing(): Promise<boolean> {
    try {
      const isTaskDefined = await TaskManager.isTaskDefined(GEOFENCING_TASK);

      if (isTaskDefined) {
        await Location.stopGeofencingAsync(GEOFENCING_TASK);
        console.log('✅ Geofencing stopped');
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to stop geofencing:', error);
      return false;
    }
  },

  // Stop all background services
  async stopAll(): Promise<boolean> {
    try {
      await this.unregisterBackgroundTask();
      await this.stopGeofencing();
      console.log('✅ All background services stopped');
      return true;
    } catch (error) {
      console.error('❌ Failed to stop all services:', error);
      return false;
    }
  },

  // Check background fetch status
  async getBackgroundFetchStatus(): Promise<BackgroundFetch.BackgroundFetchStatus> {
    return await BackgroundFetch.getStatusAsync();
  },

  // Check if user is authenticated
  async isUserAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_2_KEY);
      return !!token;
    } catch (error) {
      console.error('❌ Error checking authentication:', error);
      return false;
    }
  },

  // Manual attendance check (for testing or user-triggered)
  async manualAttendanceCheck(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_2_KEY);
      if (!token) {
        console.log('❌ No token found for manual check');
        return false;
      }

      // Request foreground permission for manual check
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Location permission denied for manual check');
        return false;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return await markAttendance(
        location.coords.latitude,
        location.coords.longitude
      );

    } catch (error) {
      console.error('❌ Manual attendance check error:', error);
      return false;
    }
  },

  // Get service status
  async getServiceStatus(): Promise<{
    isAuthenticated: boolean;
    backgroundFetchStatus: string;
    backgroundFetchRegistered: boolean;
    geofencingActive: boolean;
    officeLocation: any;
    lastAttendance: string | null;
  }> {
    const isAuth = await this.isUserAuthenticated();
    const fetchStatus = await this.getBackgroundFetchStatus();
    const bgRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_ATTENDANCE_TASK);
    const geoActive = await TaskManager.isTaskDefined(GEOFENCING_TASK);
    const officeLocation = await this.getOfficeLocation();
    const lastAttendance = await AsyncStorage.getItem(LAST_ATTENDANCE_KEY);

    let statusText = 'Unknown';
    switch (fetchStatus) {
      case BackgroundFetch.BackgroundFetchStatus.Available:
        statusText = 'Available';
        break;
      case BackgroundFetch.BackgroundFetchStatus.Denied:
        statusText = 'Denied';
        break;
      case BackgroundFetch.BackgroundFetchStatus.Restricted:
        statusText = 'Restricted';
        break;
    }

    return {
      isAuthenticated: isAuth,
      backgroundFetchStatus: statusText,
      backgroundFetchRegistered: bgRegistered,
      geofencingActive: geoActive,
      officeLocation,
      lastAttendance,
    };
  },
};