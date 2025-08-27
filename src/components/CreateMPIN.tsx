import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Config from 'react-native-config';
import {colors, commonStyles} from '../styles/theme';

// Environment configuration
const BACKEND_URL = Config.BASE_URL || 'http://127.0.0.1:8000';

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
  const [email, setEmail] = useState(initialEmail);
  const [mpin, setMPin] = useState('');
  const [confirmMPin, setConfirmMPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    mpin: '',
    confirmMPin: '',
  });

  // Backend API call for creating MPIN
  const createMPINAPI = async (email: string, mpin: string, password: string): Promise<CreateMPINResponse> => {
    try {
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
    const newErrors = {email: '', mpin: '', confirmMPin: ''};
    let isValid = true;

    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

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

    setLoading(true);
    try {
      // Call backend API to create MPIN and get token
      const response = await createMPINAPI(email, mpin, newPassword);
      
      // Call the parent handler which will:
      // 1. Reset password on backend
      // 2. Store tokens locally
      // 3. Navigate to welcome screen
      await onCreateMPIN(email, mpin, newPassword, response.token);
      
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

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>CITADEL</Text>
        </View>
      </View>

      <Text style={styles.title}>Create MPIN</Text>
      <Text style={styles.subtitle}>
        Create a 6-digit MPIN for quick login access
      </Text>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[
              styles.input, 
              errors.email ? styles.inputError : null,
              initialEmail ? { backgroundColor: '#F7FAFC' } : null
            ]}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!initialEmail && !isFormLoading}
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Create 6-Digit MPIN</Text>
          <TextInput
            style={[styles.input, errors.mpin ? styles.inputError : null]}
            value={mpin}
            onChangeText={setMPin}
            placeholder="Enter 6-digit MPIN"
            keyboardType="numeric"
            maxLength={6}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isFormLoading}
          />
          {errors.mpin ? <Text style={styles.errorText}>{errors.mpin}</Text> : null}
          <Text style={styles.hintText}>
            Choose a unique 6-digit number that you'll remember easily
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm MPIN</Text>
          <TextInput
            style={[styles.input, errors.confirmMPin ? styles.inputError : null]}
            value={confirmMPin}
            onChangeText={setConfirmMPin}
            placeholder="Re-enter 6-digit MPIN"
            keyboardType="numeric"
            maxLength={6}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isFormLoading}
          />
          {errors.confirmMPin ? (
            <Text style={styles.errorText}>{errors.confirmMPin}</Text>
          ) : null}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            💡 Your MPIN will be used for quick login access after your initial setup is complete.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onBack}
            disabled={isFormLoading}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              isFormLoading ? styles.primaryButtonDisabled : null,
            ]}
            onPress={handleSubmit}
            disabled={isFormLoading}>
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    ...commonStyles.input,
    fontSize: 16,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 4,
  },
  hintText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  infoContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  secondaryButton: {
    backgroundColor: colors.gray,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateMPIN;