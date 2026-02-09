// Dashboard.tsx - UPDATED VERSION with Real-time Reminder Updates
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  Modal,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  TextInput,
  Alert,
  LayoutAnimation
} from 'react-native';
import { ImageStyle } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as NotificationsExpo from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Import all pages
import Profile from './Profile';
import HR from './hr/HR';
import Cab from './cab/Cab';
import Driver from './driver/Driver';
import BDT from './bdt/BDT';
import Medical from './Medical';
import ScoutBoy from './scout_boy/ScoutBoy';
import SiteManager from './site_manager/SiteManager';
import Reminder from './reminder/Reminder';
import BUP from './bup/BUP';
import { CitadelHub } from './citadel_hub/CitadelHub';
// import {CitadelHubMobile} from './citadel_hub/CitadelHubMobile';
import Settings from './Settings';
import AttendanceWrapper from './AttendanceWrapper';
import EmployeeManagement from './employee_management/EmployeeManagement';
import Notifications from './Notifications';
import { ValidationScreen } from './ValidationScreen';
import DriverManager from './driver_manager/DriverManager';
import HR_Manager from './hr_manager/HR_Manager';
import HREmployeeManager from './hr_employee_management/hr_employee_management';

// Import components
import AllModulesModal from './dashboard/allModules';
import QuickActions from './dashboard/quickActions';
import UpcomingReminder from './dashboard/upcomingReminder';
import WorkStatistics from './dashboard/workStatistics';
import UpcomingEvents from './dashboard/upcomingEvents';
import BottomBar from './dashboard/bottomBar';

import { BackgroundAttendanceService } from '../services/backgroundAttendance';
import { GeofencingService } from '../services/geofencing';
import { AttendanceUtils } from '../services/attendanceUtils';
import { BACKEND_URL, BACKEND_URL_WEBSOCKET } from '../config/config';

const { width, height } = Dimensions.get('window');
const TOKEN_2_KEY = 'token_2';

// Import helper functions and types
import {
  UserData,
  Module,
  ReminderItem,
  UpcomingEvent,
  ApiResponse,
  ActivePage,
  lightColors,
  darkColors,
  getInitials,
  formatEventDate,
  formatAnniversaryYears,
  getModuleColor
} from './DashboardTypes';
import { handleModulePress, saveLastOpenedModule, getDisplayModules } from './DashboardHelpers';
import { HamburgerMenu } from './DashboardComponents';

// Configure notification handler
NotificationsExpo.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ============================================================================
// MODULE CONFIGURATION - Icons, Colors, and Display Names
// ============================================================================
interface ModuleConfig {
  icon: string;
  iconFamily: 'FontAwesome5' | 'Ionicons' | 'MaterialCommunityIcons';
  gradientColors: readonly [string, string, ...string[]];  // CHANGE THIS LINE
  displayName: string;
}

const MODULE_CONFIGURATIONS: Record<string, ModuleConfig> = {
  // Attendance
  'attendance': {
    icon: 'book-open',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#00d285', '#00b872'],
    displayName: 'Attendance'
  },
  'Attendance': {
    icon: 'book-open',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#00d285', '#00b872'],
    displayName: 'Attendance'
  },

  // Car/Cab modules
  'cab': {
    icon: 'car',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#ff5e7a', '#ff4168'],
    displayName: 'Car'
  },
  'Cab': {
    icon: 'car',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#ff5e7a', '#ff4168'],
    displayName: 'Car'
  },
  'VehicleAdmin': {
    icon: 'car-side',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#ff5e7a', '#ff4168'],
    displayName: 'Vehicle Admin'
  },

  // HR modules
  'hr': {
    icon: 'users',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#ffb157', '#ff9d3f'],
    displayName: 'HR'
  },
  'HR': {
    icon: 'users',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#ffb157', '#ff9d3f'],
    displayName: 'HR'
  },
  'hr_employee_management': {
    icon: 'user-tie',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#ff4168', '#ff4168'],
    displayName: 'Employees'
  },
  'hr_manager': {
    icon: 'user-shield',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#ff9d3f', '#ff8c2e'],
    displayName: 'HR Management'
  },
  'EmployeesAdmin': {
    icon: 'users-cog',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#ffb157', '#ff9d3f'],
    displayName: 'Employees'
  },

  // Driver modules
  'driver': {
    icon: 'steering-wheel',
    iconFamily: 'MaterialCommunityIcons',
    gradientColors: ['#6c5ce7', '#5f4fd1'],
    displayName: 'Driver'
  },
  'driver_manager': {
    icon: 'id-card',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#6c5ce7', '#5f4fd1'],
    displayName: 'Duty Manager'
  },

  // Site Manager
  'site_manager': {
    icon: 'hard-hat',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#fd79a8', '#e84393'],
    displayName: 'Database'
  },

  // BUP
  'bup': {
    icon: 'chart-line',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#00b894', '#00a680'],
    displayName: 'BUP'
  },

  // BDT
  'bdt': {
    icon: 'exchange-alt',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#0984e3', '#0773d1'],
    displayName: 'Transaction'
  },

  // Medical/Mediclaim
  'medical': {
    icon: 'medkit',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#d63031', '#c92a2b'],
    displayName: 'Mediclaim'
  },
  'mediclaim': {
    icon: 'medkit',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#d63031', '#c92a2b'],
    displayName: 'Mediclaim'
  },

  // Scout Boy
  'scout_boy': {
    icon: 'user-alt',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#fdcb6e', '#f6b93b'],
    displayName: 'Scout'
  },

  // Reminder
  'reminder': {
    icon: 'bell',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#a29bfe', '#6c5ce7'],
    displayName: 'Reminder'
  },

  // Employee Management
  'employee_management': {
    icon: 'users',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#74b9ff', '#0984e3'],
    displayName: 'Employees'
  },

  // Default fallback
  'default': {
    icon: 'cube',
    iconFamily: 'FontAwesome5',
    gradientColors: ['#636e72', '#546E7A'],
    displayName: 'Module'
  }
};

// Helper function to get module config
const getModuleConfig = (moduleUniqueName: string): ModuleConfig => {
  return MODULE_CONFIGURATIONS[moduleUniqueName] || MODULE_CONFIGURATIONS['default'];
};

// ============================================================================
// COMPLETE MODULE NAVIGATION MAP
// Maps backend module_unique_name to ActivePage type
// ============================================================================
const COMPLETE_MODULE_MAP: Record<string, ActivePage> = {
  // Core modules
  'attendance': 'attendance',
  'Attendance': 'attendance',

  // HR modules
  'hr': 'hr',
  'HR': 'hr',
  'hr_employee_management': 'hrEmployeeManager',
  'hr_manager': 'hrManager',

  // Transport modules
  'cab': 'cab',
  'Cab': 'cab',
  'driver': 'driver',
  'driver_manager': 'driverManager',

  // Other modules
  'bdt': 'bdt',
  'medical': 'medical',
  'mediclaim': 'medical',
  'scout_boy': 'scoutBoy',
  'scoutboy': 'scoutBoy',
  'reminder': 'reminder',
  'bup': 'bup',
  'business update': 'bup',
  'site_manager': 'siteManager',
  'employee_management': 'employeeManagement',

  // Special cases - Profile with modals
  'profile': 'profile',
  'profile-assets': 'profile',
  'profile-payslips': 'profile',
  'profile-documents': 'profile',
};

