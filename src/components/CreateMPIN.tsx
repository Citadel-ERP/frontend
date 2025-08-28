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
import Config from 'react-native-config';
import { colors, commonStyles } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive dimensions
const isTablet = screenWidth >= 768;
const isSmallDevice = screenHeight < 700;
const containerPadding = isTablet ? 48 : 24;
const logoSize = isTablet ? 140 : isSmallDevice ? 100 : 120;

// Environment configuration
const BACKEND_URL = Config.BACKEND_URL || 'http://127.0.0.1:8000';

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

  // Handle focus to scroll to input when keyboard appears
  const handleInputFocus = (inputType: 'mpin' | 'confirmMPin') => {
    setTimeout(() => {
      const scrollY = inputType === 'mpin' ? 
        (isSmallDevice ? 200 : 250) : 
        (isSmallDevice ? 300 : 350);
      
      scrollViewRef.current?.scrollTo({
        y: scrollY,
        animated: true,
      });
    }, 100);
  };

  const isFormLoading = isLoading || loading;

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
        <Text style={styles.title}>Create MPIN</Text>
        <Text style={styles.subtitle}>
          Create a 6-digit MPIN for quick login access
        </Text>
      </View>

      <View style={styles.formContainer}>
        {/* Email display (read-only) */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.input, styles.readOnlyInput]}>
            <Text style={styles.readOnlyText}>{initialEmail}</Text>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Create 6-Digit MPIN</Text>
          <TextInput
            style={[styles.input, errors.mpin ? styles.inputError : null]}
            value={mpin}
            onChangeText={(text) => {
              setMPin(text);
              if (errors.mpin) {
                setErrors(prev => ({ ...prev, mpin: '' }));
              }
            }}
            onFocus={() => handleInputFocus('mpin')}
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
          {errors.mpin ? <Text style={styles.errorText}>{errors.mpin}</Text> : null}
          <Text style={styles.hintText}>
            Choose a unique 6-digit number that you'll remember easily
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm MPIN</Text>
          <TextInput
            ref={confirmMPinInputRef}
            style={[styles.input, errors.confirmMPin ? styles.inputError : null]}
            value={confirmMPin}
            onChangeText={(text) => {
              setConfirmMPin(text);
              if (errors.confirmMPin) {
                setErrors(prev => ({ ...prev, confirmMPin: '' }));
              }
            }}
            onFocus={() => handleInputFocus('confirmMPin')}
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
            <Text style={styles.errorText}>{errors.confirmMPin}</Text>
          ) : null}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Your MPIN will be used for quick login access after your initial setup is complete.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onBack}
            disabled={isFormLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              isFormLoading ? styles.primaryButtonDisabled : null,
            ]}
            onPress={handleSubmit}
            disabled={isFormLoading}
            activeOpacity={0.8}
          >
            {isFormLoading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Create MPIN</Text>
            )}
          </TouchableOpacity>
        </View>
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
  },
  inputContainer: {
    marginBottom: isSmallDevice ? 20 : 24,
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
  readOnlyInput: {
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
  },
  readOnlyText: {
    color: colors.text,
    fontSize: isTablet ? 18 : 16,
    fontWeight: '400',
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
  hintText: {
    color: colors.textSecondary,
    fontSize: isTablet ? 14 : 12,
    marginTop: 6,
    lineHeight: isTablet ? 20 : 16,
    paddingLeft: 4,
  },
  infoContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: isTablet ? 12 : 8,
    padding: isTablet ? 20 : 16,
    marginBottom: isSmallDevice ? 24 : 32,
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
    fontSize: isTablet ? 16 : 14,
    color: '#4A5568',
    lineHeight: isTablet ? 24 : 20,
    textAlign: 'center',
    fontWeight: '400',
  },
  buttonContainer: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: isTablet ? 16 : 12,
    alignItems: 'stretch',
    marginBottom: isSmallDevice ? 20 : 40,
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
});

export default CreateMPIN;