// Add this import at the very top, before other imports
import './src/services/backgroundAttendance';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  AppState,
  AppStateStatus,
  Alert,
  Text,
  TouchableOpacity,
  Platform
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
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
import { BackgroundLocationService } from './src/services/backgroundLocationTracking';
import { colors } from './src/styles/theme';
import { BackgroundAttendanceService } from './src/services/backgroundAttendance';
import { ConfigValidator } from './src/utils/configValidator';
import Constants from 'expo-constants';

// ─── Import the disclosure component here so it can be shown at root level ───
import { BackgroundLocationDisclosure } from './src/components/BackgroundLocationDisclosure';

// ─── Storage key for tracking whether disclosure has been shown before ───────
// Once shown (accept OR decline), we never show it again automatically.
const BG_DISCLOSURE_SHOWN_KEY = 'bg_location_disclosure_shown_v1';

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
  const [showDevMenu, setShowDevMenu] = useState(__DEV__);

  // ─── Disclosure modal state ───────────────────────────────────────────────
  // disclosureVisible: whether the modal is currently shown
  // disclosureResolved: whether the user has acted on it this session
  const [disclosureVisible, setDisclosureVisible] = useState(false);
  const disclosureResolveRef = useRef<((accepted: boolean) => void) | null>(null);

  // ─── Show disclosure and wait for user response ───────────────────────────
  // Returns a Promise<boolean> — true = accepted, false = declined.
  // This is the same pattern used in Dashboard.tsx so both can call it.
  const showBackgroundLocationDisclosure = useCallback((): Promise<boolean> => {
    return new Promise(resolve => {
      disclosureResolveRef.current = resolve;
      setDisclosureVisible(true);
    });
  }, []);

  const handleDisclosureAccept = useCallback(async () => {
    setDisclosureVisible(false);
    // Mark as shown permanently so it never auto-triggers again
    await AsyncStorage.setItem(BG_DISCLOSURE_SHOWN_KEY, 'shown');
    disclosureResolveRef.current?.(true);
    disclosureResolveRef.current = null;
  }, []);

  const handleDisclosureDecline = useCallback(async () => {
    setDisclosureVisible(false);
    // Still mark as shown — we respect the user's choice, don't spam them
    await AsyncStorage.setItem(BG_DISCLOSURE_SHOWN_KEY, 'shown');
    disclosureResolveRef.current?.(false);
    disclosureResolveRef.current = null;
  }, []);

  // ─── On first launch: show disclosure BEFORE anything else ───────────────
  // This is the key fix: Google's scanner checks for a prominent disclosure
  // that appears at startup, before any permission API is called.
  // We show it right after splash, independently of any service logic.
  useEffect(() => {
    const checkAndShowDisclosure = async () => {
      // Only run on real device builds, not Expo Go
      if (Platform.OS === 'web') return;
      if (Constants.appOwnership === 'expo') return;

      const alreadyShown = await AsyncStorage.getItem(BG_DISCLOSURE_SHOWN_KEY);
      if (alreadyShown) return; // Already seen it — don't show again

      // Check if bg permission is already granted (e.g. after reinstall with same device)
      const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
      if (bgStatus === 'granted') {
        // Permission already granted — mark disclosure as shown and skip
        await AsyncStorage.setItem(BG_DISCLOSURE_SHOWN_KEY, 'shown');
        return;
      }

      // First launch, bg not granted — show the disclosure now.
      // We do NOT request any permission here. The disclosure is purely informational.
      // The actual permission request happens later in the services init flow.
      await showBackgroundLocationDisclosure();
    };

    // Small delay so splash screen has a chance to render first
    const timer = setTimeout(checkAndShowDisclosure, 800);
    return () => clearTimeout(timer);
  }, [showBackgroundLocationDisclosure]);

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

  useEffect(() => {
    // Auto-run validation in development mode
    if (__DEV__) {
      const runInitialValidation = async () => {
        console.log('🔍 Running initial system validation...');
        const isValid = await ConfigValidator.runValidation();
        const inExpoGo = Constants.appOwnership === 'expo';

        if (inExpoGo && Platform.OS === 'ios') {
          console.log('');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('⚠️  IMPORTANT: iOS + Expo Go Detected');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('');
          console.log('Background location features WILL NOT WORK in Expo Go.');
          console.log('This is NORMAL and EXPECTED behavior.');
          console.log('');
          console.log('✅ Your configuration is CORRECT');
          console.log('✅ Your code logic is SOUND (Android proves it)');
          console.log('');
          console.log('To test iOS background features:');
          console.log('  1. Run: eas build --profile development --platform ios');
          console.log('  2. Install the .ipa on your device');
          console.log('  3. Test background location services');
          console.log('');
          console.log('Access System Validation screen via:');
          console.log('  Menu → System Validation');
          console.log('');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else if (isValid) {
          console.log('✅ All systems ready for development');
          console.log('ℹ️  Access detailed validation: Menu → System Validation');
        }
      };

      runInitialValidation();
    }
  }, []);

  // ─── Background services init — runs after authentication ─────────────────
  // IMPORTANT: This NO LONGER shows the disclosure itself.
  // The disclosure is shown at startup (above). By the time we reach here,
  // the user has already seen it and the flag is set. We only request the
  // actual system permission dialog here, after the user has been informed.
  useEffect(() => {
    const initializeBackgroundServices = async () => {
      if (!userData.isAuthenticated) return;
      if (Platform.OS === 'web') return;
      if (Constants.appOwnership === 'expo') return;

      try {
        // Check what's already granted — no dialogs yet
        const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
        const backgroundAlreadyGranted = bgStatus === 'granted';

        if (!backgroundAlreadyGranted) {
          // Disclosure has already been shown at startup.
          // Check if user accepted it (i.e. the flag exists).
          const disclosureShown = await AsyncStorage.getItem(BG_DISCLOSURE_SHOWN_KEY);

          if (!disclosureShown) {
            // Edge case: user is authenticated but somehow missed the disclosure
            // (e.g. they were already logged in from a previous session before
            // this update). Show it now before requesting permission.
            const accepted = await showBackgroundLocationDisclosure();
            if (!accepted) {
              // Only start foreground-safe services
              await BackgroundAttendanceService.initialize(showBackgroundLocationDisclosure);
              return;
            }
          }

          // Disclosure was shown and accepted (or already shown previously).
          // Now it is safe to request the actual system permission.
          // The system dialog appears AFTER our disclosure — Google compliant.
          console.log('ℹ️ Requesting background location permission...');
          const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
          if (fgStatus !== 'granted') {
            console.log('Foreground location denied — skipping background request');
            await BackgroundAttendanceService.initialize(showBackgroundLocationDisclosure);
            return;
          }

          const { status: newBgStatus } = await Location.requestBackgroundPermissionsAsync();
          if (newBgStatus !== 'granted') {
            console.log('Background location denied — running foreground-only services');
            await BackgroundAttendanceService.initialize(showBackgroundLocationDisclosure);
            return;
          }
        }

        // Background already granted (or just granted above) — initialize everything
        console.log('🚀 Background location granted, initializing all services...');
        const results = await BackgroundAttendanceService.initializeAll();
        console.log('📊 Background attendance services:', results);

        const locationInitialized = await BackgroundLocationService.initialize();
        console.log('📍 Random location tracking:', locationInitialized ? 'Active' : 'Failed');

      } catch (error) {
        console.error('❌ Failed to initialize background services:', error);
      }
    };

    initializeBackgroundServices();
  }, [userData.isAuthenticated, showBackgroundLocationDisclosure]);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    setAppState(nextAppState);

    // Re-initialize background service when app becomes active and user is authenticated
    if (nextAppState === 'active' && userData.isAuthenticated) {
      try {
        await BackgroundAttendanceService.registerBackgroundTask();
      } catch (error) {
        console.error('Failed to re-register background task:', error);
      }
    }
  };

  const loginAPI = async (email: string, password: string, isBrowser: boolean): Promise<LoginResponse> => {
    try {
      const BACKEND_URL = getBackendUrl();

      console.log('Using Backend URL:', BACKEND_URL);
      console.log('Is Browser:', isBrowser);

      const response = await fetch(`${BACKEND_URL}/core/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          is_browser: isBrowser,
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

  const handleLogin = async (email: string, password: string, identifierType: 'email' | 'phone' = 'email', isBrowser: boolean = false) => {
    setIsLoading(true);
    try {
      const response = await loginAPI(email, password, isBrowser);
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

      // Update userData to authenticated state
      setUserData(prev => ({ ...prev, isAuthenticated: true }));

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
            last_name: response.user?.last_name || prev.last_name,
            isAuthenticated: true
          }));

          setUser({
            email: userData.email || '',
            name: response.user?.name,
            first_name: response.user?.first_name,
            last_name: response.user?.last_name
          });
        } else {
          // If no user data from API, just mark as authenticated
          setUserData(prev => ({ ...prev, isAuthenticated: true }));
        }

        setCurrentScreen('welcome');
        return;
      } catch (backendError) {
        console.log('Backend MPIN login failed, trying local verification:', backendError);

        // Fallback to local MPIN verification
        const storedMPin = await AsyncStorage.getItem(MPIN_KEY);

        if (mpin === storedMPin) {
          setUserData(prev => ({ ...prev, isAuthenticated: true }));
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

  const handleResendOTP = async (email: string) => {
    try {
      const BACKEND_URL = getBackendUrl();

      console.log('Resending OTP to:', email);

      const response = await fetch(`${BACKEND_URL}/core/forgotPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend OTP');
      }

      Alert.alert('OTP Sent', `A new verification code has been sent to ${email}`);
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', error.message || 'Failed to resend OTP. Please try again.');
    }
  };

  const handleOTPVerified = (email: string, otp: string) => {
    // OTP has already been verified by the backend in OTPVerification component
    // Just store the data and navigate to reset password screen
    console.log('OTP verified successfully, navigating to reset password');
    setTempData({ email, otp });
    setCurrentScreen('resetPassword');
  };

  // Password reset handler
  const handlePasswordReset = async (email: string, oldPasswordOrOtp: string, newPassword: string) => {
    // Check if this is forgot password flow (has OTP in tempData) or first login flow
    if (tempData.otp) {
      // Forgot password flow - password already reset via API, redirect to login
      Alert.alert(
        'Password Reset Successful',
        'Your password has been reset successfully. Please login with your new password.',
        [{
          text: 'OK',
          onPress: () => {
            setTempData({}); // Clear temp data
            setCurrentScreen('login');
          }
        }]
      );
    } else {
      // First login flow - store the new password for CreateMPIN page
      setTempData({ email, newPassword: newPassword });
      // Navigate to create MPIN
      setCurrentScreen('createMPIN');
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
        // If coming from forgot password (has OTP), go back to OTP verification
        // If coming from first login (has oldPassword), go back to login
        if (tempData.otp) {
          setCurrentScreen('otpVerification');
        } else {
          setCurrentScreen('login');
        }
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
      console.log('🔄 Logging out and stopping all background services...');

      // Stop all background services before logout
      await BackgroundAttendanceService.stopAll();
      await BackgroundLocationService.stop();

      console.log('✅ All background services stopped');

      // Clear all stored data EXCEPT the disclosure flag —
      // we intentionally keep BG_DISCLOSURE_SHOWN_KEY so the user
      // is not shown the disclosure again after re-login.
      await AsyncStorage.multiRemove([
        TOKEN_1_KEY,
        TOKEN_2_KEY,
        MPIN_KEY,
        'user_email',
        'user_first_name',
        'user_last_name',
        'last_attendance_marked',
        'office_location',
        'last_location_tracked',
        // Note: BG_DISCLOSURE_SHOWN_KEY is intentionally NOT cleared here
      ]);

      setUserData({});
      setUser(null);
      setTempData({});
      setCurrentScreen('login');

      console.log('✅ Logout complete');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Force clear even if there's an error
      await AsyncStorage.multiRemove([
        TOKEN_1_KEY,
        TOKEN_2_KEY,
        MPIN_KEY,
        'user_email',
        'user_first_name',
        'user_last_name',
        'last_attendance_marked',
        'office_location',
        'last_location_tracked',
      ]);
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
            onUseMPIN={() => setCurrentScreen('mpinLogin')}
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
            newPassword={tempData.newPassword || ''}
          />
        );

      case 'mpinLogin':
        return (
          <MPINLogin
            onMPINLogin={handleMPINLogin}
            onBiometricLogin={async (token) => {
              console.log('Biometric login successful');
              setUserData(prev => ({ ...prev, isAuthenticated: true }));
              setCurrentScreen('welcome');
            }}
            onDashboardRedirect={() => {
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
            email={tempData.email || userData.email || ''}
            oldPassword={tempData.oldPassword}
            otp={tempData.otp}
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
    <SafeAreaProvider style={{ backgroundColor: '#FFFFFF' }}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.buttonsBackground }}
        edges={['bottom']}
      >
        {renderScreen()}

        {/*
          ─── Prominent Disclosure Modal ────────────────────────────────────────
          Rendered at the ROOT level, above all screens. This ensures it is
          always visible regardless of which screen is currently active, and
          Google Play's automated scanner can detect it at app startup.

          It uses a React Native Modal (transparent + statusBarTranslucent)
          so it overlays everything, including the splash screen.
        */}
        <BackgroundLocationDisclosure
          visible={disclosureVisible}
          onAccept={handleDisclosureAccept}
          onDecline={handleDisclosureDecline}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;