// services/attendanceUtils.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { BACKEND_URL } from '../config/config';

const TOKEN_KEY = 'token_2';
const LAST_ATTENDANCE_KEY = 'last_attendance_marked';
const ATTENDANCE_LOCK_KEY = 'attendance_marking_lock';

/**
 * Shared attendance utilities and API calls
 */
export class AttendanceUtils {
  
  /**
   * Get stored authentication token
   */
  static async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('❌ Error getting token:', error);
      return null;
    }
  }

  /**
   * Check if attendance was already marked today
   */
  static async isAttendanceMarkedToday(): Promise<boolean> {
    try {
      const lastMarked = await AsyncStorage.getItem(LAST_ATTENDANCE_KEY);
      if (!lastMarked) return false;

      const lastDate = new Date(lastMarked);
      const today = new Date();
      
      return (
        lastDate.getDate() === today.getDate() &&
        lastDate.getMonth() === today.getMonth() &&
        lastDate.getFullYear() === today.getFullYear()
      );
    } catch (error) {
      console.error('❌ Error checking attendance status:', error);
      return false;
    }
  }

  /**
   * Mark attendance as completed for today
   */
  static async markAttendanceCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_ATTENDANCE_KEY, new Date().toISOString());
      console.log('✅ Attendance marked as completed for today');
    } catch (error) {
      console.error('❌ Error marking attendance completed:', error);
    }
  }

  /**
   * Acquire lock to prevent duplicate attendance marking
   * Returns true if lock acquired, false if already locked
   */
  static async acquireLock(): Promise<boolean> {
    try {
      const existingLock = await AsyncStorage.getItem(ATTENDANCE_LOCK_KEY);
      
      if (existingLock) {
        const lockTime = new Date(existingLock);
        const now = new Date();
        const timeDiff = now.getTime() - lockTime.getTime();
        
        // If lock is older than 30 seconds, consider it stale and acquire new lock
        if (timeDiff < 30000) {
          console.log('⏳ Attendance marking already in progress');
          return false;
        }
      }
      
      await AsyncStorage.setItem(ATTENDANCE_LOCK_KEY, new Date().toISOString());
      return true;
    } catch (error) {
      console.error('❌ Error acquiring lock:', error);
      return false;
    }
  }

  /**
   * Release attendance marking lock
   */
  static async releaseLock(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ATTENDANCE_LOCK_KEY);
    } catch (error) {
      console.error('❌ Error releasing lock:', error);
    }
  }

  /**
   * Check user's work status (leave/holiday)
   * Returns true if user should work today, false otherwise
   */
  static async checkWorkStatus(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/core/checkWorkStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        console.log('❌ Failed to check work status');
        return false;
      }

      const data = await response.json();
      console.log('📊 Work status:', data);
      
      // Backend returns data: false when user has leave or it's a holiday
      return data.data !== false;
    } catch (error) {
      console.error('❌ Error checking work status:', error);
      return false;
    }
  }

  /**
   * Get current device location with high accuracy
   */
  static async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('❌ Location permission not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
      });

      console.log('📍 Location obtained:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });

      return location;
    } catch (error) {
      console.error('❌ Error getting location:', error);
      return null;
    }
  }

  /**
   * Mark attendance via backend API
   */
  static async markAttendanceAPI(
    token: string,
    latitude: number,
    longitude: number,
    source: 'polling' | 'geofence' | 'manual' = 'manual'
  ): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`🎯 Marking attendance via ${source}...`);
      
      const response = await fetch(`${BACKEND_URL}/core/markAutoAttendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          source, // Optional: track which mechanism triggered attendance
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Attendance marking failed:', response.status, errorText);
        return { success: false, message: errorText };
      }

      const result = await response.json();
      console.log('✅ Attendance marked successfully:', result);
      
      return { success: true, message: result.message };
    } catch (error) {
      console.error('❌ Error marking attendance:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Complete attendance flow: check status, get location, mark attendance
   * This is the main orchestration function used by both polling and geofencing
   */
  static async executeAttendanceFlow(
    source: 'polling' | 'geofence' | 'manual' = 'manual',
    showAlert: boolean = false
  ): Promise<boolean> {
    let lockAcquired = false;

    try {
      console.log(`🚀 Starting attendance flow (${source})...`);

      // 1. Check if already marked today
      const alreadyMarked = await this.isAttendanceMarkedToday();
      if (alreadyMarked) {
        console.log('✅ Attendance already marked today');
        return true;
      }

      // 2. Acquire lock to prevent duplicate marking
      lockAcquired = await this.acquireLock();
      if (!lockAcquired) {
        console.log('⏳ Attendance marking already in progress');
        return false;
      }

      // 3. Get token
      const token = await this.getToken();
      if (!token) {
        console.log('❌ No authentication token found');
        return false;
      }

      // 4. Check work status
      const shouldWork = await this.checkWorkStatus(token);
      if (!shouldWork) {
        console.log('⏭️ User has leave or holiday - skipping attendance');
        return false;
      }

      // 5. Get current location
      const location = await this.getCurrentLocation();
      if (!location) {
        console.log('❌ Could not get location');
        return false;
      }

      // 6. Mark attendance
      const result = await this.markAttendanceAPI(
        token,
        location.coords.latitude,
        location.coords.longitude,
        source
      );

      if (result.success) {
        // 7. Save completion status
        await this.markAttendanceCompleted();
        
        if (showAlert) {
          Alert.alert(
            'Attendance Marked',
            `Your attendance has been marked successfully via ${source}!`,
            [{ text: 'OK' }]
          );
        }
        
        return true;
      } else {
        console.log('❌ Attendance marking failed:', result.message);
        return false;
      }

    } catch (error) {
      console.error('❌ Error in attendance flow:', error);
      return false;
    } finally {
      // Always release lock
      if (lockAcquired) {
        await this.releaseLock();
      }
    }
  }

  /**
   * Check if within working hours (8 AM - 11 AM, Monday-Friday)
   */
  static isWithinWorkingHours(): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hours = now.getHours();
    
    // Check if Monday-Friday (1-5)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    // Check if between 8 AM and 11 AM
    return hours >= 8 && hours < 11;
  }

  /**
   * Request location permissions (foreground and background)
   */
  static async requestLocationPermissions(): Promise<{
    foreground: boolean;
    background: boolean;
  }> {
    try {
      // Request foreground permission
      const foregroundResult = await Location.requestForegroundPermissionsAsync();
      const foregroundGranted = foregroundResult.status === 'granted';
      
      if (!foregroundGranted) {
        console.log('❌ Foreground location permission denied');
        Alert.alert(
          'Location Permission Required',
          'Location access is required to mark attendance.'
        );
        return { foreground: false, background: false };
      }

      // Request background permission
      const backgroundResult = await Location.requestBackgroundPermissionsAsync();
      const backgroundGranted = backgroundResult.status === 'granted';
      
      if (!backgroundGranted) {
        console.log('⚠️ Background location permission denied');
        Alert.alert(
          'Background Location Required',
          'Please allow "Always Allow" location access to enable automatic attendance.'
        );
      }

      return {
        foreground: foregroundGranted,
        background: backgroundGranted,
      };
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return { foreground: false, background: false };
    }
  }

  /**
   * Get all office locations from backend (for geofencing)
   */
  static async getOfficeLocations(token: string): Promise<Array<{
    id: string;
    latitude: number;
    longitude: number;
    name: string;
  }> | null> {
    try {
      const response = await fetch(`${BACKEND_URL}/core/getOfficeLocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        console.log('❌ Failed to get office locations');
        return null;
      }

      const data = await response.json();
      console.log('📍 Office locations fetched:', data.offices?.length || 0);
      
      return data.offices || [];
    } catch (error) {
      console.error('❌ Error getting office locations:', error);
      return null;
    }
  }
}