// Main Dashboard Component
function DashboardContent({ onLogout }: { onLogout: () => void }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  const [token, setToken] = useState<string | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<NotificationsExpo.Notification | undefined>(undefined);
  const notificationListener = useRef<NotificationsExpo.Subscription | undefined>(undefined);
  const responseListener = useRef<NotificationsExpo.Subscription | undefined>(undefined);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([]);
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastOpenedModules, setLastOpenedModules] = useState<Module[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [attendanceKey, setAttendanceKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hoursWorked, setHoursWorked] = useState<number[]>([]);
  const [overtimeHours, setOvertimeHours] = useState<number[]>([]);

  // ============================================================================
  // NEW: Dynamic Tile Configuration State
  // ============================================================================
  const [bigTile, setBigTile] = useState<string>('attendance');
  const [smallTile1, setSmallTile1] = useState<string>('cab');
  const [smallTile2, setSmallTile2] = useState<string>('hr');

  // Page visibility states
  const [showAttendance, setShowAttendance] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHR, setShowHR] = useState(false);
  const [showCab, setShowCab] = useState(false);
  const [showDriver, setShowDriver] = useState(false);
  const [showBDT, setShowBDT] = useState(false);
  const [showMedical, setShowMedical] = useState(false);
  const [showScoutBoy, setShowScoutBoy] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [showBUP, setShowBUP] = useState(false);
  const [showSiteManager, setShowSiteManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEmployeeManagement, setShowEmployeeManagement] = useState(false);
  const [showHREmployeeManager, setShowHREmployeeManagement] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showChatRoom, setShowChatRoom] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedChatRoom, setSelectedChatRoom] = useState<any>(null);
  const [showDriverManager, setShowDriverManager] = useState(false);
  const [showHrManager, setShowHrManager] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Active page state for web layout
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');

  // Menu state
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('Dashboard');
  const [activeNavItem, setActiveNavItem] = useState('home');

  // Theme state
  const [isDark, setIsDark] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // All modules modal
  const [allModulesVisible, setAllModulesVisible] = useState(false);

  // Search state for modules
  const [searchQuery, setSearchQuery] = useState('');

  // Refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Notification badge state
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const badgeCountRef = useRef(0);

  // Special navigation state for Profile assets modal
  const [profileModalToOpen, setProfileModalToOpen] = useState<string | null>(null);

  // Animations
  const circleScale = useRef(new Animated.Value(0)).current;
  const switchToggle = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isWeb ? 0 : -300)).current;
  const bulgeAnim = useRef(new Animated.Value(0)).current;

  // Current theme colors - memoized
  const currentColors = useMemo(() =>
    isDark ? darkColors : lightColors,
    [isDark]
  );

  // Dashboard theme - memoized
  const theme = useMemo(() => ({
    bgColor: isDark ? '#050b18' : '#ece5dd',
    cardBg: isDark ? '#111a2d' : '#f6f6f6',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    accentBlue: isDark ? '#008069' : '#008069',
    navBg: isDark ? '#0a111f' : '#ffffff',
  }), [isDark]);

  // ============================================================================
  // MEMOIZED CALLBACKS & HANDLERS
  // ============================================================================

  // Badge update callback
  const handleBadgeUpdate = useCallback((count: number) => {
    if (badgeCountRef.current !== count) {
      badgeCountRef.current = count;
      setUnreadNotificationCount(count);
      console.log(`🔔 Badge count updated: ${count}`);
    }
  }, []);

  // ============================================================================
  // FIXED NAVIGATION HANDLER FOR NOTIFICATIONS
  // ============================================================================
  const handleNavigateFromNotification = useCallback((
    moduleIdentifier: string,
    extraData?: { openModal?: string }
  ) => {
    console.log(`📍 [NAVIGATION] Starting navigation to: "${moduleIdentifier}"`, extraData);

    // Normalize the identifier
    const normalized = moduleIdentifier.toLowerCase().trim();
    console.log(`📍 [NAVIGATION] Normalized: "${normalized}"`);

    // Special cases: Profile with specific modals
    const profileModalMap: Record<string, string> = {
      'profile-assets': 'assets',
      'profile-payslips': 'payslips',
      'profile-documents': 'documents',
    };

    if (profileModalMap[normalized] || (normalized === 'profile' && extraData?.openModal)) {
      const modalToOpen = profileModalMap[normalized] || extraData?.openModal;
      console.log(`📍 [NAVIGATION] Special case: Profile with ${modalToOpen} modal`);

      if (isWeb) {
        setActivePage('profile');
        setProfileModalToOpen(modalToOpen || null);
      } else {
        setProfileModalToOpen(modalToOpen || null);
        setShowProfile(true);
      }
      return;
    }

    // Look up the target page from our complete map
    const targetPage = COMPLETE_MODULE_MAP[normalized];

    if (!targetPage) {
      console.warn(`⚠️ [NAVIGATION] No mapping found for: "${normalized}"`);
      console.log(`📋 [NAVIGATION] Available mappings:`, Object.keys(COMPLETE_MODULE_MAP));
      Alert.alert('Navigation Error', `Cannot navigate to "${moduleIdentifier}". Module not found.`);
      return;
    }

    console.log(`✅ [NAVIGATION] Found mapping: "${normalized}" → "${targetPage}"`);

    // Navigate based on platform
    if (isWeb) {
      console.log(`📍 [WEB] Setting active page to: ${targetPage}`);
      setActivePage(targetPage);
    } else {
      console.log(`📱 [MOBILE] Opening screen: ${targetPage}`);

      // Mobile navigation - comprehensive mapping
      const navigationActions: Record<ActivePage, () => void> = {
        'dashboard': () => { /* Already on dashboard */ },
        'attendance': () => {
          setAttendanceKey(prev => prev + 1);
          setShowAttendance(true);
        },
        'hr': () => setShowHR(true),
        'cab': () => setShowCab(true),
        'driver': () => setShowDriver(true),
        'bdt': () => setShowBDT(true),
        'medical': () => setShowMedical(true),
        'scoutBoy': () => setShowScoutBoy(true),
        'reminder': () => setShowReminder(true),
        'bup': () => setShowBUP(true),
        'siteManager': () => setShowSiteManager(true),
        'employeeManagement': () => setShowEmployeeManagement(true),
        'hrEmployeeManager': () => setShowHREmployeeManagement(true),
        'driverManager': () => setShowDriverManager(true),
        'hrManager': () => setShowHrManager(true),
        'profile': () => setShowProfile(true),
        'settings': () => setShowSettings(true),
        'notifications': () => setShowNotifications(true),
        'validation': () => setShowValidation(true),
        'privacy': () => Alert.alert('Coming Soon', 'Privacy Policy'),
        'messages': () => Alert.alert('Coming Soon', 'Messages'),
        'chat': () => setShowChat(true),
        'chatRoom': () => { /* Needs chat room data */ },
      };

      const action = navigationActions[targetPage];
      if (action) {
        action();
        console.log(`✅ [MOBILE] Navigation complete: ${targetPage}`);
      } else {
        console.error(`❌ [MOBILE] No action defined for: ${targetPage}`);
      }
    }
  }, [isWeb]);

  // ============================================================================
  // NEW: Callback for real-time reminder updates
  // ============================================================================


  // Function to refresh user data from backend
  const refreshUserData = useCallback(async () => {
    if (!token) return;

    try {
      console.log('🔄 Refreshing user data...');
      setRefreshing(true);
      const response = await fetch(`${BACKEND_URL}/core/getUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data: ApiResponse = await response.json();
        if (data.message === "Get modules successful") {
          const transformedUserData: UserData = {
            ...data.user,
            profile_picture: data.user.profile_picture || undefined
          };

          setUserData(transformedUserData);
          setModules(data.modules || []);

          // ============================================================================
          // NEW: Extract dynamic tile configuration from backend
          // ============================================================================
          if (data.big_tile) {
            setBigTile(data.big_tile);
            console.log('🎯 Big tile set to:', data.big_tile);
          }
          if (data.small_tile_1) {
            setSmallTile1(data.small_tile_1);
            console.log('🎯 Small tile 1 set to:', data.small_tile_1);
          }
          if (data.small_tile_2) {
            setSmallTile2(data.small_tile_2);
            console.log('🎯 Small tile 2 set to:', data.small_tile_2);
          }

          await AsyncStorage.setItem('user_data', JSON.stringify(transformedUserData));
          await AsyncStorage.setItem('is_driver', JSON.stringify(data.is_driver || false));
          if (data.city) {
            await AsyncStorage.setItem('city', data.city);
          }

          setUpcomingBirthdays(data.upcoming_birthdays || []);
          setUpcomingAnniversaries(data.upcoming_anniversary || []);

          if (Array.isArray(data.upcoming_reminder)) {
            setReminders(data.upcoming_reminder);
          } else if (data.upcoming_reminder && typeof data.upcoming_reminder === 'object') {
            setReminders([data.upcoming_reminder]);
          } else {
            setReminders([]);
          }

          setHoursWorked(data.hours_worked_last_7_attendance || []);
          setOvertimeHours(data.overtime_hours || []);

          const events = getUpcomingEvents(data.upcoming_birthdays || [], data.upcoming_anniversary || []);
          setUpcomingEvents(events);

          const storedModules = await AsyncStorage.getItem('last_opened_modules');
          if (storedModules) {
            let modulesArray = JSON.parse(storedModules);
            if (data.modules && data.modules.length > 0) {
              modulesArray = modulesArray.map((storedModule: any) => {
                const backendModule = data.modules.find(
                  (m: any) => m.module_unique_name === storedModule.module_unique_name
                );
                if (backendModule) {
                  return {
                    ...storedModule,
                    iconUrl: backendModule.module_icon,
                    title: backendModule.module_name.charAt(0).toUpperCase() +
                      backendModule.module_name.slice(1).replace('_', ' ')
                  };
                }
                return storedModule;
              });
              const uniqueModules: any[] = [];
              const seen = new Set();
              for (const module of modulesArray) {
                if (!seen.has(module.module_unique_name)) {
                  seen.add(module.module_unique_name);
                  uniqueModules.push(module);
                }
              }
              modulesArray = uniqueModules.slice(0, 4);
              await AsyncStorage.setItem('last_opened_modules', JSON.stringify(modulesArray));
              setLastOpenedModules(modulesArray);
            }
          }

          console.log('✅ User data refreshed successfully');
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  const handleReminderUpdate = useCallback(async () => {
    console.log('🔄 Refreshing reminders via callback...');
    await refreshUserData();
  }, [refreshUserData]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Auto-refresh when returning from Profile screen
  useEffect(() => {
    if (!showProfile && userData && token) {
      refreshUserData();
      // Reset profile modal state
      setProfileModalToOpen(null);
    }
  }, [showProfile]);

  // Debug logging function
  const debugLog = useCallback(async (message: string, data?: any) => {
    console.log(message, data);
    try {
      const logs = await AsyncStorage.getItem('debug_logs') || '[]';
      const logArray = JSON.parse(logs);
      logArray.push({
        timestamp: new Date().toISOString(),
        message,
        data: data ? JSON.stringify(data) : null
      });
      const recentLogs = logArray.slice(-50);
      await AsyncStorage.setItem('debug_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.error('Error storing debug log:', error);
    }
  }, []);

  // Error logging function for push token errors
  const logPushTokenError = useCallback(async (error: string, details?: any) => {
    console.error('[Push Token Error]', error, details);
    try {
      const userToken = await AsyncStorage.getItem(TOKEN_2_KEY);
      if (!userToken) {
        console.error('Cannot log error: No user token available');
        return;
      }

      const errorPayload = {
        token: userToken,
        error: `[Push Token] ${error}`,
        details: details ? JSON.stringify(details) : null,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        deviceInfo: {
          isDevice: Device.isDevice,
          modelName: Device.modelName,
          osVersion: Device.osVersion,
        }
      };

      const response = await fetch(`${BACKEND_URL}/core/logError`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorPayload),
      });

      if (response.ok) {
        console.log('✅ Error logged to backend successfully');
      } else {
        console.error('❌ Failed to log error to backend:', response.status);
      }
    } catch (logError) {
      console.error('❌ Failed to send error log to backend:', logError);
    }
  }, []);

  // Setup push notifications
  useEffect(() => {
    let isMounted = true;

    const setupNotifications = async () => {
      if (!token) {
        await debugLog('Setup aborted: No user token');
        return;
      }

      try {
        await debugLog('Starting notification setup', { token: !!token });

        const pushToken = await registerForPushNotificationsAsync();
        await debugLog('Registration result', { pushToken: !!pushToken, isMounted });

        if (pushToken && isMounted) {
          setExpoPushToken(pushToken);
          await debugLog('Calling sendTokenToBackend');
          await sendTokenToBackend(pushToken, token);
        } else if (!pushToken) {
          await logPushTokenError('Push token registration returned undefined', {
            isMounted,
            hasToken: !!token
          });
        }

        try {
          notificationListener.current = NotificationsExpo.addNotificationReceivedListener(notification => {
            debugLog('📱 Notification received in foreground', notification);
            setNotification(notification);

            const data = notification.request.content.data;
            if (data?.page === 'autoMarkAttendance') {
              debugLog('🎯 AUTO-MARK: Detected autoMarkAttendance from notification');
              AttendanceUtils.executeAttendanceFlow('manual', true);
            }
          });

          responseListener.current = NotificationsExpo.addNotificationResponseReceivedListener(response => {
            debugLog('👆 Notification tapped', response);
            const data = response.notification.request.content.data;

            if (data?.page === 'autoMarkAttendance') {
              AttendanceUtils.executeAttendanceFlow('manual', true);
            } else if (data?.go_to) {
              // Use go_to for navigation
              handleNavigateFromNotification(data.go_to as string);
            } else if (data?.page) {
              // Fallback to page
              handleNavigateFromNotification(data.page as string);
            }
          });
        } catch (listenerError: any) {
          await logPushTokenError('Failed to setup notification listeners', {
            error: listenerError.message,
            stack: listenerError.stack
          });
        }

        try {
          const lastNotificationResponse = await NotificationsExpo.getLastNotificationResponseAsync();
          if (lastNotificationResponse) {
            debugLog('📬 App opened from notification', lastNotificationResponse);
            const data = lastNotificationResponse.notification.request.content.data;

            if (data?.page === 'autoMarkAttendance') {
              setTimeout(() => {
                AttendanceUtils.executeAttendanceFlow('manual', true);
              }, 1000);
            } else if (data?.go_to) {
              setTimeout(() => {
                handleNavigateFromNotification(data.go_to as string);
              }, 500);
            } else if (data?.page) {
              setTimeout(() => {
                handleNavigateFromNotification(data.page as string);
              }, 500);
            }
          }
        } catch (lastNotifError: any) {
          await logPushTokenError('Failed to get last notification response', {
            error: lastNotifError.message,
            stack: lastNotifError.stack
          });
        }
      } catch (error: any) {
        await debugLog('Error in setupNotifications', error.message);
        await logPushTokenError('Unhandled error in setupNotifications', {
          error: error.message,
          stack: error.stack,
          name: error.name
        });
      }
    };

    if (!isWeb) {
      setupNotifications().catch(async (error: any) => {
        await logPushTokenError('setupNotifications promise rejected', {
          error: error.message,
          stack: error.stack
        });
      });
    }

    return () => {
      isMounted = false;

      try {
        notificationListener.current?.remove();
        responseListener.current?.remove();
      } catch (cleanupError: any) {
        console.error('Error cleaning up notification listeners:', cleanupError);
        logPushTokenError('Error during notification listener cleanup', {
          error: cleanupError.message,
          stack: cleanupError.stack
        });
      }
    };
  }, [token, handleNavigateFromNotification]);

  // Function to register for push notifications
  const registerForPushNotificationsAsync = useCallback(async () => {
    let token;
    try {
      await debugLog('[Push Token] Starting registration...');

      if (!Device.isDevice) {
        const errorMsg = 'Not a physical device - push notifications unavailable';
        await debugLog('[Push Token] Not a physical device');
        await logPushTokenError(errorMsg, { isDevice: Device.isDevice });
        Alert.alert('Debug', errorMsg);
        return undefined;
      }

      await debugLog('[Push Token] Device check passed');

      if (Platform.OS === 'android') {
        try {
          await NotificationsExpo.setNotificationChannelAsync('default', {
            name: 'default',
            importance: NotificationsExpo.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2D3748',
          });
          await debugLog('[Push Token] Notification channel created');
        } catch (channelError: any) {
          await logPushTokenError('Failed to create notification channel', {
            error: channelError.message,
            stack: channelError.stack
          });
          throw channelError;
        }
      }

      try {
        const { status: existingStatus } = await NotificationsExpo.getPermissionsAsync();
        await debugLog('[Push Token] Existing permission status', existingStatus);

        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await NotificationsExpo.requestPermissionsAsync();
          finalStatus = status;
          await debugLog('[Push Token] New permission status', status);
        }

        if (finalStatus !== 'granted') {
          const errorMsg = 'Permission denied for notifications';
          await debugLog('[Push Token] Permission denied');
          await logPushTokenError(errorMsg, { status: finalStatus });
          Alert.alert('Permission Denied', 'Please enable notifications in settings');
          return undefined;
        }
      } catch (permissionError: any) {
        await logPushTokenError('Failed to get/request notification permissions', {
          error: permissionError.message,
          stack: permissionError.stack
        });
        throw permissionError;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId
        || Constants.easConfig?.projectId;

      await debugLog('[Push Token] Project ID', projectId);

      if (!projectId) {
        const errorMsg = 'No project ID found in configuration';
        await debugLog('[Push Token] ERROR: No project ID found');
        await logPushTokenError(errorMsg, {
          expoConfig: Constants.expoConfig?.extra,
          easConfig: Constants.easConfig
        });
        Alert.alert(
          'Configuration Error',
          'Project ID missing. Please contact support.'
        );
        return undefined;
      }

      try {
        await debugLog('[Push Token] Getting token for project', projectId);
        const tokenData = await NotificationsExpo.getExpoPushTokenAsync({
          projectId
        });
        token = tokenData.data;
        await debugLog('[Push Token] Success', token);
        return token;
      } catch (tokenError: any) {
        await logPushTokenError('Failed to get Expo push token', {
          error: tokenError.message,
          stack: tokenError.stack,
          projectId: projectId
        });
        throw tokenError;
      }
    } catch (error: any) {
      await debugLog('[Push Token Error]', error.message);
      await logPushTokenError('Unhandled error in registerForPushNotificationsAsync', {
        error: error.message,
        stack: error.stack,
        name: error.name
      });
      return undefined;
    }
  }, [debugLog, logPushTokenError]);

  // Function to send token to backend
  const sendTokenToBackend = useCallback(async (expoToken: string, userToken: string) => {
    await debugLog('=== SENDING TOKEN TO BACKEND ===');
    await debugLog('Expo Token', expoToken);
    await debugLog('User Token exists', !!userToken);

    if (!expoToken || !userToken) {
      const errorMsg = 'Missing tokens for backend submission';
      await debugLog('ERROR: Missing tokens', { expoToken: !!expoToken, userToken: !!userToken });
      await logPushTokenError(errorMsg, {
        hasExpoToken: !!expoToken,
        hasUserToken: !!userToken
      });
      return;
    }

    try {
      await debugLog('Making request to', `${BACKEND_URL}/core/modifyToken`);
      const requestBody = {
        token: userToken,
        expo_token: expoToken,
      };
      await debugLog('Request body', requestBody);

      const response = await fetch(`${BACKEND_URL}/core/modifyToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      await debugLog('Response status', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        await logPushTokenError('Backend rejected token registration', {
          status: response.status,
          statusText: response.statusText,
          responseBody: errorText
        });
      }

      const data = await response.json();
      await debugLog('Backend response', data);

      if (response.ok) {
        await debugLog('✅ Push token registered successfully');
        await AsyncStorage.setItem('expo_push_token', expoToken);
      } else {
        await debugLog('❌ Failed to register push token', data.message);
        await logPushTokenError('Failed to register push token with backend', {
          message: data.message,
          response: data
        });
      }
    } catch (error: any) {
      await debugLog('❌ Network error', error.message);
      await logPushTokenError('Network error while sending token to backend', {
        error: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  }, [debugLog, logPushTokenError]);

  // ============================================================================
  // FETCH USER DATA - Only runs once on mount
  // ============================================================================
  useEffect(() => {
    let isMounted = true;

    const fetchToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_2_KEY);
        if (isMounted) {
          setToken(storedToken);
        }
        return storedToken;
      } catch (error) {
        console.error('Error getting token:', error);
        return null;
      }
    };

    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem(TOKEN_2_KEY);
        if (!token) return;

        if (isMounted) {
          setLoading(true);
        }

        const response = await fetch(`${BACKEND_URL}/core/getUser`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!isMounted) return;

        if (response.ok) {
          const data: ApiResponse = await response.json();
          if (data.message === "Get modules successful") {
            const transformedUserData: UserData = {
              ...data.user,
              profile_picture: data.user.profile_picture || undefined
            };

            if (isMounted) {
              setUserData(transformedUserData);
              setModules(data.modules || []);

              // ============================================================================
              // NEW: Extract dynamic tile configuration from backend
              // ============================================================================
              if (data.big_tile) {
                setBigTile(data.big_tile);
                console.log('🎯 Big tile set to:', data.big_tile);
              }
              if (data.small_tile_1) {
                setSmallTile1(data.small_tile_1);
                console.log('🎯 Small tile 1 set to:', data.small_tile_1);
              }
              if (data.small_tile_2) {
                setSmallTile2(data.small_tile_2);
                console.log('🎯 Small tile 2 set to:', data.small_tile_2);
              }
            }

            try {
              await AsyncStorage.setItem('user_data', JSON.stringify(transformedUserData));
              await AsyncStorage.setItem('is_driver', JSON.stringify(data.is_driver || false));
              if (data.city) {
                await AsyncStorage.setItem('city', data.city);
              }
              console.log('✅ User data, city, and driver status saved to AsyncStorage');
            } catch (storageError) {
              console.error('❌ Error saving to AsyncStorage:', storageError);
            }

            if (isMounted) {
              setUpcomingBirthdays(data.upcoming_birthdays || []);
              setUpcomingAnniversaries(data.upcoming_anniversary || []);

              if (Array.isArray(data.upcoming_reminder)) {
                setReminders(data.upcoming_reminder);
              } else if (data.upcoming_reminder && typeof data.upcoming_reminder === 'object') {
                setReminders([data.upcoming_reminder]);
              } else {
                setReminders([]);
              }

              setHoursWorked(data.hours_worked_last_7_attendance || []);
              setOvertimeHours(data.overtime_hours || []);

              const events = getUpcomingEvents(data.upcoming_birthdays || [], data.upcoming_anniversary || []);
              console.log('Upcoming events:', events);
              setUpcomingEvents(events);

              const storedModules = await AsyncStorage.getItem('last_opened_modules');
              if (storedModules) {
                let modulesArray = JSON.parse(storedModules);
                if (data.modules && data.modules.length > 0) {
                  modulesArray = modulesArray.map((storedModule: any) => {
                    const backendModule = data.modules.find(
                      (m: any) => m.module_unique_name === storedModule.module_unique_name
                    );
                    if (backendModule) {
                      return {
                        ...storedModule,
                        iconUrl: backendModule.module_icon,
                        title: backendModule.module_name.charAt(0).toUpperCase() +
                          backendModule.module_name.slice(1).replace('_', ' ')
                      };
                    }
                    return storedModule;
                  });
                  const uniqueModules: any[] = [];
                  const seen = new Set();
                  for (const module of modulesArray) {
                    if (!seen.has(module.module_unique_name)) {
                      seen.add(module.module_unique_name);
                      uniqueModules.push(module);
                    }
                  }
                  modulesArray = uniqueModules.slice(0, 4);
                  await AsyncStorage.setItem('last_opened_modules', JSON.stringify(modulesArray));
                  setLastOpenedModules(modulesArray);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'Failed to fetch user data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchToken();
    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize background services
  useEffect(() => {
    if (!token || !userData || isWeb) return;

    let isMounted = true;

    const initializeBackgroundServices = async () => {
      try {
        console.log('🚀 Initializing hybrid attendance system...');

        const permissions = await AttendanceUtils.requestLocationPermissions();

        if (!permissions.foreground) {
          console.log('❌ Location permissions not granted - attendance features disabled');
          return;
        }

        const isExpoGo = Constants.appOwnership === 'expo';
        if (isExpoGo) {
          console.log('⚠️ Running in Expo Go - background services limited');
          return;
        }

        const pollingInitialized = await BackgroundAttendanceService.initialize();
        console.log(pollingInitialized
          ? '✅ Polling service: Active'
          : '❌ Polling service: Failed'
        );

        if (permissions.background) {
          const geofencingInitialized = await GeofencingService.initialize();
          console.log(geofencingInitialized
            ? '✅ Geofencing service: Active'
            : '⚠️ Geofencing service: Inactive'
          );
        } else {
          console.log('⚠️ Background permission not granted - geofencing disabled');
          console.log('   Polling will still work within working hours');
        }

        console.log('✅ Hybrid attendance system initialized');
      } catch (error) {
        console.warn('⚠️ Failed to initialize attendance services:', error);
      }
    };

    initializeBackgroundServices();

    return () => {
      isMounted = false;
    };
  }, [token, userData, isWeb]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getUpcomingEvents = useCallback((birthdays: any[], anniversaries: any[]): UpcomingEvent[] => {
    console.log('🎉 Getting upcoming events...', birthdays, anniversaries);
    const events: UpcomingEvent[] = [];
    const today = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(today.getMonth() + 3);

    birthdays.forEach(user => {
      if (user.birth_date) {
        const birthDate = new Date(user.birth_date);
        const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        if (nextBirthday < today) {
          nextBirthday.setFullYear(today.getFullYear() + 1);
        }
        if (nextBirthday <= threeMonthsFromNow) {
          events.push({
            full_name: user.full_name,
            date: user.birth_date,
            type: 'birthday'
          });
        }
      }
    });

    anniversaries.forEach(user => {
      if (user.joining_date) {
        const anniversaryDate = new Date(user.joining_date);
        const nextAnniversary = new Date(today.getFullYear(), anniversaryDate.getMonth(), anniversaryDate.getDate());
        if (nextAnniversary < today) {
          nextAnniversary.setFullYear(today.getFullYear() + 1);
        }
        if (nextAnniversary <= threeMonthsFromNow) {
          const years = today.getFullYear() - anniversaryDate.getFullYear();
          events.push({
            full_name: user.full_name,
            date: user.joining_date,
            type: 'anniversary',
            years: years,
            anniversaryYears: years + 1
          });
        }
      }
    });

    events.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      const thisYearA = new Date(today.getFullYear(), dateA.getMonth(), dateA.getDate());
      const thisYearB = new Date(today.getFullYear(), dateB.getMonth(), dateB.getDate());
      const eventDateA = thisYearA >= today ? thisYearA : new Date(today.getFullYear() + 1, dateA.getMonth(), dateA.getDate());
      const eventDateB = thisYearB >= today ? thisYearB : new Date(today.getFullYear() + 1, dateB.getMonth(), dateB.getDate());
      return eventDateA.getTime() - eventDateB.getTime();
    });

    console.log(`Found ${events.length} upcoming events within next 3 months`);
    return events.slice(0, 3);
  }, []);

  // ============================================================================
  // UI HANDLERS
  // ============================================================================

  const handleThemeToggle = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    Animated.timing(switchToggle, {
      toValue: isDark ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    Animated.timing(circleScale, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      setIsDark(!isDark);
      circleScale.setValue(0);
      setIsAnimating(false);
    });
  }, [isAnimating, isDark, circleScale, switchToggle]);

  const handleModulePressWrapper = useCallback((moduleName: string, moduleUniqueName?: string) => {
    handleModulePress({
      moduleName,
      moduleUniqueName,
      modules,
      saveLastOpenedModule: (module) => saveLastOpenedModule(module, modules, setLastOpenedModules),
      setActivePage,
      isWeb,
      setAttendanceKey,
      setShowAttendance,
      setShowHR,
      setShowCab,
      setShowDriver,
      setShowBDT,
      setShowMedical,
      setShowScoutBoy,
      setShowReminder,
      setShowBUP,
      setShowSiteManager,
      setShowEmployeeManagement,
      setShowHREmployeeManagement,
      setShowDriverManager,
      setShowHrManager,
      Alert
    });
  }, [modules, isWeb]);

  const handleBackFromPage = useCallback(() => {
    if (isWeb) {
      setActivePage('dashboard');
    } else {
      setShowAttendance(false);
      setShowProfile(false);
      setShowHR(false);
      setShowCab(false);
      setShowDriver(false);
      setShowBDT(false);
      setShowMedical(false);
      setShowScoutBoy(false);
      setShowReminder(false);
      setShowBUP(false);
      setShowSiteManager(false);
      setShowNotifications(false);
      setShowSettings(false);
      setShowEmployeeManagement(false);
      setShowHREmployeeManagement(false);
      setShowChat(false);
      setShowChatRoom(false);
      setShowValidation(false);
      setShowDriverManager(false);
      setShowHrManager(false);
      setActiveMenuItem('Dashboard');
    }
    // Reset profile modal state
    setProfileModalToOpen(null);
  }, [isWeb]);

  const handleLogout = useCallback(async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          if (!isWeb) {
            await BackgroundAttendanceService.stop();
            await GeofencingService.stop();
            console.log('✅ All attendance services stopped');
          }
          onLogout();
        }
      },
    ]);
  }, [isWeb, onLogout]);

  const openMenu = useCallback(() => {
    if (isWeb) return;
    setIsMenuVisible(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, [isWeb, slideAnim]);

  const closeMenu = useCallback(() => {
    if (!isWeb) {
      Animated.timing(slideAnim, { toValue: -300, duration: 300, useNativeDriver: true }).start(() => setIsMenuVisible(false));
    } else {
      setIsMenuVisible(false);
    }
  }, [isWeb, slideAnim]);

  const handleNavItemPress = useCallback((navItem: string) => {
    setActiveNavItem(navItem);
    setActiveNavItem(navItem);
    if (navItem === 'message') {
      if (isWeb) {
        setActivePage('messages');
      } else {
        setShowChat(true);  // This opens CitadelHub on mobile
      }
    } else if (navItem === 'hr') {

      if (isWeb) {
        setActivePage('hr');
      } else {
        setShowHR(true);
      }
    } else if (navItem === 'support') {
      Alert.alert('Support', 'Support feature will be available soon!');
    } else if (navItem !== 'home') {
      Alert.alert('Coming Soon', `${navItem} feature will be available soon!`);
    }
  }, [isWeb]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const displayModules = useMemo(() => getDisplayModules(modules), [modules]);

  const filteredModules = useMemo(() =>
    displayModules.filter(module =>
      module.title.toLowerCase().includes(searchQuery.toLowerCase())
    ), [displayModules, searchQuery]
  );

  const drawerMenuItems = useMemo(() => [
    { id: 'profile', title: 'Profile', icon: 'user', color: '#3B82F6' },
    { id: 'settings', title: 'Settings', icon: 'settings', color: '#3B82F6' },
    { id: 'notifications', title: 'Notifications', icon: 'notification', color: '#F59E0B' },
    { id: 'privacy', title: 'Privacy Policy', icon: 'shield', color: '#1E40AF' },
    { id: 'messages', title: 'Messages', icon: 'chatbubbles', color: '#10B981' },
  ], []);

  const handleMenuItemPress = useCallback((item: any) => {
    setActiveMenuItem(item.title);
    closeMenu();
    const pageMap: Record<string, ActivePage> = {
      'profile': 'profile',
      'settings': 'settings',
      'validation': 'validation',
      'notifications': 'notifications',
      'logout': 'dashboard'
    };

    const targetPage = pageMap[item.id];
    if (targetPage) {
      if (isWeb) {
        setActivePage(targetPage);
      } else {
        const mobileHandlers: Record<ActivePage, () => void> = {
          'profile': () => setShowProfile(true),
          'settings': () => setShowSettings(true),
          'notifications': () => setShowNotifications(true),
          'validation': () => setShowValidation(true),
          'dashboard': () => { },
          'attendance': () => { },
          'hr': () => { },
          'cab': () => { },
          'driver': () => { },
          'bdt': () => { },
          'medical': () => { },
          'scoutBoy': () => { },
          'reminder': () => { },
          'bup': () => { },
          'siteManager': () => { },
          'employeeManagement': () => { },
          'driverManager': () => { },
          'hrManager': () => { },
          'hrEmployeeManager': () => { },
          'privacy': () => Alert.alert('Coming Soon', 'Privacy Policy feature will be available soon!'),
          'messages': () => Alert.alert('Coming Soon', 'Messages feature will be available soon!'),
          'chat': () => { },
          'chatRoom': () => { }
        };
        mobileHandlers[targetPage]();
      }
    }
  }, [isWeb, closeMenu]);

  const maxRadius = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight);
  const circleSize = circleScale.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxRadius * 2.5],
  });

  const switchTranslate = switchToggle.interpolate({
    inputRange: [0, 1],
    outputRange: [4, screenWidth * 0.43 - 54],
  });

  // ============================================================================
  // NEW: Dynamic Tile Rendering Component
  // ============================================================================
  const renderModuleTile = (moduleUniqueName: string, size: 'big' | 'small') => {
    const config = getModuleConfig(moduleUniqueName);
    const IconComponent = config.iconFamily === 'Ionicons' ? Ionicons :
      config.iconFamily === 'MaterialCommunityIcons' ? MaterialCommunityIcons :
        FontAwesome5;

    const iconSize = size === 'big' ? 22 : 18;
    const containerStyle = size === 'big' ? styles.moduleAttendance : styles.moduleSmall;

    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={() => handleModulePressWrapper(config.displayName, moduleUniqueName)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={config.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.moduleGradient}
        >
          <Ionicons
            name="arrow-up"
            size={size === 'big' ? 18 : 16}
            color="white"
            style={[styles.moduleArrow, { transform: [{ rotate: '45deg' }] }]}
          />
          <View style={styles.moduleIconCircle}>
            <IconComponent name={config.icon as any} size={iconSize} color="white" />
          </View>
          <Text style={styles.moduleTitle}>{config.displayName}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // ============================================================================
  // RENDER STATES
  // ============================================================================

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bgColor }, isWeb && styles.loadingContainerWeb]}>
        <ActivityIndicator size="large" color={theme.accentBlue} />
        <Text style={[styles.loadingText, { color: theme.textMain }, isWeb && styles.loadingTextWeb]}>Loading...</Text>
      </View>
    );
  }

  if (error || !userData) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: currentColors.headerBg }, isWeb && styles.containerWeb]}>
        <StatusBar barStyle={isDark ? "light-content" : "light-content"} backgroundColor={currentColors.headerBg} />
        <Text style={[styles.errorText, { color: currentColors.text }, isWeb && styles.errorTextWeb]}>Failed to load data</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: currentColors.info }]}>
          <Text style={[styles.retryButtonText, { color: currentColors.white }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showValidation && !isWeb) {
    return (
      <ValidationScreen onBack={handleBackFromPage} />
    );
  }

  // ============================================================================
  // MOBILE PAGE RENDERS
  // ============================================================================

  if (!isWeb) {
    if (showChatRoom && selectedChatRoom) {
      return (
        <CitadelHub
          apiBaseUrl={BACKEND_URL}
          wsBaseUrl={BACKEND_URL_WEBSOCKET}
          token={token}
          currentUser={userData}
        />
      );
    }

    if (showChat) {
      return (
        <CitadelHub
          apiBaseUrl={BACKEND_URL}
          wsBaseUrl={BACKEND_URL_WEBSOCKET}
          token={token}
          onBack={handleBackFromPage}
          currentUser={userData}
        />
      );
    }

    if (showNotifications) {
      return (
        <Notifications
          onBack={handleBackFromPage}
          isDark={isDark}
          onBadgeUpdate={handleBadgeUpdate}
          onNavigateToModule={handleNavigateFromNotification}
        />
      );
    }

    if (showDriverManager) {
      return (
        <DriverManager onBack={handleBackFromPage} />
      );
    }

    if (showHrManager) {
      return (
        <HR_Manager onBack={handleBackFromPage} />
      );
    }

    if (showAttendance) {
      return (
        <AttendanceWrapper key={attendanceKey} onBack={handleBackFromPage} attendanceKey={attendanceKey} />
      );
    }

    if (showProfile) {
      return (
        <Profile
          onBack={handleBackFromPage}
          userData={userData}
          onProfileUpdate={(updatedData: UserData) => {
            const completeData: UserData = {
              ...userData!,
              ...updatedData
            };
            setUserData(completeData);
            refreshUserData();
          }}
          initialModalToOpen={profileModalToOpen}
        />
      );
    }

    if (showHR) {
      return (
        <HR onBack={handleBackFromPage} />
      );
    }

    if (showCab) {
      return (
        <Cab onBack={handleBackFromPage} />
      );
    }

    if (showDriver) {
      return (
        <Driver onBack={handleBackFromPage} />
      );
    }

    if (showBDT) {
      return (
        <BDT onBack={handleBackFromPage} />
      );
    }

    if (showMedical) {
      return (
        <Medical onBack={handleBackFromPage} />
      );
    }

    if (showScoutBoy) {
      return (
        <ScoutBoy onBack={handleBackFromPage} />
      );
    }

    // ============================================================================
    // UPDATED: Reminder component with callback for real-time updates
    // ============================================================================
    if (showReminder) {
      return (
        <Reminder
          onBack={handleBackFromPage}
          onReminderUpdate={handleReminderUpdate}  // Add this prop
        />
      );
    }

    if (showBUP) {
      return (
        <BUP onBack={handleBackFromPage} />
      );
    }

    if (showSiteManager) {
      return (
        <SiteManager onBack={handleBackFromPage} />
      );
    }

    if (showSettings) {
      return (
        <Settings onBack={handleBackFromPage} />
      );
    }

    if (showEmployeeManagement) {
      return (
        <EmployeeManagement onBack={handleBackFromPage} />
      );
    }

    if (showHREmployeeManager) {
      return (
        <HREmployeeManager onBack={handleBackFromPage} />
      );
    }
  }

  // ============================================================================
  // MAIN DASHBOARD RENDER
  // ============================================================================

  return (
    <View style={[styles.safeContainer, { backgroundColor: theme.bgColor }, isWeb && styles.safeContainerWeb]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'light-content'}
        backgroundColor={currentColors.headerBg}
        translucent={false}
      />

      <HamburgerMenu
        isVisible={isMenuVisible}
        onClose={closeMenu}
        userData={userData}
        menuItems={drawerMenuItems}
        activeMenuItem={activeMenuItem}
        onMenuItemPress={handleMenuItemPress}
        onLogout={handleLogout}
        isDark={isDark}
        slideAnim={slideAnim}
        getInitials={getInitials}
        currentColors={currentColors}
      />

      <AllModulesModal
        isVisible={allModulesVisible}
        onClose={() => setAllModulesVisible(false)}
        modules={filteredModules}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onModulePress={handleModulePressWrapper}
        theme={theme}
        currentColors={currentColors}
      />

      <View style={[styles.mainContent, isWeb && styles.mainContentWeb]}>
        {isAnimating && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.circleOverlay,
              {
                opacity: circleScale,
                transform: [{ scale: circleScale }],
                backgroundColor: isDark ? '#e7e6e5' : '#050b18',
              },
            ]}
          />
        )}

        {isWeb ? (
          // WEB LAYOUT
          <View style={[styles.webContainer, { backgroundColor: theme.bgColor }]}>
            {/* Left Side - User Profile & Navigation */}
            <View style={[styles.webLeftSide, { backgroundColor: theme.navBg }]}>
              <View style={[styles.webUserProfile, { backgroundColor: theme.navBg }]}>
                {userData?.profile_picture ? (
                  <Image
                    source={{ uri: userData.profile_picture }}
                    style={styles.webUserAvatar}
                  />
                ) : (
                  <View style={[styles.webAvatarPlaceholder, { backgroundColor: currentColors.primaryBlue }]}>
                    <Text style={styles.webAvatarText}>
                      {getInitials(userData?.full_name || 'User')}
                    </Text>
                  </View>
                )}
                <View style={styles.webUserInfo}>
                  <Text style={[styles.webUserName, { color: theme.textMain }]}>
                    {userData?.full_name || 'User'}
                  </Text>
                  <Text style={[styles.webUserDesignation, { color: theme.textSub }]}>
                    {userData?.designation || 'Employee'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.webSettingsButton, { backgroundColor: theme.navBg }]}
                  onPress={() => setActivePage('settings')}
                >
                  <Ionicons name="settings-outline" size={24} color={theme.textMain} />
                </TouchableOpacity>
              </View>

              <View style={styles.webNavigation}>
                <TouchableOpacity
                  style={[
                    styles.webNavItem,
                    { backgroundColor: theme.navBg },
                    activePage === 'dashboard' && styles.webNavItemActive
                  ]}
                  onPress={() => {
                    setActiveNavItem('home');
                    setActivePage('dashboard');
                  }}
                >
                  <Ionicons
                    name="home"
                    size={24}
                    color={activePage === 'dashboard' ? currentColors.primaryBlue : theme.textSub}
                  />
                  <Text style={[
                    styles.webNavText,
                    {
                      color: activePage === 'dashboard' ? currentColors.primaryBlue : theme.textSub,
                      fontWeight: activePage === 'dashboard' ? '600' : '400'
                    }
                  ]}>
                    Home
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.webNavItem,
                    { backgroundColor: theme.navBg },
                    activePage === 'profile' && styles.webNavItemActive
                  ]}
                  onPress={() => {
                    setActiveNavItem('profile');
                    setActivePage('profile');
                  }}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={24}
                    color={activePage === 'profile' ? currentColors.primaryBlue : theme.textSub}
                  />
                  <Text style={[
                    styles.webNavText,
                    {
                      color: activePage === 'profile' ? currentColors.primaryBlue : theme.textSub,
                      fontWeight: activePage === 'profile' ? '600' : '400'
                    }
                  ]}>
                    Profile
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.webNavItem,
                    { backgroundColor: theme.navBg },
                    activePage === 'settings' && styles.webNavItemActive
                  ]}
                  onPress={() => {
                    setActiveNavItem('settings');
                    setActivePage('settings');
                  }}
                >
                  <Ionicons
                    name="settings-outline"
                    size={24}
                    color={activePage === 'settings' ? currentColors.primaryBlue : theme.textSub}
                  />
                  <Text style={[
                    styles.webNavText,
                    {
                      color: activePage === 'settings' ? currentColors.primaryBlue : theme.textSub,
                      fontWeight: activePage === 'settings' ? '600' : '400'
                    }
                  ]}>
                    Settings
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.webNavItem,
                    { backgroundColor: theme.navBg },
                    activePage === 'notifications' && styles.webNavItemActive
                  ]}
                  onPress={() => {
                    setActiveNavItem('notifications');
                    setActivePage('notifications');
                  }}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={24}
                    color={activePage === 'notifications' ? currentColors.warning : theme.textSub}
                  />
                  <Text style={[
                    styles.webNavText,
                    {
                      color: activePage === 'notifications' ? currentColors.warning : theme.textSub,
                      fontWeight: activePage === 'notifications' ? '600' : '400'
                    }
                  ]}>
                    Notifications
                    {unreadNotificationCount > 0 && (
                      <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</Text>
                      </View>
                    )}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.webNavItem,
                    { backgroundColor: theme.navBg },
                    activePage === 'privacy' && styles.webNavItemActive
                  ]}
                  onPress={() => {
                    setActiveNavItem('privacy');
                    setActivePage('privacy');
                  }}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={24}
                    color={activePage === 'privacy' ? '#1E40AF' : theme.textSub}
                  />
                  <Text style={[
                    styles.webNavText,
                    {
                      color: activePage === 'privacy' ? '#1E40AF' : theme.textSub,
                      fontWeight: activePage === 'privacy' ? '600' : '400'
                    }
                  ]}>
                    Privacy Policy
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.webNavItem,
                    { backgroundColor: theme.navBg },
                    activePage === 'messages' && styles.webNavItemActive
                  ]}
                  onPress={() => {
                    setActiveNavItem('messages');
                    setActivePage('messages');
                  }}
                >
                  <Ionicons
                    name="chatbubbles-outline"
                    size={24}
                    color={activePage === 'messages' ? currentColors.success : theme.textSub}
                  />
                  <Text style={[
                    styles.webNavText,
                    {
                      color: activePage === 'messages' ? currentColors.success : theme.textSub,
                      fontWeight: activePage === 'messages' ? '600' : '400'
                    }
                  ]}>
                    Messages
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Center Content */}
            <ScrollView
              style={[styles.webCenterContent, { backgroundColor: theme.bgColor }]}
              showsVerticalScrollIndicator={false}
            >
              {activePage === 'dashboard' ? (
                <View style={styles.dashboardContainer}>
                  <LinearGradient
                    colors={isDark ? ['#000D24', '#000D24'] : ['#4A5568', '#2D3748']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.webHeader}
                  >
                    <Image
                      source={require('../assets/bg.jpeg')}
                      style={styles.webHeaderImage}
                      resizeMode="cover"
                    />
                    <View style={[styles.webHeaderOverlay, {
                      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.3)'
                    }]} />
                    <View style={styles.webHeaderContent}>
                      <View style={styles.webTopNav}>
                        <View style={styles.webLogoContainer}>
                          <Text style={styles.webLogoText}>CITADEL</Text>
                        </View>
                      </View>
                      <View style={{ marginTop: 40 }}>
                        <Text style={styles.webWelcomeText}>Welcome back!</Text>
                        <Text style={styles.webEmployeeText}>
                          {userData?.first_name + ' ' + userData?.last_name || 'User'}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>

                  <View style={{ paddingHorizontal: 20 }}>
                    <QuickActions
                      lastOpenedModules={lastOpenedModules}
                      modules={modules}
                      theme={theme}
                      handleModulePress={handleModulePressWrapper}
                    />
                  </View>

                  <View style={{ paddingHorizontal: 20 }}>
                    <UpcomingReminder
                      reminders={reminders}
                      theme={theme}
                      currentColors={currentColors}
                      onPress={() => handleModulePressWrapper('Reminder')}
                    />
                  </View>

                  <View style={{ paddingHorizontal: 20 }}>
                    <WorkStatistics
                      hoursWorked={hoursWorked}
                      overtimeHours={overtimeHours}
                      userData={userData}
                      theme={theme}
                      currentColors={currentColors}
                    />
                  </View>

                  <View style={{ paddingHorizontal: 20 }}>
                    <UpcomingEvents
                      upcomingEvents={upcomingEvents}
                      theme={theme}
                      currentColors={currentColors}
                      getInitials={getInitials}
                      formatEventDate={formatEventDate}
                      formatAnniversaryYears={formatAnniversaryYears}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.embeddedPageWrapper}>
                  <View style={styles.webEmbeddedPage}>
                    {activePage === 'profile' && (
                      <Profile
                        onBack={() => setActivePage('dashboard')}
                        userData={userData}
                        onProfileUpdate={(updatedData) => {
                          setUserData(updatedData);
                          refreshUserData();
                        }}
                        initialModalToOpen={profileModalToOpen}
                      />
                    )}
                    {activePage === 'settings' && (
                      <Settings onBack={() => setActivePage('dashboard')} isDark={isDark} />
                    )}
                    {activePage === 'notifications' && (
                      <Notifications
                        onBack={() => setActivePage('dashboard')}
                        isDark={isDark}
                        onBadgeUpdate={handleBadgeUpdate}
                        onNavigateToModule={handleNavigateFromNotification}
                      />
                    )}
                    {activePage === 'privacy' && (
                      <View style={[styles.moduleContainer, { backgroundColor: theme.cardBg }]}>
                        <Text style={[styles.privacyText, { color: theme.textMain }]}>
                          Privacy Policy Content
                        </Text>
                      </View>
                    )}
                    {activePage === 'messages' && (
                      <CitadelHub
                        apiBaseUrl={BACKEND_URL}
                        wsBaseUrl={BACKEND_URL_WEBSOCKET}
                        token={token}
                        currentUser={userData}
                      />
                    )}

                    {activePage === 'attendance' && (
                      <AttendanceWrapper
                        onBack={() => setActivePage('dashboard')}
                        attendanceKey={attendanceKey}
                      />
                    )}
                    {activePage === 'hr' && (
                      <HR onBack={() => setActivePage('dashboard')} />
                    )}
                    {activePage === 'cab' && (
                      <Cab onBack={() => setActivePage('dashboard')} />
                    )}
                    {activePage === 'driver' && (
                      <Driver onBack={() => setActivePage('dashboard')} />
                    )}
                    {activePage === 'bdt' && (
                      <BDT onBack={() => setActivePage('dashboard')} />
                    )}
                    {activePage === 'medical' && (
                      <Medical onBack={() => setActivePage('dashboard')} />
                    )}
                    {activePage === 'scoutBoy' && (
                      <ScoutBoy onBack={() => setActivePage('dashboard')} />
                    )}
                    {/* ============================================================================
                    // UPDATED: Reminder component with callback for real-time updates
                    // ============================================================================ */}
                    {activePage === 'reminder' && (
                      <Reminder
                        onBack={() => setActivePage('dashboard')}
                        onReminderUpdate={handleReminderUpdate}  // Add this prop
                      />
                    )}
                    {activePage === 'bup' && (
                      <BUP onBack={() => setActivePage('dashboard')} />
                    )}
                    {activePage === 'siteManager' && (
                      <SiteManager onBack={() => setActivePage('dashboard')} />
                    )}
                    {activePage === 'employeeManagement' && (
                      <EmployeeManagement onBack={() => setActivePage('dashboard')} />
                    )}
                    {activePage === 'hrEmployeeManager' && (
                      <HREmployeeManager onBack={() => setActivePage('dashboard')} />
                    )}
                    {activePage === 'driverManager' && (
                      <DriverManager onBack={() => setActivePage('dashboard')} />
                    )}
                    {activePage === 'hrManager' && (
                      <HR_Manager onBack={() => setActivePage('dashboard')} />
                    )}
                    {activePage === 'validation' && (
                      <ValidationScreen onBack={() => setActivePage('dashboard')} />
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Right Side - All Modules Grid */}
            <View style={[styles.webRightSide, { backgroundColor: theme.navBg }]}>
              <View style={styles.modulesHeader}>
                <Text style={[styles.modulesGridTitle, { color: theme.textMain }]}>
                  All Modules
                </Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={refreshUserData}
                  disabled={refreshing}
                >
                  <Ionicons
                    name="refresh"
                    size={20}
                    color={refreshing ? theme.textSub : theme.accentBlue}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.modulesGridScroll}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modulesGridContainer}>
                  {filteredModules.map((module, index) => (
                    <TouchableOpacity
                      key={`${module.module_unique_name}-${index}`}
                      style={[styles.moduleGridItem, { backgroundColor: theme.cardBg }]}
                      onPress={() => handleModulePressWrapper(module.title, module.module_unique_name)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.moduleGridIconContainer,
                        { backgroundColor: theme.cardBg === '#111a2d' ? 'rgba(255, 255, 255, 0.05)' : '#f8f9fa' }
                      ]}>
                        <Image
                          source={{ uri: module.iconUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }}
                          style={styles.moduleGridIcon}
                          resizeMode="contain"
                        />
                      </View>
                      <Text
                        style={[styles.moduleGridTitle, { color: theme.textMain }]}
                        numberOfLines={2}
                      >
                        {module.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        ) : (
          // MOBILE LAYOUT
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <LinearGradient
              colors={isDark ? ['#000D24', '#000D24'] : ['#4A5568', '#2D3748']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerBanner}
            >
              <Image
                source={require('../assets/background_dashboard.jpeg')}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  opacity: 1,
                }}
                resizeMode="cover"
              />
              <View style={[styles.headerOverlay, {
                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.3)'
              }]} />
              <View style={[styles.headerContent, { paddingTop: Platform.OS === 'ios' ? 40 : 20 }]}>
                <View style={[styles.topNav, { marginBottom: 10, marginTop: Platform.OS === 'ios' ? 10 : 20 }]}>
                  <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
                    {[1, 2, 3].map(i => (
                      <View key={i} style={[styles.menuLine, { backgroundColor: 'white' }]} />
                    ))}
                  </TouchableOpacity>
                  <Text style={styles.logoText}>CITADEL</Text>
                  <View style={styles.headerSpacer} />
                </View>
                <View style={{ marginTop: 75 }}>
                  <Text style={styles.welcomeText}>Welcome!</Text>
                  <Text style={styles.employeeText}>{userData?.first_name + ' ' + userData?.last_name || 'User'}</Text>
                </View>
              </View>
            </LinearGradient>

            <QuickActions
              lastOpenedModules={lastOpenedModules}
              modules={modules}
              theme={theme}
              handleModulePress={handleModulePressWrapper}
            />

            <UpcomingReminder
              reminders={reminders}
              theme={theme}
              currentColors={currentColors}
              onPress={() => handleModulePressWrapper('Reminder')}
            />

            {/* ============================================================================ */}
            {/* NEW: DYNAMIC MODULE TILES */}
            {/* ============================================================================ */}
            <View style={styles.moduleGrid}>
              {/* Big Tile (from backend) */}
              {renderModuleTile(bigTile, 'big')}

              {/* Small Tiles Column (from backend) */}
              <View style={styles.moduleColumn}>
                {renderModuleTile(smallTile1, 'small')}
                {renderModuleTile(smallTile2, 'small')}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.viewAllContainer, { marginHorizontal: 20 }]}
              onPress={() => setAllModulesVisible(true)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[currentColors.gradientStart, currentColors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>View all modules</Text>
                <View style={styles.chevronGroup}>
                  <Ionicons name="chevron-forward" size={16} color="white" />
                  <Ionicons name="chevron-forward" size={16} color="white" style={{ marginLeft: -8 }} />
                  <Ionicons name="chevron-forward" size={16} color="white" style={{ marginLeft: -8 }} />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <WorkStatistics
              hoursWorked={hoursWorked}
              overtimeHours={overtimeHours}
              userData={userData}
              theme={theme}
              currentColors={currentColors}
            />

            <UpcomingEvents
              upcomingEvents={upcomingEvents}
              theme={theme}
              currentColors={currentColors}
              getInitials={getInitials}
              formatEventDate={formatEventDate}
              formatAnniversaryYears={formatAnniversaryYears}
            />

            <View style={styles.footer}>
              <Text style={styles.footerLogo}>CITADEL</Text>
              <Text style={styles.footerText}>Made with ❤️</Text>
            </View>
          </ScrollView>
        )}
      </View>

      {!isWeb && (
        <BottomBar
          activeNavItem={activeNavItem}
          handleNavItemPress={handleNavItemPress}
          theme={theme}
          currentColors={currentColors}
          bulgeAnim={bulgeAnim}
          screenWidth={screenWidth}
          unreadNotificationCount={unreadNotificationCount}
        />
      )}
    </View>
  );
}

