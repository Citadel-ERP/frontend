import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricPermissionResult {
  granted: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  error?: string;
}

export const requestBiometricPermissions = async (): Promise<BiometricPermissionResult> => {
  try {
    console.log('Requesting biometric permissions...');
    
    // Check if biometric hardware is available
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    console.log('Has biometric hardware:', hasHardware);
    
    if (!hasHardware) {
      return {
        granted: false,
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        error: 'No biometric hardware available on this device'
      };
    }

    // Check if biometrics are enrolled
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    console.log('Has enrolled biometrics:', isEnrolled);
    
    if (!isEnrolled) {
      return {
        granted: false,
        hasHardware: true,
        isEnrolled: false,
        supportedTypes: [],
        error: 'No biometric authentication methods are enrolled on this device'
      };
    }

    // Get supported authentication types
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    console.log('Supported authentication types:', supportedTypes);

    return {
      granted: true,
      hasHardware: true,
      isEnrolled: true,
      supportedTypes: supportedTypes,
    };

  } catch (error) {
    console.error('Error requesting biometric permissions:', error);
    return {
      granted: false,
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
      error: error instanceof Error ? error.message : 'Unknown biometric permission error'
    };
  }
};

export const getBiometricType = (supportedTypes: LocalAuthentication.AuthenticationType[]): {
  hasFaceID: boolean;
  hasFingerprint: boolean;
  primaryType: 'face' | 'fingerprint' | 'iris' | 'none';
} => {
  const hasFaceID = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const hasFingerprint = supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  const hasIris = supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS);

  let primaryType: 'face' | 'fingerprint' | 'iris' | 'none' = 'none';
  
  if (hasFaceID) primaryType = 'face';
  else if (hasFingerprint) primaryType = 'fingerprint';
  else if (hasIris) primaryType = 'iris';

  return {
    hasFaceID,
    hasFingerprint,
    primaryType
  };
};

export const getBiometricPromptMessage = (supportedTypes: LocalAuthentication.AuthenticationType[]): {
  title: string;
  subtitle: string;
} => {
  const { hasFaceID, hasFingerprint } = getBiometricType(supportedTypes);

  if (hasFaceID && hasFingerprint) {
    return {
      title: 'Biometric Authentication',
      subtitle: 'Use your fingerprint or face recognition to authenticate'
    };
  }
  
  if (hasFaceID) {
    return {
      title: 'Face Authentication',
      subtitle: 'Look at your device to authenticate with face recognition'
    };
  }
  
  if (hasFingerprint) {
    return {
      title: 'Fingerprint Authentication',
      subtitle: 'Place your finger on the fingerprint sensor'
    };
  }

  return {
    title: 'Biometric Authentication',
    subtitle: 'Use your device biometric to authenticate'
  };
};

// For future notification permissions
export const checkNotificationPermission = async (): Promise<boolean> => {
  try {
    // This would require expo-notifications package
    // For now, we'll just return true as a placeholder
    console.log('Notification permission check - implement when expo-notifications is added');
    return true;
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
};