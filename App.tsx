import React, { useState, useEffect } from 'react';
import {
  View,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashScreen from './src/components/SplashScreen';
import Login from './src/components/Login';
import ChangePassword from './src/components/ChangePassword';
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
  | 'changePassword'
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

function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [userData, setUserData] = useState<UserData>({});
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [tempData, setTempData] = useState<{ email?: string; otp?: string }>({});

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    setAppState(nextAppState);
  };

  const handleSplashComplete = async () => {
    setCurrentScreen('login');
  };

  // Login flow (replace with API later)
  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const hardcodedEmail = "test@citadel.com";
      const hardcodedPassword = "password123";

      if (email === hardcodedEmail && password === hardcodedPassword) {
        setUserData({
          email,
          firstLogin: false,
          isAuthenticated: true,
        });
        setUser({ email });
        setCurrentScreen('changePassword');
      } 
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setCurrentScreen('createMPIN');
  };

  const handleCreateMPIN = async () => {
    setCurrentScreen('welcome');
  };

  const handleMPINLogin = async (mpin: string) => {
    if (mpin === "1234") {
      setCurrentScreen('welcome');
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
    // Placeholder for API call
  };

  const handleOTPVerified = (email: string, otp: string) => {
    if (otp === "0000") {
      setTempData({ email, otp });
      setCurrentScreen('resetPassword');
    }
  };

  const handlePasswordReset = async () => {
    setCurrentScreen('login');
  };

  const handleBack = () => {
    switch (currentScreen) {
      case 'changePassword':
      case 'forgotPassword':
        setCurrentScreen('login');
        break;
      case 'createMPIN':
        setCurrentScreen('changePassword');
        break;
      case 'otpVerification':
        setCurrentScreen('forgotPassword');
        break;
      case 'resetPassword':
        setCurrentScreen('otpVerification');
        break;
      default:
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
      case 'changePassword':
        return (
          <ChangePassword
            onChangePassword={handleChangePassword}
            onBack={handleBack}
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
        return <WelcomeScreen name="Priyanka" onContinue={() => setCurrentScreen('dashboard')} />;
      case 'dashboard':
        return <Dashboard />;
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