export default function CitadelDashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <SafeAreaProvider>
      <DashboardContent onLogout={onLogout} />
    </SafeAreaProvider>
  );
}

// ============================================================================
// STYLES (unchanged)
// ============================================================================
const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#000D24' },
  safeContainerWeb: { maxWidth: 1400, marginHorizontal: 'auto', width: '100%' },
  container: { flex: 1 },
  containerWeb: { maxWidth: 1200, marginHorizontal: 'auto' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingContainerWeb: { minHeight: Dimensions.get('window').height },
  loadingText: { marginTop: 16, fontSize: 16 },
  loadingTextWeb: { fontSize: 18 },
  errorText: { fontSize: 18, textAlign: 'center', marginBottom: 24 },
  errorTextWeb: { fontSize: 20 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { fontSize: 16, fontWeight: '600' },
  mainContent: { flex: 1 },
  mainContentWeb: { maxWidth: 1400, marginHorizontal: 'auto', width: '100%' },
  circleOverlay: {
    position: 'absolute', top: height / 2, left: width / 2,
    width: Math.sqrt(width * width + height * height) * 2.5,
    height: Math.sqrt(width * width + height * height) * 2.5,
    borderRadius: Math.sqrt(width * width + height * height) * 1.25,
    marginLeft: -Math.sqrt(width * width + height * height) * 1.25,
    marginTop: -Math.sqrt(width * width + height * height) * 1.25,
    zIndex: 1000,
  },
  scrollContent: { paddingBottom: 100 },
  webContainer: { flex: 1, flexDirection: 'row', alignItems: 'stretch', minHeight: '100vh' as any, backgroundColor: 'transparent' },
  webLeftSide: { width: 280, height: '100vh', flexDirection: 'column', borderRightWidth: 1, borderRightColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' },
  embeddedPageWrapper: { flex: 1, backgroundColor: 'transparent', overflow: 'hidden', maxWidth: '100%', width: '100%' },
  dashboardContainer: { flex: 1, backgroundColor: 'transparent', maxWidth: '100%', width: '100%' },
  webEmbeddedPage: { flex: 1, backgroundColor: 'transparent', overflow: 'hidden', maxWidth: '100%', width: '100%' },
  webUserProfile: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  webUserAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 } as ImageStyle,
  webAvatarPlaceholder: { width: 50, height: 50, borderRadius: 25, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  webAvatarText: { color: 'white', fontSize: 18, fontWeight: '600' },
  webUserInfo: { flex: 1 },
  webUserName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  webUserDesignation: { fontSize: 12, opacity: 0.7 },
  webSettingsButton: { padding: 8, borderRadius: 8 },
  webNavigation: { flex: 1, overflow: 'auto', paddingVertical: 16 },
  webNavItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, marginVertical: 2, position: 'relative' },
  webNavItemActive: { backgroundColor: 'rgba(0, 128, 105, 0.1)', borderLeftWidth: 3, borderLeftColor: '#008069' },
  webNavText: { marginLeft: 12, fontSize: 14, flex: 1 },
  webCenterContent: { flex: 1, maxHeight: '100vh', overflow: 'auto', backgroundColor: 'transparent' },
  webRightSide: { width: 280, height: '100vh', flexDirection: 'column', borderLeftWidth: 1, borderLeftColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' },
  webHeader: { height: 220, overflow: 'hidden', position: 'relative' },
  webHeaderImage: { position: 'absolute', width: '100%', height: '100%', opacity: 1 } as ImageStyle,
  webHeaderOverlay: { position: 'absolute', width: '100%', height: '100%' },
  webHeaderContent: { padding: 30, position: 'relative', zIndex: 1 },
  webTopNav: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  webLogoContainer: { alignItems: 'center' },
  webLogoText: { color: 'white', fontSize: 24, fontWeight: '800', letterSpacing: 2 },
  webWelcomeText: { color: 'white', fontSize: 28, fontWeight: '700' },
  webEmployeeText: { color: 'white', fontSize: 18, opacity: 0.8, marginTop: 4 },
  modulesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  modulesGridTitle: { fontSize: 18, fontWeight: '700' },
  refreshButton: { padding: 8, borderRadius: 8 },
  modulesGridScroll: { flex: 1 },
  modulesGridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 16, gap: 12 },
  moduleGridItem: { width: '47%', aspectRatio: 1, marginBottom: 12, padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  moduleGridIconContainer: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  moduleGridIcon: { width: 30, height: 30 } as ImageStyle,
  moduleGridTitle: { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 16 },
  moduleContainer: { flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: 'transparent' },
  privacyText: { fontSize: 16, lineHeight: 24 },
  headerBanner: { height: 250, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', position: 'relative' },
  headerOverlay: { position: 'absolute', width: '100%', height: '100%' },
  headerContent: { padding: 20, position: 'relative', zIndex: 1 },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuButton: { padding: 8, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  menuLine: { width: 24, height: 2, marginVertical: 3, borderRadius: 1 },
  logoText: { color: 'white', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  headerSpacer: { width: 40 },
  welcomeText: { color: 'white', fontSize: 30, fontWeight: '700' },
  employeeText: { color: 'white', fontSize: 18, opacity: 0.8, marginTop: 2 },
  moduleGrid: { marginHorizontal: 20, marginBottom: 15, flexDirection: 'row', height: 220, gap: 12 },
  moduleAttendance: { flex: 1, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  moduleColumn: { flex: 1, gap: 12 },
  moduleSmall: { flex: 1, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  moduleGradient: { flex: 1, padding: 16, justifyContent: 'space-between' },
  moduleArrow: { position: 'absolute', top: 12, right: 12 },
  moduleIconCircle: { width: 45, height: 45, backgroundColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 22.5, alignItems: 'center', justifyContent: 'center' },
  moduleTitle: { color: 'white', fontSize: 16, fontWeight: '600', textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  viewAllContainer: { marginBottom: 15 },
  viewAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, shadowColor: '#008069', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  viewAllText: { fontSize: 14, fontWeight: '600', color: 'white', marginRight: 8 },
  chevronGroup: { flexDirection: 'row', alignItems: 'center' },
  footer: { alignItems: 'center', paddingBottom: 30, paddingTop: 15 },
  footerLogo: { fontSize: 28, fontWeight: '700', letterSpacing: 5, color: '#a9a9a9b6', marginBottom: 5 },
  footerText: { fontSize: 10, color: '#666' },
  badgeContainer: { position: 'absolute', top: -8, right: -8, backgroundColor: '#F15C6D', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});