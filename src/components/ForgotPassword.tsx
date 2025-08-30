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
import { colors, commonStyles } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive dimensions
const isTablet = screenWidth >= 768;
const isSmallDevice = screenHeight < 700;
const containerPadding = isTablet ? 48 : 24;
const logoSize = isTablet ? 140 : isSmallDevice ? 100 : 120;

interface ForgotPasswordProps {
  onBack: () => void;
  onOTPSent: (email: string) => void;
  isLoading?: boolean;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onBack,
  onOTPSent,
  isLoading,
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);

  const validateEmail = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email');
      return false;
    }
    
    setError('');
    return true;
  };

  const handleSendOTP = async () => {
    if (!validateEmail()) return;

    try {
      // Here you would call your forgot password API
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      Alert.alert(
        'OTP Sent',
        `A verification code has been sent to ${email}`,
        [
          {
            text: 'OK',
            onPress: () => onOTPSent(email),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    }
  };

  // Handle focus to scroll to input when keyboard appears
  const handleInputFocus = () => {
    setTimeout(() => {
      const scrollY = isSmallDevice ? 200 : 250;
      
      scrollViewRef.current?.scrollTo({
        y: scrollY,
        animated: true,
      });
    }, 100);
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
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you a verification code to reset your password.
        </Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) {
                setError('');
              }
            }}
            onFocus={handleInputFocus}
            placeholder="Enter your email"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            returnKeyType="done"
            onSubmitEditing={handleSendOTP}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onBack}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              isLoading ? styles.primaryButtonDisabled : null,
            ]}
            onPress={handleSendOTP}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Send OTP</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Check your email inbox and spam folder for the verification code. The code will expire in 10 minutes.
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
    marginBottom: isSmallDevice ? 24 : 40,
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
    paddingHorizontal: isTablet ? 20 : 12,
  },
  formContainer: {
    width: '100%',
    maxWidth: isTablet ? 400 : '100%',
    alignSelf: 'center',
    marginBottom: isSmallDevice ? 24 : 32,
  },
  inputContainer: {
    marginBottom: isSmallDevice ? 24 : 32,
  },
  label: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: isSmallDevice ? 6 : 8,
    letterSpacing: 0.3,
  },
  input: {
    ...commonStyles.input,
    fontSize: isTablet ? 18 : 16,
    height: isTablet ? 64 : isSmallDevice ? 48 : 56,
    paddingHorizontal: isTablet ? 20 : 16,
    borderRadius: isTablet ? 16 : 12,
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
  inputError: {
    borderColor: colors.error,
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: colors.error,
    fontSize: isTablet ? 16 : 14,
    marginTop: 6,
    fontWeight: '500',
    paddingLeft: 4,
  },
  buttonContainer: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: isTablet ? 16 : 12,
    alignItems: 'stretch',
  },
  button: {
    flex: isTablet ? 1 : 0,
    height: isTablet ? 64 : isSmallDevice ? 48 : 56,
    borderRadius: isTablet ? 16 : 12,
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
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: isTablet ? 12 : 8,
    padding: isTablet ? 20 : 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginHorizontal: isTablet ? 20 : 0,
    marginBottom: isSmallDevice ? 20 : 40,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  infoText: {
    fontSize: isTablet ? 16 : 14,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: isTablet ? 24 : 20,
    fontWeight: '400',
  },
});

export default ForgotPassword;