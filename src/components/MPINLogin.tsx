import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { BACKEND_URL } from '../config/config'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const isTablet = screenWidth >= 768;
const isSmallDevice = screenHeight < 700;
const containerPadding = isTablet ? 48 : 24;
const logoSize = isTablet ? 140 : isSmallDevice ? 100 : 120;
const mpinInputSize = isTablet ? 55 : isSmallDevice ? 40 : 45;
const mpinInputHeight = isTablet ? 66 : isSmallDevice ? 50 : 56;

interface MPINLoginProps {
  onMPINLogin: (mpin: string) => Promise<void>;
  onBiometricLogin?: (token: string) => Promise<void>;
  onUsePassword: () => void;
  isLoading?: boolean;
  userEmail?: string;
}

interface LoginResponse {
  message: string;
  token?: string;
  user?: {
    email: string;
    name?: string;
  };
}

type BiometryType = 'TouchID' | 'FaceID' | 'Biometrics';

interface BiometricState {
  isAvailable: boolean;
  biometryType: BiometryType | null;
  isEnabled: boolean;
  isLoading: boolean;
}

const MPINLogin: React.FC<MPINLoginProps> = ({
  onMPINLogin,
  onBiometricLogin,
  onUsePassword,
  isLoading = false,
  userEmail,
}) => {
  const [mpin, setMPin] = useState<string[]>(['', '', '', '', '', '']);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [biometric, setBiometric] = useState<BiometricState>({
    isAvailable: false,
    biometryType: null,
    isEnabled: false,
    isLoading: false,
  });
  
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const rnBiometricsRef = useRef<ReactNativeBiometrics | null>(null);

  // Initialize biometrics instance with better error handling
  const getBiometricsInstance = useCallback(() => {
    try {
      if (!rnBiometricsRef.current) {
        // Add platform check
        if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
          console.warn('Biometrics not supported on this platform');
          return null;
        }
        
        rnBiometricsRef.current = new ReactNativeBiometrics({
          allowDeviceCredentials: false // Optional: only allow biometric authentication
        });
      }
      return rnBiometricsRef.current;
    } catch (error) {
      console.error('Failed to create ReactNativeBiometrics instance:', error);
      rnBiometricsRef.current = null;
      return null;
    }
  }, []);

  // Constants
  const TOKEN_2_KEY = 'token_2';
  const MPIN_ATTEMPTS_KEY = 'mpin_attempts';
  const MPIN_BLOCK_TIME_KEY = 'mpin_block_time';
  const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
  const MAX_ATTEMPTS = 3;
  const BLOCK_DURATION = 30 * 60 * 1000; // 30 minutes

  const getBackendUrl = useCallback((): string => {
    const backendUrl = BACKEND_URL;
    
    if (!backendUrl) {
      console.error('BACKEND_URL not found in environment variables');
      throw new Error('Backend URL not configured. Please check your environment setup.');
    }
    
    return backendUrl;
  }, []);

  const hasEnteredDigits = mpin.some(digit => digit !== '');
  const isMPINComplete = mpin.every(digit => digit !== '') && mpin.join('').length === 6;

  const initializeBiometrics = useCallback(async () => {
    try {
      setBiometric(prev => ({ ...prev, isLoading: true }));
      
      const rnBiometrics = getBiometricsInstance();
      if (!rnBiometrics) {
        console.log('ReactNativeBiometrics instance not available');
        setBiometric({
          isAvailable: false,
          biometryType: null,
          isEnabled: false,
          isLoading: false,
        });
        return;
      }

      // Add null check before calling methods
      if (typeof rnBiometrics.isSensorAvailable !== 'function') {
        console.warn('isSensorAvailable method not available');
        setBiometric({
          isAvailable: false,
          biometryType: null,
          isEnabled: false,
          isLoading: false,
        });
        return;
      }

      // Check if biometrics is available with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Biometric check timeout')), 10000);
      });

      const biometricPromise = rnBiometrics.isSensorAvailable();
      
      const { available, biometryType } = await Promise.race([
        biometricPromise,
        timeoutPromise
      ]) as { available: boolean; biometryType?: BiometryType };
      
      if (available && biometryType) {
        // Check if user has enabled biometrics for this app
        const biometricEnabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
        const isEnabled = biometricEnabled === 'true';

        setBiometric({
          isAvailable: true,
          biometryType,
          isEnabled,
          isLoading: false,
        });

        console.log(`Biometric type available: ${biometryType}, Enabled: ${isEnabled}`);
      } else {
        setBiometric({
          isAvailable: false,
          biometryType: null,
          isEnabled: false,
          isLoading: false,
        });
        console.log('Biometrics not available on this device');
      }
    } catch (error) {
      console.error('Error initializing biometrics:', error);
      setBiometric({
        isAvailable: false,
        biometryType: null,
        isEnabled: false,
        isLoading: false,
      });
    }
  }, [getBiometricsInstance]);

  const loadAttemptData = useCallback(async () => {
    try {
      const [storedAttempts, storedBlockTime] = await AsyncStorage.multiGet([
        MPIN_ATTEMPTS_KEY,
        MPIN_BLOCK_TIME_KEY
      ]);

      const attempts = storedAttempts[1] ? parseInt(storedAttempts[1], 10) : 0;
      const blockTime = storedBlockTime[1] ? parseInt(storedBlockTime[1], 10) : 0;

      const currentTime = Date.now();

      if (blockTime > 0 && (currentTime - blockTime) < BLOCK_DURATION) {
        setIsBlocked(true);
        setAttemptCount(MAX_ATTEMPTS);
        const remainingTime = Math.ceil((BLOCK_DURATION - (currentTime - blockTime)) / 60000);
        setError(`Too many failed attempts. Try again in ${remainingTime} minutes.`);
      } else if (blockTime > 0 && (currentTime - blockTime) >= BLOCK_DURATION) {
        await clearAttemptData();
        setAttemptCount(0);
        setIsBlocked(false);
      } else {
        setAttemptCount(attempts);
      }
    } catch (error) {
      console.error('Error loading attempt data:', error);
    }
  }, []);

  const clearAttemptData = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([MPIN_ATTEMPTS_KEY, MPIN_BLOCK_TIME_KEY]);
      console.log('MPIN attempt data cleared');
    } catch (error) {
      console.error('Error clearing attempt data:', error);
    }
  }, []);

  useEffect(() => {
    loadAttemptData();
    
    // Add a small delay to ensure component is fully mounted
    const initTimer = setTimeout(() => {
      initializeBiometrics();
    }, 500);

    return () => clearTimeout(initTimer);
  }, [loadAttemptData, initializeBiometrics]);

  const getBiometricPromptMessage = useCallback((): string => {
    switch (biometric.biometryType) {
      case BiometryTypes.FaceID:
        return 'Use Face ID to login';
      case BiometryTypes.TouchID:
        return 'Use Touch ID to login';
      case BiometryTypes.Biometrics:
        return 'Use biometric authentication to login';
      default:
        return 'Use biometric authentication to login';
    }
  }, [biometric.biometryType]);

  const getBiometricButtonText = useCallback((): string => {
    switch (biometric.biometryType) {
      case BiometryTypes.FaceID:
        return 'Face ID';
      case BiometryTypes.TouchID:
        return 'Touch ID';
      case BiometryTypes.Biometrics:
        return 'Biometric';
      default:
        return 'Biometric';
    }
  }, [biometric.biometryType]);

  const getBiometricIcon = useCallback((): string => {
    switch (biometric.biometryType) {
      case BiometryTypes.FaceID:
        return '👤';
      case BiometryTypes.TouchID:
        return '👆';
      case BiometryTypes.Biometrics:
        return '🔐';
      default:
        return '🔐';
    }
  }, [biometric.biometryType]);

  const handleRedirectToLogin = useCallback(() => {
    try {
      console.log('Redirecting to login page due to exceeded MPIN attempts');
      onUsePassword();
    } catch (error) {
      console.error('Error during redirect to login:', error);
      setTimeout(() => onUsePassword(), 100);
    }
  }, [onUsePassword]);

  const handleBiometricAuthentication = useCallback(async () => {
    if (!biometric.isAvailable || !biometric.isEnabled || isBlocked) {
      return;
    }

    const rnBiometrics = getBiometricsInstance();
    if (!rnBiometrics) {
      setError('Biometric authentication not available');
      return;
    }

    setBiometric(prev => ({ ...prev, isLoading: true }));
    setError('');

    try {
      // Validate that required methods exist
      if (typeof rnBiometrics.createSignature !== 'function') {
        throw new Error('Biometric signature method not available');
      }

      const epochTimeSeconds = Math.round(Date.now() / 1000).toString();
      const payload = epochTimeSeconds + (userEmail || '');

      const { success, signature } = await rnBiometrics.createSignature({
        promptMessage: getBiometricPromptMessage(),
        payload: payload,
      });

      if (success && signature) {
        console.log('Biometric authentication successful');
        
        // Get stored token for biometric login
        const storedToken = await AsyncStorage.getItem(TOKEN_2_KEY);
        
        if (!storedToken) {
          throw new Error('No authentication token found');
        }

        // Call biometric login API or use existing MPIN login with biometric flag
        if (onBiometricLogin) {
          await onBiometricLogin(storedToken);
        } else {
          // Fallback: you might want to implement a separate biometric login endpoint
          console.log('Biometric login successful');
          Alert.alert('Success', 'Biometric authentication successful', [
            { text: 'OK', onPress: () => onUsePassword() }
          ]);
        }
      }
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      
      if (error.message === 'User cancellation' || error.message === 'UserCancel') {
        // User cancelled, don't show error
        setError('');
      } else if (error.message === 'User fallback' || error.message === 'UserFallback') {
        // User chose to use password instead
        setError('');
      } else if (error.message && error.message.includes('No authentication token')) {
        setError('Session expired. Please login with email and password.');
        setTimeout(() => {
          Alert.alert(
            'Session Expired',
            'Please login with your email and password.',
            [{ text: 'OK', onPress: handleRedirectToLogin }]
          );
        }, 500);
      } else {
        setError('Biometric authentication failed. Please try again or use your MPIN.');
      }
    } finally {
      setBiometric(prev => ({ ...prev, isLoading: false }));
    }
  }, [biometric.isAvailable, biometric.isEnabled, isBlocked, getBiometricsInstance, getBiometricPromptMessage, userEmail, onBiometricLogin, onUsePassword, handleRedirectToLogin]);

  const enableBiometrics = useCallback(async () => {
    if (!biometric.isAvailable) return;

    const rnBiometrics = getBiometricsInstance();
    if (!rnBiometrics) {
      Alert.alert('Error', 'Biometric authentication not available.');
      return;
    }

    try {
      // Validate that required methods exist
      if (typeof rnBiometrics.biometricKeysExist !== 'function' || 
          typeof rnBiometrics.createKeys !== 'function' ||
          typeof rnBiometrics.createSignature !== 'function') {
        throw new Error('Required biometric methods not available');
      }

      // Create biometric keys
      const { keysExist } = await rnBiometrics.biometricKeysExist();
      
      if (!keysExist) {
        const { publicKey } = await rnBiometrics.createKeys();
        console.log('Biometric keys created:', publicKey);
      }

      // Test biometric authentication
      const epochTimeSeconds = Math.round(Date.now() / 1000).toString();
      const payload = epochTimeSeconds + (userEmail || '');

      const { success } = await rnBiometrics.createSignature({
        promptMessage: 'Enable biometric authentication for future logins',
        payload: payload,
      });

      if (success) {
        await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
        setBiometric(prev => ({ ...prev, isEnabled: true }));
        Alert.alert('Success', 'Biometric authentication has been enabled for your account.');
      }
    } catch (error: any) {
      console.error('Error enabling biometrics:', error);
      if (error.message !== 'User cancellation' && error.message !== 'UserCancel') {
        Alert.alert('Error', 'Failed to enable biometric authentication. Please try again.');
      }
    }
  }, [biometric.isAvailable, getBiometricsInstance, userEmail]);

  const disableBiometrics = useCallback(async () => {
    const rnBiometrics = getBiometricsInstance();
    
    try {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
      setBiometric(prev => ({ ...prev, isEnabled: false }));
      
      // Optionally delete biometric keys
      if (rnBiometrics && typeof rnBiometrics.deleteKeys === 'function') {
        try {
          await rnBiometrics.deleteKeys();
        } catch (keyError) {
          console.warn('Could not delete biometric keys:', keyError);
        }
      }
      
      Alert.alert('Success', 'Biometric authentication has been disabled.');
    } catch (error) {
      console.error('Error disabling biometrics:', error);
      Alert.alert('Error', 'Failed to disable biometric authentication.');
    }
  }, [getBiometricsInstance]);

  const incrementAttempts = useCallback(async () => {
    const newAttemptCount = attemptCount + 1;
    console.log(`MPIN attempt ${newAttemptCount}/${MAX_ATTEMPTS}`);

    setAttemptCount(newAttemptCount);

    try {
      await AsyncStorage.setItem(MPIN_ATTEMPTS_KEY, newAttemptCount.toString());

      if (newAttemptCount >= MAX_ATTEMPTS) {
        const blockTime = Date.now();
        await AsyncStorage.setItem(MPIN_BLOCK_TIME_KEY, blockTime.toString());
        setIsBlocked(true);

        console.log('Maximum MPIN attempts reached. Blocking user and redirecting to login.');

        setMPin(['', '', '', '', '', '']);
        setCurrentIndex(0);

        Alert.alert(
          'Account Temporarily Locked',
          'You have exceeded the maximum number of MPIN attempts. For security reasons, you will be redirected to the login page where you can use your email and password.',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('User acknowledged lock alert, redirecting to login...');
                handleRedirectToLogin();
              }
            }
          ],
          { cancelable: false }
        );

        setTimeout(() => {
          console.log('Fallback redirect to login triggered');
          handleRedirectToLogin();
        }, 2000);
      }
    } catch (error) {
      console.error('Error saving attempt data:', error);
    }
  }, [attemptCount, handleRedirectToLogin]);

  const mpinLoginAPI = useCallback(async (token: string, mpin: string): Promise<LoginResponse> => {
    try {
      const BACKEND_URL = getBackendUrl();
      
      const response = await fetch(`${BACKEND_URL}/core/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          mpin,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || errorData?.detail || `MPIN login failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      return {
        message: data.message || 'Login successful',
        token: data.token,
        user: data.user,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred during MPIN login');
    }
  }, [getBackendUrl]);

  const handleMPINChange = useCallback((value: string, index: number) => {
    if (isBlocked) return;
    if (value.length > 1) return;

    const newMPin = [...mpin];
    newMPin[index] = value;
    setMPin(newMPin);
    setError('');

    if (value !== '' && index < 5) {
      setCurrentIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    } else if (value === '' && index > 0) {
      setCurrentIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
    }

    if (index === 5 && value !== '') {
      inputRefs.current[index]?.blur();
    }
  }, [isBlocked, mpin]);

  const handleKeyPress = useCallback((e: any, index: number) => {
    if (isBlocked) return;

    if (e.nativeEvent.key === 'Backspace' && mpin[index] === '' && index > 0) {
      const newMPin = [...mpin];
      newMPin[index - 1] = '';
      setMPin(newMPin);
      setCurrentIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
    }
  }, [isBlocked, mpin]);

  const isAuthenticationError = useCallback((error: Error): boolean => {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('401') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('wrong') ||
      errorMessage.includes('incorrect') ||
      errorMessage.includes('400') ||
      errorMessage.includes('403')
    );
  }, []);

  const handleSubmit = useCallback(async (mpinValue?: string) => {
    if (isBlocked) {
      setError('Account is temporarily locked. Please use email and password to login.');
      handleRedirectToLogin();
      return;
    }

    const completeMPin = mpinValue || mpin.join('');

    if (completeMPin.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    if (!/^\d{6}$/.test(completeMPin)) {
      setError('MPIN must contain only numbers');
      return;
    }

    setIsSubmitting(true);
    console.log('Attempting MPIN login...');

    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_2_KEY);

      if (!storedToken) {
        throw new Error('No authentication token found');
      }

      const response = await mpinLoginAPI(storedToken, completeMPin);

      console.log('MPIN login successful, clearing attempt data');
      await clearAttemptData();
      setAttemptCount(0);
      setIsBlocked(false);
      await onMPINLogin(completeMPin);

      console.log('MPIN login successful:', response.message);
    } catch (error: any) {
      console.error('MPIN login error:', error);

      let errorMessage = 'Invalid MPIN. Please try again.';
      let shouldIncrementAttempts = false;

      if (error instanceof Error) {
        if (error.message.includes('Backend URL not configured')) {
          errorMessage = 'Configuration error. Please contact support.';
        } else if (isAuthenticationError(error)) {
          shouldIncrementAttempts = true;
          const remainingAttempts = MAX_ATTEMPTS - attemptCount - 1;
          if (remainingAttempts > 0) {
            errorMessage = `Invalid MPIN. ${remainingAttempts} attempt(s) remaining.`;
          } else {
            errorMessage = 'Invalid MPIN. This is your last attempt.';
          }
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('No authentication token')) {
          errorMessage = 'Session expired. Please login with email and password.';
          setTimeout(() => {
            Alert.alert(
              'Session Expired',
              'Please login with your email and password.',
              [{ text: 'OK', onPress: handleRedirectToLogin }]
            );
          }, 500);
          return;
        } else {
          errorMessage = error.message;
          if (error.message.includes('400') || error.message.includes('403')) {
            shouldIncrementAttempts = true;
          }
        }
      }

      setError(errorMessage);

      setMPin(['', '', '', '', '', '']);
      setCurrentIndex(0);
      inputRefs.current[0]?.focus();

      if (shouldIncrementAttempts) {
        console.log('Authentication error detected, incrementing attempts...');
        await incrementAttempts();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isBlocked, mpin, mpinLoginAPI, onMPINLogin, clearAttemptData, isAuthenticationError, attemptCount, handleRedirectToLogin, incrementAttempts]);

  const clearMPIN = useCallback(() => {
    if (isBlocked) return;

    setMPin(['', '', '', '', '', '']);
    setCurrentIndex(0);
    setError('');
    inputRefs.current[0]?.focus();
  }, [isBlocked]);

  const getDisplayEmail = useCallback(() => {
    if (!userEmail) return 'your account';
    const parts = userEmail.split('@');
    if (parts.length !== 2) return userEmail;
    const username = parts[0];
    const domain = parts[1];
    if (username.length <= 2) return userEmail;
    const maskedUsername = username[0] + '*'.repeat(username.length - 2) + username[username.length - 1];
    return `${maskedUsername}@${domain}`;
  }, [userEmail]);

  const getAttemptIndicator = useCallback(() => {
    if (attemptCount === 0) return null;

    const remainingAttempts = MAX_ATTEMPTS - attemptCount;

    if (isBlocked) {
      return (
        <View style={[styles.attemptIndicator, styles.blockedIndicator]}>
          <Text style={styles.blockedText}>🔒 Account locked - Redirecting to login page...</Text>
        </View>
      );
    }

    return (
      <View style={[styles.attemptIndicator, remainingAttempts === 1 ? styles.criticalIndicator : null]}>
        <Text style={[styles.attemptText, remainingAttempts === 1 ? styles.criticalText : null]}>
          ⚠️ {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
          {remainingAttempts === 1 && ' - Account will be locked after next failed attempt'}
        </Text>
      </View>
    );
  }, [attemptCount, isBlocked]);

  useEffect(() => {
    if (isBlocked && attemptCount >= MAX_ATTEMPTS) {
      const redirectTimer = setTimeout(() => {
        console.log('Auto-redirecting to login after account lock');
        handleRedirectToLogin();
      }, 3000);

      return () => clearTimeout(redirectTimer);
    }
  }, [isBlocked, attemptCount, handleRedirectToLogin]);

  const handleInputFocus = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: isSmallDevice ? 200 : 300,
        animated: true,
      });
    }, 100);
  }, []);

  const renderBiometricSection = useCallback(() => {
    // Only show if biometrics is available
    if (!biometric.isAvailable) return null;

    return (
      <View style={styles.biometricSection}>
        <Text style={styles.biometricSectionTitle}>Quick Login</Text>
        
        {biometric.isEnabled ? (
          <View style={styles.biometricEnabledContainer}>
            <TouchableOpacity
              style={[
                styles.biometricButton,
                isBlocked && styles.biometricButtonDisabled,
              ]}
              onPress={handleBiometricAuthentication}
              disabled={biometric.isLoading || isBlocked || isLoading || isSubmitting}
            >
              {biometric.isLoading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Text style={styles.biometricIcon}>{getBiometricIcon()}</Text>
                  <Text style={styles.biometricButtonText}>
                    {isBlocked ? 'Disabled' : `Login with ${getBiometricButtonText()}`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.biometricSettingsButton}
              onPress={disableBiometrics}
              disabled={isLoading || isSubmitting}
            >
              <Text style={styles.biometricSettingsText}>Disable Biometric Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.biometricDisabledContainer}>
            <Text style={styles.biometricDisabledText}>
              Enable {getBiometricButtonText()} for faster and more secure login
            </Text>
            <TouchableOpacity
              style={styles.enableBiometricButton}
              onPress={enableBiometrics}
              disabled={isLoading || isSubmitting}
            >
              <Text style={styles.enableBiometricButtonText}>
                Enable {getBiometricButtonText()}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
      </View>
    );
  }, [
    biometric.isAvailable,
    biometric.isEnabled,
    biometric.isLoading,
    isBlocked,
    isLoading,
    isSubmitting,
    handleBiometricAuthentication,
    disableBiometrics,
    enableBiometrics,
    getBiometricButtonText,
    getBiometricIcon,
  ]);

  const renderContent = useCallback(() => (
    <View style={styles.contentContainer}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/Logo.png')}
          style={[styles.logo, { width: logoSize, height: logoSize }]}
          resizeMode="contain"
        />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          Login to {getDisplayEmail()}
        </Text>
      </View>

      {getAttemptIndicator()}

      {renderBiometricSection()}

      <View style={styles.mpinSectionContainer}>
        <Text style={styles.mpinSectionTitle}>Enter Your MPIN</Text>
        
        <View style={styles.mpinContainer}>
          {mpin.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.mpinInput,
                {
                  width: mpinInputSize,
                  height: mpinInputHeight,
                  fontSize: isTablet ? 28 : isSmallDevice ? 20 : 24,
                },
                currentIndex === index ? styles.mpinInputFocused : null,
                error ? styles.mpinInputError : null,
                isBlocked ? styles.mpinInputDisabled : null,
              ]}
              value={digit}
              onChangeText={(value) => handleMPINChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              onFocus={() => {
                setCurrentIndex(index);
                handleInputFocus();
              }}
              keyboardType="numeric"
              maxLength={1}
              secureTextEntry
              selectTextOnFocus
              editable={!isLoading && !isSubmitting && !isBlocked}
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !isMPINComplete ? styles.submitButtonSecondary : null,
              (isLoading || isSubmitting || isBlocked) ? styles.submitButtonDisabled : null,
            ]}
            onPress={() => handleSubmit()}
            disabled={isLoading || isSubmitting || isBlocked || !isMPINComplete}
          >
            {(isLoading || isSubmitting) ? (
              <ActivityIndicator 
                color={isMPINComplete ? colors.white : colors.textSecondary} 
                size="small" 
              />
            ) : (
              <Text style={[
                styles.submitButtonText,
                !isMPINComplete ? styles.submitButtonTextSecondary : null,
              ]}>
                {isBlocked ? 'Account Locked' : 'Login with MPIN'}
              </Text>
            )}
          </TouchableOpacity>

          {hasEnteredDigits && (
            <TouchableOpacity
              style={[
                styles.clearButton,
                isBlocked ? styles.clearButtonDisabled : null,
              ]}
              onPress={clearMPIN}
              disabled={isLoading || isSubmitting || isBlocked}
            >
              <Text style={[
                styles.clearButtonText,
                isBlocked ? styles.clearButtonTextDisabled : null,
              ]}>
                Clear
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.alternativeContainer}>
        <Text style={styles.alternativeText}>Having trouble?</Text>
        <TouchableOpacity
          style={styles.usePasswordButton}
          onPress={() => {
            console.log('Manual redirect to password login');
            handleRedirectToLogin();
          }}
          disabled={isLoading || isSubmitting}
        >
          <Text style={styles.usePasswordText}>Use Email & Password Instead</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.securityInfo}>
        <Text style={styles.securityText}>
          🔒 Your login credentials are authenticated securely with our servers
          {attemptCount > 0 && !isBlocked && (
            `\n⚠️ Account will be locked after ${MAX_ATTEMPTS} failed attempts`
          )}
        </Text>
      </View>
    </View>
  ), [
    getDisplayEmail,
    getAttemptIndicator,
    renderBiometricSection,
    mpin,
    currentIndex,
    error,
    isLoading,
    isSubmitting,
    isBlocked,
    handleMPINChange,
    handleKeyPress,
    handleInputFocus,
    handleSubmit,
    clearMPIN,
    hasEnteredDigits,
    isMPINComplete,
    attemptCount,
    handleRedirectToLogin,
  ]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        {renderContent()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 50 : 20,
  },
  contentContainer: {
    paddingHorizontal: containerPadding,
    paddingVertical: isSmallDevice ? 20 : 40,
    minHeight: screenHeight - (Platform.OS === 'ios' ? 100 : 50),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? 20 : 30,
  },
  logo: {
    marginBottom: isTablet ? 30 : isSmallDevice ? 16 : 24,
  },
  titleContainer: {
    marginBottom: isSmallDevice ? 20 : 32,
  },
  title: {
    fontSize: isTablet ? 32 : isSmallDevice ? 24 : 28,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: isSmallDevice ? 6 : 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: isTablet ? 28 : isSmallDevice ? 20 : 24,
    paddingHorizontal: isTablet ? 0 : 16,
  },
  attemptIndicator: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 12,
    padding: isTablet ? 16 : 12,
    marginBottom: isSmallDevice ? 16 : 24,
    alignItems: 'center',
    marginHorizontal: isTablet ? 40 : 0,
  },
  criticalIndicator: {
    backgroundColor: '#FFF2F2',
    borderColor: '#FFCDD2',
  },
  blockedIndicator: {
    backgroundColor: '#FFEBEE',
    borderColor: '#E57373',
  },
  attemptText: {
    fontSize: isTablet ? 16 : 14,
    color: '#856404',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  criticalText: {
    color: '#D32F2F',
    fontWeight: '600',
  },
  blockedText: {
    fontSize: isTablet ? 16 : 14,
    color: '#D32F2F',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Biometric Styles
  biometricSection: {
    marginBottom: isSmallDevice ? 20 : 32,
  },
  biometricSectionTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: isSmallDevice ? 12 : 16,
  },
  biometricEnabledContainer: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? 16 : 20,
  },
  biometricButton: {
    backgroundColor: colors.primary,
    borderRadius: isTablet ? 16 : 12,
    height: isTablet ? 64 : isSmallDevice ? 48 : 56,
    paddingHorizontal: isTablet ? 40 : 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minWidth: isTablet ? 300 : 250,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  biometricButtonDisabled: {
    opacity: 0.6,
  },
  biometricIcon: {
    fontSize: isTablet ? 24 : 20,
    marginRight: 12,
  },
  biometricButtonText: {
    color: colors.white,
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  biometricSettingsButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  biometricSettingsText: {
    color: colors.textSecondary,
    fontSize: isTablet ? 14 : 12,
    textDecorationLine: 'underline',
  },
  biometricDisabledContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: isTablet ? 12 : 8,
    padding: isTablet ? 20 : 16,
    alignItems: 'center',
    marginBottom: isSmallDevice ? 16 : 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  biometricDisabledText: {
    fontSize: isTablet ? 16 : 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  enableBiometricButton: {
    backgroundColor: colors.primary,
    borderRadius: isTablet ? 12 : 8,
    paddingVertical: isTablet ? 12 : 10,
    paddingHorizontal: isTablet ? 24 : 20,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  enableBiometricButtonText: {
    color: colors.white,
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: isSmallDevice ? 16 : 24,
    paddingHorizontal: isTablet ? 40 : 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: isTablet ? 16 : 14,
    color: colors.textSecondary,
    marginHorizontal: 16,
    fontWeight: '500',
  },
  // MPIN Styles
  mpinSectionContainer: {
    marginBottom: isSmallDevice ? 20 : 32,
  },
  mpinSectionTitle: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: isSmallDevice ? 16 : 20,
  },
  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isSmallDevice ? 20 : 32,
    gap: isTablet ? 16 : isSmallDevice ? 8 : 12,
    paddingHorizontal: isTablet ? 0 : 10,
  },
  mpinInput: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: isTablet ? 16 : 12,
    textAlign: 'center',
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  mpinInputFocused: {
    borderColor: colors.primary,
    backgroundColor: '#F0F8FF',
    transform: [{ scale: 1.05 }],
  },
  mpinInputError: {
    borderColor: colors.error,
    backgroundColor: '#FFF5F5',
  },
  mpinInputDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    color: '#A0A0A0',
  },
  errorText: {
    color: colors.error,
    fontSize: isTablet ? 16 : 14,
    textAlign: 'center',
    marginBottom: isSmallDevice ? 16 : 24,
    fontWeight: '500',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  buttonContainer: {
    marginBottom: isSmallDevice ? 24 : 32,
    paddingHorizontal: isTablet ? 60 : 0,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: isTablet ? 16 : 12,
    height: isTablet ? 64 : isSmallDevice ? 48 : 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitButtonSecondary: {
    backgroundColor: colors.textSecondary || '#9CA3AF',
    ...Platform.select({
      ios: {
        shadowColor: colors.textSecondary || '#9CA3AF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  submitButtonTextSecondary: {
    color: colors.white,
    opacity: 0.9,
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: isTablet ? 16 : 12,
    height: isTablet ? 56 : 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonDisabled: {
    borderColor: '#E0E0E0',
  },
  clearButtonText: {
    color: colors.text,
    fontSize: isTablet ? 18 : 16,
    fontWeight: '500',
  },
  clearButtonTextDisabled: {
    color: '#A0A0A0',
  },
  alternativeContainer: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? 20 : 32,
    paddingHorizontal: 16,
  },
  alternativeText: {
    fontSize: isTablet ? 16 : 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  usePasswordButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  usePasswordText: {
    color: colors.primary,
    fontSize: isTablet ? 16 : 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  securityInfo: {
    backgroundColor: '#F0F8FF',
    borderRadius: isTablet ? 12 : 8,
    padding: isTablet ? 20 : 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginHorizontal: isTablet ? 40 : 0,
    marginBottom: isSmallDevice ? 20 : 40,
  },
  securityText: {
    fontSize: isTablet ? 14 : 12,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: isTablet ? 22 : 18,
  },
});

export default MPINLogin;