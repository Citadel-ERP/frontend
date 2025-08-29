import React, { useState, useEffect } from 'react';
import {
  View,
  AppState,
  AppStateStatus,
  Alert,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from './src/config/config';
import SplashScreen from './src/components/SplashScreen';
import Login from './src/components/Login';
import CreateMPIN from './src/components/CreateMPIN';
import MPINLogin from './src/components/MPINLogin';
import ForgotPassword from './src/components/ForgotPassword';
import OTPVerification from './src/components/OTPVerification';
import ResetPassword from './src/components/ResetPassword';
import WelcomeScreen from './src/components/WelcomeScreen';
import Dashboard from './src/components/Dashboard';
import { colors } from './src/styles/theme';

type Screen =
  | 'splash'
  | 'login'
  | 'createMPIN'
  | 'mpinLogin'
  | 'forgotPassword'
  | 'otpVerification'
  | 'resetPassword'
  | 'welcome'
  | 'dashboard';

interface User {
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
}

interface UserData {
  email?: string;
  first_name?: string;
  last_name?: string;
  firstLogin?: boolean;
  isAuthenticated?: boolean;
}

interface LoginResponse {
  message: string;
  first_login?: boolean;
  token?: string;
  mpin?: string;
  user?: {
    email: string;
    name?: string;
    first_name?: string;
    last_name?: string;
  };
}

interface ResetPasswordResponse {
  message: string;
}

const TOKEN_1_KEY = 'token_1';
const TOKEN_2_KEY = 'token_2';
const MPIN_KEY = 'user_mpin';

function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [userData, setUserData] = useState<UserData>({});
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [tempData, setTempData] = useState<{ email?: string; oldPassword?: string; newPassword?: string; otp?: string }>({});

  // Get backend URL from environment variables
  const getBackendUrl = (): string => {
    const backendUrl = BACKEND_URL;

    if (!backendUrl) {
      console.error('BACKEND_URL not found in environment variables');
      throw new Error('Backend URL not configured. Please check your environment setup.');
    }

    return backendUrl;
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    setAppState(nextAppState);
  };

  const loginAPI = async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const BACKEND_URL = getBackendUrl();
      console.log('Using Backend URL:', BACKEND_URL);

      const response = await fetch(`${BACKEND_URL}/core/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || errorData?.detail || `Login failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return {
        message: data.message || 'Login successful',
        first_login: data.first_login,
        token: data.token,
        mpin: data.mpin,
        user: data.user,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred during login');
    }
  };

  const mpinLoginAPI = async (token: string, mpin: string): Promise<LoginResponse> => {
    try {
      const BACKEND_URL = getBackendUrl();

      const response = await fetch(`${BACKEND_URL}/core/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          mpin,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || errorData?.detail || `MPIN login failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return {
        message: data.message || 'Login successful',
        token: data.token,
        mpin: data.mpin,
        user: data.user,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred during MPIN login');
    }
  };

  const resetPasswordAPI = async (email: string, oldPassword: string, newPassword: string): Promise<ResetPasswordResponse> => {
    try {
      const BACKEND_URL = getBackendUrl();

      const response = await fetch(`${BACKEND_URL}/core/resetPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || errorData?.detail || `Reset password failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return {
        message: data.message || 'Reset password successful',
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred during password reset');
    }
  };

  const handleSplashComplete = async () => {
    try {
      const token1 = await AsyncStorage.getItem(TOKEN_1_KEY);
      const email = await AsyncStorage.getItem('user_email');
      const firstName = await AsyncStorage.getItem('user_first_name');
      const lastName = await AsyncStorage.getItem('user_last_name');

      console.log('Token check:', { token1: !!token1, email });

      // If token1 exists, show MPIN login
      if (token1 && email) {
        setUserData({
          email,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          isAuthenticated: false
        });
        setCurrentScreen('mpinLogin');
        return;
      }

      // Otherwise show login
      setCurrentScreen('login');
    } catch (error) {
      console.error('Error checking tokens:', error);
      setCurrentScreen('login');
    }
  };

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await loginAPI(email, password);
      console.log('Login response:', response);

      // Store email and user data
      await AsyncStorage.setItem('user_email', email);

      // Store first_name and last_name if available
      if (response.user?.first_name) {
        await AsyncStorage.setItem('user_first_name', response.user.first_name);
      }
      if (response.user?.last_name) {
        await AsyncStorage.setItem('user_last_name', response.user.last_name);
      }

      setUserData({
        email,
        first_name: response.user?.first_name,
        last_name: response.user?.last_name,
        isAuthenticated: true
      });

      setUser({
        email,
        name: response.user?.name,
        first_name: response.user?.first_name,
        last_name: response.user?.last_name
      });

      // Check if this is first login
      if (response.first_login === true) {
        // First login - store old password and redirect to reset password
        setTempData({ email, oldPassword: password });
        setCurrentScreen('resetPassword');
      } else if (response.first_login === false && response.token) {
        // Not first login and we have token - save it and proceed
        await AsyncStorage.setItem(TOKEN_2_KEY, response.token);
        // Generate token1 and proceed to welcome/dashboard
        const token1 = generateRandomToken();
        await AsyncStorage.setItem(TOKEN_1_KEY, token1);
        setCurrentScreen('welcome');
      } else {
        // Handle unexpected response
        Alert.alert('Error', 'Unexpected response from server. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('Backend URL not configured')) {
          errorMessage = 'Configuration error. Please contact support.';
        } else if (error.message.includes('401') || error.message.includes('Invalid credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      Alert.alert(
        'Login Error',
        errorMessage,
        [{ text: 'Retry' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomToken = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleCreateMPIN = async (email: string, mpin: string, newPassword: string, token?: string) => {
    setIsLoading(true);
    try {
      // The API call has already been made in CreateMPIN component
      // Just save the token and navigate
      if (token) {
        await AsyncStorage.setItem(TOKEN_2_KEY, token);
      }
      // Generate token1 and save MPIN
      const token1 = generateRandomToken();
      await AsyncStorage.multiSet([
        [TOKEN_1_KEY, token1],
        [MPIN_KEY, mpin]
      ]);
      setCurrentScreen('welcome');
    } catch (error) {
      console.error('Error storing MPIN data:', error);
      Alert.alert('Error', 'Failed to save MPIN data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMPINLogin = async (mpin: string) => {
    setIsLoading(true);
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_2_KEY);
      if (!storedToken) {
        throw new Error('No authentication token found');
      }

      try {
        const response = await mpinLoginAPI(storedToken, mpin);
        console.log('MPIN login response:', response);
        // Update user data if we get fresh data from the API
        if (response.user) {
          setUserData(prev => ({
            ...prev,
            first_name: response.user?.first_name || prev.first_name,
            last_name: response.user?.last_name || prev.last_name
          }));

          setUser({
            email: userData.email || '',
            name: response.user?.name,
            first_name: response.user?.first_name,
            last_name: response.user?.last_name
          });
        }

        setCurrentScreen('welcome');
        return;
      } catch (backendError) {
        console.log('Backend MPIN login failed, trying local verification:', backendError);
        // Fallback to local MPIN verification
        const storedMPin = await AsyncStorage.getItem(MPIN_KEY);
        if (mpin === storedMPin) {
          setCurrentScreen('welcome');
        } else {
          Alert.alert(
            'Invalid MPIN',
            'Please enter the correct MPIN and try again.',
            [{ text: 'Retry' }]
          );
        }
      }
    } catch (error) {
      console.error('MPIN login error:', error);

      let errorMessage = 'Something went wrong. Please login with your email and password.';
      if (error instanceof Error && error.message.includes('Backend URL not configured')) {
        errorMessage = 'Configuration error. Please contact support.';
      }

      Alert.alert(
        'Authentication Error',
        errorMessage,
        [{ text: 'OK', onPress: () => setCurrentScreen('login') }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsePassword = () => {
    setCurrentScreen('login');
  };

  const handleForgotPassword = () => {
    setCurrentScreen('forgotPassword');
  };

  const handleOTPSent = (email: string) => {
    setTempData({ email });
    setCurrentScreen('otpVerification');
  };

  const handleResendOTP = async () => {
    try {
      Alert.alert('OTP Sent', 'A new OTP has been sent to your email');
    } catch (error) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    }
  };

  const handleOTPVerified = (email: string, otp: string) => {
    // Mock OTP verification
    if (otp === "0000") {
      setTempData({ email, otp });
      setCurrentScreen('resetPassword');
    } else {
      Alert.alert('Invalid OTP', 'Please enter the correct OTP');
    }
  };

  // Password reset handler for first-time login
  const handlePasswordReset = async (email: string, oldPassword: string, newPassword: string) => {
    // Store the new password for CreateMPIN page
    setTempData({ email, newPassword: newPassword });
    // Navigate to create MPIN
    setCurrentScreen('createMPIN');
  };

  const handleBack = () => {
    switch (currentScreen) {
      case 'createMPIN':
        setCurrentScreen('login');
        break;
      case 'forgotPassword':
        setCurrentScreen('login');
        break;
      case 'otpVerification':
        setCurrentScreen('forgotPassword');
        break;
      case 'resetPassword':
        // For first login reset password, go back to login
        setCurrentScreen('login');
        break;
      case 'mpinLogin':
        setCurrentScreen('login');
        break;
      default:
        setCurrentScreen('login');
    }
  };

  const handleLogout = async () => {
    try {
      // Clear all stored data including first_name and last_name
      await AsyncStorage.multiRemove([TOKEN_1_KEY, TOKEN_2_KEY, MPIN_KEY, 'user_email', 'user_first_name', 'user_last_name']);
      setUserData({});
      setUser(null);
      setTempData({});
      setCurrentScreen('login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Force clear even if there's an error
      await AsyncStorage.multiRemove([TOKEN_1_KEY, TOKEN_2_KEY, MPIN_KEY, 'user_email', 'user_first_name', 'user_last_name']);
      setUserData({});
      setUser(null);
      setTempData({});
      setCurrentScreen('login');
    }
  };

  // Helper function to get display name
  const getDisplayName = (): string => {
    if (userData.first_name && userData.last_name) {
      return `${userData.first_name} ${userData.last_name}`;
    } else if (userData.first_name) {
      return userData.first_name;
    } else if (userData.last_name) {
      return userData.last_name;
    } else if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user?.first_name) {
      return user.first_name;
    } else if (user?.last_name) {
      return user.last_name;
    } else if (user?.name) {
      return user.name;
    } else {
      return userData.email?.split('@')[0] || "User";
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen onSplashComplete={handleSplashComplete} />;
      case 'login':
        return (
          <Login
            onLogin={handleLogin}
            onForgotPassword={handleForgotPassword}
            isLoading={isLoading}
          />
        );
      case 'createMPIN':
        return (
          <CreateMPIN
            onCreateMPIN={handleCreateMPIN}
            onBack={handleBack}
            isLoading={isLoading}
            initialEmail={userData.email}
            newPassword={tempData.newPassword || ''} // Pass the new password
          />
        );
      case 'mpinLogin':
        return (
          <MPINLogin
            onMPINLogin={handleMPINLogin}
            onBiometricLogin={async (token) => {
              // Handle successful biometric login
              console.log('Biometric login successful');
              // Update user data and navigate to welcome screen
              setUserData(prev => ({ ...prev, isAuthenticated: true }));
              setCurrentScreen('welcome');
            }}
            onDashboardRedirect={() => {
              // Direct navigation to dashboard after biometric auth
              console.log('Redirecting to dashboard after biometric auth');
              setUserData(prev => ({ ...prev, isAuthenticated: true }));
              setCurrentScreen('dashboard');
            }}
            onUsePassword={handleUsePassword}
            isLoading={isLoading}
            userEmail={userData.email}
          />
        );
      case 'forgotPassword':
        return (
          <ForgotPassword
            onBack={handleBack}
            onOTPSent={handleOTPSent}
            isLoading={isLoading}
          />
        );
      case 'otpVerification':
        return (
          <OTPVerification
            email={tempData.email || ''}
            onOTPVerified={handleOTPVerified}
            onBack={handleBack}
            onResendOTP={handleResendOTP}
            isLoading={isLoading}
          />
        );
      case 'resetPassword':
        return (
          <ResetPassword
            email={userData.email || ''}
            oldPassword={tempData.oldPassword || ''} // Pass the login password as old password
            onPasswordReset={handlePasswordReset}
            onBack={handleBack}
            isLoading={isLoading}
          />
        );
      case 'welcome':
        return (
          <WelcomeScreen
            name={getDisplayName()}
            onContinue={() => setCurrentScreen('dashboard')}
          />
        );
      case 'dashboard':
        return <Dashboard onLogout={handleLogout} />;
      default:
        return <SplashScreen onSplashComplete={handleSplashComplete} />;
    }
  };

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {renderScreen()}
      </View>
    </SafeAreaProvider>
  );
}

export default App;