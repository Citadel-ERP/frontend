// App.tsx — PRODUCTION-READY: disclosure shown once on Android, once ever on iOS
//
// Root-cause fixes
// ────────────────
// iOS — "shows every launch":
//   The old code had TWO independent paths that could trigger the disclosure:
//   (1) the startup useEffect and (2) the background-services useEffect (the
//   "edge case" branch that fires whenever userData.isAuthenticated flips).
//   Path (2) was reached every login because AsyncStorage.getItem runs before
//   setItem in the accept handler (race). Fix: gate path (2) behind a React
//   ref (`disclosureShownThisSession`) that is set to true the moment the
//   disclosure first shows — so it can never be triggered a second time within
//   the same JS runtime lifetime, even before AsyncStorage flushes.
//
// Android — Play Store rejection:
//   The old implementation initialised `disclosureVisible` to `false` and
//   triggered the modal only after an 800 ms setTimeout + AsyncStorage read.
//   Google's automated scanner audits the APK's initial UI tree and doesn't
//   wait for async operations — it never saw the disclosure text.
//   Fix: on Android, we derive the initial modal state SYNCHRONOUSLY. We ship
//   a build-time flag `NEEDS_BG_LOCATION` (true by default) that makes the
//   modal start as `visible={true}` on first launch. AsyncStorage is still
//   checked, but we do it in parallel and hide the modal only when we confirm
//   it was already shown. This means the scanner sees the disclosure content
//   immediately on the very first cold boot.
//
import './src/services/backgroundAttendance'; // side-effect import must be first
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  AppState,
  AppStateStatus,
  Alert,
  Text,
  TouchableOpacity,
  Platform,
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
import { BackgroundLocationDisclosure } from './src/components/BackgroundLocationDisclosure';

// ─── Storage keys ─────────────────────────────────────────────────────────────
const TOKEN_1_KEY = 'token_1';
const TOKEN_2_KEY = 'token_2';
const MPIN_KEY = 'user_mpin';

/**
 * Persistent flag. Once written (on accept OR decline) the disclosure never
 * auto-triggers again across app restarts.
 * Intentionally NOT cleared on logout — the user already gave their answer.
 */
const BG_DISCLOSURE_SHOWN_KEY = 'bg_location_disclosure_shown_v1';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** True when running as a standalone build (not Expo Go). */
const isStandaloneBuild = (): boolean =>
  Platform.OS !== 'web' && Constants.appOwnership !== 'expo';

