// services/backgroundAttendance.ts
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AttendanceUtils } from './attendanceUtils';
import { GeofencingService } from './geofencing';

const BACKGROUND_FETCH_TASK = 'attendance-background-fetch';
const POLLING_INTERVAL = 15 * 60; // 15 minutes in seconds

/**
 * Define the background fetch task
 * This runs periodically to check and mark attendance
 */
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('📱 Background fetch task triggered');
    
    // Check if we're running in Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo) {
      console.log('⚠️ Running in Expo Go - background fetch limited');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Check if within working hours (8 AM - 11 AM, Monday-Friday)
    if (!AttendanceUtils.isWithinWorkingHours()) {
      console.log('⏭️ Outside working hours - skipping background fetch');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Execute attendance flow
    const success = await AttendanceUtils.executeAttendanceFlow('polling', false);
    
    if (success) {
      console.log('✅ Background attendance marked successfully');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.log('⏭️ Background attendance skipped (already marked or on leave)');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

  } catch (error) {
    console.error('❌ Background fetch task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Background Attendance Service using polling mechanism
 * Works alongside geofencing for hybrid approach
 */
export class BackgroundAttendanceService {
  
  /**
   * Initialize polling-based background attendance
   */
  static async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing polling attendance service...');

      // Check if we're in Expo Go
      const isExpoGo = Constants.appOwnership === 'expo';
      if (isExpoGo) {
        console.log('⚠️ Running in Expo Go - background fetch not available');
        console.log('   Build a standalone app to enable background attendance');
        return false;
      }

      // Check if task is already registered
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      
      if (isRegistered) {
        console.log('✅ Polling task already registered');
        return true;
      }

      // Register background fetch task
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: POLLING_INTERVAL, // 15 minutes
        stopOnTerminate: false, // Continue after app termination
        startOnBoot: true, // Start when device boots
      });

      console.log('✅ Polling attendance service initialized');
      console.log(`   - Interval: ${POLLING_INTERVAL / 60} minutes`);
      console.log('   - Active hours: 8-11 AM, Monday-Friday');
      
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize polling service:', error);
      return false;
    }
  }

  /**
   * Register/re-register the background task
   * Useful for re-initialization when app comes to foreground
   */
  static async registerBackgroundTask(): Promise<void> {
    try {
      const isExpoGo = Constants.appOwnership === 'expo';
      if (isExpoGo) {
        return;
      }

      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      
      if (isRegistered) {
        // Unregister first
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      }

      // Re-register
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: POLLING_INTERVAL,
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('🔄 Background task re-registered');
    } catch (error) {
      console.error('❌ Error re-registering background task:', error);
    }
  }

  /**
   * Stop polling-based background attendance
   */
  static async stop(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
        console.log('🛑 Polling service stopped');
      } else {
        console.log('ℹ️ Polling service was not running');
      }
    } catch (error) {
      console.error('❌ Error stopping polling service:', error);
    }
  }

  /**
   * Check if polling service is currently active
   */
  static async isRunning(): Promise<boolean> {
    try {
      const isExpoGo = Constants.appOwnership === 'expo';
      if (isExpoGo) {
        return false;
      }

      return await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    } catch (error) {
      console.error('❌ Error checking polling status:', error);
      return false;
    }
  }

  /**
   * Get polling service status
   */
  static async getStatus(): Promise<{
    isRunning: boolean;
    nextExecutionTime?: Date;
    isExpoGo: boolean;
  }> {
    try {
      const isExpoGo = Constants.appOwnership === 'expo';
      const isRunning = await this.isRunning();
      
      let nextExecutionTime: Date | undefined;
      
      if (isRunning && !isExpoGo) {
        // Try to get next execution time (if available)
        const status = await BackgroundFetch.getStatusAsync();
        console.log('Background fetch status:', status);
      }

      return {
        isRunning,
        nextExecutionTime,
        isExpoGo,
      };
    } catch (error) {
      console.error('❌ Error getting status:', error);
      return {
        isRunning: false,
        isExpoGo: Constants.appOwnership === 'expo',
      };
    }
  }

  /**
   * Initialize all attendance services (polling + geofencing)
   * Returns status of each service
   */
  static async initializeAll(): Promise<{
    backgroundFetch: boolean;
    geofencing: boolean;
  }> {
    try {
      console.log('🚀 Initializing all attendance services...');
      
      // Initialize polling service
      const pollingInitialized = await this.initialize();
      
      // Initialize geofencing service
      const geofencingInitialized = await GeofencingService.initialize();
      
      return {
        backgroundFetch: pollingInitialized,
        geofencing: geofencingInitialized,
      };
    } catch (error) {
      console.error('❌ Error initializing all services:', error);
      return {
        backgroundFetch: false,
        geofencing: false,
      };
    }
  }

  /**
   * Stop all attendance services
   */
  static async stopAll(): Promise<void> {
    try {
      console.log('🛑 Stopping all attendance services...');
      await this.stop();
      await GeofencingService.stop();
      console.log('✅ All attendance services stopped');
    } catch (error) {
      console.error('❌ Error stopping services:', error);
    }
  }

  /**
   * Refresh all attendance services
   * Useful when settings change
   */
  static async refreshAll(): Promise<{
    backgroundFetch: boolean;
    geofencing: boolean;
  }> {
    console.log('🔄 Refreshing all attendance services...');
    await this.stopAll();
    return await this.initializeAll();
  }

  /**
   * Get comprehensive status of all attendance services
   */
  static async getAllStatus(): Promise<{
    polling: {
      isRunning: boolean;
      nextExecutionTime?: Date;
      isExpoGo: boolean;
    };
    geofencing: {
      isRunning: boolean;
      regionCount: number;
      regions: Array<{ id: string; lat: number; lng: number }> | null;
    };
  }> {
    const pollingStatus = await this.getStatus();
    const geofencingStatus = await GeofencingService.getStatus();

    return {
      polling: pollingStatus,
      geofencing: geofencingStatus,
    };
  }
}

// Export for use in other parts of the app
export default BackgroundAttendanceService;