import React, {useState, useRef, useEffect} from 'react';
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

interface MPINLoginProps {
  onMPINLogin: (mpin: string) => Promise<void>;
  onUsePassword: () => void;
  isLoading?: boolean;
  userEmail?: string;
}

const MPINLogin: React.FC<MPINLoginProps> = ({
  onMPINLogin,
  onUsePassword,
  isLoading,
  userEmail,
}) => {
  const [mpin, setMPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleMPINChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const newMPin = [...mpin];
    newMPin[index] = value;
    setMPin(newMPin);
    setError(''); 

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 3 && value && newMPin.every(digit => digit !== '')) {
      handleSubmit(newMPin.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !mpin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (mpinValue?: string) => {
    const mpinToSubmit = mpinValue || mpin.join('');
    
    if (mpinToSubmit.length !== 4) {
      setError('Please enter complete 4-digit MPIN');
      return;
    }

    try {
      await onMPINLogin(mpinToSubmit);
    } catch (error) {
      setError('Invalid MPIN. Please try again.');
      setMPin(['', '', '', '']); 
      inputRefs.current[0]?.focus();
    }
  };

  const clearMPIN = () => {
    setMPin(['', '', '', '']);
    setError('');
    inputRefs.current[0]?.focus();
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>CITADEL</Text>
        </View>
      </View>

      <Text style={styles.title}>Enter MPIN</Text>
      {userEmail && <Text style={styles.subtitle}>{userEmail}</Text>}

      <View style={styles.formContainer}>
        <View style={styles.mpinContainer}>
          <Text style={styles.label}>4-Digit MPIN</Text>
          <View style={styles.mpinInputContainer}>
            {mpin.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => (inputRefs.current[index] = ref)}
                style={[styles.mpinInput, error ? styles.mpinInputError : null]}
                value={digit}
                onChangeText={value => handleMPINChange(value, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                secureTextEntry
                selectTextOnFocus
                textAlign="center"
              />
            ))}
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.clearButton} onPress={clearMPIN}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, isLoading ? styles.submitButtonDisabled : null]}
            onPress={() => handleSubmit()}
            disabled={isLoading || mpin.join('').length !== 4}>
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onUsePassword} style={styles.usePasswordButton}>
          <Text style={styles.usePasswordText}>Use Password Instead</Text>
        </TouchableOpacity>
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
  },
  formContainer: {
    width: '100%',
  },
  mpinContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  mpinInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  mpinInput: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: colors.white,
  },
  mpinInputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  clearButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.gray,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  usePasswordButton: {
    alignSelf: 'center',
    paddingVertical: 12,
  },
  usePasswordText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default MPINLogin;