import React, { useState, useRef } from 'react';
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
import { colors, commonStyles } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const isTablet = screenWidth >= 768;
const isSmallDevice = screenHeight < 700;

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onForgotPassword: () => void;
  isLoading?: boolean;
}

// Eye icon components for password visibility toggle
const EyeIcon = ({ visible }: { visible: boolean }) => (
  <View style={styles.eyeIcon}>
    <Text style={styles.eyeIconText}>{visible ? '👁️' : '👁️‍🗨️'}</Text>
  </View>
);

const Login: React.FC<LoginProps> = ({
  onLogin,
  onForgotPassword,
  isLoading,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  const scrollViewRef = useRef<ScrollView>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const validateForm = () => {
    const newErrors = { email: '', password: '' };
    let isValid = true;

    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await onLogin(email.toLowerCase().trim(), password);
    } catch (error: any) {
      console.error('Login error:', error);
    }
  };

  // Improved keyboard handling - scroll to the focused input with appropriate offset
  const handleInputFocus = (inputType: 'email' | 'password') => {
    setTimeout(() => {
      if (scrollViewRef.current) {
        const baseOffset = isSmallDevice ? 100 : 120;
        const inputOffset = inputType === 'password' ? 80 : 0;
        const totalOffset = baseOffset + inputOffset;
        
        scrollViewRef.current.scrollTo({
          y: totalOffset,
          animated: true,
        });
      }
    }, 150);
  };

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

        {/* Main Content - Login Form */}
        <View style={styles.mainContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.email ? styles.inputError : null
                ]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) {
                    setErrors(prev => ({ ...prev, email: '' }));
                  }
                }}
                onFocus={() => handleInputFocus('email')}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
              />
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  ref={passwordInputRef}
                  style={[
                    styles.passwordInput,
                    errors.password ? styles.inputError : null
                  ]}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) {
                      setErrors(prev => ({ ...prev, password: '' }));
                    }
                  }}
                  onFocus={() => handleInputFocus('password')}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <EyeIcon visible={showPassword} />
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={onForgotPassword}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoading ? styles.loginButtonDisabled : null,
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <View style={styles.footerContent}>
            <Text style={styles.footerText}>
              First time user? Your password will be provided by your administrator.
            </Text>
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
  },

  // Form styles
  formContainer: {
    width: '100%',
    maxWidth: isTablet ? 400 : '100%',
    alignSelf: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: isTablet ? 16 : 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    ...commonStyles.input,
    fontSize: isTablet ? 16 : 15,
    height: isTablet ? 56 : 52,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
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
  
  // Password field styles
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    ...commonStyles.input,
    fontSize: isTablet ? 16 : 15,
    height: isTablet ? 56 : 52,
    paddingHorizontal: 16,
    paddingRight: 50,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flex: 1,
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
  eyeButton: {
    position: 'absolute',
    right: 12,
    height: isTablet ? 56 : 52,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIconText: {
    fontSize: 18,
    opacity: 0.6,
  },

  inputError: {
    borderColor: colors.error,
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: colors.error,
    fontSize: isTablet ? 14 : 13,
    marginTop: 6,
    fontWeight: '500',
    paddingLeft: 4,
  },
  
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: isTablet ? 15 : 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: isTablet ? 56 : 52,
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
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: isTablet ? 17 : 16,
    fontWeight: '600',
    letterSpacing: 0.3,
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

export default Login;