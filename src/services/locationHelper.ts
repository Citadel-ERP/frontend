import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';

interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

interface LocationResult {
  success: boolean;
  coordinates?: LocationCoordinates;
  error?: string;
}

/**
 * iOS-safe location fetcher for attendance marking
 * Handles:
 * - iOS Reduced Accuracy mode
 * - Temporary full accuracy requests
 * - Permission flow without churn
 * - Proper error handling for production
 */
export const ensureLocationReady = async (): Promise<LocationResult> => {
  try {
    // Step 1: Check current permission status (no request yet)
    const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
    
    let finalStatus = currentStatus;
    
    // Step 2: Request permission only if not already granted
    if (currentStatus !== 'granted') {
      const { status: requestedStatus } = await Location.requestForegroundPermissionsAsync();
      finalStatus = requestedStatus;
      
      if (requestedStatus !== 'granted') {
        return {
          success: false,
          error: 'Location permission denied. Please enable location access in Settings.'
        };
      }
    }

    // Step 3: iOS-specific - Request temporary full accuracy when needed
    // This is crucial: iOS may grant permission but default to "reduced accuracy"
    if (Platform.OS === 'ios') {
      try {
        // Request full accuracy for this session
        // This shows the iOS prompt: "Allow [App] to use your precise location?"
        await Location.requestForegroundPermissionsAsync();
        
        // Additional step: Try to enable high accuracy mode
        const accuracy = await Location.enableNetworkProviderAsync();
        console.log('iOS network provider enabled:', accuracy);
      } catch (accuracyError) {
        console.warn('iOS accuracy request warning:', accuracyError);
        // Continue anyway - we'll try to get location with whatever accuracy is available
      }
    }

    // Step 4: Get current location with appropriate settings
    // NO timeout race - let the OS handle it properly
    const locationOptions: Location.LocationOptions = {
      accuracy: Platform.OS === 'ios' 
        ? Location.Accuracy.BestForNavigation  // Highest accuracy for iOS
        : Location.Accuracy.High,               // High accuracy for Android
      // iOS-specific: maximize chances of getting precise location
      ...(Platform.OS === 'ios' && {
        timeInterval: 1000,
        distanceInterval: 0,
      })
    };

    const location = await Location.getCurrentPositionAsync(locationOptions);

    // Step 5: Validate location data
    if (!location?.coords?.latitude || !location?.coords?.longitude) {
      return {
        success: false,
        error: 'Invalid location data received. Please try again.'
      };
    }

    // Step 6: iOS-specific - Check if we got reduced accuracy (coordinates rounded to ~500m)
    if (Platform.OS === 'ios') {
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      
      // Reduced accuracy typically rounds to 2-3 decimal places
      // Full accuracy has 6+ decimal places
      const latDecimals = (lat.toString().split('.')[1] || '').length;
      const lngDecimals = (lng.toString().split('.')[1] || '').length;
      
      if (latDecimals < 4 || lngDecimals < 4) {
        console.warn('iOS: Possible reduced accuracy detected', { latDecimals, lngDecimals });
        // Still proceed but log for debugging
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
    console.error('Location fetch error:', error);
    
    // Provide user-friendly error messages
    let errorMessage = 'Unable to get your location. ';
    
    if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
      errorMessage += 'Location request timed out. Please ensure you have a clear view of the sky and try again.';
    } else if (error.message?.includes('denied') || error.message?.includes('permission')) {
      errorMessage += 'Location permission is required. Please enable it in your device Settings.';
    } else if (error.message?.includes('unavailable') || error.message?.includes('disabled')) {
      errorMessage += 'Location services are disabled. Please enable them in your device Settings.';
    } else {
      errorMessage += 'Please check your location settings and try again.';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Quick permission status check (no request)
 * Use this for UI state only, not for actual location fetching
 */
export const checkLocationPermissionStatus = async (): Promise<boolean> => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking permission status:', error);
    return false;
  }
};

/**
 * Show user-friendly alert for location issues
 */
export const showLocationAlert = (errorMessage?: string) => {
  Alert.alert(
    'Location Required',
    errorMessage || 'Location access is required to mark attendance. Please enable location services and try again.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => {
          if (Platform.OS === 'ios') {
            // On iOS, you can't directly open app settings from code
            // User must manually go to Settings
            Alert.alert(
              'Enable Location',
              'Go to Settings > Privacy & Security > Location Services > [Your App] and enable location access with "Precise Location" turned ON.',
              [{ text: 'OK' }]
            );
          } else {
            // On Android, you could use Linking to open settings
            // but keeping it simple with an info alert
            Alert.alert(
              'Enable Location',
              'Go to Settings > Apps > [Your App] > Permissions and enable location access.',
              [{ text: 'OK' }]
            );
          }
        }
      }
    ]
  );
};