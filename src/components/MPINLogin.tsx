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
  StatusBar,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { BACKEND_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../styles/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const getDeviceType = () => {
  if (Platform.OS === 'web') {
    if (SCREEN_WIDTH >= 1024) return 'desktop';
    if (SCREEN_WIDTH >= 768) return 'tablet';
    return 'mobile';
  }
  return SCREEN_WIDTH >= 768 ? 'tablet' : 'mobile';
};

const getResponsiveValues = () => {
  const deviceType = getDeviceType();

  return {
    isDesktop: deviceType === 'desktop',
    isTablet: deviceType === 'tablet',
    isMobile: deviceType === 'mobile',
    isWeb: Platform.OS === 'web',
    containerMaxWidth: deviceType === 'desktop' ? 480 : deviceType === 'tablet' ? 420 : '100%',
    horizontalPadding: deviceType === 'desktop' ? 60 : deviceType === 'tablet' ? 40 : 24,
    logoSize: deviceType === 'desktop' ? 140 : deviceType === 'tablet' ? 120 : 90,
    titleSize: deviceType === 'desktop' ? 36 : deviceType === 'tablet' ? 32 : 28,
    subtitleSize: deviceType === 'desktop' ? 18 : deviceType === 'tablet' ? 17 : 16,
    inputHeight: deviceType === 'desktop' ? 58 : deviceType === 'tablet' ? 56 : 50,
    buttonHeight: deviceType === 'desktop' ? 58 : deviceType === 'tablet' ? 56 : 52,
    fontSize: deviceType === 'desktop' ? 16 : deviceType === 'tablet' ? 16 : 15,
    spacing: deviceType === 'desktop' ? 32 : deviceType === 'tablet' ? 28 : 24,
    mpinInputSize: deviceType === 'desktop' ? 60 : deviceType === 'tablet' ? 55 : 48,
    mpinInputFontSize: deviceType === 'desktop' ? 28 : deviceType === 'tablet' ? 26 : 22,
    biometricIconSize: deviceType === 'desktop' ? 100 : deviceType === 'tablet' ? 90 : 80,
    biometricIconFontSize: deviceType === 'desktop' ? 45 : deviceType === 'tablet' ? 40 : 32,
  };
};

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

// Biometric Icons Component
const BiometricIcon = ({ type }: { type: 'face' | 'fingerprint' | 'default' }) => {
  const responsive = getResponsiveValues();

  const getIconText = () => {
    switch (type) {
      case 'face': return '🔐';
      case 'fingerprint': return '👆';
      default: return '🔐';
    }
  };

  return (
    <View style={[
      styles.biometricIconContainer,
      {
        width: responsive.biometricIconSize,
        height: responsive.biometricIconSize,
        borderRadius: responsive.biometricIconSize / 2,
      }
    ]}>
      <Text style={[styles.biometricIconText, { fontSize: responsive.biometricIconFontSize }]}>
        {getIconText()}
      </Text>
    </View>
  );
};

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
  const [responsive, setResponsive] = useState(getResponsiveValues());

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

  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  useEffect(() => {
    if (biometricCapabilities && !biometricAttempted && !showMPINSection) {
      attemptBiometricAuthentication();
    }
  }, [biometricCapabilities, biometricAttempted, showMPINSection]);

  useEffect(() => {
    const handleResize = () => {
      setResponsive(getResponsiveValues());
    };

    if (Platform.OS === 'web') {
      const globalWindow = (global as any).window;
      if (globalWindow && globalWindow.addEventListener) {
        globalWindow.addEventListener('resize', handleResize);
        return () => globalWindow.removeEventListener('resize', handleResize);
      }
    }
  }, []);

  const checkBiometricCapabilities = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

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

    try {
      const biometricPreference = await AsyncStorage.getItem(BIOMETRIC_PREFERENCE_KEY);
      if (biometricPreference === 'false') {
        setShowMPINSection(true);
        return;
      }
    } catch (error) {
      // If we can't read preference, continue with biometric
    }

    setBiometricAttempted(true);
    setIsBiometricAuthenticating(true);
    setBiometricError('');

    try {
      let promptMessage = 'Authenticate to login';
      let fallbackLabel = 'Use MPIN instead';

      if (biometricCapabilities.hasFaceID && biometricCapabilities.hasFingerprintOrTouchID) {
        promptMessage = 'Use Face ID, Touch ID, or Fingerprint to login';
      } else if (biometricCapabilities.hasFaceID) {
        promptMessage = 'Use Face ID to login';
      } else if (biometricCapabilities.hasFingerprintOrTouchID) {
        promptMessage = Platform.OS === 'ios' ? 'Use Touch ID to login' : 'Use Fingerprint to login';
      }

      const authOptions = Platform.OS === 'ios'
        ? {
          promptMessage,
          fallbackLabel,
          cancelLabel: 'Cancel',
          disableDeviceFallback: true,
          requireConfirmation: false,
        }
        : {
          promptMessage,
          fallbackLabel,
          cancelLabel: 'Cancel',
          disableDeviceFallback: false,
          requireConfirmation: false,
        };

      const authResult = await LocalAuthentication.authenticateAsync(authOptions);

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

        if (onDashboardRedirect) {
          onDashboardRedirect();
        }

        return;
      } else {
        if (authResult.error === 'user_cancel' || authResult.error === 'user_fallback') {
          setShowMPINSection(true);
        } else if (authResult.error === 'system_cancel') {
          setShowMPINSection(true);
        } else if (authResult.error === 'app_cancel') {
          setShowMPINSection(true);
        } else {
          setBiometricError('Biometric authentication failed. Please try again or use MPIN.');
          setShowMPINSection(true);
        }
      }

    } catch (error) {
      setBiometricError('Biometric authentication unavailable. Please use MPIN.');
      setShowMPINSection(true);
    } finally {
      setIsBiometricAuthenticating(false);
    }
  }, [biometricCapabilities, biometricAttempted, overrideLoginAPI, onBiometricLogin, onMPINLogin, onDashboardRedirect]);

  const handleRetryBiometric = useCallback(() => {
    setBiometricAttempted(false);
    setBiometricError('');
    setShowMPINSection(false);
    attemptBiometricAuthentication();
  }, [attemptBiometricAuthentication]);

  const handleRedirectToLogin = useCallback(() => {
    try {
      onUsePassword();
    } catch (e) {
      setTimeout(() => onUsePassword(), 100);
    }
  }, [onUsePassword]);

  const handleForgotMPIN = useCallback(() => {
    try {
      if (onForgotMPIN) {
        onForgotMPIN();
      } else {
        onUsePassword();
      }
    } catch (e) {
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
      if (onDashboardRedirect) {
        console.log('Redirecting to dashboard after MPIN login');
        onDashboardRedirect();
      }
      console.log('MPIN login successful:', response.message);
    } catch (e: any) {
      console.error('MPIN login error:', e);

      // Check if the error is an Invalid Token error
      const errorMsg = e.message?.toLowerCase() || '';
      if (errorMsg.includes('invalid token') || errorMsg.includes('login failed')) {
        console.log('Invalid token detected, clearing stored data and redirecting to login');
        // Clear the invalid token
        await AsyncStorage.removeItem(TOKEN_2_KEY);
        // Redirect to login page
        handleRedirectToLogin();
        return;
      }

      let errorMessage = 'Invalid MPIN. Please try again.';
      setError(errorMessage);
      setMPin(['', '', '', '', '', '']);
      setCurrentIndex(0);
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }, [isBlocked, mpin, mpinLoginAPI, onMPINLogin, onDashboardRedirect, isAuthenticationError, handleRedirectToLogin]);
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
      const completeMPin = [...newMPin.slice(0, 5), value].join('');
      if (completeMPin.length === 6) {
        setTimeout(() => {
          handleSubmit(completeMPin);
        }, 300);
      }
    }
  }, [isBlocked, mpin, handleSubmit]);

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

  const dismissKeyboard = () => {
    // Only dismiss keyboard on mobile platforms
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  };

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

  const dynamicStyles = getDynamicStyles(responsive);

  // Create content without TouchableWithoutFeedback wrapper
  const content = (
    <View style={styles.wrapper}>
      {Platform.OS !== 'web' && (
        <StatusBar
          barStyle="dark-content"
          backgroundColor={colors.background}
          translucent={false}
        />
      )}

      {/* Fixed Container - No Scroll */}
      <View style={styles.fixedContainer}>
        <View style={[styles.innerContainer, { maxHeight: SCREEN_HEIGHT }]}>
          <View style={[styles.headerContainer, dynamicStyles.headerContainer]}>
            <Image
              source={require('../assets/logo.png')}
              style={[styles.logo, dynamicStyles.logo]}
              resizeMode="contain"
            />
          </View>

          <View style={[styles.mainContent, dynamicStyles.mainContent]}>
            <View style={[styles.contentMaxWidth, dynamicStyles.contentMaxWidth]}>
              <View style={[styles.titleContainer, dynamicStyles.titleContainer]}>
                <Text style={[styles.title, dynamicStyles.title]}>
                  Welcome Back
                </Text>
                <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
                  Login to {getDisplayEmail()}
                </Text>
              </View>

              {/* Biometric Section */}
              {!showMPINSection && biometricCapabilities?.isEnrolled ? (
                <View style={[styles.biometricSection, dynamicStyles.biometricSection]}>
                  <BiometricIcon type={getBiometricIconType()} />

                  {isBiometricAuthenticating ? (
                    <View style={[styles.authenticatingContainer, dynamicStyles.authenticatingContainer]}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={[styles.authenticatingText, dynamicStyles.authenticatingText]}>
                        Authenticating with {getBiometricText()}...
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.biometricReadyContainer, dynamicStyles.biometricReadyContainer]}>
                      <Text style={[styles.biometricReadyText, dynamicStyles.biometricReadyText]}>
                        Use {getBiometricText()} to login
                      </Text>
                      <TouchableOpacity
                        style={[styles.biometricButton, dynamicStyles.biometricButton]}
                        onPress={handleRetryBiometric}
                        disabled={isBiometricAuthenticating}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.biometricButtonText, dynamicStyles.biometricButtonText]}>
                          Try {getBiometricText()}
                        </Text>
                      </TouchableOpacity>

                      {biometricError ? (
                        <Text style={[styles.errorText, dynamicStyles.errorText]}>{biometricError}</Text>
                      ) : null}
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.switchToMPINButton, dynamicStyles.switchToMPINButton]}
                    onPress={() => setShowMPINSection(true)}
                    disabled={isBiometricAuthenticating}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.switchToMPINText, dynamicStyles.switchToMPINText]}>
                      Use MPIN Instead
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* MPIN Section */
                <View style={[styles.mpinSection, dynamicStyles.mpinSection]}>
                  {biometricCapabilities?.isEnrolled && (
                    <TouchableOpacity
                      style={[styles.switchToBiometricButton, dynamicStyles.switchToBiometricButton]}
                      onPress={() => {
                        setShowMPINSection(false);
                        setBiometricAttempted(false);
                        setBiometricError('');
                      }}
                      disabled={isLoading || isSubmitting}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.switchToBiometricText, dynamicStyles.switchToBiometricText]}>
                        Use {getBiometricText()} Instead
                      </Text>
                    </TouchableOpacity>
                  )}

                  <Text style={[styles.mpinTitle, dynamicStyles.mpinTitle]}>Enter Your MPIN</Text>

                  {/* FIX: Added a fixed container for MPIN inputs to prevent position shifting */}
                  <View style={[styles.mpinFixedContainer, dynamicStyles.mpinFixedContainer]}>
                    <View style={[styles.mpinContainer, dynamicStyles.mpinContainer]}>
                      {mpin.map((digit, index) => (
                        <TextInput
                          key={index}
                          ref={(ref) => {
                            inputRefs.current[index] = ref;
                          }}
                          style={[
                            styles.mpinInput,
                            dynamicStyles.mpinInput,
                            currentIndex === index ? styles.mpinInputFocused : null,
                            error ? styles.mpinInputError : null,
                            isBlocked ? styles.mpinInputDisabled : null,
                          ]}
                          value={digit}
                          onChangeText={(value) => handleMPINChange(value, index)}
                          onKeyPress={(e) => handleKeyPress(e, index)}
                          keyboardType="numeric"
                          maxLength={1}
                          secureTextEntry
                          selectTextOnFocus
                          editable={!isLoading && !isSubmitting && !isBlocked}
                          // FIX: Added fixed height and width to prevent layout shifts
                          onLayout={(event) => {
                            // Keep the layout stable
                          }}
                        />
                      ))}
                    </View>
                  </View>

                  {error ? (
                    <Text style={[styles.errorText, dynamicStyles.errorText]}>{error}</Text>
                  ) : null}

                  <View style={[styles.buttonContainer, dynamicStyles.buttonContainer]}>
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        dynamicStyles.submitButton,
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
                        <Text style={[styles.submitButtonText, dynamicStyles.submitButtonText]}>
                          {isBlocked ? 'Account Locked' : 'Login with MPIN'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.forgotMPINLink, dynamicStyles.forgotMPINLink]}
                      onPress={handleForgotMPIN}
                      disabled={isLoading || isSubmitting}
                      activeOpacity={0.7}
                      hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
                    >
                      <Text style={[styles.forgotMPINText, dynamicStyles.forgotMPINText]}>
                        Forgot MPIN?
                      </Text>
                    </TouchableOpacity>

                    {hasEnteredDigits && (
                      <TouchableOpacity
                        style={[styles.clearLink, dynamicStyles.clearLink]}
                        onPress={clearMPIN}
                        disabled={isLoading || isSubmitting || isBlocked}
                        activeOpacity={0.7}
                        hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
                      >
                        <Text style={[styles.clearLinkText, dynamicStyles.clearLinkText]}>
                          Clear
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.footerContainer, dynamicStyles.footerContainer]}>
            <View style={[styles.contentMaxWidth, dynamicStyles.footerMaxWidth]}>
              <View style={[styles.footerContent, dynamicStyles.footerContent]}>
                <Text style={[styles.footerTitle, dynamicStyles.footerTitle]}>
                  Having trouble?
                </Text>
                <TouchableOpacity
                  style={[styles.usePasswordButton, dynamicStyles.usePasswordButton]}
                  onPress={handleRedirectToLogin}
                  disabled={isLoading || isSubmitting || isBiometricAuthenticating}
                  activeOpacity={0.7}
                  hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
                >
                  <Text style={[styles.usePasswordText, dynamicStyles.usePasswordText]}>
                    Use Email & Password Instead
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  // Only wrap with TouchableWithoutFeedback on mobile platforms
  if (Platform.OS === 'web') {
    return content;
  }

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
      {content}
    </TouchableWithoutFeedback>
  );
};

