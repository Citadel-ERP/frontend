// services/backgroundAttendance.ts
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { AttendanceUtils } from './attendanceUtils';

const POLLING_TASK_NAME = 'attendance-polling-check';
const POLLING_INTERVAL = 15 * 60; // 15 minutes in seconds

/**
 * Define the polling task
 * This runs periodically to check and mark attendance
 */
TaskManager.defineTask(POLLING_TASK_NAME, async () => {
  try {
    console.log('🔄 Polling attendance check triggered');

    // Check if within working hours
    if (!AttendanceUtils.isWithinWorkingHours()) {
      console.log('⏭️ Outside working hours - skipping polling check');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Execute attendance flow
    const success = await AttendanceUtils.executeAttendanceFlow('polling', false);

    if (success) {
      console.log('✅ Polling attendance marked successfully');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.log('ℹ️ Polling check completed - no attendance marked');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

  } catch (error) {
    console.error('❌ Error in polling task:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Background polling service for attendance
 */
export class BackgroundAttendanceService {
  
  /**
   * Initialize polling service
   */
  static async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing polling attendance service...');

      // Check if task is already registered
      const isRegistered = await TaskManager.isTaskRegisteredAsync(POLLING_TASK_NAME);
      
      if (isRegistered) {
        console.log('✅ Polling task already registered');
        return true;
      }

      // Register background fetch task
      await BackgroundFetch.registerTaskAsync(POLLING_TASK_NAME, {
        minimumInterval: POLLING_INTERVAL,
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('✅ Polling service initialized');
      console.log(`   - Check interval: ${POLLING_INTERVAL / 60} minutes`);
      console.log('   - Active hours: 8 AM - 11 AM, Mon-Fri');
      
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize polling service:', error);
      return false;
    }
  }

  /**
   * Stop polling service
   */
  static async stop(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(POLLING_TASK_NAME);
      console.log('🛑 Polling service stopped');
    } catch (error) {
      console.error('❌ Error stopping polling service:', error);
    }
  }

  /**
   * Check if polling service is running
   */
  static async isRunning(): Promise<boolean> {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      const isRegistered = await TaskManager.isTaskRegisteredAsync(POLLING_TASK_NAME);
      
      return (
        status === BackgroundFetch.BackgroundFetchStatus.Available &&
        isRegistered
      );
    } catch (error) {
      console.error('❌ Error checking polling status:', error);
      return false;
    }
  }

  /**
   * Initialize all attendance services (polling + geofencing)
   * This is a convenience method for the dashboard
   */
  static async initializeAll(): Promise<void> {
    console.log('🚀 Initializing all attendance services...');
    
    // Start polling service
    const pollingSuccess = await this.initialize();
    console.log(pollingSuccess ? '✅ Polling: Active' : '❌ Polling: Failed');

    // Note: Geofencing is initialized separately in dashboard
    // to avoid circular dependencies
  }

  /**
   * Stop all attendance services
   */
  static async stopAll(): Promise<void> {
    console.log('🛑 Stopping all attendance services...');
    await this.stop();
    // Note: Geofencing is stopped separately in dashboard
  }

  /**
   * Get service status
   */
  static async getStatus(): Promise<{
    isRunning: boolean;
    interval: number;
  }> {
    const isRunning = await this.isRunning();
    
    return {
      isRunning,
      interval: POLLING_INTERVAL,
    };
  }
}