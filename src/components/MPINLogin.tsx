import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../styles/theme';

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

  
 const BACKEND_URL = Config.BACKEND_URL || 'https://962xzp32-8000.inc1.devtunnels.ms';
  const TOKEN_2_KEY = 'token_2';
  const MPIN_ATTEMPTS_KEY = 'mpin_attempts';
  const MPIN_BLOCK_TIME_KEY = 'mpin_block_time';
  const MAX_ATTEMPTS = 3;
  const BLOCK_DURATION = 30 * 60 * 1000; 
 
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
        // Block the account
        const blockTime = Date.now();
        await AsyncStorage.setItem(MPIN_BLOCK_TIME_KEY, blockTime.toString());
        setIsBlocked(true);
        
        console.log('Maximum MPIN attempts reached. Blocking user and redirecting to login.');
        
        // Clear MPIN input immediately
        setMPin(['', '', '', '', '', '']);
        setCurrentIndex(0);
        
        // Show alert and redirect to login
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
        
        // Fallback redirect in case alert doesn't work
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
      // Force redirect even if there's an error
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

    // Auto-submit when all 6 digits are entered
    if (index === 5 && value !== '') {
      const completeMPin = newMPin.join('');
      if (completeMPin.length === 6) {
        setTimeout(() => handleSubmit(completeMPin), 100);
      }
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
        if (isAuthenticationError(error)) {
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
          // Any other 4xx errors should also increment attempts
          if (error.message.includes('400') || error.message.includes('403')) {
            shouldIncrementAttempts = true;
          }
        }
      }
      
      setError(errorMessage);
      
      // Clear MPIN input and reset focus
      setMPin(['', '', '', '', '', '']);
      setCurrentIndex(0);
      inputRefs.current[0]?.focus();
      
      // Increment attempts if it's an authentication error
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

  // Effect to handle automatic redirect when blocked
  useEffect(() => {
    if (isBlocked && attemptCount >= MAX_ATTEMPTS) {
      const redirectTimer = setTimeout(() => {
        console.log('Auto-redirecting to login after account lock');
        handleRedirectToLogin();
      }, 3000); // Auto redirect after 3 seconds

      return () => clearTimeout(redirectTimer);
    }
  }, [isBlocked, attemptCount]);

  useEffect(() => {
    console.log(`Current attempt count: ${attemptCount}, Is blocked: ${isBlocked}`);
  }, [attemptCount, isBlocked]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>CITADEL</Text>
        </View>
      </View>

      <Text style={styles.title}>Enter Your MPIN</Text>
      <Text style={styles.subtitle}>
        Enter your 6-digit MPIN for {getDisplayEmail()}
      </Text>

      {getAttemptIndicator()}

      <View style={styles.mpinContainer}>
        {mpin.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[
              styles.mpinInput,
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
          />
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (isLoading || isSubmitting || isBlocked) ? styles.submitButtonDisabled : null,
          ]}
          onPress={() => handleSubmit()}
          disabled={isLoading || isSubmitting || isBlocked || mpin.join('').length !== 6}
        >
          {(isLoading || isSubmitting) ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isBlocked ? 'Account Locked' : 'Login'}
            </Text>
          )}
        </TouchableOpacity>

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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  attemptIndicator: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    alignItems: 'center',
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
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
    textAlign: 'center',
  },
  criticalText: {
    color: '#D32F2F',
    fontWeight: '600',
  },
  blockedText: {
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: '600',
    textAlign: 'center',
  },
  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  mpinInput: {
    width: 45,
    height: 56,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.white,
  },
  mpinInputFocused: {
    borderColor: colors.primary,
    backgroundColor: '#F0F8FF',
  },
  mpinInputError: {
    borderColor: colors.error,
  },
  mpinInputDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    color: '#A0A0A0',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    marginBottom: 32,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonDisabled: {
    borderColor: '#E0E0E0',
  },
  clearButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  clearButtonTextDisabled: {
    color: '#A0A0A0',
  },
  alternativeContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  alternativeText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  usePasswordButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  usePasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  securityInfo: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  securityText: {
    fontSize: 12,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default MPINLogin;