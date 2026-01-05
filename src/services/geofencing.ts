// services/geofencing.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AttendanceUtils } from './attendanceUtils';

const GEOFENCE_TASK_NAME = 'attendance-geofence';
const GEOFENCE_REGIONS_KEY = 'geofence_regions';
const GEOFENCE_RADIUS = 50; // 50 meters

interface GeofenceRegion {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
}

// Define the geofencing event data type
interface GeofencingEventData {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

/**
 * Define the geofencing task
 * This runs when user enters/exits office geofence regions
 */
TaskManager.defineTask(
  GEOFENCE_TASK_NAME,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<GeofencingEventData>) => {
    if (error) {
      console.error('❌ Geofencing task error:', error);
      return;
    }

    if (!data) {
      console.log('⚠️ No data in geofencing event');
      return;
    }

    const { eventType, region } = data;

    console.log('🎯 Geofence event:', {
      type: eventType === Location.GeofencingEventType.Enter ? 'ENTER' : 'EXIT',
      region: region.identifier,
    });

    // Only trigger on ENTER events
    if (eventType === Location.GeofencingEventType.Enter) {
      console.log('👋 User entered office geofence:', region.identifier);

      // Check if within working hours
      if (!AttendanceUtils.isWithinWorkingHours()) {
        console.log('⏭️ Outside working hours - skipping geofence attendance');
        return;
      }

      // Execute attendance flow
      const success = await AttendanceUtils.executeAttendanceFlow('geofence', false);
      
      if (success) {
        console.log('✅ Geofence attendance marked successfully');
      } else {
        console.log('❌ Geofence attendance marking failed');
      }
    }
  }
);

/**
 * Geofencing service for event-driven attendance
 */
export class GeofencingService {
  
  /**
   * Initialize geofencing service
   * Fetches office locations and sets up geofence regions
   */
  static async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing geofencing service...');

      // Check permissions
      const { status: foregroundStatus } = 
        await Location.getForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.log('❌ Location permission not granted');
        return false;
      }

      const { status: backgroundStatus } = 
        await Location.getBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.log('⚠️ Background location permission not granted - geofencing may not work');
        // Continue anyway - user might grant later
      }

      // Get token
      const token = await AttendanceUtils.getToken();
      if (!token) {
        console.log('❌ No token found');
        return false;
      }

      // Fetch office locations from backend
      const offices = await AttendanceUtils.getOfficeLocations(token);
      if (!offices || offices.length === 0) {
        console.log('⚠️ No office locations found - geofencing disabled');
        return false;
      }

      // Create geofence regions from office locations
      const regions: Location.LocationRegion[] = offices.map(office => ({
        identifier: office.id,
        latitude: office.latitude,
        longitude: office.longitude,
        radius: GEOFENCE_RADIUS,
        notifyOnEnter: true,
        notifyOnExit: false, // We only care about entry
      }));

      console.log(`📍 Setting up ${regions.length} geofence regions`);

      // Save regions to storage (for debugging/info purposes)
      await AsyncStorage.setItem(
        GEOFENCE_REGIONS_KEY,
        JSON.stringify(regions.map(r => ({
          id: r.identifier,
          lat: r.latitude,
          lng: r.longitude,
        })))
      );

      // Check if task is already registered
      const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
      
      if (isRegistered) {
        // Stop existing geofencing to update regions
        await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
        console.log('🔄 Updating existing geofence regions');
      }

      // Start geofencing with all office locations
      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);

      console.log('✅ Geofencing service initialized successfully');
      console.log(`   - Monitoring ${regions.length} office location(s)`);
      console.log(`   - Trigger radius: ${GEOFENCE_RADIUS}m`);
      
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize geofencing:', error);
      return false;
    }
  }

  /**
   * Stop geofencing service
   */
  static async stop(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
      
      if (isRegistered) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
        console.log('🛑 Geofencing service stopped');
      } else {
        console.log('ℹ️ Geofencing was not running');
      }
    } catch (error) {
      console.error('❌ Error stopping geofencing:', error);
    }
  }

  /**
   * Check if geofencing is currently active
   */
  static async isRunning(): Promise<boolean> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
      
      if (!isRegistered) {
        return false;
      }

      // Check if task is actually defined and has regions
      const regions = await AsyncStorage.getItem(GEOFENCE_REGIONS_KEY);
      return isRegistered && regions !== null;
      
    } catch (error) {
      console.error('❌ Error checking geofencing status:', error);
      return false;
    }
  }

  /**
   * Get current geofence regions (for debugging)
   */
  static async getRegions(): Promise<Array<{
    id: string;
    lat: number;
    lng: number;
  }> | null> {
    try {
      const regionsStr = await AsyncStorage.getItem(GEOFENCE_REGIONS_KEY);
      return regionsStr ? JSON.parse(regionsStr) : null;
    } catch (error) {
      console.error('❌ Error getting regions:', error);
      return null;
    }
  }

  /**
   * Refresh geofence regions (call this when office locations change)
   */
  static async refresh(): Promise<boolean> {
    console.log('🔄 Refreshing geofence regions...');
    await this.stop();
    return await this.initialize();
  }

  /**
   * Get geofencing status info
   */
  static async getStatus(): Promise<{
    isRunning: boolean;
    regionCount: number;
    regions: Array<{ id: string; lat: number; lng: number }> | null;
  }> {
    const isRunning = await this.isRunning();
    const regions = await this.getRegions();
    
    return {
      isRunning,
      regionCount: regions?.length || 0,
      regions,
    };
  }
}