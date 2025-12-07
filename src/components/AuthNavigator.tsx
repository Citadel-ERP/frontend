import React, {useState, useEffect} from 'react';
import {
  View,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import Login from './Login';
import ChangePassword from './ChangePassword';
import CreateMPIN from './CreateMPIN';
import MPINLogin from './MPINLogin';
import authService, { LoginResponse } from '../services/authServices';
import {colors, commonStyles} from '../styles/theme';

type AuthStep = 
  | 'loading'
  | 'login'
  | 'change_password'
  | 'create_mpin'
  | 'mpin_login'
  | 'authenticated';

interface AuthNavigatorProps {
  onAuthSuccess: (user: any) => void;
}

const AuthNavigator: React.FC<AuthNavigatorProps> = ({onAuthSuccess}) => {
  const [currentStep, setCurrentStep] = useState<AuthStep>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const tokens = await authService.initializeTokens();
      const authStatus = authService.getAuthStatus();

      switch (authStatus) {
        case 'not_authenticated':
          setCurrentStep('login');
          break;
        case 'partial_auth':
          setCurrentStep('login'); // Show login to get token2
          break;
        case 'full_auth':
          setCurrentStep('mpin_login');
          break;
        default:
          setCurrentStep('login');
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setCurrentStep('login');
    }
  };

  const handleLogin = async (identifier: string, password: string, identifierType: 'email' | 'phone') => {
  setIsLoading(true);
  try {
    const response: LoginResponse = await authService.login(identifier, password, identifierType);
    setUserEmail(response.user.email);

    if (response.requiresPasswordChange) {
      setCurrentStep('change_password');
    } else if (response.requiresMPINSetup) {
      setCurrentStep('create_mpin');
    } else if (response.token2) {
      onAuthSuccess(response.user);
    } else {
      setCurrentStep('change_password');
    }
  } catch (error: any) {
    Alert.alert('Login Failed', error.message || 'Please check your credentials');
  } finally {
    setIsLoading(false);
  }
};

  const handleMPINLogin = async (mpin: string) => {
    setIsLoading(true);
    try {
      const response: LoginResponse = await authService.loginWithMPIN(mpin);
      onAuthSuccess(response.user);
    } catch (error: any) {
      Alert.alert('MPIN Login Failed', error.message || 'Invalid MPIN');
      // Don't set loading to false here - let the component handle it
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (oldPassword: string, newPassword: string) => {
    setIsLoading(true);
    try {
      await authService.changePassword(oldPassword, newPassword);
      Alert.alert(
        'Success',
        'Password changed successfully. Please create your MPIN.',
        [
          {
            text: 'OK',
            onPress: () => setCurrentStep('create_mpin'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMPIN = async (email: string, mpin: string, newPassword: string) => {
    setIsLoading(true);
    try {
      await authService.createMPIN(email, mpin, newPassword);
      Alert.alert(
        'Success',
        'MPIN created successfully. You can now login with your MPIN.',
        [
          {
            text: 'OK',
            onPress: () => setCurrentStep('mpin_login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create MPIN');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    Alert.prompt(
      'Forgot Password',
      'Please enter your email address:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send Reset Link',
          onPress: async (email) => {
            if (email) {
              try {
                setIsLoading(true);
                await authService.forgotPassword(email);
                Alert.alert('Success', 'Password reset link sent to your email.');
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to send reset link');
              } finally {
                setIsLoading(false);
              }
            }
          },
        },
      ],
      'plain-text',
      userEmail
    );
  };

  const handleUsePassword = () => {
    setCurrentStep('login');
  };

  const handleBackToLogin = () => {
    setCurrentStep('login');
  };

  if (currentStep === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {currentStep === 'login' && (
        <Login
          onLogin={handleLogin}
          onForgotPassword={handleForgotPassword}
          isLoading={isLoading}
        />
      )}

      {currentStep === 'change_password' && (
        <ChangePassword
          onChangePassword={handleChangePassword}
          onBack={handleBackToLogin}
          isLoading={isLoading}
        />
      )}

      {currentStep === 'create_mpin' && (
        <CreateMPIN
          onCreateMPIN={handleCreateMPIN}
          onBack={handleBackToLogin}
          isLoading={isLoading}
          initialEmail={userEmail}
        />
      )}

      {currentStep === 'mpin_login' && (
        <MPINLogin
          onMPINLogin={handleMPINLogin}
          onUsePassword={handleUsePassword}
          isLoading={isLoading}
          userEmail={userEmail}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    ...commonStyles.centerContainer,
    backgroundColor: colors.background,
  },
});

export default AuthNavigator;