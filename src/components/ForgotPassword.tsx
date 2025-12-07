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
  ScrollView,
  StatusBar,
} from 'react-native';
import { colors, commonStyles } from '../styles/theme';
import { BACKEND_URL } from '../config/config';

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
    logoSize: deviceType === 'desktop' ? 100 : deviceType === 'tablet' ? 90 : 90,
    titleSize: deviceType === 'desktop' ? 32 : deviceType === 'tablet' ? 28 : 28,
    subtitleSize: deviceType === 'desktop' ? 16 : deviceType === 'tablet' ? 15 : 16,
    inputHeight: deviceType === 'desktop' ? 52 : deviceType === 'tablet' ? 50 : 50,
    buttonHeight: deviceType === 'desktop' ? 52 : deviceType === 'tablet' ? 50 : 52,
    fontSize: deviceType === 'desktop' ? 15 : deviceType === 'tablet' ? 15 : 15,
    spacing: deviceType === 'desktop' ? 20 : deviceType === 'tablet' ? 18 : 24,
    inputSpacing: deviceType === 'desktop' ? 20 : deviceType === 'tablet' ? 18 : 24,
  };
};

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const [responsive, setResponsive] = useState(getResponsiveValues());

  React.useEffect(() => {
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

  const getBackendUrl = () => {
    const backendUrl = BACKEND_URL;
    if (!backendUrl) {
      console.error('BACKEND_URL not found in environment variables');
      throw new Error('Backend URL not configured. Please check your environment setup.');
    }
    return backendUrl;
  };

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

  const forgotPasswordAPI = async (emailAddress: string) => {
    try {
      const backend = getBackendUrl();
      console.log('Calling forgot password API...');
      
      const response = await fetch(`${backend}/core/forgotPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailAddress }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      return {
        success: true,
        message: data.message || 'OTP sent successfully',
      };
    } catch (error: any) {
      console.error('Forgot password API error:', error);
      throw new Error(error.message || 'Network error occurred');
    }
  };

  const handleSendOTP = async () => {
    if (!validateEmail()) return;

    setIsSubmitting(true);
    try {
      console.log('Sending OTP to:', email);
      const result = await forgotPasswordAPI(email.trim());
      
      Alert.alert(
        'OTP Sent',
        `A verification code has been sent to ${email}`,
        [
          {
            text: 'OK',
            onPress: () => onOTPSent(email.trim()),
          },
        ]
      );
    } catch (error: any) {
      console.error('Handle send OTP error:', error);
      
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      if (error.message.includes('Invalid Email')) {
        errorMessage = 'Invalid email address. Please check and try again.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dynamicStyles = getDynamicStyles(responsive);

  const renderContent = () => (
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

          {responsive.isWeb ? (
            // Web: No scroll, fixed layout
            <View style={[styles.mainContent, dynamicStyles.mainContent]}>
              <View style={[styles.contentMaxWidth, dynamicStyles.contentMaxWidth]}>
                <View style={[styles.titleContainer, dynamicStyles.titleContainer]}>
                  <Text style={[styles.title, dynamicStyles.title]}>Forgot Password</Text>
                  <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
                    Enter your email address and we'll send you a verification code to reset your password.
                  </Text>
                </View>

                <View style={styles.formContainer}>
                  <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
                    <Text style={[styles.label, dynamicStyles.label]}>Email Address</Text>
                    <TextInput
                      style={[
                        styles.input,
                        dynamicStyles.input,
                        error ? styles.inputError : null
                      ]}
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (error) {
                          setError('');
                        }
                      }}
                      placeholder="Enter your email"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading && !isSubmitting}
                      returnKeyType="done"
                      onSubmitEditing={handleSendOTP}
                    />
                    {error ? <Text style={[styles.errorText, dynamicStyles.errorText]}>{error}</Text> : null}
                  </View>

                  <View style={[styles.infoContainer, dynamicStyles.infoContainer]}>
                    <Text style={[styles.infoText, dynamicStyles.infoText]}>
                      Check your email inbox and spam folder for the verification code. The code will expire in 10 minutes.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            // Mobile: Scrollable layout
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={[styles.scrollContent, dynamicStyles.scrollContent]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              <View style={[styles.mainContent, dynamicStyles.mainContent]}>
                <View style={[styles.contentMaxWidth, dynamicStyles.contentMaxWidth]}>
                  <View style={[styles.titleContainer, dynamicStyles.titleContainer]}>
                    <Text style={[styles.title, dynamicStyles.title]}>Forgot Password</Text>
                    <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
                      Enter your email address and we'll send you a verification code to reset your password.
                    </Text>
                  </View>

                  <View style={styles.formContainer}>
                    <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
                      <Text style={[styles.label, dynamicStyles.label]}>Email Address</Text>
                      <TextInput
                        style={[
                          styles.input,
                          dynamicStyles.input,
                          error ? styles.inputError : null
                        ]}
                        value={email}
                        onChangeText={(text) => {
                          setEmail(text);
                          if (error) {
                            setError('');
                          }
                        }}
                        placeholder="Enter your email"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading && !isSubmitting}
                        returnKeyType="done"
                        onSubmitEditing={handleSendOTP}
                      />
                      {error ? <Text style={[styles.errorText, dynamicStyles.errorText]}>{error}</Text> : null}
                    </View>

                    <View style={[styles.infoContainer, dynamicStyles.infoContainer]}>
                      <Text style={[styles.infoText, dynamicStyles.infoText]}>
                        Check your email inbox and spam folder for the verification code. The code will expire in 10 minutes.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}

          <View style={[styles.footerContainer, dynamicStyles.footerContainer]}>
            <View style={[styles.contentMaxWidth, dynamicStyles.footerMaxWidth]}>
              <View style={[styles.buttonContainer, dynamicStyles.buttonContainer]}>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton, dynamicStyles.button]}
                  onPress={onBack}
                  disabled={isLoading || isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.secondaryButtonText, dynamicStyles.buttonText]}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.primaryButton,
                    dynamicStyles.button,
                    (isLoading || isSubmitting) ? styles.primaryButtonDisabled : null,
                  ]}
                  onPress={handleSendOTP}
                  disabled={isLoading || isSubmitting}
                  activeOpacity={0.8}
                >
                  {(isLoading || isSubmitting) ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={[styles.primaryButtonText, dynamicStyles.buttonText]}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return renderContent();
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
      paddingTop: responsive.isWeb ? (responsive.isDesktop ? 24 : responsive.isTablet ? 20 : 20) : Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: responsive.isDesktop ? 12 : responsive.isTablet ? 10 : 12,
    },
    logo: {
      width: responsive.logoSize,
      height: responsive.logoSize,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: responsive.horizontalPadding,
    },
    mainContent: {
      paddingVertical: responsive.isWeb ? (responsive.isDesktop ? 10 : responsive.isTablet ? 8 : 12) : (responsive.isDesktop ? 20 : responsive.isTablet ? 16 : 12),
      paddingHorizontal: responsive.isWeb ? responsive.horizontalPadding : 0,
      justifyContent: responsive.isWeb ? 'flex-start' : 'center',
      width: '100%',
    },
    titleContainer: {
      marginBottom: responsive.isWeb ? (responsive.isDesktop ? 20 : responsive.isTablet ? 18 : responsive.spacing) : responsive.spacing,
    },
    title: {
      fontSize: responsive.titleSize,
    },
    subtitle: {
      fontSize: responsive.subtitleSize,
    },
    inputContainer: {
      marginBottom: responsive.isWeb ? (responsive.isDesktop ? responsive.inputSpacing : responsive.isTablet ? responsive.inputSpacing : 24) : 24,
    },
    label: {
      fontSize: responsive.fontSize,
      marginBottom: responsive.isDesktop ? 10 : responsive.isTablet ? 8 : 6,
    },
    input: {
      height: responsive.inputHeight,
      fontSize: responsive.fontSize,
      paddingHorizontal: responsive.isDesktop ? 20 : responsive.isTablet ? 18 : 16,
      borderRadius: responsive.isDesktop ? 14 : responsive.isTablet ? 12 : 10,
    },
    errorText: {
      fontSize: responsive.fontSize - 2,
      marginTop: responsive.isDesktop ? 8 : 6,
    },
    infoContainer: {
      borderRadius: responsive.isDesktop ? 12 : responsive.isTablet ? 10 : 8,
      padding: responsive.isDesktop ? 16 : responsive.isTablet ? 14 : 16,
      marginBottom: responsive.isWeb ? (responsive.isDesktop ? 12 : responsive.isTablet ? 10 : responsive.spacing) : responsive.spacing,
    },
    infoText: {
      fontSize: responsive.isWeb ? (responsive.isDesktop ? 13 : responsive.isTablet ? 13 : responsive.fontSize - 1) : (responsive.fontSize - 1),
      lineHeight: responsive.isDesktop ? 20 : responsive.isTablet ? 18 : 20,
    },
    footerContainer: {
      paddingHorizontal: responsive.horizontalPadding,
      paddingTop: responsive.isWeb ? (responsive.isDesktop ? 12 : responsive.isTablet ? 10 : 12) : responsive.spacing * 0.8,
      paddingBottom: responsive.isWeb ? (responsive.isDesktop ? 24 : responsive.isTablet ? 20 : 16) : Platform.OS === 'ios' ? 40 : 24,
    },
    buttonContainer: {
      flexDirection: responsive.isDesktop || responsive.isTablet ? 'row' : 'column',
      gap: responsive.isDesktop ? 16 : responsive.isTablet ? 14 : 12,
    },
    button: {
      height: responsive.buttonHeight,
      borderRadius: responsive.isDesktop ? 14 : responsive.isTablet ? 12 : 10,
      flex: responsive.isDesktop || responsive.isTablet ? 1 : 0,
    },
    buttonText: {
      fontSize: responsive.fontSize + 1,
    },
  });
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  fixedContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    width: '100%',
    flexShrink: 0,
  },
  logo: {
    width: 100,
    height: 100,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainContent: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  contentMaxWidth: {
    alignItems: 'center',
    width: '100%',
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
    lineHeight: 24,
  },
  formContainer: {
    width: '100%',
    maxWidth: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: colors.white,
    fontSize: 16,
    color: colors.text,
    paddingHorizontal: 16,
    height: 50,
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
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
    paddingLeft: 4,
  },
  infoContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
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
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '400',
  },
  footerContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.background,
    flexShrink: 0,
  },
  buttonContainer: {
    alignItems: 'stretch',
    width: '100%',
    maxWidth: '100%',
  },
  button: {
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ForgotPassword;