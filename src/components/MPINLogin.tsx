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
import * as LocalAuthentication from 'expo-local-authentication';
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
  onBiometricLogin?: (token: string, opts?: { payload?: string; signature?: string }) => Promise<void>;
  onUsePassword: () => void;
  onDashboardRedirect?: () => void; // New prop for direct dashboard redirect
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

const MPINLogin: React.FC<MPINLoginProps> = ({
  onMPINLogin,
  onBiometricLogin,
  onUsePassword,
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

  const checkBiometricCapabilities = useCallback(async () => {
    try {
      console.log('Checking biometric capabilities...');

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      console.log('Has biometric hardware:', hasHardware);

      if (!hasHardware) {
        console.log('No biometric hardware available, showing MPIN section');
        setBiometricCapabilities({
          hasHardware: false,
          isEnrolled: false,
          supportedTypes: [],
          hasFaceID: false,
          hasFingerprintOrTouchID: false,
        });
        setShowMPINSection(true);
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      console.log('Has enrolled biometrics:', isEnrolled);

      if (!isEnrolled) {
        console.log('No biometrics enrolled, showing MPIN section');
        setBiometricCapabilities({
          hasHardware: true,
          isEnrolled: false,
          supportedTypes: [],
          hasFaceID: false,
          hasFingerprintOrTouchID: false,
        });
        setShowMPINSection(true);
        return;
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      console.log('Supported authentication types:', supportedTypes);

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
      console.log('Biometric capabilities set:', capabilities);

    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
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
      console.log('Biometric authentication not available or already attempted');
      setShowMPINSection(true);
      return;
    }

    // Check if user has previously disabled biometric authentication
    try {
      const biometricPreference = await AsyncStorage.getItem(BIOMETRIC_PREFERENCE_KEY);
      if (biometricPreference === 'false') {
        console.log('User has disabled biometric authentication');
        setShowMPINSection(true);
        return;
      }
    } catch (error) {
      console.warn('Could not check biometric preference:', error);
    }

    setBiometricAttempted(true);
    setIsBiometricAuthenticating(true);
    setBiometricError('');

    try {
      console.log('Attempting biometric authentication...');

      // Determine authentication prompt based on available biometric types
      let promptMessage = 'Authenticate to login';
      let fallbackLabel = 'Use MPIN instead';

      if (biometricCapabilities.hasFaceID && biometricCapabilities.hasFingerprintOrTouchID) {
        promptMessage = 'Use Face ID, Touch ID, or Fingerprint to login';
      } else if (biometricCapabilities.hasFaceID) {
        promptMessage = 'Use Face ID to login';
      } else if (biometricCapabilities.hasFingerprintOrTouchID) {
        promptMessage = Platform.OS === 'ios' ? 'Use Touch ID to login' : 'Use Fingerprint to login';
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false, // Allow device PIN/Pattern as fallback
        requireConfirmation: false,
      });

      console.log('Biometric authentication result:', authResult);
      if (authResult.success) {
        console.log('Biometric authentication successful, calling override login...');

        // Get stored token for override login
        const storedToken = await AsyncStorage.getItem(TOKEN_2_KEY);
        if (!storedToken) {
          throw new Error('No authentication token found');
        }

        // Call override login API
        const response = await overrideLoginAPI(storedToken);
        console.log('Override login successful:', response.message);

        // Since override login succeeded, directly call onBiometricLogin
        // which should navigate to the welcome screen
        if (onBiometricLogin) {
          await onBiometricLogin(storedToken);
        } else {
          // This should not happen based on your App.tsx, but as a fallback
          console.warn('onBiometricLogin callback not provided, falling back to onMPINLogin');
          await onMPINLogin('__BIOMETRIC_SUCCESS__');
        }
        return;
      }
      else if (authResult.error === 'UserCancel' || authResult.error === 'UserFallback') {
        console.log('User cancelled biometric authentication or chose fallback');
        setShowMPINSection(true);
      } else if (authResult.error === 'SystemCancel') {
        console.log('System cancelled biometric authentication');
        setShowMPINSection(true);
      } else {
        console.log('Biometric authentication failed:', authResult.error);
        setBiometricError('Biometric authentication failed. Please try again or use MPIN.');
        setShowMPINSection(true);
      }

    } catch (error) {
      console.error('Biometric authentication error:', error);
      setBiometricError('Biometric authentication unavailable. Please use MPIN.');
      setShowMPINSection(true);
    } finally {
      setIsBiometricAuthenticating(false);
    }
  }, [biometricCapabilities, biometricAttempted, overrideLoginAPI, onBiometricLogin, onDashboardRedirect]);

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
      let shouldIncrementAttempts = false;

      setError(errorMessage);
      setMPin(['', '', '', '', '', '']);
      setCurrentIndex(0);
      inputRefs.current[0]?.focus();

      if (shouldIncrementAttempts) {
        console.log('Authentication error detected, incrementing attempts...');
      }
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

  const handleInputFocus = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: isSmallDevice ? 200 : 300,
        animated: true,
      });
    }, 100);
  }, []);

  const getBiometricIcon = useCallback(() => {
    if (!biometricCapabilities) return '🔐';
    if (biometricCapabilities.hasFaceID) return '👤';
    if (biometricCapabilities.hasFingerprintOrTouchID) return '👆';
    return '🔐';
  }, [biometricCapabilities]);

  const getBiometricText = useCallback(() => {
    if (!biometricCapabilities) return 'Setting up authentication...';
    if (biometricCapabilities.hasFaceID && biometricCapabilities.hasFingerprintOrTouchID) {
      return 'Face ID, Touch ID, or Fingerprint';
    }
    if (biometricCapabilities.hasFaceID) return 'Face ID';
    if (biometricCapabilities.hasFingerprintOrTouchID) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    return 'Biometric Authentication';
  }, [biometricCapabilities]);

  const renderBiometricSection = useCallback(() => (
    <View style={styles.biometricContainer}>
      <View style={styles.biometricIconContainer}>
        <Text style={styles.biometricIcon}>{getBiometricIcon()}</Text>
      </View>

      {isBiometricAuthenticating ? (
        <View style={styles.biometricAuthenticatingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.biometricAuthenticatingText}>
            Authenticating with {getBiometricText()}...
          </Text>
        </View>
      ) : (
        <View style={styles.biometricReadyContainer}>
          <Text style={styles.biometricReadyText}>
            Ready for {getBiometricText()}
          </Text>
          <TouchableOpacity
            style={styles.retryBiometricButton}
            onPress={handleRetryBiometric}
            disabled={isBiometricAuthenticating}
          >
            <Text style={styles.retryBiometricButtonText}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {biometricError ? (
        <Text style={styles.biometricErrorText}>{biometricError}</Text>
      ) : null}

      <TouchableOpacity
        style={styles.skipBiometricButton}
        onPress={() => setShowMPINSection(true)}
        disabled={isBiometricAuthenticating}
      >
        <Text style={styles.skipBiometricButtonText}>
          Use MPIN Instead
        </Text>
      </TouchableOpacity>
    </View>
  ), [
    getBiometricIcon,
    getBiometricText,
    isBiometricAuthenticating,
    biometricError,
    handleRetryBiometric,
  ]);

  const renderMPINSection = useCallback(() => (
    <View style={styles.mpinSectionContainer}>
      {biometricCapabilities?.isEnrolled && (
        <TouchableOpacity
          style={styles.useBiometricButton}
          onPress={() => {
            setShowMPINSection(false);
            setBiometricAttempted(false);
            setBiometricError('');
          }}
          disabled={isLoading || isSubmitting}
        >
          <Text style={styles.useBiometricButtonText}>
            Use {getBiometricText()} Instead
          </Text>
        </TouchableOpacity>
      )}

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
  ), [
    biometricCapabilities,
    getBiometricText,
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

      {!showMPINSection && !isBiometricAuthenticating && biometricCapabilities?.isEnrolled ?
        renderBiometricSection() :
        showMPINSection ?
          renderMPINSection() :
          renderBiometricSection()
      }

      <View style={styles.alternativeContainer}>
        <Text style={styles.alternativeText}>Having trouble?</Text>
        <TouchableOpacity
          style={styles.usePasswordButton}
          onPress={() => {
            console.log('Manual redirect to password login');
            handleRedirectToLogin();
          }}
          disabled={isLoading || isSubmitting || isBiometricAuthenticating}
        >
          <Text style={styles.usePasswordText}>Use Email & Password Instead</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [
    getDisplayEmail,
    showMPINSection,
    isBiometricAuthenticating,
    biometricCapabilities,
    renderBiometricSection,
    renderMPINSection,
    isLoading,
    isSubmitting,
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

export default MPINLogin;


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
  biometricContainer: {
    alignItems: 'center',
    marginBottom: isTablet ? 40 : isSmallDevice ? 20 : 30,
    paddingVertical: isTablet ? 40 : 30,
  },
  biometricIconContainer: {
    marginBottom: isTablet ? 30 : 20,
  },
  biometricIcon: {
    fontSize: isTablet ? 80 : 60,
    textAlign: 'center',
  },
  biometricAuthenticatingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  biometricAuthenticatingText: {
    fontSize: isTablet ? 18 : 16,
    color: colors.textPrimary,
    marginTop: 15,
    textAlign: 'center',
  },
  biometricReadyContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  biometricReadyText: {
    fontSize: isTablet ? 18 : 16,
    color: colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryBiometricButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: isTablet ? 40 : 30,
    paddingVertical: isTablet ? 15 : 12,
    borderRadius: isTablet ? 12 : 8,
  },
  retryBiometricButtonText: {
    color: colors.white,
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  biometricErrorText: {
    color: colors.error,
    fontSize: isTablet ? 14 : 12,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  skipBiometricButton: {
    paddingHorizontal: isTablet ? 30 : 20,
    paddingVertical: isTablet ? 12 : 10,
  },
  skipBiometricButtonText: {
    color: colors.textSecondary,
    fontSize: isTablet ? 16 : 14,
    textAlign: 'center',
  },

  // MPIN Section Styles
  mpinSectionContainer: {
    alignItems: 'center',
    marginBottom: isTablet ? 40 : isSmallDevice ? 20 : 30,
  },
  useBiometricButton: {
    marginBottom: 20,
    paddingHorizontal: isTablet ? 20 : 15,
    paddingVertical: isTablet ? 10 : 8,
  },
  useBiometricButtonText: {
    color: colors.primary,
    fontSize: isTablet ? 16 : 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  mpinSectionTitle: {
    fontSize: isTablet ? 20 : isSmallDevice ? 16 : 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: isTablet ? 30 : isSmallDevice ? 15 : 20,
    textAlign: 'center',
  },
  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isTablet ? 30 : isSmallDevice ? 15 : 20,
    gap: isTablet ? 15 : isSmallDevice ? 8 : 10,
  },
  mpinInput: {
    borderWidth: 2,
    borderColor: colors.inputBorder,
    borderRadius: isTablet ? 12 : 8,
    textAlign: 'center',
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  mpinInputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.inputBackgroundFocused,
  },
  mpinInputError: {
    borderColor: colors.error,
    backgroundColor: colors.errorBackground,
  },
  mpinInputDisabled: {
    borderColor: colors.inputBorderDisabled,
    backgroundColor: colors.inputBackgroundDisabled,
    color: colors.textDisabled,
  },
  errorText: {
    color: colors.error,
    fontSize: isTablet ? 14 : isSmallDevice ? 11 : 12,
    textAlign: 'center',
    marginBottom: isTablet ? 20 : isSmallDevice ? 10 : 15,
    lineHeight: isTablet ? 18 : 16,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: colors.primary,
    width: '100%',
    maxWidth: isTablet ? 400 : 280,
    paddingVertical: isTablet ? 18 : isSmallDevice ? 12 : 15,
    borderRadius: isTablet ? 12 : 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonSecondary: {
    backgroundColor: colors.buttonSecondary,
    shadowColor: colors.buttonSecondary,
    shadowOpacity: 0.2,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  submitButtonTextSecondary: {
    color: colors.textSecondary,
  },
  clearButton: {
    paddingVertical: isTablet ? 12 : 10,
    paddingHorizontal: isTablet ? 24 : 20,
  },
  clearButtonDisabled: {
    opacity: 0.5,
  },
  clearButtonText: {
    color: colors.textSecondary,
    fontSize: isTablet ? 16 : isSmallDevice ? 13 : 14,
    fontWeight: '500',
  },
  clearButtonTextDisabled: {
    color: colors.textDisabled,
  },
  alternativeContainer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: isTablet ? 40 : isSmallDevice ? 20 : 30,
  },
  alternativeText: {
    color: colors.textSecondary,
    fontSize: isTablet ? 16 : isSmallDevice ? 13 : 14,
    marginBottom: isTablet ? 15 : 10,
    textAlign: 'center',
  },
  usePasswordButton: {
    paddingVertical: isTablet ? 12 : 10,
    paddingHorizontal: isTablet ? 24 : 20,
  },
  usePasswordText: {
    color: colors.primary,
    fontSize: isTablet ? 16 : isSmallDevice ? 13 : 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
