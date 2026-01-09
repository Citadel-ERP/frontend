// services/attendanceUtils.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { BACKEND_URL } from '../config/config';
import { LocationService } from './locationService';

const TOKEN_KEY = 'token_2';
const LAST_ATTENDANCE_KEY = 'last_attendance_marked';
const ATTENDANCE_LOCK_KEY = 'attendance_marking_lock';

/**
 * Shared attendance utilities with iOS-optimized location handling
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
   */
  static async acquireLock(): Promise<boolean> {
    try {
      const existingLock = await AsyncStorage.getItem(ATTENDANCE_LOCK_KEY);
      
      if (existingLock) {
        const lockTime = new Date(existingLock);
        const now = new Date();
        const timeDiff = now.getTime() - lockTime.getTime();
        
        // If lock is older than 60 seconds (increased for iOS), consider stale
        if (timeDiff < 60000) {
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
      
      return data.data !== false;
    } catch (error) {
      console.error('❌ Error checking work status:', error);
      return false;
    }
  }

  /**
   * Get current device location using iOS-optimized service
   */
  static async getCurrentLocation(): Promise<{
    latitude: number;
    longitude: number;
  } | null> {
    console.log('📍 Getting current location...');
    
    const result = await LocationService.getCurrentLocation();
    
    if (result.success && result.coordinates) {
      return result.coordinates;
    }
    
    console.error('❌ Location fetch failed:', result.error);
    return null;
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
          source,
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
   * Complete attendance flow with iOS-optimized location handling
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

      // 2. Acquire lock
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

      // 5. Get current location (iOS-optimized, no timeout)
      const location = await this.getCurrentLocation();
      if (!location) {
        console.log('❌ Could not get location');
        
        if (showAlert && Platform.OS === 'ios') {
          Alert.alert(
            'Location Error',
            'Unable to get your location. Please ensure:\n\n1. Location Services are enabled\n2. App has "While Using" or "Always" permission\n3. "Precise Location" is enabled\n\nGo to Settings > Privacy & Security > Location Services',
            [{ text: 'OK' }]
          );
        }
        
        return false;
      }

      // 6. Mark attendance
      const result = await this.markAttendanceAPI(
        token,
        location.latitude,
        location.longitude,
        source
      );

      if (result.success) {
        await this.markAttendanceCompleted();
        
        if (showAlert) {
          Alert.alert(
            'Attendance Marked',
            `Your attendance has been marked successfully!`,
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
    const dayOfWeek = now.getDay();
    const hours = now.getHours();
    
    // Monday-Friday (1-5)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    // 8 AM to 11 AM
    return hours >= 8 && hours < 11;
  }

  /**
   * Request location permissions with iOS guidance
   */
  static async requestLocationPermissions(): Promise<{
    foreground: boolean;
    background: boolean;
  }> {
    const foreground = await LocationService.requestPermissions();
    
    if (!foreground) {
      return { foreground: false, background: false };
    }

    const background = await LocationService.requestBackgroundPermission();
    
    return { foreground, background };
  }

  /**
   * Get all office locations from backend
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