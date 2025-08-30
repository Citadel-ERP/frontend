import React, { useState, useRef } from 'react';
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
import { BACKEND_URL } from '../config/config';
import { colors } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const isTablet = screenWidth >= 768;
const isSmallDevice = screenHeight < 700;
const containerPadding = isTablet ? 48 : 24;
const logoSize = isTablet ? 140 : isSmallDevice ? 100 : 120;

interface ForgotMPINProps {
  onBack: () => void;
  onOTPSent: (email: string) => void;
  isLoading?: boolean;
  userEmail?: string;
}

interface ForgotMPINResponse {
  message: string;
}

const ForgotMPIN: React.FC<ForgotMPINProps> = ({
  onBack,
  onOTPSent,
  isLoading = false,
  userEmail = '',
}) => {
  const [email, setEmail] = useState(userEmail);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const getBackendUrl = (): string => {
    const backendUrl = BACKEND_URL;
    
    if (!backendUrl) {
      console.error('BACKEND_URL not found in environment variables');
      throw new Error('Backend URL not configured. Please check your environment setup.');
    }
    
    return backendUrl;
  };

  const forgotMPINAPI = async (email: string): Promise<ForgotMPINResponse> => {
    try {
      const BACKEND_URL = getBackendUrl();
      console.log('Sending forgot MPIN request to:', `${BACKEND_URL}/core/forgotMpin`);
      
      const response = await fetch(`${BACKEND_URL}/core/forgotMpin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || errorData?.detail || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return {
        message: data.message || 'OTP sent successfully redirect to reset mpin with OTP',
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred while sending OTP');
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');
    console.log('Sending forgot MPIN request for email:', email);

    try {
      const response = await forgotMPINAPI(email.trim());
      console.log('Forgot MPIN response:', response);

      Alert.alert(
        'OTP Sent',
        'An OTP has been sent to your email address. Please check your inbox and follow the instructions to reset your MPIN.',
        [
          {
            text: 'Continue',
            onPress: () => {
              console.log('Navigating to OTP verification for MPIN reset');
              onOTPSent(email.trim());
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Forgot MPIN error:', error);

      let errorMessage = 'Failed to send OTP. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('Backend URL not configured')) {
          errorMessage = 'Configuration error. Please contact support.';
        } else if (error.message.includes('404')) {
          errorMessage = 'Email address not found. Please check your email and try again.';
        } else if (error.message.includes('400') || error.message.includes('Invalid')) {
          errorMessage = 'Invalid email address. Please check your email and try again.';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('500')) {
          errorMessage = 'Server error. Please try again later or contact support.';
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputFocus = () => {
    setEmailFocused(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: isSmallDevice ? 150 : 200,
        animated: true,
      });
    }, 100);
  };

  const handleInputBlur = () => {
    setEmailFocused(false);
  };

  const renderContent = () => (
    <View style={styles.contentContainer}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/logo.png')}
          style={[styles.logo, { width: logoSize, height: logoSize }]}
          resizeMode="contain"
        />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Forgot Your MPIN?</Text>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you an OTP to reset your MPIN
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={[
              styles.input,
              emailFocused ? styles.inputFocused : null,
              error ? styles.inputError : null,
            ]}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError('');
            }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Enter your email address"
            placeholderTextColor={colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading && !isSubmitting}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            styles.submitButton,
            (isLoading || isSubmitting || !email.trim()) ? styles.submitButtonDisabled : null,
          ]}
          onPress={handleSubmit}
          disabled={isLoading || isSubmitting || !email.trim()}
        >
          {(isLoading || isSubmitting) ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Send OTP</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.backContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          disabled={isLoading || isSubmitting}
        >
          <Text style={styles.backButtonText}>← Back to MPIN Login</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.securityInfo}>
        <Text style={styles.securityText}>
          🔒 We'll send a secure OTP to your registered email address. The OTP will be valid for 10 minutes.
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
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? 20 : 30,
  },
  logo: {
    marginBottom: isTablet ? 30 : isSmallDevice ? 16 : 24,
  },
  titleContainer: {
    marginBottom: isSmallDevice ? 24 : 32,
  },
  title: {
    fontSize: isTablet ? 32 : isSmallDevice ? 24 : 28,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: isSmallDevice ? 8 : 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: isTablet ? 28 : isSmallDevice ? 20 : 24,
    paddingHorizontal: isTablet ? 0 : 16,
  },
  formContainer: {
    marginBottom: isSmallDevice ? 24 : 32,
  },
  inputContainer: {
    marginBottom: isSmallDevice ? 16 : 24,
  },
  inputLabel: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    height: isTablet ? 64 : isSmallDevice ? 48 : 56,
    paddingHorizontal: isTablet ? 20 : 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: isTablet ? 16 : 12,
    fontSize: isTablet ? 18 : 16,
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
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: '#F0F8FF',
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: colors.error,
    fontSize: isTablet ? 16 : 14,
    marginBottom: isSmallDevice ? 12 : 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: isTablet ? 16 : 12,
    height: isTablet ? 64 : isSmallDevice ? 48 : 56,
    justifyContent: 'center',
    alignItems: 'center',
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
  submitButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
    ...Platform.select({
      ios: {
        shadowColor: colors.textSecondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  submitButtonText: {
    color: colors.white,
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  backContainer: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? 20 : 32,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: isTablet ? 16 : 14,
    fontWeight: '500',
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

export default ForgotMPIN;