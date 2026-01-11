// services/locationService.ts
import * as Location from 'expo-location';
import { Platform, Alert } from 'react-native';

interface LocationResult {
  success: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  error?: string;
}

/**
 * iOS-Optimized Location Service
 * Fixes all iOS location issues
 */
export class LocationService {
  
  /**
   * Get current location with iOS-specific optimizations
   * NO TIMEOUTS - let iOS handle timing naturally
   */
  static async getCurrentLocation(): Promise<LocationResult> {
    try {
      console.log('📍 Starting location fetch...');

      // Step 1: Check permissions
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('❌ Location permission not granted');
        return {
          success: false,
          error: 'Location permission is required. Please enable it in Settings.'
        };
      }

      // Step 2: iOS-specific - Request full accuracy if needed
      if (Platform.OS === 'ios') {
        try {
          // This triggers the "Use Precise Location" dialog if not already approved
          const { canAskAgain, granted } = await Location.requestForegroundPermissionsAsync();
          
          if (!granted && canAskAgain) {
            console.log('⚠️ iOS: Precise location not enabled');
            return {
              success: false,
              error: 'Please enable "Precise Location" in Settings > Privacy > Location Services > [Your App]'
            };
          }
        } catch (error) {
          console.warn('iOS accuracy check warning:', error);
          // Continue anyway
        }
      }

      // Step 3: Configure location options for iOS
      const locationOptions: Location.LocationOptions = {
        // iOS: BestForNavigation provides most reliable results
        // Android: High accuracy
        accuracy: Platform.OS === 'ios' 
          ? Location.Accuracy.BestForNavigation 
          : Location.Accuracy.High,
      };

      // iOS-specific: Add delay settings to give GPS more time
      if (Platform.OS === 'ios') {
        Object.assign(locationOptions, {
          timeInterval: 1000,
          distanceInterval: 0,
        });
      }

      console.log('📡 Requesting location (iOS may take 15-30 seconds)...');

      // Step 4: Get location WITHOUT timeout
      // Critical: Let iOS take as long as it needs
      const location = await Location.getCurrentPositionAsync(locationOptions);

      // Step 5: Validate coordinates
      if (!location?.coords?.latitude || !location?.coords?.longitude) {
        console.error('❌ Invalid location data:', location);
        return {
          success: false,
          error: 'Received invalid location data. Please try again.'
        };
      }

      console.log('✅ Location obtained:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });

      // Step 6: iOS - Check if we got reduced accuracy
      if (Platform.OS === 'ios' && location.coords.accuracy) {
        if (location.coords.accuracy > 100) {
          console.warn(`⚠️ iOS: Low accuracy (${location.coords.accuracy}m)`);
          // Still proceed but user might see warning
        }
      }

      return {
        success: true,
        coordinates: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }
      };

    } catch (error: any) {
      console.error('❌ Location error:', error);
      
      // Provide specific error messages
      let errorMessage = 'Unable to get location. ';
      
      if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
        errorMessage += 'Location services are disabled. Enable them in Settings.';
      } else if (error.code === 'E_LOCATION_UNAUTHORIZED') {
        errorMessage += 'Location permission denied. Enable it in Settings.';
      } else if (error.message?.includes('timed out')) {
        // This shouldn't happen anymore since we removed timeout
        errorMessage += 'Location request took too long. Please ensure you have a clear view of the sky.';
      } else {
        errorMessage += 'Please check Settings > Privacy > Location Services.';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Request location permissions with iOS-specific guidance
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      console.log('🔐 Requesting location permissions...');

      // Request foreground permission
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        if (!canAskAgain) {
          // User previously denied - show settings guidance
          Alert.alert(
            'Location Permission Required',
            Platform.OS === 'ios'
              ? 'Go to Settings > Privacy & Security > Location Services > [Your App] and enable location access with "Precise Location" ON.'
              : 'Go to Settings > Apps > [Your App] > Permissions and enable location access.',
            [{ text: 'OK' }]
          );
        }
        return false;
      }

      console.log('✅ Location permission granted');
      return true;

    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Request background location permission
   */
  static async requestBackgroundPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      
      if (status !== 'granted') {
        // Alert.alert(
        //   'Background Location Required',
        //   Platform.OS === 'ios'
        //     ? 'For automatic attendance, please:\n\n1. Go to Settings > Privacy & Security > Location Services > [Your App]\n2. Select "Always"\n3. Enable "Precise Location"'
        //     : 'Please enable "Allow all the time" for location access in Settings.',
        //   [{ text: 'OK' }]
        // );
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error requesting background permission:', error);
      return false;
    }
  }

  /**
   * Check current permission status without requesting
   */
  static async checkPermissionStatus(): Promise<{
    foreground: boolean;
    background: boolean;
  }> {
    try {
      const foregroundResult = await Location.getForegroundPermissionsAsync();
      const backgroundResult = await Location.getBackgroundPermissionsAsync();
      
      return {
        foreground: foregroundResult.status === 'granted',
        background: backgroundResult.status === 'granted',
      };
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      return { foreground: false, background: false };
    }
  }

  /**
   * Show user-friendly alert for location issues
   */
  static showLocationAlert(errorMessage?: string): void {
    Alert.alert(
      'Location Required',
      errorMessage || 'Location access is required to mark attendance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            const settingsMessage = Platform.OS === 'ios'
              ? 'Go to Settings > Privacy & Security > Location Services > [Your App] and:\n\n1. Enable location access\n2. Select "While Using" or "Always"\n3. Turn ON "Precise Location"'
              : 'Go to Settings > Apps > [Your App] > Permissions and enable location access.';
            
            Alert.alert('Enable Location', settingsMessage, [{ text: 'OK' }]);
          }
        }
      ]
    );
  }
}