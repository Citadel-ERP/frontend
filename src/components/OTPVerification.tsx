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
import { colors, commonStyles } from '../styles/theme';
import { BACKEND_URL } from '../config/config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const isTablet = screenWidth >= 768;
const isSmallDevice = screenHeight < 700;
const containerPadding = isTablet ? 48 : 24;
const logoSize = isTablet ? 120 : 100;

interface OTPVerificationProps {
  email: string;
  onOTPVerified: (email: string, otp: string) => void;
  onBack: () => void;
  onResendOTP: (email: string) => void;
  isLoading?: boolean;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({
  email,
  onOTPVerified,
  onBack,
  onResendOTP,
  isLoading,
}) => {
  const [otp, setOTP] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const getBackendUrl = () => {
    const backendUrl = BACKEND_URL;
    if (!backendUrl) {
      console.error('BACKEND_URL not found in environment variables');
      throw new Error('Backend URL not configured. Please check your environment setup.');
    }
    return backendUrl;
  };

  const verifyOTPAPI = async (emailOrPhone: string, otpValue: string) => {
    try {
      const backend = getBackendUrl();
      console.log('Calling verify OTP API...', { email: emailOrPhone, otp: otpValue });
      
      const response = await fetch(`${backend}/core/verifyOtp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: emailOrPhone,
          otp: otpValue 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }

      return {
        success: true,
        message: data.message || 'OTP verified successfully',
      };
    } catch (error: any) {
      console.error('Verify OTP API error:', error);
      throw new Error(error.message || 'Network error occurred');
    }
  };

  const handleOTPChange = (value: string, index: number) => {
    if (!value || value === '') {
      const newOTP = [...otp];
      newOTP[index] = '';
      setOTP(newOTP);
      setError('');
      return;
    }

    const lastChar = value.charAt(value.length - 1);
    
    if (!/^[0-9]$/.test(lastChar)) {
      return;
    }

    const newOTP = [...otp];
    newOTP[index] = lastChar;
    
    setOTP(newOTP);
    setError('');

    if (index < 5) {
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
        setFocusedIndex(index + 1);
      }, 10);
    }

    if (index === 5 && newOTP.every((digit) => digit !== '')) {
      setTimeout(() => {
        handleVerifyOTP(newOTP.join(''));
      }, 100);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (otp[index]) {
        const newOTP = [...otp];
        newOTP[index] = '';
        setOTP(newOTP);
        setError('');
      } else if (index > 0) {
        const newOTP = [...otp];
        newOTP[index - 1] = '';
        setOTP(newOTP);
        setTimeout(() => {
          inputRefs.current[index - 1]?.focus();
          setFocusedIndex(index - 1);
        }, 10);
      }
    }
  };

  const handleVerifyOTP = async (otpValue?: string) => {
    const otpToVerify = otpValue || otp.join('');

    if (otpToVerify.length !== 6) {
      setError('Please enter complete 6-digit OTP');
      return;
    }

    setIsVerifying(true);
    try {
      console.log('Verifying OTP:', otpToVerify);
      const result = await verifyOTPAPI(email, otpToVerify);
      
      // If verification successful, call the parent callback to move to next screen
      console.log('OTP verified successfully:', result.message);
      onOTPVerified(email, otpToVerify);
    } catch (error: any) {
      console.error('OTP verification error:', error);
      
      let errorMessage = 'Invalid OTP. Please try again.';
      
      if (error.message.includes('Invalid credentials') || error.message.includes('Verify OTP failed')) {
        errorMessage = 'Invalid OTP. Please check and try again.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      clearOTP();
    } finally {
      setIsVerifying(false);
    }
  };

  const clearOTP = () => {
    setOTP(['', '', '', '', '', '']);
    setError('');
    setTimeout(() => {
      inputRefs.current[0]?.focus();
      setFocusedIndex(0);
    }, 100);
  };

  const handleResend = () => {
    onResendOTP(email);
    setTimer(60);
    setCanResend(false);
    clearOTP();
  };

  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleInputFocus = (index: number) => {
    setFocusedIndex(index);
    setTimeout(() => {
      if (scrollViewRef.current) {
        const scrollY = isSmallDevice ? 180 : 220;
        scrollViewRef.current.scrollTo({
          y: scrollY,
          animated: true,
        });
      }
    }, 150);
  };

  const isButtonDisabled = isLoading || isVerifying || otp.join('').length !== 6;

  const renderContent = () => (
    <View style={styles.contentContainer}>
      <View style={styles.headerContainer}>
        <Image
          source={require('../assets/logo.png')}
          style={[styles.logo, { width: logoSize, height: logoSize }]}
          resizeMode="contain"
        />
      </View>

      <View style={styles.mainContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit verification code to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.otpContainer}>
            <Text style={styles.label}>Enter Verification Code</Text>
            <View style={styles.otpInputContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={`otp-${index}`}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[
                    styles.otpInput,
                    error ? styles.otpInputError : null,
                    digit ? styles.otpInputFilled : null,
                    focusedIndex === index ? styles.otpInputFocused : null
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOTPChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => handleInputFocus(index)}
                  onBlur={() => setFocusedIndex(-1)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  editable={!isLoading && !isVerifying}
                  autoCorrect={false}
                  spellCheck={false}
                  contextMenuHidden={true}
                  selection={digit ? { start: 1, end: 1 } : undefined}
                />
              ))}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.timerContainer}>
            {canResend ? (
              <TouchableOpacity 
                onPress={handleResend}
                disabled={isLoading || isVerifying}
                activeOpacity={0.7}
              >
                <Text style={styles.resendText}>
                  Didn't receive the code? Resend OTP
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>
                Resend OTP in {formatTimer(timer)}
              </Text>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={clearOTP}
              disabled={isLoading || isVerifying}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                isButtonDisabled ? styles.primaryButtonDisabled : null,
              ]}
              onPress={() => handleVerifyOTP()}
              disabled={isButtonDisabled}
              activeOpacity={0.8}
            >
              {(isLoading || isVerifying) ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backButtonContainer}
            onPress={onBack}
            disabled={isLoading || isVerifying}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footerContainer}>
        <View style={styles.footerContent}>
          <Text style={styles.footerText}>
            Check your email inbox and spam folder for the verification code. The code will expire in 10 minutes.
          </Text>
        </View>
      </View>
    </View>
  );

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
    minHeight: screenHeight,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: containerPadding,
    paddingVertical: isSmallDevice ? 20 : 30,
  },
  headerContainer: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  logo: {
    marginBottom: isTablet ? 20 : 16,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  titleContainer: {
    marginBottom: isSmallDevice ? 32 : 40,
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
    lineHeight: isTablet ? 28 : 24,
  },
  emailText: {
    color: colors.primary,
    fontWeight: '600',
  },
  formContainer: {
    width: '100%',
    maxWidth: isTablet ? 400 : '100%',
    alignSelf: 'center',
  },
  otpContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: isTablet ? 16 : 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: isTablet ? 20 : 8,
  },
  otpInput: {
    width: isTablet ? 56 : 48,
    height: isTablet ? 64 : 56,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    fontSize: isTablet ? 24 : 20,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.white,
    textAlign: 'center',
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
  otpInputError: {
    borderColor: colors.error,
    backgroundColor: '#FFF5F5',
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: '#F0F9FF',
  },
  otpInputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  errorText: {
    color: colors.error,
    fontSize: isTablet ? 14 : 13,
    marginTop: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timerText: {
    fontSize: isTablet ? 15 : 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  resendText: {
    fontSize: isTablet ? 15 : 14,
    fontWeight: '600',
    color: colors.primary,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: isTablet ? 16 : 12,
    marginBottom: 24,
  },
  button: {
    flex: isTablet ? 1 : 0,
    height: isTablet ? 56 : 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: isTablet ? 17 : 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: isTablet ? 17 : 16,
    fontWeight: '600',
  },
  backButtonContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: isTablet ? 15 : 14,
    fontWeight: '500',
  },
  footerContainer: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 20,
  },
  footerContent: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: isTablet ? 20 : 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
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
  footerText: {
    fontSize: isTablet ? 15 : 14,
    color: '#4A5568',
    lineHeight: isTablet ? 22 : 20,
    textAlign: 'center',
    fontWeight: '400',
  },
});

export default OTPVerification;