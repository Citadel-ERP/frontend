import React, { useState, useRef, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { colors, commonStyles } from '../styles/theme';

declare var alert: (message: string) => void;

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
  };
};

interface LoginProps {
  onLogin: (identifier: string, password: string, identifierType: 'email' | 'phone', isBrowser: boolean) => Promise<void>;
  onForgotPassword: () => void;
  onUseMPIN?: () => void; // New prop for MPIN navigation
  isLoading?: boolean;
}

const EyeIcon = ({ visible }: { visible: boolean }) => (
  <Text style={styles.eyeIconText}>{visible ? '👁️' : '👁️‍🗨️'}</Text>
);

// Helper function to detect if input is phone number
const isPhoneNumber = (input: string): boolean => {
  // Remove spaces, dashes, and parentheses
  const cleaned = input.replace(/[\s\-\(\)]/g, '');
  // If it contains @ it is likely an email, not a phone number
  if (cleaned.includes('@')) {
    return false;
  }
  return true;
};

const Login: React.FC<LoginProps> = ({
  onLogin,
  onForgotPassword,
  onUseMPIN,
  isLoading,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({
    identifier: '',
    password: '',
  });
  const [loginError, setLoginError] = useState('');
  const [responsive, setResponsive] = useState(getResponsiveValues());
  const passwordInputRef = useRef<TextInput>(null);

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

  const validateForm = () => {
    const newErrors = { identifier: '', password: '' };
    let isValid = true;

    if (!identifier.trim()) {
      newErrors.identifier = 'Email or phone number is required';
      isValid = false;
    } else {
      const isPhone = isPhoneNumber(identifier);
      console.log("isPhone", isPhone);
      const isEmail = /\S+@\S+\.\S+/.test(identifier);
      
      if (!isPhone && !isEmail) {
        newErrors.identifier = 'Please enter a valid email or phone number';
        isValid = false;
      }
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const showErrorAlert = (message: string) => {
    setLoginError(message);
    
    if (Platform.OS === 'web') {
      setTimeout(() => {
        alert(message);
      }, 100);
    } else {
      Alert.alert(
        'Login Failed',
        message,
        [{ text: 'OK', onPress: () => setLoginError('') }],
        { cancelable: false }
      );
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoginError('');
   
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }

    try {
      const trimmedIdentifier = identifier.trim();
      const identifierType = isPhoneNumber(trimmedIdentifier) ? 'phone' : 'email';
      console.log("identifierType", identifierType);
      
      const formattedIdentifier = identifierType === 'email' 
        ? trimmedIdentifier.toLowerCase() 
        : trimmedIdentifier;
      
      // Detect if the user is using a browser (web platform) or native app (iOS/Android)
      const isBrowser = Platform.OS === 'web';
      
      await onLogin(formattedIdentifier, password, identifierType, isBrowser);
      setLoginError('');
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Invalid credentials. Please try again.';
      
      if (error && error.message) {
        const msg = error.message.toLowerCase();
        
        if (msg.includes('invalid email') || 
            msg.includes('invalid phone') ||
            msg.includes('invalid password') ||
            msg.includes('invalid') || 
            msg.includes('incorrect') ||
            msg.includes('wrong') ||
            msg.includes('400')) {
          errorMessage = 'You entered the wrong credentials';
        } else if (msg.includes('network') ||
                   msg.includes('connection') ||
                   msg.includes('failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (msg.includes('unauthorized') ||
                   msg.includes('401') ||
                   msg.includes('403')) {
          errorMessage = 'Invalid credentials. Please check your email/phone and password.';
        } else if (msg.includes('blocked') ||
                   msg.includes('locked')) {
          errorMessage = 'Your account has been temporarily locked. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }
      
      showErrorAlert(errorMessage);
    }
  };

  const dismissKeyboard = () => {
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  };

  const handleForgotPasswordPress = () => {
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
    setTimeout(() => {
      onForgotPassword();
    }, 100);
  };

  const handleUseMPINPress = () => {
    if (!onUseMPIN) return;
    
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
    setTimeout(() => {
      onUseMPIN();
    }, 100);
  };

  const dynamicStyles = getDynamicStyles(responsive);

  const content = (
    <View style={styles.wrapper}>
      {Platform.OS !== 'web' && (
        <StatusBar
          barStyle="dark-content"
          backgroundColor={colors.background}
          translucent={false}
        />
      )}
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
                <Text style={[styles.title, dynamicStyles.title]}>Welcome Back</Text>
                <Text style={[styles.subtitle, dynamicStyles.subtitle]}>Sign in to your account</Text>
              </View>
              
              {loginError ? (
                <View style={[styles.loginErrorContainer, dynamicStyles.loginErrorContainer]}>
                  <Text style={[styles.loginErrorText, dynamicStyles.loginErrorText]}>{loginError}</Text>
                </View>
              ) : null}
              
              <View style={[styles.formContainer, dynamicStyles.formContainer]}>
                <View style={[styles.inputContainer, dynamicStyles.inputMargin]}>
                  <Text style={[styles.label, dynamicStyles.label]}>Email or Phone</Text>
                  <TextInput
                    style={[
                      styles.input,
                      dynamicStyles.input,
                      (errors.identifier || loginError) && styles.inputError,
                    ]}
                    value={identifier}
                    onChangeText={(text) => {
                      setIdentifier(text);
                      if (errors.identifier) {
                        setErrors(prev => ({ ...prev, identifier: '' }));
                      }
                      if (loginError) {
                        setLoginError('');
                      }
                    }}
                    placeholder="Enter your email or phone"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                  {errors.identifier ? (
                    <Text style={[styles.errorText, dynamicStyles.errorText]}>{errors.identifier}</Text>
                  ) : null}
                </View>

                <View style={[styles.inputContainer, dynamicStyles.passwordMargin]}>
                  <Text style={[styles.label, dynamicStyles.label]}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      ref={passwordInputRef}
                      style={[
                        styles.passwordInput,
                        dynamicStyles.passwordInput,
                        (errors.password || loginError) && styles.inputError,
                      ]}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (errors.password) {
                          setErrors(prev => ({ ...prev, password: '' }));
                        }
                        if (loginError) {
                          setLoginError('');
                        }
                      }}
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
                      style={[styles.eyeButton, dynamicStyles.eyeButton]}
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      activeOpacity={0.7}
                    >
                      <EyeIcon visible={showPassword} />
                    </TouchableOpacity>
                  </View>
                  {errors.password ? (
                    <Text style={[styles.errorText, dynamicStyles.errorText]}>{errors.password}</Text>
                  ) : null}
                </View>

                <View style={[styles.forgotPasswordWrapper, dynamicStyles.forgotPasswordMargin]}>
                  <TouchableOpacity
                    onPress={handleForgotPasswordPress}
                    disabled={isLoading}
                    activeOpacity={0.7}
                    hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
                    style={styles.forgotPasswordButton}
                  >
                    <Text style={[styles.forgotPasswordText, dynamicStyles.forgotPasswordText]}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    dynamicStyles.loginButton,
                    isLoading && styles.loginButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={[styles.loginButtonText, dynamicStyles.loginButtonText]}>Sign In</Text>
                  )}
                </TouchableOpacity>

                {/* New: Use MPIN Button */}
                {onUseMPIN && (
                  <TouchableOpacity
                    style={[styles.mpinButtonWrapper, dynamicStyles.mpinButtonMargin]}
                    onPress={handleUseMPINPress}
                    disabled={isLoading}
                    activeOpacity={0.7}
                    hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
                  >
                    <Text style={[styles.mpinButtonText, dynamicStyles.mpinButtonText]}>
                      Use MPIN Instead
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.footerContainer, dynamicStyles.footerContainer]}>
            <View style={[styles.contentMaxWidth, dynamicStyles.footerMaxWidth]}>
              <View style={[styles.footerContent, dynamicStyles.footerContent]}>
                <Text style={[styles.footerText, dynamicStyles.footerText]}>First time user? Your password will be provided by your administrator.</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

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
    loginErrorContainer: {
      marginBottom: responsive.spacing * 0.8,
      width: '100%',
    },
    loginErrorText: {
      fontSize: responsive.fontSize - 1,
    },
    formContainer: {
      width: '100%',
    },
    label: {
      fontSize: responsive.fontSize,
    },
    input: {
      height: responsive.inputHeight,
      fontSize: responsive.fontSize,
    },
    passwordInput: {
      height: responsive.inputHeight,
      fontSize: responsive.fontSize,
    },
    eyeButton: {
      height: responsive.inputHeight,
    },
    inputMargin: {
      marginBottom: responsive.spacing * 0.7,
    },
    passwordMargin: {
      marginBottom: responsive.spacing * 0.6,
    },
    forgotPasswordMargin: {
      marginBottom: responsive.spacing * 0.75,
    },
    forgotPasswordText: {
      fontSize: responsive.fontSize - 1,
    },
    loginButton: {
      height: responsive.buttonHeight,
    },
    loginButtonText: {
      fontSize: responsive.fontSize + 1,
    },
    mpinButtonMargin: {
      marginTop: responsive.spacing * 0.3,
    },
    mpinButtonText: {
      fontSize: responsive.fontSize - 1,
    },
    errorText: {
      fontSize: responsive.fontSize - 2,
    },
    footerContainer: {
      paddingHorizontal: responsive.horizontalPadding,
      paddingTop: responsive.isWeb ? (responsive.isDesktop ? 20 : responsive.isTablet ? 16 : 12) : responsive.spacing * 0.8,
      paddingBottom: responsive.isWeb ? (responsive.isDesktop ? 30 : responsive.isTablet ? 20 : 16) : Platform.OS === 'ios' ? 40 : 24,
    },
    footerContent: {
      padding: responsive.isDesktop ? 22 : responsive.isTablet ? 18 : 14,
    },
    footerText: {
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
  loginErrorContainer: {
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    borderRadius: 8,
    padding: 12,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: colors.error,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  loginErrorText: {
    color: colors.error,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'left',
  },
  formContainer: {
    width: '100%',
    alignSelf: 'center',
  },
  inputContainer: {
    width: '100%',
  },
  label: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    width: '100%',
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    color: colors.text,
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
      },
    }),
  },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  passwordInput: {
    width: '100%',
    paddingHorizontal: 16,
    paddingRight: 50,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    color: colors.text,
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
      },
    }),
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    width: 40,
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
    marginTop: 6,
    fontWeight: '500',
    paddingLeft: 4,
  },
  forgotPasswordWrapper: {
    alignItems: 'flex-end',
    paddingVertical: 4,
    width: '100%',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    color: colors.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // New: MPIN button styles
  mpinButtonWrapper: {
    alignItems: 'center',
    paddingVertical: 8,
    width: '100%',
  },
  mpinButtonText: {
    color: colors.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
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
    color: '#4A5568',
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '400',
  },
});

export default Login;