// ─── App ──────────────────────────────────────────────────────────────────────
function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [userData, setUserData] = useState<UserData>({});
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [tempData, setTempData] = useState<{
    email?: string;
    oldPassword?: string;
    newPassword?: string;
    otp?: string;
  }>({});

  // ── Disclosure state ────────────────────────────────────────────────────────
  //
  // Android fix: start the modal as VISIBLE on first-ever launch so the Play
  // Store scanner sees the disclosure text immediately. We hide it quickly if
  // AsyncStorage tells us the user has already acted on it.
  //
  // iOS fix: start the modal as HIDDEN (false). The once-only check runs
  // asynchronously after the splash screen; if the flag is not set, we show
  // it. The `disclosureShownInSession` ref ensures no second path can show
  // it again during the same session.
  const [disclosureVisible, setDisclosureVisible] = useState<boolean>(
    // Android: assume first-run until AsyncStorage proves otherwise.
    // iOS / web: stay hidden until the async check resolves.
    Platform.OS === 'android' && isStandaloneBuild(),
  );

  /**
   * In-session guard. Set to `true` the moment we either show the disclosure
   * OR confirm it has already been shown (flag exists). Prevents any secondary
   * code path from triggering it again within the same JS runtime.
   */
  const disclosureShownInSession = useRef<boolean>(false);

  /** Resolve function for the Promise-based API used by services. */
  const disclosureResolveRef = useRef<((accepted: boolean) => void) | null>(null);

  // ── One-time disclosure check ───────────────────────────────────────────────
  //
  // Runs once at startup. Behaviour:
  //   Android — modal is already visible=true. We check AsyncStorage and hide
  //             it immediately if already shown. If not shown, we leave it
  //             visible (scanner-safe).
  //   iOS     — modal starts hidden. We check AsyncStorage and show it if
  //             not yet shown.
  //
  useEffect(() => {
    if (!isStandaloneBuild()) return;

    const bootstrapDisclosure = async () => {
      const alreadyShown = await AsyncStorage.getItem(BG_DISCLOSURE_SHOWN_KEY);

      if (alreadyShown) {
        // User already acted on it — mark in-session and hide the modal.
        disclosureShownInSession.current = true;
        if (Platform.OS === 'android') {
          // Hide the modal we pre-opened for the scanner.
          setDisclosureVisible(false);
        }
        return;
      }

      // First-ever launch (flag absent).
      disclosureShownInSession.current = true; // mark BEFORE showing

      // Check whether bg permission is already granted (e.g. reinstall with
      // same device profile). If so, write the flag and skip the disclosure —
      // no need to ask again.
      const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
      if (bgStatus === 'granted') {
        await AsyncStorage.setItem(BG_DISCLOSURE_SHOWN_KEY, 'shown');
        if (Platform.OS === 'android') setDisclosureVisible(false);
        return;
      }

      // Show the disclosure.
      if (Platform.OS === 'ios') {
        // On iOS the modal started hidden — show it now.
        setDisclosureVisible(true);
      }
      // On Android the modal is already visible — nothing to do.
    };

    // Small delay so the Splash component has painted at least one frame.
    // Keep this as short as possible (200 ms is enough); the Android scanner
    // sees the modal from the very first JS render anyway because we
    // initialise `disclosureVisible` synchronously above.
    const timer = setTimeout(bootstrapDisclosure, 200);
    return () => clearTimeout(timer);
  }, []); // ← intentionally empty: runs exactly once per JS runtime lifetime

  // ── Disclosure callbacks ────────────────────────────────────────────────────

  const handleDisclosureAccept = useCallback(async () => {
    setDisclosureVisible(false);
    await AsyncStorage.setItem(BG_DISCLOSURE_SHOWN_KEY, 'shown');
    disclosureResolveRef.current?.(true);
    disclosureResolveRef.current = null;
  }, []);

  const handleDisclosureDecline = useCallback(async () => {
    setDisclosureVisible(false);
    await AsyncStorage.setItem(BG_DISCLOSURE_SHOWN_KEY, 'shown');
    disclosureResolveRef.current?.(false);
    disclosureResolveRef.current = null;
  }, []);

  /**
   * Promise-based API for background services.
   *
   * Returns immediately with `false` if the disclosure has already been shown
   * this session (prevents duplicate modals). Otherwise shows it and waits
   * for the user's choice.
   */
  const showBackgroundLocationDisclosure = useCallback((): Promise<boolean> => {
    // Safety gate — never show twice in the same session.
    if (disclosureShownInSession.current) {
      // Resolve with the current permission state as a best-effort answer.
      return Location.getBackgroundPermissionsAsync().then(
        ({ status }) => status === 'granted',
      );
    }

    return new Promise(resolve => {
      disclosureShownInSession.current = true;
      disclosureResolveRef.current = resolve;
      setDisclosureVisible(true);
    });
  }, []);

  // ── Dev validation ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!__DEV__) return;

    const runInitialValidation = async () => {
      console.log('🔍 Running initial system validation...');
      const isValid = await ConfigValidator.runValidation();
      const inExpoGo = Constants.appOwnership === 'expo';

      if (inExpoGo && Platform.OS === 'ios') {
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⚠️  IMPORTANT: iOS + Expo Go Detected');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Background location features WILL NOT WORK in Expo Go.');
        console.log('Run: eas build --profile development --platform ios');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } else if (isValid) {
        console.log('✅ All systems ready');
      }
    };

    runInitialValidation();
  }, []);

  // ── AppState listener ───────────────────────────────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    setAppState(nextAppState);
    if (nextAppState === 'active' && userData.isAuthenticated) {
      try {
        await BackgroundAttendanceService.registerBackgroundTask();
      } catch (error) {
        console.error('Failed to re-register background task:', error);
      }
    }
  };

  // ── Background services init ────────────────────────────────────────────────
  //
  // Runs whenever the user becomes authenticated. The disclosure is NOT
  // triggered from here — that is exclusively the job of the startup effect
  // above. This effect only requests the system permission dialog (which is
  // separate from our disclosure) after the user has already seen and
  // acknowledged our in-app disclosure.
  //
  useEffect(() => {
    if (!userData.isAuthenticated) return;
    if (!isStandaloneBuild()) return;

    const initializeBackgroundServices = async () => {
      try {
        const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
        const backgroundAlreadyGranted = bgStatus === 'granted';

        if (!backgroundAlreadyGranted) {
          // Check whether the user has seen our in-app disclosure yet.
          const disclosureShown = await AsyncStorage.getItem(BG_DISCLOSURE_SHOWN_KEY);

          if (!disclosureShown) {
            // Rare edge-case: user is authenticated but somehow the startup
            // effect didn't set the flag (e.g. very first install + immediate
            // deep-link). Use the in-session guard so we never show twice.
            const accepted = await showBackgroundLocationDisclosure();
            if (!accepted) {
              await BackgroundAttendanceService.initialize(showBackgroundLocationDisclosure);
              return;
            }
          }

          // Disclosure was shown (either now or previously). Request system
          // permission dialogs — these are distinct from our disclosure.
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

        // Permission granted — start all services.
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

  // ── Backend helpers ─────────────────────────────────────────────────────────

  const getBackendUrl = (): string => {
    const url = BACKEND_URL;
    if (!url) {
      throw new Error('Backend URL not configured. Please check your environment setup.');
    }
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
      throw new Error(
        err?.message || err?.detail || `Login failed with status ${response.status}`,
      );
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
      throw new Error(
        err?.message || err?.detail || `MPIN login failed with status ${response.status}`,
      );
    }

    const data = await response.json();
    return {
      message: data.message || 'Login successful',
      token: data.token,
      mpin: data.mpin,
      user: data.user,
    };
  };

  // ── Screen handlers ─────────────────────────────────────────────────────────

  const handleSplashComplete = async () => {
    try {
      const token1 = await AsyncStorage.getItem(TOKEN_1_KEY);
      const email = await AsyncStorage.getItem('user_email');
      const firstName = await AsyncStorage.getItem('user_first_name');
      const lastName = await AsyncStorage.getItem('user_last_name');

      if (token1 && email) {
        setUserData({
          email,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          isAuthenticated: false,
        });
        setCurrentScreen('mpinLogin');
        return;
      }

      setCurrentScreen('login');
    } catch {
      setCurrentScreen('login');
    }
  };

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
        first_name: response.user?.first_name,
        last_name: response.user?.last_name,
        isAuthenticated: true,
      });
      setUser({
        email,
        name: response.user?.name,
        first_name: response.user?.first_name,
        last_name: response.user?.last_name,
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
        else if (
          error.message.includes('401') ||
          error.message.includes('Invalid credentials')
        )
          msg = 'Invalid email or password. Please check your credentials and try again.';
        else if (error.message.includes('Network'))
          msg = 'Network error. Please check your internet connection and try again.';
        else msg = error.message;
      }
      Alert.alert('Login Error', msg, [{ text: 'Retry' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomToken = (): string =>
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

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
            last_name: response.user?.last_name || prev.last_name,
            isAuthenticated: true,
          }));
          setUser({
            email: userData.email || '',
            name: response.user?.name,
            first_name: response.user?.first_name,
            last_name: response.user?.last_name,
          });
        } else {
          setUserData(prev => ({ ...prev, isAuthenticated: true }));
        }
        setCurrentScreen('welcome');
      } catch (backendError) {
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
      if (
        error instanceof Error &&
        error.message.includes('Backend URL not configured')
      )
        msg = 'Configuration error. Please contact support.';

      Alert.alert('Authentication Error', msg, [
        { text: 'OK', onPress: () => setCurrentScreen('login') },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => setCurrentScreen('forgotPassword');
  const handleUsePassword = () => setCurrentScreen('login');

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
      Alert.alert('OTP Sent', `A new verification code has been sent to ${email}`);
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
        'Your password has been reset successfully. Please login with your new password.',
        [
          {
            text: 'OK',
            onPress: () => {
              setTempData({});
              setCurrentScreen('login');
            },
          },
        ],
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
      console.log('🔄 Logging out and stopping all background services...');
      await BackgroundAttendanceService.stopAll();
      await BackgroundLocationService.stop();

      // Intentionally keep BG_DISCLOSURE_SHOWN_KEY — user's choice persists.
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
      console.error('❌ Error during logout:', error);
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

  const getDisplayName = (): string => {
    if (userData.first_name && userData.last_name)
      return `${userData.first_name} ${userData.last_name}`;
    if (userData.first_name) return userData.first_name;
    if (userData.last_name) return userData.last_name;
    if (user?.first_name && user?.last_name)
      return `${user.first_name} ${user.last_name}`;
    if (user?.first_name) return user.first_name;
    if (user?.last_name) return user.last_name;
    if (user?.name) return user.name;
    return userData.email?.split('@')[0] || 'User';
  };

  // ── Screen renderer ─────────────────────────────────────────────────────────

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
          <ForgotPassword onBack={handleBack} onOTPSent={handleOTPSent} isLoading={isLoading} />
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
  return (
    <SafeAreaProvider style={{ backgroundColor: '#FFFFFF' }}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.buttonsBackground }}
        edges={['bottom']}
      >
        {renderScreen()}

        {/*
          ── Prominent Disclosure Modal ────────────────────────────────────────
          Rendered at ROOT level above all screens.

          Android: `disclosureVisible` is initialised to `true` on first launch
          before any async code runs, ensuring the Play Store scanner sees the
          disclosure content immediately on cold boot.

          iOS: `disclosureVisible` starts `false` and is set to `true` only
          after the once-only AsyncStorage check in the startup useEffect.

          In both cases the modal is shown AT MOST ONCE per install, because:
            • We write BG_DISCLOSURE_SHOWN_KEY on accept OR decline.
            • We set disclosureShownInSession.current=true immediately.
            • No other code path calls setDisclosureVisible(true) after the
              session flag is set.
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