const getDynamicStyles = (responsive: ReturnType<typeof getResponsiveValues>) => {
  return StyleSheet.create({
    contentMaxWidth: {
      maxWidth: responsive.isDesktop ? 480 : responsive.isTablet ? 420 : '100%',
      width: '100%',
    },
    footerMaxWidth: {
      maxWidth: responsive.isDesktop ? 480 : responsive.isTablet ? 420 : '100%',
      width: '100%',
    },
    headerContainer: {
      paddingTop: responsive.isWeb ? (responsive.isDesktop ? 40 : responsive.isTablet ? 30 : 20) : Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: responsive.isDesktop ? 20 : responsive.isTablet ? 16 : 12,
    },
    logo: {
      width: responsive.logoSize,
      height: responsive.logoSize,
    },
    mainContent: {
      paddingVertical: responsive.isDesktop ? 20 : responsive.isTablet ? 16 : 12,
      paddingHorizontal: responsive.horizontalPadding,
    },
    titleContainer: {
      marginBottom: responsive.spacing,
    },
    title: {
      fontSize: responsive.titleSize,
    },
    subtitle: {
      fontSize: responsive.subtitleSize,
    },

    // Biometric section
    biometricSection: {
      alignItems: 'center',
      width: '100%',
    },
    authenticatingContainer: {
      alignItems: 'center',
      paddingVertical: responsive.spacing,
    },
    authenticatingText: {
      fontSize: responsive.fontSize,
      marginTop: responsive.spacing * 0.5,
    },
    biometricReadyContainer: {
      alignItems: 'center',
      width: '100%',
    },
    biometricReadyText: {
      fontSize: responsive.fontSize + 1,
      marginBottom: responsive.spacing,
    },
    biometricButton: {
      paddingVertical: responsive.isDesktop ? 16 : responsive.isTablet ? 14 : 12,
      paddingHorizontal: responsive.isDesktop ? 40 : responsive.isTablet ? 32 : 24,
      minWidth: responsive.isDesktop ? 250 : responsive.isTablet ? 220 : 200,
      marginBottom: responsive.spacing * 0.5,
    },
    biometricButtonText: {
      fontSize: responsive.fontSize,
    },
    switchToMPINButton: {
      paddingVertical: responsive.spacing * 0.3,
      paddingHorizontal: 16,
    },
    switchToMPINText: {
      fontSize: responsive.fontSize - 1,
    },

    // MPIN section
    mpinSection: {
      alignItems: 'center',
      width: '100%',
    },
    switchToBiometricButton: {
      marginBottom: responsive.spacing,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    switchToBiometricText: {
      fontSize: responsive.fontSize - 1,
    },
    mpinTitle: {
      fontSize: responsive.titleSize - 2,
      marginBottom: responsive.spacing,
    },
    // FIX: Added fixed container for MPIN inputs
    mpinFixedContainer: {
      minHeight: responsive.isDesktop ? 75 : responsive.isTablet ? 70 : 65,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      marginBottom: responsive.spacing,
    },
    mpinContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      // FIX: Added minWidth to prevent container shrinking
      minWidth: responsive.isDesktop ? 450 : responsive.isTablet ? 380 : 320,
    },
    // FIX: Made MPIN inputs fully responsive
    mpinInput: {
      width: responsive.mpinInputSize,
      height: responsive.isDesktop ? 65 : responsive.isTablet ? 60 : 55,
      fontSize: responsive.mpinInputFontSize,
      // Ensure consistent spacing
      marginHorizontal: responsive.isDesktop ? 6 : responsive.isTablet ? 5 : 4,
      // Fixed minWidth to prevent size changes
      minWidth: responsive.mpinInputSize,
    },
    buttonContainer: {
      width: '100%',
    },
    submitButton: {
      height: responsive.buttonHeight,
      marginBottom: responsive.spacing * 0.3,
    },
    submitButtonText: {
      fontSize: responsive.fontSize + 1,
    },
    forgotMPINLink: {
      marginBottom: responsive.spacing * 0.4,
    },
    forgotMPINText: {
      fontSize: responsive.fontSize - 1,
    },
    clearLink: {
      paddingVertical: 8,
    },
    clearLinkText: {
      fontSize: responsive.fontSize - 1,
    },
    errorText: {
      fontSize: responsive.fontSize - 2,
      marginBottom: responsive.spacing,
    },

    // Footer
    footerContainer: {
      paddingHorizontal: responsive.horizontalPadding,
      paddingTop: responsive.isWeb ? (responsive.isDesktop ? 20 : responsive.isTablet ? 16 : 12) : responsive.spacing * 0.8,
      paddingBottom: responsive.isWeb ? (responsive.isDesktop ? 30 : responsive.isTablet ? 20 : 16) : Platform.OS === 'ios' ? 40 : 24,
    },
    footerContent: {
      padding: responsive.isDesktop ? 22 : responsive.isTablet ? 18 : 14,
    },
    footerTitle: {
      fontSize: responsive.fontSize - 1,
      marginBottom: responsive.spacing * 0.2,
    },
    usePasswordButton: {
      paddingVertical: responsive.spacing * 0.2,
    },
    usePasswordText: {
      fontSize: responsive.fontSize - 1,
    },
  });
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fixedContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },

  headerContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    width: '100%',
  },
  logo: {
    width: 100,
    height: 100,
  },

  mainContent: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    flex: 1,
  },
  contentMaxWidth: {
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '400',
  },

  // Biometric section
  biometricSection: {
    alignItems: 'center',
  },
  biometricIconContainer: {
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: colors.primary + '20',
  },
  biometricIconText: {
    fontSize: 32,
  },
  authenticatingContainer: {
    alignItems: 'center',
  },
  authenticatingText: {
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  biometricReadyContainer: {
    alignItems: 'center',
    width: '100%',
  },
  biometricReadyText: {
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  biometricButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
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
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  switchToMPINButton: {
    alignSelf: 'center',
  },
  switchToMPINText: {
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },

  // MPIN section
  mpinSection: {
    alignItems: 'center',
    width: '100%',
  },
  // FIX: Added fixed container for MPIN inputs
  mpinFixedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  switchToBiometricButton: {
    alignSelf: 'center',
  },
  switchToBiometricText: {
    color: colors.primary,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  mpinTitle: {
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    // FIX: Added minWidth to prevent container shrinking
    minWidth: 320,
  },
  mpinInput: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: colors.white,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.text,
    // FIX: Added consistent margin to prevent position shifts
    marginHorizontal: 4,
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
      web: {
        outlineStyle: 'none',
        // FIX: Prevent layout shifts on web
        boxSizing: 'border-box',
        minWidth: 48,
        transition: 'all 0.2s ease',
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
  buttonContainer: {
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
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
  submitButtonInactive: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  forgotMPINLink: {
    alignSelf: 'center',
  },
  forgotMPINText: {
    color: colors.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  clearLink: {
    alignSelf: 'center',
  },
  clearLinkText: {
    color: colors.textSecondary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Footer styles
  footerContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  footerContent: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    width: '100%',
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
    color: '#4A5568',
    fontWeight: '600',
    textAlign: 'center',
  },
  usePasswordButton: {
    alignSelf: 'center',
  },
  usePasswordText: {
    color: colors.primary,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

export default MPINLogin;