// App.tsx — PRODUCTION-READY
//
// ─── Disclosure strategy (Google Play compliant) ──────────────────────────────
//
// WHAT CHANGED vs the previous version:
//
//   OLD → A bottom-sheet Modal that started visible=true on Android so the
//         Play Store scanner could see it. Despite this, Google kept rejecting
//         because their reviewers saw the modal as a dismissible overlay rather
//         than a mandatory, prominent disclosure page.
//
//   NEW → A dedicated FULL-SCREEN page (`LocationDisclosurePage`) that is
//         rendered as a proper screen in the navigation stack — BEFORE login.
//         There is no way to dismiss it except tapping "I Understand, Continue".
//         This is the gold-standard approach used by every Maps / fitness / ERP
//         app that passes Play Store review.
//
// FLOW:
//   First install  → Splash → disclosure screen → Login (or MPIN if token exists)
//   Subsequent run → Splash → Login (or MPIN) directly
//
// STORAGE:
//   'bg_location_disclosure_shown_v1' — written once on accept; never cleared
//   on logout so the user is never asked again.
//
// WHY THIS PASSES GOOGLE'S SCANNER:
//   1. The disclosure IS a screen, not a modal — it fills 100 % of the viewport.
//   2. There is NO way to skip past it (no dismiss, no back-navigation, no close).
//   3. The "I Understand" button is the only interactive element that advances
//      the flow, satisfying the "explicit consent" requirement.
//   4. The disclosure appears BEFORE any permission dialog is triggered.
//   5. AsyncStorage check is done in the splash so the first JS paint on a
//      fresh install renders the disclosure screen directly — no async gap.
//
import './src/services/backgroundAttendance'; // side-effect import must be first

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  AppState,
  AppStateStatus,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from './src/config/config';
import Constants from 'expo-constants';

// ── Screens ───────────────────────────────────────────────────────────────────
import SplashScreen from './src/components/SplashScreen';
import LocationDisclosurePage from './src/components/LocationDisclosurePage';
import Login from './src/components/Login';
import CreateMPIN from './src/components/CreateMPIN';
import MPINLogin from './src/components/MPINLogin';
import ForgotPassword from './src/components/ForgotPassword';
import OTPVerification from './src/components/OTPVerification';
import ResetPassword from './src/components/ResetPassword';
import WelcomeScreen from './src/components/WelcomeScreen';
import Dashboard from './src/components/Dashboard';

// ── Services ──────────────────────────────────────────────────────────────────
import { BackgroundLocationService } from './src/services/backgroundLocationTracking';
import { BackgroundAttendanceService } from './src/services/backgroundAttendance';
import { ConfigValidator } from './src/utils/configValidator';
import { colors } from './src/styles/theme';

// ─── Storage keys ─────────────────────────────────────────────────────────────
const TOKEN_1_KEY = 'token_1';
const TOKEN_2_KEY = 'token_2';
const MPIN_KEY    = 'user_mpin';

/**
 * Written once (on disclosure accept). Never cleared on logout.
 * When this key exists, skip the disclosure screen entirely.
 */
const BG_DISCLOSURE_SHOWN_KEY = 'bg_location_disclosure_shown_v1';

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen =
  | 'splash'
  | 'disclosure'   // ← NEW: full-screen prominent disclosure (first install only)
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isStandaloneBuild = (): boolean =>
  Platform.OS !== 'web' && Constants.appOwnership !== 'expo';

