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
const containerPadding = isTablet ? 48 : 24;
const logoSize = isTablet ? 140 : isSmallDevice ? 100 : 120;

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onForgotPassword: () => void;
  isLoading?: boolean;
}

const Login: React.FC<LoginProps> = ({
  onLogin,
  onForgotPassword,
  isLoading,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  // Handle focus to scroll to input when keyboard appears
  const handleInputFocus = (inputType: 'email' | 'password') => {
    setTimeout(() => {
      const scrollY = inputType === 'email' ? 
        (isSmallDevice ? 150 : 200) : 
        (isSmallDevice ? 250 : 300);
      
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
          source={require('../assets/Logo.png')}
          style={[styles.logo, { width: logoSize, height: logoSize }]}
          resizeMode="contain"
        />
      </View>

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
          <TextInput
            ref={passwordInputRef}
            style={[
              styles.input, 
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
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
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

      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>
          First time user? Your password will be provided by your administrator.
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
  },
  formContainer: {
    width: '100%',
    maxWidth: isTablet ? 400 : '100%',
    alignSelf: 'center',
    marginBottom: isSmallDevice ? 24 : 32,
  },
  inputContainer: {
    marginBottom: isSmallDevice ? 16 : 20,
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: isSmallDevice ? 24 : 32,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: isTablet ? 16 : 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  loginButton: {
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
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footerContainer: {
    marginTop: isSmallDevice ? 20 : 32,
    padding: isTablet ? 20 : 16,
    backgroundColor: '#F7FAFC',
    borderRadius: isTablet ? 12 : 8,
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
  footerText: {
    fontSize: isTablet ? 16 : 14,
    color: '#4A5568',
    lineHeight: isTablet ? 24 : 20,
    textAlign: 'center',
    fontWeight: '400',
  },
});

export default Login;