// src/components/OTPVerification.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, commonStyles } from '../styles/theme';

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
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
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

  const handleOTPChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newOTP = [...otp];
    newOTP[index] = value;
    setOTP(newOTP);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && value && newOTP.every((digit) => digit !== '')) {
      handleVerifyOTP(newOTP.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpValue?: string) => {
    const otpToVerify = otpValue || otp.join('');

    if (otpToVerify.length !== 6) {
      setError('Please enter complete 6-digit OTP');
      return;
    }

    try {
      onOTPVerified(email, otpToVerify);
    } catch (error) {
      setError('Invalid OTP. Please try again.');
      clearOTP();
    }
  };

  const clearOTP = () => {
    setOTP(['', '', '', '', '', '']);
    setError('');
    inputRefs.current[0]?.focus();
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

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>CITADEL</Text>
        </View>
      </View>

      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>
        We've sent a 6-digit verification code to{'\n'}
        <Text style={styles.emailText}>{email}</Text>
      </Text>

      <View style={styles.formContainer}>
        <View style={styles.otpContainer}>
          <Text style={styles.label}>Enter Verification Code</Text>
          <View style={styles.otpInputContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[styles.otpInput, error ? styles.otpInputError : null]}
                value={digit}
                onChangeText={(value) => handleOTPChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                selectTextOnFocus
                textAlign="center"
              />
            ))}
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.timerContainer}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>
              Resend OTP in {formatTimer(timer)}
            </Text>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.clearButton} onPress={clearOTP}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.verifyButton,
              isLoading ? styles.verifyButtonDisabled : null,
            ]}
            onPress={() => handleVerifyOTP()}
            disabled={isLoading || otp.join('').length !== 6}>
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.verifyButtonText}>Verify</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OTPVerification;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  logoText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    ...commonStyles.title,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    ...commonStyles.subtitle,
    textAlign: 'center',
    marginBottom: 25,
    color: colors.textSecondary,
  },
  emailText: {
    color: colors.primaryDark,
    fontWeight: 'bold',
  },
  formContainer: {
    marginTop: 20,
  },
  otpContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    fontWeight: '500',
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpInput: {
    width: 45,
    height: 50,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: 8,
    fontSize: 20,
    color: colors.text,
  },
  otpInputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    marginTop: 6,
    fontSize: 13,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  timerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  clearButton: {
    flex: 1,
    marginRight: 8,
    padding: 14,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
  },
  clearButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  verifyButton: {
    flex: 1,
    marginLeft: 8,
    padding: 14,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  verifyButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});