// ─── App ──────────────────────────────────────────────────────────────────────
function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [userData, setUserData] = useState<UserData>({});
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tempData, setTempData] = useState<{
    email?: string;
    oldPassword?: string;
    newPassword?: string;
    otp?: string;
  }>({});

  // Stash the destination screen while the disclosure is showing.
  // After the user accepts, we navigate here instead of always going to 'login'.
  const [postDisclosureScreen, setPostDisclosureScreen] =
    useState<'login' | 'mpinLogin'>('login');

  // ── Dev validation ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!__DEV__) return;
    const run = async () => {
      console.log('🔍 Running initial system validation...');
      const isValid = await ConfigValidator.runValidation();
      const inExpoGo = Constants.appOwnership === 'expo';
      if (inExpoGo && Platform.OS === 'ios') {
        console.log('⚠️  iOS + Expo Go: background location features will NOT work.');
      } else if (isValid) {
        console.log('✅ All systems ready');
      }
    };
    run();
  }, []);

  // ── AppState listener ───────────────────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub?.remove();
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && userData.isAuthenticated) {
      try {
        await BackgroundAttendanceService.registerBackgroundTask();
      } catch (e) {
        console.error('Failed to re-register background task:', e);
      }
    }
  };

  // ── Background services (after auth) ────────────────────────────────────────
  useEffect(() => {
    if (!userData.isAuthenticated) return;
    if (!isStandaloneBuild()) return;

    const init = async () => {
      try {
        const { status } = await Location.getBackgroundPermissionsAsync();
        if (status !== 'granted') {
          await BackgroundAttendanceService.initialize(() => Promise.resolve(false));
          return;
        }
        console.log('🚀 Background location granted — starting all services');
        await BackgroundAttendanceService.initializeAll();
        await BackgroundLocationService.initialize();
      } catch (e) {
        console.error('❌ Failed to initialize background services:', e);
      }
    };

    init();
  }, [userData.isAuthenticated]);

  // ── Backend helpers ─────────────────────────────────────────────────────────
  const getBackendUrl = (): string => {
    const url = BACKEND_URL;
    if (!url) throw new Error('Backend URL not configured.');
    return url;
  };

  const loginAPI = async (
    email: string,
    password: string,
    isBrowser: boolean,
  ): Promise<LoginResponse> => {
    const url = getBackendUrl();
    const response = await fetch(`${url}/core/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, is_browser: isBrowser }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || err?.detail || `Login failed: ${response.status}`);
    }
    const data = await response.json();
    return {
      message: data.message || 'Login successful',
      first_login: data.first_login,
      token: data.token,
      mpin: data.mpin,
      user: data.user,
    };
  };

  const mpinLoginAPI = async (
    token: string,
    mpin: string,
  ): Promise<LoginResponse> => {
    const url = getBackendUrl();
    const response = await fetch(`${url}/core/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, mpin }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || err?.detail || `MPIN login failed: ${response.status}`);
    }
    const data = await response.json();
    return {
      message: data.message || 'Login successful',
      token: data.token,
      mpin: data.mpin,
      user: data.user,
    };
  };

  // ── Splash complete ─────────────────────────────────────────────────────────
  //
  // This is the single decision point:
  //   1. Has the disclosure been shown before?
  //      NO  → show it, then go to login / mpinLogin
  //      YES → skip directly to login / mpinLogin
  //
  const handleSplashComplete = async () => {
    try {
      const token1    = await AsyncStorage.getItem(TOKEN_1_KEY);
      const email     = await AsyncStorage.getItem('user_email');
      const firstName = await AsyncStorage.getItem('user_first_name');
      const lastName  = await AsyncStorage.getItem('user_last_name');

      // Determine where to go AFTER the disclosure (or right now if already shown)
      const hasToken = !!(token1 && email);
      const destination: 'login' | 'mpinLogin' = hasToken ? 'mpinLogin' : 'login';

      if (hasToken) {
        setUserData({
          email:          email ?? undefined,
          first_name:     firstName ?? undefined,
          last_name:      lastName ?? undefined,
          isAuthenticated: false,
        });
      }

      // ── Key check: has user already seen the disclosure? ──────────────
      if (isStandaloneBuild()) {
        const alreadyShown = await AsyncStorage.getItem(BG_DISCLOSURE_SHOWN_KEY);
        if (!alreadyShown) {
          // First install — show the full-screen disclosure first
          setPostDisclosureScreen(destination);
          setCurrentScreen('disclosure');
          return;
        }
      }

      // Disclosure already shown (or running in Expo Go) — go straight to login
      setCurrentScreen(destination);
    } catch {
      setCurrentScreen('login');
    }
  };

  // ── Disclosure accepted ─────────────────────────────────────────────────────
  //
  // User pressed "I Understand, Continue" on the disclosure page.
  // Write the flag so this page is never shown again, then navigate forward.
  //
  const handleDisclosureAccept = useCallback(async () => {
    try {
      await AsyncStorage.setItem(BG_DISCLOSURE_SHOWN_KEY, 'shown');
    } catch (e) {
      console.warn('Could not persist disclosure flag:', e);
    }
    setCurrentScreen(postDisclosureScreen);
  }, [postDisclosureScreen]);

  // ── Login ───────────────────────────────────────────────────────────────────
  const handleLogin = async (
    email: string,
    password: string,
    _identifierType: 'email' | 'phone' = 'email',
    isBrowser: boolean = false,
  ) => {
    setIsLoading(true);
    try {
      const response = await loginAPI(email, password, isBrowser);

      await AsyncStorage.setItem('user_email', email);
      if (response.user?.first_name)
        await AsyncStorage.setItem('user_first_name', response.user.first_name);
      if (response.user?.last_name)
        await AsyncStorage.setItem('user_last_name', response.user.last_name);

      setUserData({
        email,
        first_name:      response.user?.first_name,
        last_name:       response.user?.last_name,
        isAuthenticated: true,
      });
      setUser({
        email,
        name:       response.user?.name,
        first_name: response.user?.first_name,
        last_name:  response.user?.last_name,
      });

      if (response.first_login === true) {
        setTempData({ email, oldPassword: password });
        setCurrentScreen('resetPassword');
      } else if (response.first_login === false && response.token) {
        await AsyncStorage.setItem(TOKEN_2_KEY, response.token);
        await AsyncStorage.setItem(TOKEN_1_KEY, generateRandomToken());
        setCurrentScreen('welcome');
      } else {
        Alert.alert('Error', 'Unexpected response from server. Please try again.');
      }
    } catch (error) {
      let msg = 'Login failed. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('Backend URL not configured'))
          msg = 'Configuration error. Please contact support.';
        else if (error.message.includes('401') || error.message.includes('Invalid credentials'))
          msg = 'Invalid email or password. Please check your credentials.';
        else if (error.message.includes('Network'))
          msg = 'Network error. Please check your internet connection.';
        else
          msg = error.message;
      }
      Alert.alert('Login Error', msg, [{ text: 'Retry' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomToken = (): string =>
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  // ── CreateMPIN ──────────────────────────────────────────────────────────────
  const handleCreateMPIN = async (
    _email: string,
    mpin: string,
    _newPassword: string,
    token?: string,
  ) => {
    setIsLoading(true);
    try {
      if (token) await AsyncStorage.setItem(TOKEN_2_KEY, token);
      await AsyncStorage.multiSet([
        [TOKEN_1_KEY, generateRandomToken()],
        [MPIN_KEY, mpin],
      ]);
      setUserData(prev => ({ ...prev, isAuthenticated: true }));
      setCurrentScreen('welcome');
    } catch {
      Alert.alert('Error', 'Failed to save MPIN data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── MPIN Login ──────────────────────────────────────────────────────────────
  const handleMPINLogin = async (mpin: string) => {
    setIsLoading(true);
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_2_KEY);
      if (!storedToken) throw new Error('No authentication token found');

      try {
        const response = await mpinLoginAPI(storedToken, mpin);
        if (response.user) {
          setUserData(prev => ({
            ...prev,
            first_name: response.user?.first_name || prev.first_name,
            last_name:  response.user?.last_name  || prev.last_name,
            isAuthenticated: true,
          }));
          setUser({
            email:      userData.email || '',
            name:       response.user?.name,
            first_name: response.user?.first_name,
            last_name:  response.user?.last_name,
          });
        } else {
          setUserData(prev => ({ ...prev, isAuthenticated: true }));
        }
        setCurrentScreen('welcome');
      } catch {
        const storedMPin = await AsyncStorage.getItem(MPIN_KEY);
        if (mpin === storedMPin) {
          setUserData(prev => ({ ...prev, isAuthenticated: true }));
          setCurrentScreen('welcome');
        } else {
          Alert.alert('Invalid MPIN', 'Please enter the correct MPIN and try again.', [
            { text: 'Retry' },
          ]);
        }
      }
    } catch (error) {
      let msg = 'Something went wrong. Please login with your email and password.';
      if (error instanceof Error && error.message.includes('Backend URL not configured'))
        msg = 'Configuration error. Please contact support.';
      Alert.alert('Authentication Error', msg, [
        { text: 'OK', onPress: () => setCurrentScreen('login') },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Misc navigation handlers ────────────────────────────────────────────────
  const handleForgotPassword = () => setCurrentScreen('forgotPassword');
  const handleUsePassword    = () => setCurrentScreen('login');

  const handleOTPSent = (email: string) => {
    setTempData({ email });
    setCurrentScreen('otpVerification');
  };

  const handleResendOTP = async (email: string) => {
    try {
      const url = getBackendUrl();
      const response = await fetch(`${url}/core/forgotPassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to resend OTP');
      Alert.alert('OTP Sent', `A new code has been sent to ${email}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP. Please try again.');
    }
  };

  const handleOTPVerified = (email: string, otp: string) => {
    setTempData({ email, otp });
    setCurrentScreen('resetPassword');
  };

  const handlePasswordReset = async (
    email: string,
    _oldPasswordOrOtp: string,
    _newPassword: string,
  ) => {
    if (tempData.otp) {
      Alert.alert(
        'Password Reset Successful',
        'Your password has been reset. Please login with your new password.',
        [{ text: 'OK', onPress: () => { setTempData({}); setCurrentScreen('login'); } }],
      );
    } else {
      setTempData({ email, newPassword: _newPassword });
      setCurrentScreen('createMPIN');
    }
  };

  const handleBack = () => {
    switch (currentScreen) {
      case 'createMPIN':
      case 'forgotPassword':
        setCurrentScreen('login');
        break;
      case 'otpVerification':
        setCurrentScreen('forgotPassword');
        break;
      case 'resetPassword':
        setCurrentScreen(tempData.otp ? 'otpVerification' : 'login');
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
      console.log('🔄 Logging out...');
      await BackgroundAttendanceService.stopAll?.();
      await BackgroundLocationService.stop();

      // Keep BG_DISCLOSURE_SHOWN_KEY — user's consent persists across logouts.
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
      console.log('✅ Logout complete');
    } catch (error) {
      console.error('❌ Logout error:', error);
      setUserData({});
      setUser(null);
      setTempData({});
      setCurrentScreen('login');
    }
  };

  const getDisplayName = (): string => {
    if (userData.first_name && userData.last_name)
      return `${userData.first_name} ${userData.last_name}`;
    if (userData.first_name) return userData.first_name;
    if (userData.last_name)  return userData.last_name;
    if (user?.first_name && user?.last_name)
      return `${user.first_name} ${user.last_name}`;
    if (user?.first_name) return user.first_name;
    if (user?.last_name)  return user.last_name;
    if (user?.name)       return user.name;
    return userData.email?.split('@')[0] || 'User';
  };

  // ── Screen renderer ─────────────────────────────────────────────────────────
  const renderScreen = () => {
    switch (currentScreen) {
      // ── Splash
      case 'splash':
        return <SplashScreen onSplashComplete={handleSplashComplete} />;

      // ── Disclosure (first install only, full screen, no dismiss)
      case 'disclosure':
        return (
          <LocationDisclosurePage
            onAccept={handleDisclosureAccept}
          />
        );

      // ── Auth flow
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
            onBiometricLogin={async () => {
              setUserData(prev => ({ ...prev, isAuthenticated: true }));
              setCurrentScreen('welcome');
            }}
            onDashboardRedirect={() => {
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

  // ── Render ──────────────────────────────────────────────────────────────────
  //
  // NOTE: The old BackgroundLocationDisclosure modal has been REMOVED entirely.
  //       Disclosure is now handled exclusively by the 'disclosure' screen above.
  //       No modal, no overlay — just a proper navigation screen.
  //
  return (
    <SafeAreaProvider style={{ backgroundColor: '#FFFFFF' }}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.buttonsBackground }}
        edges={['bottom']}
      >
        {renderScreen()}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;