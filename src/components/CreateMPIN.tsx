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
import {colors, commonStyles} from '../styles/theme';

interface CreateMPINProps {
  onCreateMPIN: (email: string, mpin: string, newPassword: string) => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
  initialEmail?: string;
}

const CreateMPIN: React.FC<CreateMPINProps> = ({
  onCreateMPIN,
  onBack,
  isLoading,
  initialEmail = '',
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [mpin, setMPin] = useState('');
  const [confirmMPin, setConfirmMPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errors, setErrors] = useState({
    email: '',
    mpin: '',
    confirmMPin: '',
    newPassword: '',
  });

  const validateForm = () => {
    const newErrors = {email: '', mpin: '', confirmMPin: '', newPassword: ''};
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
    } else if (mpin.length !== 4 || !/^\d{4}$/.test(mpin)) {
      newErrors.mpin = 'MPIN must be exactly 4 digits';
      isValid = false;
    }

    if (!confirmMPin.trim()) {
      newErrors.confirmMPin = 'Please confirm your MPIN';
      isValid = false;
    } else if (mpin !== confirmMPin) {
      newErrors.confirmMPin = 'MPINs do not match';
      isValid = false;
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
      isValid = false;
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await onCreateMPIN(email, mpin, newPassword);
    } catch (error) {
      Alert.alert('Error', 'Failed to create MPIN. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>CITADEL</Text>
        </View>
      </View>

      <Text style={styles.title}>Create MPIN</Text>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            value={email}
            onChangeText={setEmail}
            placeholder=""
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Create 4-Digit MPIN</Text>
          <TextInput
            style={[styles.input, errors.mpin ? styles.inputError : null]}
            value={mpin}
            onChangeText={setMPin}
            placeholder=""
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.mpin ? <Text style={styles.errorText}>{errors.mpin}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm MPIN</Text>
          <TextInput
            style={[styles.input, errors.confirmMPin ? styles.inputError : null]}
            value={confirmMPin}
            onChangeText={setConfirmMPin}
            placeholder=""
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.confirmMPin ? (
            <Text style={styles.errorText}>{errors.confirmMPin}</Text>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={[styles.input, errors.newPassword ? styles.inputError : null]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder=""
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          {errors.newPassword ? (
            <Text style={styles.errorText}>{errors.newPassword}</Text>
          ) : null}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onBack}
            disabled={isLoading}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              isLoading ? styles.primaryButtonDisabled : null,
            ]}
            onPress={handleSubmit}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
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
    marginBottom: 40,
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