import React, { useState, useRef, useEffect } from 'react';
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
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive dimensions
const isTablet = screenWidth >= 768;
const isSmallDevice = screenHeight < 700;
const containerPadding = isTablet ? 48 : 24;
const logoSize = isTablet ? 140 : isSmallDevice ? 100 : 120;
const mpinInputSize = isTablet ? 55 : isSmallDevice ? 40 : 45;
const mpinInputHeight = isTablet ? 66 : isSmallDevice ? 50 : 56;

interface MPINLoginProps {
  onMPINLogin: (mpin: string) => Promise<void>;
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

const MPINLogin: React.FC<MPINLoginProps> = ({
  onMPINLogin,
  onUsePassword,
  isLoading,
  userEmail,
}) => {
  const [mpin, setMPin] = useState(['', '', '', '', '', '']);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  const TOKEN_2_KEY = 'token_2';
  const MPIN_ATTEMPTS_KEY = 'mpin_attempts';
  const MPIN_BLOCK_TIME_KEY = 'mpin_block_time';
  const MAX_ATTEMPTS = 3;
  const BLOCK_DURATION = 30 * 60 * 1000;

  // Get backend URL from environment variables
  const getBackendUrl = (): string => {
    const backendUrl = Config.BACKEND_URL;
    
    if (!backendUrl) {
      console.error('BACKEND_URL not found in environment variables');
      throw new Error('Backend URL not configured. Please check your environment setup.');
    }
    
    return backendUrl;
  };

  // Check if user has entered any digits
  const hasEnteredDigits = mpin.some(digit => digit !== '');
  
  // Check if MPIN is complete (all 6 digits filled)
  const isMPINComplete = mpin.every(digit => digit !== '') && mpin.join('').length === 6;

  useEffect(() => {
    loadAttemptData();
  }, []);

  const loadAttemptData = async () => {
    try {
      const storedAttempts = await AsyncStorage.getItem(MPIN_ATTEMPTS_KEY);
      const storedBlockTime = await AsyncStorage.getItem(MPIN_BLOCK_TIME_KEY);

      const attempts = storedAttempts ? parseInt(storedAttempts) : 0;
      const blockTime = storedBlockTime ? parseInt(storedBlockTime) : 0;

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
  };

  const incrementAttempts = async () => {
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
  };

  const handleRedirectToLogin = () => {
    try {
      console.log('Redirecting to login page due to exceeded MPIN attempts');
      onUsePassword();
    } catch (error) {
      console.error('Error during redirect to login:', error);
      setTimeout(() => onUsePassword(), 100);
    }
  };

  const clearAttemptData = async () => {
    try {
      await AsyncStorage.multiRemove([MPIN_ATTEMPTS_KEY, MPIN_BLOCK_TIME_KEY]);
      console.log('MPIN attempt data cleared');
    } catch (error) {
      console.error('Error clearing attempt data:', error);
    }
  };

  const mpinLoginAPI = async (token: string, mpin: string): Promise<LoginResponse> => {
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
  };

  const handleMPINChange = (value: string, index: number) => {
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

    // REMOVED: Automatic submission when 6th digit is entered
    // The user must now manually press the login button
    if (index === 5 && value !== '') {
      // Just blur the last input, don't auto-submit
      inputRefs.current[index]?.blur();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (isBlocked) return;

    if (e.nativeEvent.key === 'Backspace' && mpin[index] === '' && index > 0) {
      const newMPin = [...mpin];
      newMPin[index - 1] = '';
      setMPin(newMPin);
      setCurrentIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const isAuthenticationError = (error: Error): boolean => {
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
  };

  const handleSubmit = async (mpinValue?: string) => {
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
  };

  const clearMPIN = () => {
    if (isBlocked) return;

    setMPin(['', '', '', '', '', '']);
    setCurrentIndex(0);
    setError('');
    inputRefs.current[0]?.focus();
  };

  const getDisplayEmail = () => {
    if (!userEmail) return 'your account';
    const parts = userEmail.split('@');
    if (parts.length !== 2) return userEmail;
    const username = parts[0];
    const domain = parts[1];
    if (username.length <= 2) return userEmail;
    const maskedUsername = username[0] + '*'.repeat(username.length - 2) + username[username.length - 1];
    return `${maskedUsername}@${domain}`;
  };

  const getAttemptIndicator = () => {
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
  };

  useEffect(() => {
    if (isBlocked && attemptCount >= MAX_ATTEMPTS) {
      const redirectTimer = setTimeout(() => {
        console.log('Auto-redirecting to login after account lock');
        handleRedirectToLogin();
      }, 3000);

      return () => clearTimeout(redirectTimer);
    }
  }, [isBlocked, attemptCount]);

  useEffect(() => {
    console.log(`Current attempt count: ${attemptCount}, Is blocked: ${isBlocked}`);
  }, [attemptCount, isBlocked]);

  // Handle focus to scroll to MPIN inputs when keyboard appears
  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: isSmallDevice ? 200 : 300,
        animated: true,
      });
    }, 100);
  };

  const renderContent = () => (
    <View style={styles.contentContainer}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/Logo.png')}
          style={[styles.logo, { width: logoSize, height: logoSize }]}
          resizeMode="contain"
        />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Enter Your MPIN</Text>
        <Text style={styles.subtitle}>
          Enter your 6-digit MPIN for {getDisplayEmail()}
        </Text>
      </View>

      {getAttemptIndicator()}

      <View style={styles.mpinContainer}>
        {mpin.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
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
              {isBlocked ? 'Account Locked' : 'Login'}
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
          🔒 Your MPIN is authenticated securely with our servers
          {attemptCount > 0 && !isBlocked && (
            `\n⚠️ Account will be locked after ${MAX_ATTEMPTS} failed attempts`
          )}
        </Text>
      </View>
    </View>
  );

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