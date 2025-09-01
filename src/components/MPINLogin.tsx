import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { BACKEND_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../styles/theme';
import {
  requestBiometricPermissions,
  getBiometricType,
  getBiometricPromptMessage
} from '../utils/permissions';
import Constants from 'expo-constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const isTablet = screenWidth >= 768;
const isSmallDevice = screenHeight < 700;

interface MPINLoginProps {
  onMPINLogin: (mpin: string) => Promise<void>;
  onBiometricLogin?: (token: string, opts?: { payload?: string; signature?: string }) => Promise<void>;
  onUsePassword: () => void;
  onForgotMPIN?: () => void;
  onDashboardRedirect?: () => void;
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

interface BiometricCapabilities {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  hasFaceID: boolean;
  hasFingerprintOrTouchID: boolean;
}

interface DebugInfo {
  supportedTypes: number[];
  hasHardware: boolean;
  isEnrolled: boolean;
  platform: string;
  isExpoGo: boolean;
  lastError?: string;
  authAttempts: number;
}


const MPINLogin: React.FC<MPINLoginProps> = ({
  onMPINLogin,
  onBiometricLogin,
  onUsePassword,
  onForgotMPIN,
  onDashboardRedirect,
  isLoading = false,
  userEmail,
}) => {
  const [mpin, setMPin] = useState<string[]>(['', '', '', '', '', '']);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);

  // Biometric states
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(null);
  const [isBiometricAuthenticating, setIsBiometricAuthenticating] = useState<boolean>(false);
  const [biometricError, setBiometricError] = useState<string>('');
  const [showMPINSection, setShowMPINSection] = useState<boolean>(false);
  const [biometricAttempted, setBiometricAttempted] = useState<boolean>(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Constants
  const TOKEN_2_KEY = 'token_2';
  const BIOMETRIC_PREFERENCE_KEY = 'biometric_enabled';

  const getBackendUrl = useCallback((): string => {
    const backendUrl = BACKEND_URL;
    if (!backendUrl) {
      console.error('BACKEND_URL not found in environment variables');
      throw new Error('Backend URL not configured. Please check your environment setup.');
    }
    return backendUrl;
  }, []);
  // Biometric Icons Component
  const BiometricIcon = ({ type }: { type: 'face' | 'fingerprint' | 'default' }) => {
    const getIconText = () => {
      switch (type) {
        case 'face': return '🔐';
        case 'fingerprint': return '👆';
        default: return '🔐';
      }
    };

    return (
      <View style={styles.biometricIconContainer}>
        <Text style={styles.biometricIconText}>{getIconText()}</Text>
      </View>
    );
  };
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    supportedTypes: [],
    hasHardware: false,
    isEnrolled: false,
    platform: Platform.OS,
    isExpoGo: Constants.appOwnership === 'expo',
    authAttempts: 0,
  });
  const [showDebug, setShowDebug] = useState(false);


  const hasEnteredDigits = mpin.some(digit => digit !== '');
  const isMPINComplete = mpin.every(digit => digit !== '') && mpin.join('').length === 6;

  // Check biometric capabilities on component mount
  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  // Attempt biometric authentication after capabilities are checked
  useEffect(() => {
    if (biometricCapabilities && !biometricAttempted && !showMPINSection) {
      attemptBiometricAuthentication();
    }
  }, [biometricCapabilities, biometricAttempted, showMPINSection]);
  const debugBiometrics = useCallback(async () => {
    const permissionResult = await requestBiometricPermissions();
    console.log('=== BIOMETRIC DEBUG ===');
    console.log('Permission result:', permissionResult);

    if (permissionResult.granted) {
      const types = getBiometricType(permissionResult.supportedTypes);
      console.log('Detected types:', types);

      const messages = getBiometricPromptMessage(permissionResult.supportedTypes);
      console.log('Prompt messages:', messages);
    }
    console.log('=====================');
  }, []);

  // Call this in useEffect for testing
  useEffect(() => {
    debugBiometrics();
  }, []);

  const checkBiometricCapabilities = useCallback(async () => {
    try {
      console.log('Checking biometric capabilities...');

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        hasHardware,
        isEnrolled,
        supportedTypes,
      }));

      if (!hasHardware || !isEnrolled) {
        setShowMPINSection(true);
        setBiometricCapabilities({
          hasHardware,
          isEnrolled,
          supportedTypes,
          hasFaceID: false,
          hasFingerprintOrTouchID: false,
        });
        return;
      }

      const hasFaceID = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      const hasFingerprintOrTouchID = supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);

      const capabilities: BiometricCapabilities = {
        hasHardware,
        isEnrolled,
        supportedTypes,
        hasFaceID,
        hasFingerprintOrTouchID,
      };

      setBiometricCapabilities(capabilities);

    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      }));

      setBiometricCapabilities({
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        hasFaceID: false,
        hasFingerprintOrTouchID: false,
      });
      setShowMPINSection(true);
    }
  }, []);

  const overrideLoginAPI = useCallback(async (token: string): Promise<LoginResponse> => {
    try {
      const backend = getBackendUrl();
      console.log('Calling override login API...');

      const response = await fetch(`${backend}/core/overrideLogin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || errorData?.detail || `Override login failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return {
        message: data.message || 'Override login successful',
        token: data.token,
        user: data.user,
      };
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error('Network error occurred during override login');
    }
  }, [getBackendUrl]);

  const attemptBiometricAuthentication = useCallback(async () => {
    if (!biometricCapabilities || !biometricCapabilities.isEnrolled || biometricAttempted) {
      setShowMPINSection(true);
      return;
    }

    setBiometricAttempted(true);
    setIsBiometricAuthenticating(true);
    setBiometricError('');

    // Update debug info
    setDebugInfo(prev => ({
      ...prev,
      authAttempts: prev.authAttempts + 1,
    }));

    try {
      // Try different authentication strategies
      let authResult;

      // Strategy 1: Try with all available types
      if (biometricCapabilities.hasFaceID && biometricCapabilities.hasFingerprintOrTouchID) {
        authResult = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate with biometrics',
          subtitle: 'Use fingerprint or face recognition',
          fallbackLabel: 'Use MPIN',
          cancelLabel: 'Cancel',
          allowedAuthenticationTypes: [
            LocalAuthentication.AuthenticationType.FINGERPRINT,
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
          ],
        });
      }
      // Strategy 2: Face recognition only
      else if (biometricCapabilities.hasFaceID) {
        authResult = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Use face recognition to login',
          subtitle: 'Look at your device camera',
          fallbackLabel: 'Use MPIN',
          cancelLabel: 'Cancel',
          allowedAuthenticationTypes: [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION],
        });
      }
      // Strategy 3: Fingerprint only
      else {
        authResult = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Use fingerprint to login',
          subtitle: 'Place finger on sensor',
          fallbackLabel: 'Use MPIN',
          cancelLabel: 'Cancel',
          allowedAuthenticationTypes: [LocalAuthentication.AuthenticationType.FINGERPRINT],
        });
      }

      if (authResult.success) {
        const storedToken = await AsyncStorage.getItem(TOKEN_2_KEY);
        if (!storedToken) {
          throw new Error('No authentication token found');
        }

        const response = await overrideLoginAPI(storedToken);

        if (onBiometricLogin) {
          await onBiometricLogin(storedToken);
        } else {
          await onMPINLogin('__BIOMETRIC_SUCCESS__');
        }
        return;
      } else {
        // Update debug info with error
        setDebugInfo(prev => ({
          ...prev,
          lastError: `Auth failed: ${authResult.error}`,
        }));

        setBiometricError(`Authentication failed: ${authResult.error}`);
        setShowMPINSection(true);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setDebugInfo(prev => ({
        ...prev,
        lastError: errorMsg,
      }));

      setBiometricError('Biometric authentication failed. Please use MPIN.');
      setShowMPINSection(true);
    } finally {
      setIsBiometricAuthenticating(false);
    }
  }, [biometricCapabilities, biometricAttempted, overrideLoginAPI, onBiometricLogin, onMPINLogin]);

  const handleRetryBiometric = useCallback(() => {
    setBiometricAttempted(false);
    setBiometricError('');
    setShowMPINSection(false);
    attemptBiometricAuthentication();
  }, [attemptBiometricAuthentication]);

  const handleRedirectToLogin = useCallback(() => {
    try {
      console.log('Redirecting to login page due to exceeded MPIN attempts');
      onUsePassword();
    } catch (e) {
      console.error('Error during redirect to login:', e);
      setTimeout(() => onUsePassword(), 100);
    }
  }, [onUsePassword]);

  const handleForgotMPIN = useCallback(() => {
    try {
      if (onForgotMPIN) {
        console.log('Navigating to forgot MPIN page');
        onForgotMPIN();
      } else {
        console.log('Forgot MPIN callback not provided, redirecting to email login');
        // Fallback to email login if forgot MPIN callback is not provided
        onUsePassword();
      }
    } catch (e) {
      console.error('Error during forgot MPIN navigation:', e);
      // Retry the navigation after a short delay
      setTimeout(() => {
        if (onForgotMPIN) {
          onForgotMPIN();
        } else {
          onUsePassword();
        }
      }, 100);
    }
  }, [onForgotMPIN, onUsePassword]);

  const mpinLoginAPI = useCallback(async (token: string, mpinValue: string): Promise<LoginResponse> => {
    try {
      const backend = getBackendUrl();
      const response = await fetch(`${backend}/core/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, mpin: mpinValue }),
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
    } catch (e) {
      if (e instanceof Error) throw e;
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

  const isAuthenticationError = useCallback((err: Error): boolean => {
    const m = err.message.toLowerCase();
    return m.includes('401') || m.includes('invalid') || m.includes('unauthorized') || m.includes('wrong') ||
      m.includes('incorrect') || m.includes('400') || m.includes('403');
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
      setAttemptCount(0);
      setIsBlocked(false);
      await onMPINLogin(completeMPin);

      console.log('MPIN login successful:', response.message);
    } catch (e: any) {
      console.error('MPIN login error:', e);

      let errorMessage = 'Invalid MPIN. Please try again.';

      setError(errorMessage);
      setMPin(['', '', '', '', '', '']);
      setCurrentIndex(0);
      inputRefs.current[0]?.focus();

    } finally {
      setIsSubmitting(false);
    }
  }, [isBlocked, mpin, mpinLoginAPI, onMPINLogin, isAuthenticationError, handleRedirectToLogin]);

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

  // Improved keyboard handling
  const handleInputFocus = useCallback((index: number) => {
    setCurrentIndex(index);
    setTimeout(() => {
      if (scrollViewRef.current) {
        // Calculate scroll position based on input position and screen size
        const baseScrollY = isSmallDevice ? 80 : 100;
        const keyboardOffset = Platform.OS === 'ios' ? 0 : 50;
        const scrollY = baseScrollY + keyboardOffset;

        scrollViewRef.current.scrollTo({
          y: scrollY,
          animated: true,
        });
      }
    }, 100);
  }, []);

  const getBiometricText = useCallback(() => {
    if (!biometricCapabilities) return 'Biometric Authentication';
    if (biometricCapabilities.hasFaceID && biometricCapabilities.hasFingerprintOrTouchID) {
      return 'Face ID or Fingerprint';
    }
    if (biometricCapabilities.hasFaceID) return 'Face ID';
    if (biometricCapabilities.hasFingerprintOrTouchID) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    return 'Biometric Authentication';
  }, [biometricCapabilities]);

  const getBiometricIconType = useCallback((): 'face' | 'fingerprint' | 'default' => {
    if (!biometricCapabilities) return 'default';
    if (biometricCapabilities.hasFaceID) return 'face';
    if (biometricCapabilities.hasFingerprintOrTouchID) return 'fingerprint';
    return 'default';
  }, [biometricCapabilities]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEnabled={true}
      >
        {/* Header with Logo */}
        <View style={styles.headerContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to {getDisplayEmail()}</Text>
          </View>

          {showDebug && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Debug Info (Tap to hide)</Text>
              <Text style={styles.debugText}>Platform: {debugInfo.platform}</Text>
              <Text style={styles.debugText}>Is Expo Go: {debugInfo.isExpoGo ? 'Yes' : 'No'}</Text>
              <Text style={styles.debugText}>Has Hardware: {debugInfo.hasHardware ? 'Yes' : 'No'}</Text>
              <Text style={styles.debugText}>Is Enrolled: {debugInfo.isEnrolled ? 'Yes' : 'No'}</Text>
              <Text style={styles.debugText}>Supported Types: [{debugInfo.supportedTypes.join(', ')}]</Text>
              <Text style={styles.debugText}>Auth Attempts: {debugInfo.authAttempts}</Text>
              {debugInfo.lastError && (
                <Text style={styles.debugError}>Last Error: {debugInfo.lastError}</Text>
              )}
              <TouchableOpacity
                style={styles.debugButton}
                onPress={() => setShowDebug(false)}
              >
                <Text style={styles.debugButtonText}>Hide Debug</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.debugToggle}
            onPress={() => setShowDebug(!showDebug)}
          >
            <Text style={styles.debugToggleText}>
              {showDebug ? 'Hide' : 'Show'} Debug
            </Text>
          </TouchableOpacity>

          {/* Biometric Section */}
          {!showMPINSection && biometricCapabilities?.isEnrolled ? (
            <View style={styles.biometricSection}>
              <BiometricIcon type={getBiometricIconType()} />

              {isBiometricAuthenticating ? (
                <View style={styles.authenticatingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.authenticatingText}>
                    Authenticating with {getBiometricText()}...
                  </Text>
                </View>
              ) : (
                <View style={styles.biometricReadyContainer}>
                  <Text style={styles.biometricReadyText}>
                    Use {getBiometricText()} to login
                  </Text>
                  <TouchableOpacity
                    style={styles.biometricButton}
                    onPress={handleRetryBiometric}
                    disabled={isBiometricAuthenticating}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.biometricButtonText}>
                      Try {getBiometricText()}
                    </Text>
                  </TouchableOpacity>

                  {biometricError ? (
                    <Text style={styles.errorText}>{biometricError}</Text>
                  ) : null}
                </View>
              )}

              <TouchableOpacity
                style={styles.switchToMPINButton}
                onPress={() => setShowMPINSection(true)}
                disabled={isBiometricAuthenticating}
                activeOpacity={0.7}
              >
                <Text style={styles.switchToMPINText}>Use MPIN Instead</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* MPIN Section */
            <View style={styles.mpinSection}>
              {biometricCapabilities?.isEnrolled && (
                <TouchableOpacity
                  style={styles.switchToBiometricButton}
                  onPress={() => {
                    setShowMPINSection(false);
                    setBiometricAttempted(false);
                    setBiometricError('');
                  }}
                  disabled={isLoading || isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.switchToBiometricText}>
                    Use {getBiometricText()} Instead
                  </Text>
                </TouchableOpacity>
              )}
              {biometricCapabilities?.hasFaceID && (
                <TouchableOpacity
                  style={[styles.biometricButton, { backgroundColor: '#FF6B6B', marginTop: 10 }]}
                  onPress={async () => {
                    try {
                      setDebugInfo(prev => ({ ...prev, lastError: 'Testing face recognition...' }));

                      const result = await LocalAuthentication.authenticateAsync({
                        promptMessage: 'Face Recognition Test',
                        subtitle: 'Look directly at your camera',
                        allowedAuthenticationTypes: [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION],
                        fallbackLabel: 'Cancel',
                        cancelLabel: 'Cancel',
                      });

                      setDebugInfo(prev => ({
                        ...prev,
                        lastError: `Face test result: ${result.success ? 'SUCCESS' : 'FAILED - ' + result.error}`
                      }));

                      if (result.success) {
                        // Handle success
                        const storedToken = await AsyncStorage.getItem(TOKEN_2_KEY);
                        if (storedToken && onBiometricLogin) {
                          await onBiometricLogin(storedToken);
                        }
                      }
                    } catch (error) {
                      setDebugInfo(prev => ({
                        ...prev,
                        lastError: `Face test error: ${error instanceof Error ? error.message : 'Unknown'}`
                      }));
                    }
                  }}
                >
                  <Text style={styles.biometricButtonText}>Test Face Recognition Only</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.mpinTitle}>Enter Your MPIN</Text>

              <View style={styles.mpinInputContainer}>
                <View style={styles.mpinContainer}>
                  {mpin.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        inputRefs.current[index] = ref;
                      }}
                      style={[
                        styles.mpinInput,
                        currentIndex === index ? styles.mpinInputFocused : null,
                        error ? styles.mpinInputError : null,
                        isBlocked ? styles.mpinInputDisabled : null,
                      ]}
                      value={digit}
                      onChangeText={(value) => handleMPINChange(value, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      onFocus={() => handleInputFocus(index)}
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
                      !isMPINComplete ? styles.submitButtonInactive : null,
                      (isLoading || isSubmitting || isBlocked) ? styles.submitButtonDisabled : null,
                    ]}
                    onPress={() => handleSubmit()}
                    disabled={isLoading || isSubmitting || isBlocked || !isMPINComplete}
                    activeOpacity={0.8}
                  >
                    {(isLoading || isSubmitting) ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {isBlocked ? 'Account Locked' : 'Login with MPIN'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.forgotMPINLink}
                    onPress={handleForgotMPIN}
                    disabled={isLoading || isSubmitting}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.forgotMPINText}>Forgot MPIN?</Text>
                  </TouchableOpacity>

                  {hasEnteredDigits && (
                    <TouchableOpacity
                      style={styles.clearLink}
                      onPress={clearMPIN}
                      disabled={isLoading || isSubmitting || isBlocked}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.clearLinkText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <View style={styles.footerContent}>
            <Text style={styles.footerTitle}>Having trouble?</Text>
            <TouchableOpacity
              style={styles.usePasswordButton}
              onPress={handleRedirectToLogin}
              disabled={isLoading || isSubmitting || isBiometricAuthenticating}
              activeOpacity={0.7}
            >
              <Text style={styles.usePasswordText}>Use Email & Password Instead</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    minHeight: screenHeight,
  },

  // Header with logo
  headerContainer: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: colors.background,
  },
  logo: {
    width: isTablet ? 120 : 100,
    height: isTablet ? 120 : 100,
  },

  // Main content area
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: isTablet ? 48 : 24,
    paddingVertical: 20,
  },
  titleContainer: {
    marginBottom: isSmallDevice ? 40 : 50,
    alignItems: 'center',
  },
  title: {
    fontSize: isTablet ? 32 : isSmallDevice ? 28 : 30,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: isTablet ? 18 : isSmallDevice ? 16 : 17,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '400',
  },

  // Biometric section
  biometricSection: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? 30 : 40,
  },
  biometricIconContainer: {
    width: isTablet ? 100 : 80,
    height: isTablet ? 100 : 80,
    borderRadius: isTablet ? 50 : 40,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: colors.primary + '20',
  },
  biometricIconText: {
    fontSize: isTablet ? 40 : 32,
  },
  authenticatingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  authenticatingText: {
    fontSize: isTablet ? 18 : 16,
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  biometricReadyContainer: {
    alignItems: 'center',
    width: '100%',
  },
  biometricReadyText: {
    fontSize: isTablet ? 20 : 18,
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  biometricButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: isTablet ? 16 : 14,
    paddingHorizontal: isTablet ? 40 : 32,
    marginBottom: 16,
    minWidth: isTablet ? 250 : 200,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  biometricButtonText: {
    color: colors.white,
    fontSize: isTablet ? 17 : 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  switchToMPINButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  switchToMPINText: {
    color: colors.textSecondary,
    fontSize: isTablet ? 16 : 14,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },

  // MPIN section
  mpinSection: {
    alignItems: 'center',
    width: '100%',
  },
  switchToBiometricButton: {
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  switchToBiometricText: {
    color: colors.primary,
    fontSize: isTablet ? 16 : 14,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  mpinTitle: {
    fontSize: isTablet ? 24 : isSmallDevice ? 20 : 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: isSmallDevice ? 24 : 32,
    letterSpacing: -0.3,
  },
  mpinInputContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 20 : 16,
  },
  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    maxWidth: isTablet ? 380 : 300,
    gap: isTablet ? 14 : isSmallDevice ? 8 : 10,
  },
  mpinInput: {
    width: isTablet ? 55 : isSmallDevice ? 42 : 48,
    height: isTablet ? 65 : isSmallDevice ? 52 : 58,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: colors.white,
    textAlign: 'center',
    fontSize: isTablet ? 26 : isSmallDevice ? 20 : 22,
    fontWeight: '700',
    color: colors.text,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  mpinInputFocused: {
    borderColor: colors.primary,
    backgroundColor: '#F0F8FF',
    transform: [{ scale: 1.05 }],
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mpinInputError: {
    borderColor: colors.error,
    backgroundColor: '#FFF5F5',
  },
  mpinInputDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#D1D5DB',
    color: '#9CA3AF',
  },
  errorText: {
    color: colors.error,
    fontSize: isTablet ? 16 : 14,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: isTablet ? 56 : 52,
    width: '110%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  submitButtonInactive: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: isTablet ? 17 : 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Forgot MPIN link - centered like the login page
  forgotMPINLink: {
    alignSelf: 'flex-end',
    paddingVertical: 1,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  forgotMPINText: {
    color: colors.primary,
    fontSize: isTablet ? 15 : 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // Clear link - positioned at bottom center
  clearLink: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearLinkText: {
    color: colors.textSecondary,
    fontSize: isTablet ? 15 : 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // Footer styles
  footerContainer: {
    paddingHorizontal: isTablet ? 48 : 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 20,
  },
  footerContent: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: isTablet ? 24 : 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  footerTitle: {
    fontSize: isTablet ? 16 : 15,
    color: '#4A5568',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  usePasswordButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  usePasswordText: {
    color: colors.primary,
    fontSize: isTablet ? 15 : 14,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  // Add these to your existing styles object
  debugContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  debugError: {
    fontSize: 12,
    color: '#ff0000',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  debugButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 5,
    marginTop: 10,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
  debugToggle: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 5,
    zIndex: 1000,
  },
  debugToggleText: {
    color: 'white',
    fontSize: 10,
  },
});

export default MPINLogin;