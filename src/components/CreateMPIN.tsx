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
  StatusBar,
} from 'react-native';
import { BACKEND_URL } from '../config/config'; 
import { colors, commonStyles } from '../styles/theme';

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
    inputSpacing: deviceType === 'desktop' ? 16 : deviceType === 'tablet' ? 16 : 20,
  };
};

interface CreateMPINProps {
  onCreateMPIN: (email: string, mpin: string, newPassword: string, token?: string) => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
  initialEmail?: string;
  newPassword?: string;
}

interface CreateMPINResponse {
  message: string;
  token: string;
}

const CreateMPIN: React.FC<CreateMPINProps> = ({
  onCreateMPIN,
  onBack,
  isLoading,
  initialEmail = '',
  newPassword = '',
}) => {
  const [mpin, setMPin] = useState('');
  const [confirmMPin, setConfirmMPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    mpin: '',
    confirmMPin: '',
  });

  const scrollViewRef = useRef<ScrollView>(null);
  const confirmMPinInputRef = useRef<TextInput>(null);
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

  // Backend API call for creating MPIN
  const createMPINAPI = async (email: string, mpin: string, password: string): Promise<CreateMPINResponse> => {
    try {
      console.log('CreateMPIN API Call:', { email, mpin, password });
      const response = await fetch(`${BACKEND_URL}/core/createMpin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          mpin,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || errorData?.detail || `Create MPIN failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.token) {
        throw new Error('Invalid response format from server - token missing');
      }

      return {
        message: data.message || 'Create MPIN successful',
        token: data.token,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred during MPIN creation');
    }
  };

  const validateForm = () => {
    const newErrors = { mpin: '', confirmMPin: '' };
    let isValid = true;

    if (!mpin.trim()) {
      newErrors.mpin = 'MPIN is required';
      isValid = false;
    } else if (mpin.length !== 6 || !/^\d{6}$/.test(mpin)) {
      newErrors.mpin = 'MPIN must be exactly 6 digits';
      isValid = false;
    }

    if (!confirmMPin.trim()) {
      newErrors.confirmMPin = 'Please confirm your MPIN';
      isValid = false;
    } else if (mpin !== confirmMPin) {
      newErrors.confirmMPin = 'MPINs do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!newPassword) {
      Alert.alert('Error', 'Password information is missing. Please go back and try again.');
      return;
    }

    if (!initialEmail) {
      Alert.alert('Error', 'Email information is missing. Please go back and try again.');
      return;
    }

    setLoading(true);
    try {
      // Call backend API to create MPIN and get token
      const response = await createMPINAPI(initialEmail, mpin, newPassword);

      // Call the parent handler which will store tokens locally and navigate
      await onCreateMPIN(initialEmail, mpin, newPassword, response.token);

      Alert.alert('Success', response.message || 'MPIN created successfully!', [{ text: 'OK' }]);
    } catch (error) {
      console.error('Create MPIN error:', error);

      let errorMessage = 'Failed to create MPIN. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('409') || error.message.includes('already exists')) {
          errorMessage = 'MPIN already exists for this account. Please try logging in.';
        } else if (error.message.includes('400') || error.message.includes('Invalid')) {
          errorMessage = 'Invalid input. Please check your details and try again.';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert('MPIN Creation Failed', errorMessage, [{ text: 'Retry' }]);
    } finally {
      setLoading(false);
    }
  };

  const isFormLoading = isLoading || loading;

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
                  <Text style={[styles.title, dynamicStyles.title]}>Create MPIN</Text>
                  <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
                    Create a 6-digit MPIN for quick login access
                  </Text>
                </View>

                <View style={styles.formContainer}>
                  {/* Email display (read-only) */}
                  <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
                    <Text style={[styles.label, dynamicStyles.label]}>Email</Text>
                    <View style={[styles.input, styles.readOnlyInput, dynamicStyles.input]}>
                      <Text style={[styles.readOnlyText, dynamicStyles.readOnlyText]}>{initialEmail}</Text>
                    </View>
                  </View>

                  <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
                    <Text style={[styles.label, dynamicStyles.label]}>Create 6-Digit MPIN</Text>
                    <TextInput
                      style={[
                        styles.input,
                        dynamicStyles.input,
                        errors.mpin ? styles.inputError : null
                      ]}
                      value={mpin}
                      onChangeText={(text) => {
                        setMPin(text);
                        if (errors.mpin) {
                          setErrors(prev => ({ ...prev, mpin: '' }));
                        }
                      }}
                      placeholder="Enter 6-digit MPIN"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      maxLength={6}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isFormLoading}
                      returnKeyType="next"
                      onSubmitEditing={() => confirmMPinInputRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                    {errors.mpin ? <Text style={[styles.errorText, dynamicStyles.errorText]}>{errors.mpin}</Text> : null}
                    <Text style={[styles.hintText, dynamicStyles.hintText]}>
                      Choose a unique 6-digit number that you'll remember easily
                    </Text>
                  </View>

                  <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
                    <Text style={[styles.label, dynamicStyles.label]}>Confirm MPIN</Text>
                    <TextInput
                      ref={confirmMPinInputRef}
                      style={[
                        styles.input,
                        dynamicStyles.input,
                        errors.confirmMPin ? styles.inputError : null
                      ]}
                      value={confirmMPin}
                      onChangeText={(text) => {
                        setConfirmMPin(text);
                        if (errors.confirmMPin) {
                          setErrors(prev => ({ ...prev, confirmMPin: '' }));
                        }
                      }}
                      placeholder="Re-enter 6-digit MPIN"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      maxLength={6}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isFormLoading}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                    {errors.confirmMPin ? (
                      <Text style={[styles.errorText, dynamicStyles.errorText]}>{errors.confirmMPin}</Text>
                    ) : null}
                  </View>

                  <View style={[styles.infoContainer, dynamicStyles.infoContainer]}>
                    <Text style={[styles.infoText, dynamicStyles.infoText]}>
                      Your MPIN will be used for quick login access after your initial setup is complete.
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
                    <Text style={[styles.title, dynamicStyles.title]}>Create MPIN</Text>
                    <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
                      Create a 6-digit MPIN for quick login access
                    </Text>
                  </View>

                  <View style={styles.formContainer}>
                    {/* Email display (read-only) */}
                    <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
                      <Text style={[styles.label, dynamicStyles.label]}>Email</Text>
                      <View style={[styles.input, styles.readOnlyInput, dynamicStyles.input]}>
                        <Text style={[styles.readOnlyText, dynamicStyles.readOnlyText]}>{initialEmail}</Text>
                      </View>
                    </View>

                    <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
                      <Text style={[styles.label, dynamicStyles.label]}>Create 6-Digit MPIN</Text>
                      <TextInput
                        style={[
                          styles.input,
                          dynamicStyles.input,
                          errors.mpin ? styles.inputError : null
                        ]}
                        value={mpin}
                        onChangeText={(text) => {
                          setMPin(text);
                          if (errors.mpin) {
                            setErrors(prev => ({ ...prev, mpin: '' }));
                          }
                        }}
                        placeholder="Enter 6-digit MPIN"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        maxLength={6}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isFormLoading}
                        returnKeyType="next"
                        onSubmitEditing={() => confirmMPinInputRef.current?.focus()}
                        blurOnSubmit={false}
                      />
                      {errors.mpin ? <Text style={[styles.errorText, dynamicStyles.errorText]}>{errors.mpin}</Text> : null}
                      <Text style={[styles.hintText, dynamicStyles.hintText]}>
                        Choose a unique 6-digit number that you'll remember easily
                      </Text>
                    </View>

                    <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
                      <Text style={[styles.label, dynamicStyles.label]}>Confirm MPIN</Text>
                      <TextInput
                        ref={confirmMPinInputRef}
                        style={[
                          styles.input,
                          dynamicStyles.input,
                          errors.confirmMPin ? styles.inputError : null
                        ]}
                        value={confirmMPin}
                        onChangeText={(text) => {
                          setConfirmMPin(text);
                          if (errors.confirmMPin) {
                            setErrors(prev => ({ ...prev, confirmMPin: '' }));
                          }
                        }}
                        placeholder="Re-enter 6-digit MPIN"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                        maxLength={6}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isFormLoading}
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit}
                      />
                      {errors.confirmMPin ? (
                        <Text style={[styles.errorText, dynamicStyles.errorText]}>{errors.confirmMPin}</Text>
                      ) : null}
                    </View>

                    <View style={[styles.infoContainer, dynamicStyles.infoContainer]}>
                      <Text style={[styles.infoText, dynamicStyles.infoText]}>
                        Your MPIN will be used for quick login access after your initial setup is complete.
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
                  disabled={isFormLoading}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.secondaryButtonText, dynamicStyles.buttonText]}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.primaryButton,
                    dynamicStyles.button,
                    isFormLoading ? styles.primaryButtonDisabled : null,
                  ]}
                  onPress={handleSubmit}
                  disabled={isFormLoading}
                  activeOpacity={0.8}
                >
                  {isFormLoading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={[styles.primaryButtonText, dynamicStyles.buttonText]}>Create MPIN</Text>
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
      marginBottom: responsive.isWeb ? (responsive.isDesktop ? 16 : responsive.isTablet ? 14 : responsive.spacing) : responsive.spacing,
    },
    title: {
      fontSize: responsive.titleSize,
    },
    subtitle: {
      fontSize: responsive.subtitleSize,
    },
    inputContainer: {
      marginBottom: responsive.isWeb ? (responsive.isDesktop ? responsive.inputSpacing : responsive.isTablet ? responsive.inputSpacing : 20) : (responsive.isDesktop ? 24 : responsive.isTablet ? 22 : 20),
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
    readOnlyText: {
      fontSize: responsive.fontSize,
    },
    errorText: {
      fontSize: responsive.fontSize - 2,
      marginTop: responsive.isDesktop ? 8 : 6,
    },
    hintText: {
      fontSize: responsive.fontSize - 2,
      marginTop: responsive.isDesktop ? 8 : 6,
      lineHeight: responsive.isDesktop ? 20 : responsive.isTablet ? 18 : 16,
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
    marginBottom: 20,
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
  readOnlyInput: {
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
  },
  readOnlyText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '400',
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
  hintText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
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

export default CreateMPIN;