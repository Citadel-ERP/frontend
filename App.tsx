import React, { useState, useEffect } from 'react';
import {
  View,
  AppState,
  AppStateStatus,
  Alert,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config'; // Import environment config
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

const BACKEND_URL = Config.BASE_URL || 'http://127.0.0.1:8000';

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
}

interface UserData {
  email?: string;
  firstLogin?: boolean;
  isAuthenticated?: boolean;
}

interface LoginResponse {
  message: string;
  token?: string;
  mpin?: string;
  user?: {
    email: string;
    name?: string;
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
  const [tempData, setTempData] = useState<{ email?: string; otp?: string; newPassword?: string }>({});

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    setAppState(nextAppState);
  };


  const loginAPI = async (email: string, password: string): Promise<LoginResponse> => {
    try {
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
      const token2 = await AsyncStorage.getItem(TOKEN_2_KEY);
      const storedMPin = await AsyncStorage.getItem(MPIN_KEY);
      const email = await AsyncStorage.getItem('user_email');

      console.log('Token check:', { token1: !!token1, token2: !!token2, mpin: !!storedMPin, email });

    
      if (token1 && token2 && storedMPin && email) {
        setUserData({ email, isAuthenticated: false });
        setCurrentScreen('mpinLogin');
        return;
      }

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
      
      setUserData({
        email,
        isAuthenticated: true,
      });
      
      setUser({ 
        email, 
        name: response.user?.name 
      });

      
      await AsyncStorage.setItem('user_email', email);

      
      if (response.token) {
        await AsyncStorage.setItem(TOKEN_2_KEY, response.token);
      }
      
      if (response.mpin) {
        await AsyncStorage.setItem(MPIN_KEY, response.mpin);
    
        const token1 = generateRandomToken();
        await AsyncStorage.setItem(TOKEN_1_KEY, token1);

        setCurrentScreen('welcome');
      } else {
 
        setCurrentScreen('createMPIN');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Invalid credentials')) {
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


  const handleCreateMPIN = async (email: string, mpin: string) => {
    setIsLoading(true);
    try {
   
      const token1 = generateRandomToken();
      

      await AsyncStorage.multiSet([
        [TOKEN_1_KEY, token1],
        [MPIN_KEY, mpin]
      ]);

      setCurrentScreen('welcome');
    } catch (error) {
      console.error('Error creating MPIN:', error);
      Alert.alert('Error', 'Failed to create MPIN. Please try again.');
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
        setCurrentScreen('welcome');
        return;
      } catch (backendError) {
        console.log('Backend MPIN login failed, trying local verification:', backendError);
        
      
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
      Alert.alert(
        'Authentication Error',
        'Something went wrong. Please login with your email and password.',
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
   
    if (otp === "0000") { 
      setTempData({ email, otp });
      setCurrentScreen('resetPassword');
    } else {
      Alert.alert('Invalid OTP', 'Please enter the correct OTP');
    }
  };


  const handlePasswordReset = async (email: string, otp: string, newPassword: string) => {
    setIsLoading(true);
    try {

      await resetPasswordAPI(email, otp, newPassword);
      
      Alert.alert(
        'Success', 
        'Password reset successfully', 
        [{ text: 'OK', onPress: () => setCurrentScreen('login') }]
      );
    } catch (error) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Failed to reset password. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
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
        setCurrentScreen('otpVerification');
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
     
      await AsyncStorage.multiRemove([TOKEN_1_KEY, TOKEN_2_KEY, MPIN_KEY, 'user_email']);
      setUserData({});
      setUser(null);
      setTempData({});
      setCurrentScreen('login');
    } catch (error) {
      console.error('Error during logout:', error);

      await AsyncStorage.multiRemove([TOKEN_1_KEY, TOKEN_2_KEY, MPIN_KEY, 'user_email']);
      setUserData({});
      setUser(null);
      setTempData({});
      setCurrentScreen('login');
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
          />
        );
      case 'mpinLogin':
        return (
          <MPINLogin
            onMPINLogin={handleMPINLogin}
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
            email={tempData.email || ''}
            otp={tempData.otp || ''}
            onPasswordReset={handlePasswordReset}
            onBack={handleBack}
            isLoading={isLoading}
          />
        );
      case 'welcome':
        return (
          <WelcomeScreen 
            name={user?.name || userData.email?.split('@')[0] || "User"} 
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