// Dashboard.tsx - FIXED VERSION: disclosure owned by App.tsx, compliant background services
// COLD-LAUNCH NOTIFICATION FIX:
//   When the app is opened from a tapped notification (cold launch), the old code called
//   handleNavigateFromNotification inside getLastNotificationResponseAsync before the
//   dashboard had finished loading — the navigation ran but was immediately wiped when
//   `loading` flipped to false and re-rendered the dashboard.
//   Fix: store the pending target in a ref (immune to re-renders), then consume it in a
//   dedicated useEffect that fires only after `loading=false` AND `userData` is populated.
//
// UNREAD MESSAGES BADGE:
//   Fetches total_unread count from /citadel_hub/countUnreadMessages on mount and
//   whenever the user closes the chat screen. Count is passed down to BottomBar which
//   renders a WhatsApp-style badge on the Message icon.
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
  LayoutAnimation,
  Linking,
  BackHandler,
} from 'react-native';
import { ImageStyle } from 'react-native';
import Support from './Support';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as NotificationsExpo from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { BackgroundLocationService } from '../services/backgroundLocationTracking';

// Import all pages
import Profile from './Profile';
import PrivacyPolicy from './PrivacyPolicy';
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
import AssetModule from './assets/index';
import OfficeModule from './office/index';
import Settings from './Settings';
import AttendanceWrapper from './AttendanceWrapper';
import EmployeeManagement from './employee_management/EmployeeManagement';
import Notifications from './Notifications';
import { ValidationScreen } from './ValidationScreen';
import DriverManager from './driver_manager/DriverManager';
import HR_Manager from './hr_manager/HR_Manager';
import HREmployeeManager from './hr_employee_management/hr_employee_management';
import AccessModule from './access/access';

// Import components
import AllModulesModal from './dashboard/allModules';
import QuickActions from './dashboard/quickActions';
import UpcomingReminder from './dashboard/upcomingReminder';
import WorkStatistics from './dashboard/workStatistics';
import UpcomingEvents from './dashboard/upcomingEvents';
import BottomBar from './dashboard/bottomBar';
import About from './About';
import { BackgroundAttendanceService } from '../services/backgroundAttendance';
import { GeofencingService } from '../services/geofencing';
import { AttendanceUtils } from '../services/attendanceUtils';
import { BACKEND_URL, BACKEND_URL_WEBSOCKET } from '../config/config';

const { width, height } = Dimensions.get('window');
const TOKEN_2_KEY = 'token_2';

// ============================================================================
// NAVIGATION STACK TYPES
// ============================================================================
type MobilePageKey =
  | 'attendance' | 'profile' | 'hr' | 'cab' | 'driver' | 'bdt'
  | 'medical' | 'scoutBoy' | 'reminder' | 'bup' | 'siteManager'
  | 'settings' | 'employeeManagement' | 'hrEmployeeManager' | 'chat'
  | 'chatRoom' | 'notifications' | 'driverManager' | 'hrManager'
  | 'validation' | 'asset' | 'office' | 'access' | 'privacy' | 'about'
  | 'support' | 'dashboard';

interface NavEntry {
  page: MobilePageKey;
  menuWasOpen: boolean;
}

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
// MODULE CONFIGURATION
// ============================================================================
interface ModuleConfig {
  icon: string;
  iconFamily: 'FontAwesome5' | 'Ionicons' | 'MaterialCommunityIcons';
  gradientColors: readonly [string, string, ...string[]];
  displayName: string;
}

const MODULE_CONFIGURATIONS: Record<string, ModuleConfig> = {
  'attendance': { icon: 'book-open', iconFamily: 'FontAwesome5', gradientColors: ['#00d285', '#00b872'], displayName: 'Attendance' },
  'Attendance': { icon: 'book-open', iconFamily: 'FontAwesome5', gradientColors: ['#00d285', '#00b872'], displayName: 'Attendance' },
  'office': { icon: 'business', iconFamily: 'Ionicons', gradientColors: ['#003580', '#004d69'], displayName: 'Offices' },
  'offices': { icon: 'business', iconFamily: 'Ionicons', gradientColors: ['#003580', '#004d69'], displayName: 'Offices' },
  'asset': { icon: 'hardware-chip', iconFamily: 'Ionicons', gradientColors: ['#80006b', '#4d0069'], displayName: 'Assets' },
  'assets': { icon: 'hardware-chip', iconFamily: 'Ionicons', gradientColors: ['#80006b', '#4d0069'], displayName: 'Assets' },
  'cab': { icon: 'car', iconFamily: 'FontAwesome5', gradientColors: ['#ff5e7a', '#ff4168'], displayName: 'Car' },
  'Cab': { icon: 'car', iconFamily: 'FontAwesome5', gradientColors: ['#ff5e7a', '#ff4168'], displayName: 'Car' },
  'VehicleAdmin': { icon: 'car-side', iconFamily: 'FontAwesome5', gradientColors: ['#ff5e7a', '#ff4168'], displayName: 'Vehicle Admin' },
  'hr': { icon: 'users', iconFamily: 'FontAwesome5', gradientColors: ['#ffb157', '#ff9d3f'], displayName: 'HR' },
  'HR': { icon: 'users', iconFamily: 'FontAwesome5', gradientColors: ['#ffb157', '#ff9d3f'], displayName: 'HR' },
  'hr_employee_management': { icon: 'user-tie', iconFamily: 'FontAwesome5', gradientColors: ['#ff4168', '#ff4168'], displayName: 'Employees' },
  'hr_manager': { icon: 'user-shield', iconFamily: 'FontAwesome5', gradientColors: ['#ff9d3f', '#ff8c2e'], displayName: 'HR Management' },
  'EmployeesAdmin': { icon: 'users-cog', iconFamily: 'FontAwesome5', gradientColors: ['#ffb157', '#ff9d3f'], displayName: 'Employees' },
  'driver': { icon: 'steering-wheel', iconFamily: 'MaterialCommunityIcons', gradientColors: ['#6c5ce7', '#5f4fd1'], displayName: 'Driver' },
  'driver_manager': { icon: 'id-card', iconFamily: 'FontAwesome5', gradientColors: ['#6c5ce7', '#5f4fd1'], displayName: 'Duty Manager' },
  'site_manager': { icon: 'hard-hat', iconFamily: 'FontAwesome5', gradientColors: ['#fd79a8', '#e84393'], displayName: 'Database' },
  'bup': { icon: 'chart-line', iconFamily: 'FontAwesome5', gradientColors: ['#ffb157', '#ff9d3f'], displayName: 'BUP' },
  'bdt': { icon: 'exchange-alt', iconFamily: 'FontAwesome5', gradientColors: ['#0984e3', '#0773d1'], displayName: 'Transaction' },
  'medical': { icon: 'medkit', iconFamily: 'FontAwesome5', gradientColors: ['#d63031', '#c92a2b'], displayName: 'Mediclaim' },
  'mediclaim': { icon: 'medkit', iconFamily: 'FontAwesome5', gradientColors: ['#d63031', '#c92a2b'], displayName: 'Mediclaim' },
  'scout_boy': { icon: 'user-alt', iconFamily: 'FontAwesome5', gradientColors: ['#fdcb6e', '#f6b93b'], displayName: 'Scout' },
  'reminder': { icon: 'bell', iconFamily: 'FontAwesome5', gradientColors: ['#a29bfe', '#6c5ce7'], displayName: 'Reminder' },
  'employee_management': { icon: 'users', iconFamily: 'FontAwesome5', gradientColors: ['#74b9ff', '#0984e3'], displayName: 'Employees' },
  'default': { icon: 'cube', iconFamily: 'FontAwesome5', gradientColors: ['#636e72', '#546E7A'], displayName: 'Module' },
  'access': { icon: 'shield-checkmark', iconFamily: 'Ionicons', gradientColors: ['#00b894', '#00cec9'], displayName: 'Access Control' },
};

const getModuleConfig = (moduleUniqueName: string): ModuleConfig =>
  MODULE_CONFIGURATIONS[moduleUniqueName] || MODULE_CONFIGURATIONS['default'];

// ============================================================================
// COMPLETE MODULE NAVIGATION MAP
// ============================================================================
const COMPLETE_MODULE_MAP: Record<string, ActivePage> = {
  'attendance': 'attendance', 'Attendance': 'attendance',
  'asset': 'asset', 'assets': 'asset', 'Asset': 'asset',
  'office': 'office', 'Office': 'office', 'offices': 'office',
  'hr': 'hr', 'HR': 'hr',
  'hr_employee_management': 'hrEmployeeManager',
  'hr_manager': 'hrManager', 'hr_management': 'hrManager',
  'cab': 'cab', 'Cab': 'cab',
  'driver': 'driver', 'driver_manager': 'driverManager',
  'bdt': 'bdt',
  'medical': 'medical', 'mediclaim': 'medical',
  'scout_boy': 'scoutBoy', 'scoutboy': 'scoutBoy',
  'reminder': 'reminder',
  'bup': 'bup', 'business update': 'bup',
  'site_manager': 'siteManager',
  'employee_management': 'employeeManagement',
  'profile': 'profile', 'profile-assets': 'profile',
  'profile-payslips': 'profile', 'profile-documents': 'profile',
  'access': 'access', 'Access': 'access',
  'citadel-hub': 'messages', 'citadel_hub': 'messages',
  'settings': 'settings',
  'attendance-leaves': 'attendance',
  'driver_management': 'driverManager',
  'hr-request': 'hrManager', 'hr-grievance': 'hrManager',
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================
function DashboardContent({ onLogout }: { onLogout: () => void }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------
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
  const [showSupport, setShowSupport] = useState(false);
  const [attendanceOpenLeaves, setAttendanceOpenLeaves] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoursWorked, setHoursWorked] = useState<number[]>([]);
  const [overtimeHours, setOvertimeHours] = useState<number[]>([]);
  const [showAccess, setShowAccess] = useState(false);
  const [hrManagerInitialTab, setHrManagerInitialTab] = useState<'requests' | 'grievances'>('requests');

  // Dynamic tile configuration
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

  // Web active page
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Menu / nav / theme
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('Dashboard');
  const [activeNavItem, setActiveNavItem] = useState('home');
  const [isDark, setIsDark] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Modules modal / search
  const [allModulesVisible, setAllModulesVisible] = useState(false);
  const [showAsset, setShowAsset] = useState(false);
  const [showOffice, setShowOffice] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Navigation stack (mobile only)
  const [navStack, setNavStack] = useState<NavEntry[]>([]);

  // Notifications badge
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const badgeCountRef = useRef(0);

  // Profile deep-link modal
  const [profileModalToOpen, setProfileModalToOpen] = useState<string | null>(null);

  // ── FIX: Cold-launch notification ref ──────────────────────────────────────
  // Stores the notification navigation target from getLastNotificationResponseAsync.
  // We must NOT call handleNavigateFromNotification immediately because the
  // dashboard is still loading — the nav call would be wiped when loading→false
  // triggers a re-render. Instead we store it here and consume it below once
  // loading is done and userData is ready.
  const pendingNotificationNav = useRef<{
    module: string;
    extraData?: { openModal?: string };
  } | null>(null);

  // Animations
  const circleScale = useRef(new Animated.Value(0)).current;
  const switchToggle = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isWeb ? 0 : -300)).current;
  const bulgeAnim = useRef(new Animated.Value(0)).current;

  const currentColors = useMemo(() => isDark ? darkColors : lightColors, [isDark]);

  const theme = useMemo(() => ({
    bgColor: isDark ? '#050b18' : '#ece5dd',
    cardBg: isDark ? '#111a2d' : '#f6f6f6',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    accentBlue: isDark ? '#008069' : '#008069',
    navBg: isDark ? '#0a111f' : '#ffffff',
  }), [isDark]);

  // --------------------------------------------------------------------------
  // BADGE UPDATE
  // --------------------------------------------------------------------------
  const handleBadgeUpdate = useCallback((count: number) => {
    if (badgeCountRef.current !== count) {
      badgeCountRef.current = count;
      setUnreadNotificationCount(count);
    }
  }, []);

  // --------------------------------------------------------------------------
  // UNREAD MESSAGES BADGE — fetch from backend
  // --------------------------------------------------------------------------
  /**
   * Calls countUnreadMessages and updates the badge count.
   * Errors are swallowed silently — this is non-critical UI decoration.
   */
  const fetchUnreadMessageCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/citadel_hub/countUnreadMessages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.total_unread === 'number') {
        handleBadgeUpdate(data.total_unread);
      }
    } catch {
      // Non-critical — silently ignore network / parse errors
    }
  }, [token, handleBadgeUpdate]);

  // Fetch once when the token is available (i.e. on dashboard load)
  useEffect(() => {
    fetchUnreadMessageCount();
  }, [fetchUnreadMessageCount]);

  // Re-fetch when the user closes the chat screen (they may have read messages)
  // useEffect(() => {
  //   if (!showChat) {
  //     fetchUnreadMessageCount();
  //   }
  // }, [showChat]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: fetchUnreadMessageCount intentionally excluded so we only fire on
  // showChat transitions, not on every token/handleBadgeUpdate change.

  // --------------------------------------------------------------------------
  // CLOSE ALL PAGES
  // --------------------------------------------------------------------------
  const closeAllPages = useCallback(() => {
    setShowAttendance(false);
    setAttendanceOpenLeaves(false);
    setShowAsset(false);
    setShowOffice(false);
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
    setShowAccess(false);
    setShowPrivacy(false);
    setShowAbout(false);
    setShowSupport(false);
  }, []);

  // --------------------------------------------------------------------------
  // RESTORE PAGE
  // --------------------------------------------------------------------------
  const restorePage = useCallback((page: MobilePageKey) => {
    switch (page) {
      case 'attendance': setShowAttendance(true); break;
      case 'profile': setShowProfile(true); break;
      case 'hr': setShowHR(true); break;
      case 'cab': setShowCab(true); break;
      case 'driver': setShowDriver(true); break;
      case 'bdt': setShowBDT(true); break;
      case 'medical': setShowMedical(true); break;
      case 'scoutBoy': setShowScoutBoy(true); break;
      case 'reminder': setShowReminder(true); break;
      case 'bup': setShowBUP(true); break;
      case 'siteManager': setShowSiteManager(true); break;
      case 'settings': setShowSettings(true); break;
      case 'employeeManagement': setShowEmployeeManagement(true); break;
      case 'hrEmployeeManager': setShowHREmployeeManagement(true); break;
      case 'chat': setShowChat(true); break;
      case 'chatRoom': setShowChatRoom(true); break;
      case 'notifications': setShowNotifications(true); break;
      case 'driverManager': setShowDriverManager(true); break;
      case 'hrManager': setShowHrManager(true); break;
      case 'validation': setShowValidation(true); break;
      case 'asset': setShowAsset(true); break;
      case 'office': setShowOffice(true); break;
      case 'access': setShowAccess(true); break;
      case 'privacy': setShowPrivacy(true); break;
      case 'about': setShowAbout(true); break;
      case 'support': setShowSupport(true); break;
      case 'dashboard': break;
    }
  }, []);

  // --------------------------------------------------------------------------
  // HANDLE BACK
  // --------------------------------------------------------------------------
  const handleBack = useCallback(() => {
    setProfileModalToOpen(null);

    if (isWeb) {
      setActivePage('dashboard');
      return;
    }

    setNavStack(prev => {
      if (prev.length === 0) {
        closeAllPages();
        setActiveMenuItem('Dashboard');
        setActiveNavItem('home');
        return prev;
      }

      const entry = prev[prev.length - 1];
      const next = prev.slice(0, -1);

      closeAllPages();

      if (entry.page === 'dashboard') {
        if (entry.menuWasOpen) {
          slideAnim.setValue(0);
          setIsMenuVisible(true);
        } else {
          slideAnim.setValue(-300);
          setIsMenuVisible(false);
        }
        setActiveMenuItem('Dashboard');
        setActiveNavItem('home');
      } else {
        slideAnim.setValue(-300);
        setIsMenuVisible(false);
        restorePage(entry.page);
      }

      return next;
    });
  }, [isWeb, closeAllPages, restorePage, slideAnim]);

  const handleBackFromPage = handleBack;

  // --------------------------------------------------------------------------
  // NAVIGATE TO
  // --------------------------------------------------------------------------
  const navigateTo = useCallback((
    fromPage: MobilePageKey,
    openFn: () => void,
  ) => {
    const menuWasOpen = isMenuVisible;
    slideAnim.setValue(-300);
    setIsMenuVisible(false);
    setNavStack(prev => [...prev, { page: fromPage, menuWasOpen }]);
    closeAllPages();
    openFn();
  }, [isMenuVisible, closeAllPages, slideAnim]);

  // --------------------------------------------------------------------------
  // NOTIFICATION NAVIGATION
  // --------------------------------------------------------------------------
  const handleNavigateFromNotification = useCallback((
    moduleIdentifier: string,
    extraData?: { openModal?: string }
  ) => {
    const normalized = moduleIdentifier.toLowerCase().trim();

    const profileModalMap: Record<string, string> = {
      'profile-assets': 'assets',
      'profile-payslips': 'payslips',
      'profile-documents': 'documents',
    };

    if (profileModalMap[normalized] || (normalized === 'profile' && extraData?.openModal)) {
      const modalToOpen = profileModalMap[normalized] || extraData?.openModal;
      if (isWeb) {
        setActivePage('profile');
        setProfileModalToOpen(modalToOpen || null);
      } else {
        setProfileModalToOpen(modalToOpen || null);
        setShowProfile(true);
      }
      return;
    }

    const targetPage = COMPLETE_MODULE_MAP[normalized];
    if (!targetPage) {
      Alert.alert('Navigation Error', `Cannot navigate to "${moduleIdentifier}". Module not found.`);
      return;
    }

    if (isWeb) {
      setActivePage(targetPage);
    } else {
      const navigationActions: Record<ActivePage, () => void> = {
        'dashboard': () => { },
        'attendance': () => {
          setAttendanceKey(prev => prev + 1);
          setAttendanceOpenLeaves(normalized === 'attendance-leaves');
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
        'hrManager': () => {
          setHrManagerInitialTab(normalized === 'hr-grievance' ? 'grievances' : 'requests');
          setShowHrManager(true);
        },
        'profile': () => setShowProfile(true),
        'settings': () => setShowSettings(true),
        'notifications': () => setShowNotifications(true),
        'validation': () => setShowValidation(true),
        'privacy': () => setShowPrivacy(true),
        'messages': () => setShowChat(true),
        'chat': () => setShowChat(true),
        'chatRoom': () => setShowChatRoom(true),
        'assets': () => setShowAsset(true),
        'asset': () => setShowAsset(true),
        'office': () => setShowOffice(true),
        'access': () => setShowAccess(true),
      };
      navigationActions[targetPage]?.();
    }
  }, [isWeb]);

  // --------------------------------------------------------------------------
  // FIX: Consume pending cold-launch notification once dashboard is ready
  // --------------------------------------------------------------------------
  // This effect fires whenever `loading` or `userData` changes. Once both
  // conditions are satisfied (loading=false AND userData is set) and there is
  // a pending navigation target stored by the cold-launch path below, we
  // execute the navigation. The 100 ms timeout gives React one tick to fully
  // commit the dashboard render before we start flipping show* flags.
  useEffect(() => {
    if (loading) return;
    if (!userData) return;
    if (!pendingNotificationNav.current) return;

    const { module, extraData } = pendingNotificationNav.current;
    pendingNotificationNav.current = null; // clear immediately — prevent double-fire

    const timer = setTimeout(() => {
      handleNavigateFromNotification(module, extraData);
    }, 100);

    return () => clearTimeout(timer);
  }, [loading, userData, handleNavigateFromNotification]);

  // --------------------------------------------------------------------------
  // REFRESH USER DATA
  // --------------------------------------------------------------------------
  const refreshUserData = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const response = await fetch(`${BACKEND_URL}/core/getUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data: ApiResponse = await response.json();
        if (data.message === 'Get modules successful') {
          const transformedUserData: UserData = {
            ...data.user,
            profile_picture: data.user.profile_picture || undefined,
          };

          setUserData(transformedUserData);
          setModules(data.modules || []);
          if (data.big_tile) setBigTile(data.big_tile);
          if (data.small_tile_1) setSmallTile1(data.small_tile_1);
          if (data.small_tile_2) setSmallTile2(data.small_tile_2);

          await AsyncStorage.setItem('user_data', JSON.stringify(transformedUserData));
          await AsyncStorage.setItem('is_driver', JSON.stringify(data.is_driver || false));
          if (data.city) await AsyncStorage.setItem('city', data.city);
          await AsyncStorage.setItem('is_admin', JSON.stringify(data.is_admin ?? false));
          if (data.user_city) await AsyncStorage.setItem('user_city', data.user_city);

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
          setUpcomingEvents(getUpcomingEvents(data.upcoming_birthdays || [], data.upcoming_anniversary || []));

          const storedModules = await AsyncStorage.getItem('last_opened_modules');
          if (storedModules) {
            let modulesArray = JSON.parse(storedModules);
            if (data.modules?.length > 0) {
              modulesArray = modulesArray.map((storedModule: any) => {
                const backendModule = data.modules.find(
                  (m: any) => m.module_unique_name === storedModule.module_unique_name
                );
                return backendModule
                  ? {
                    ...storedModule,
                    iconUrl: backendModule.module_icon,
                    title: backendModule.module_name.charAt(0).toUpperCase() +
                      backendModule.module_name.slice(1).replace('_', ' '),
                  }
                  : storedModule;
              });
              const seen = new Set<string>();
              const uniqueModules: any[] = [];
              for (const m of modulesArray) {
                if (!seen.has(m.module_unique_name)) {
                  seen.add(m.module_unique_name);
                  uniqueModules.push(m);
                }
              }
              modulesArray = uniqueModules.slice(0, 4);
              await AsyncStorage.setItem('last_opened_modules', JSON.stringify(modulesArray));
              setLastOpenedModules(modulesArray);
            }
          }
        }
      }
    } catch (err) {
      console.error('❌ Error refreshing user data:', err);
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  const handleReminderUpdate = useCallback(async () => {
    await refreshUserData();
  }, [refreshUserData]);

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------
  const getUpcomingEvents = useCallback((birthdays: any[], anniversaries: any[]): UpcomingEvent[] => {
    const events: UpcomingEvent[] = [];
    const today = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(today.getMonth() + 3);

    birthdays.forEach(user => {
      if (user.birth_date) {
        const birthDate = new Date(user.birth_date);
        const next = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        if (next < today) next.setFullYear(today.getFullYear() + 1);
        if (next <= threeMonthsFromNow)
          events.push({ full_name: user.full_name, date: user.birth_date, type: 'birthday' });
      }
    });

    anniversaries.forEach(user => {
      if (user.joining_date) {
        const annDate = new Date(user.joining_date);
        const next = new Date(today.getFullYear(), annDate.getMonth(), annDate.getDate());
        if (next < today) next.setFullYear(today.getFullYear() + 1);
        if (next <= threeMonthsFromNow) {
          const years = today.getFullYear() - annDate.getFullYear();
          events.push({ full_name: user.full_name, date: user.joining_date, type: 'anniversary', years, anniversaryYears: years + 1 });
        }
      }
    });

    events.sort((a, b) => {
      const dA = new Date(a.date), dB = new Date(b.date);
      const tA = new Date(today.getFullYear(), dA.getMonth(), dA.getDate());
      const tB = new Date(today.getFullYear(), dB.getMonth(), dB.getDate());
      const eA = tA >= today ? tA : new Date(today.getFullYear() + 1, dA.getMonth(), dA.getDate());
      const eB = tB >= today ? tB : new Date(today.getFullYear() + 1, dB.getMonth(), dB.getDate());
      return eA.getTime() - eB.getTime();
    });

    return events.slice(0, 3);
  }, []);

  const logPushTokenError = useCallback(async (error: string, details?: any) => {
    console.error('[Push Token Error]', error, details);
    try {
      const userToken = await AsyncStorage.getItem(TOKEN_2_KEY);
      if (!userToken) return;
      await fetch(`${BACKEND_URL}/core/logError`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: userToken,
          error: `[Push Token] ${error}`,
          details: details ? JSON.stringify(details) : null,
          timestamp: new Date().toISOString(),
          platform: Platform.OS,
          deviceInfo: { isDevice: Device.isDevice, modelName: Device.modelName, osVersion: Device.osVersion },
        }),
      });
    } catch { /* non-critical */ }
  }, []);

  // --------------------------------------------------------------------------
  // EFFECTS
  // --------------------------------------------------------------------------

  // Auto-refresh when returning from Profile
  useEffect(() => {
    if (!showProfile && userData && token) {
      refreshUserData();
      setProfileModalToOpen(null);
    }
  }, [showProfile]);

  // --------------------------------------------------------------------------
  // BACKGROUND SERVICES — Google Play compliant version
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!token || !userData || isWeb) return;
    if (Constants.appOwnership === 'expo') return;

    const init = async () => {
      try {
        const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
        const backgroundGranted = bgStatus === 'granted';

        if (!backgroundGranted) {
          console.log(
            'ℹ️ Dashboard: background location not granted, starting foreground-only services',
          );
          await BackgroundAttendanceService.initialize(
            () => Promise.resolve(false),
          );
          return;
        }

        console.log('🚀 Dashboard: background location granted, starting all services');
        await BackgroundAttendanceService.initialize(() => Promise.resolve(true));
        await GeofencingService.initialize();
        await BackgroundAttendanceService.initializeAll();
        await BackgroundLocationService.initialize();
      } catch (e) {
        console.warn('Dashboard background services failed:', e);
      }
    };

    init();
  }, [token, userData, isWeb]);

  // --------------------------------------------------------------------------
  // PUSH NOTIFICATIONS SETUP
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (isWeb) return;
    let isMounted = true;

    const setupNotifications = async () => {
      if (!token) return;
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken && isMounted) {
          setExpoPushToken(pushToken);
          await sendTokenToBackend(pushToken, token);
        }

        notificationListener.current = NotificationsExpo.addNotificationReceivedListener(n => {
          setNotification(n);
          if (n.request.content.data?.page === 'autoMarkAttendance')
            AttendanceUtils.executeAttendanceFlow('manual', true);
        });

        responseListener.current = NotificationsExpo.addNotificationResponseReceivedListener(r => {
          // This fires when the user taps a notification while the app is
          // foreground or background (already mounted). Navigation is safe
          // to call directly here.
          const data = r.notification.request.content.data;
          if (data?.page === 'autoMarkAttendance') AttendanceUtils.executeAttendanceFlow('manual', true);
          else if (data?.go_to) handleNavigateFromNotification(data.go_to as string);
          else if (data?.page) handleNavigateFromNotification(data.page as string);
        });

        // ── FIX: Cold-launch path ─────────────────────────────────────────────
        // getLastNotificationResponseAsync fires when the app was CLOSED and
        // the user tapped a notification to open it. At this point the
        // dashboard is still loading — do NOT call handleNavigateFromNotification
        // directly. Instead, store the target in the ref; the dedicated
        // useEffect above will execute it once loading=false + userData ready.
        const lastResp = await NotificationsExpo.getLastNotificationResponseAsync();
        if (lastResp) {
          const data = lastResp.notification.request.content.data;
          if (data?.page === 'autoMarkAttendance') {
            // Auto-attendance doesn't need UI to be ready, keep the old path.
            setTimeout(() => AttendanceUtils.executeAttendanceFlow('manual', true), 1000);
          } else if (data?.go_to) {
            // Defer — dashboard not ready yet.
            pendingNotificationNav.current = { module: data.go_to as string };
          } else if (data?.page) {
            // Defer — dashboard not ready yet.
            pendingNotificationNav.current = { module: data.page as string };
          }
        }
      } catch (err: any) {
        await logPushTokenError('Unhandled error in setupNotifications', { error: err.message });
      }
    };

    setupNotifications();

    return () => {
      isMounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [token, handleNavigateFromNotification]);

  const registerForPushNotificationsAsync = useCallback(async () => {
    try {
      if (!Device.isDevice) { Alert.alert('Debug', 'Not a physical device'); return undefined; }

      if (Platform.OS === 'android') {
        await NotificationsExpo.setNotificationChannelAsync('default', {
          name: 'default',
          importance: NotificationsExpo.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2D3748',
        });
        const userToken = await AsyncStorage.getItem(TOKEN_2_KEY);
        if (userToken) {
          const res = await fetch(`${BACKEND_URL}/core/getNotificationSounds`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
          if (res.ok) {
            const configs = await res.json();
            for (const cfg of configs) {
              await NotificationsExpo.setNotificationChannelAsync(cfg.channel_id, {
                name: cfg.module_unique_name,
                importance: NotificationsExpo.AndroidImportance.MAX,
                sound: cfg.android_sound_name,
                vibrationPattern: cfg.vibration_pattern || [0, 250, 250, 250],
                enableVibrate: true,
              });
            }
          }
        }
      }

      const { status: existing } = await NotificationsExpo.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await NotificationsExpo.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable notifications in settings');
        return undefined;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      if (!projectId) { Alert.alert('Configuration Error', 'Project ID missing.'); return undefined; }

      const { data } = await NotificationsExpo.getExpoPushTokenAsync({ projectId });
      return data;
    } catch (err: any) {
      await logPushTokenError('registerForPushNotificationsAsync failed', { error: err.message });
      return undefined;
    }
  }, [logPushTokenError]);

  const sendTokenToBackend = useCallback(async (expoToken: string, userToken: string) => {
    if (!expoToken || !userToken) return;
    try {
      const response = await fetch(`${BACKEND_URL}/core/modifyToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: userToken, expo_token: expoToken }),
      });
      if (response.ok) await AsyncStorage.setItem('expo_push_token', expoToken);
    } catch (err: any) {
      await logPushTokenError('Network error sending token', { error: err.message });
    }
  }, [logPushTokenError]);

  // --------------------------------------------------------------------------
  // FETCH USER DATA ON MOUNT
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_2_KEY);
        if (isMounted) setToken(storedToken);
        if (!storedToken) return;
        if (isMounted) setLoading(true);

        const response = await fetch(`${BACKEND_URL}/core/getUser`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: storedToken }),
        });
        if (!isMounted) return;

        if (response.ok) {
          const data: ApiResponse = await response.json();
          if (data.message === 'Get modules successful') {
            const transformedUserData: UserData = {
              ...data.user,
              profile_picture: data.user.profile_picture || undefined,
            };

            if (isMounted) {
              setUserData(transformedUserData);
              setModules(data.modules || []);
              if (data.big_tile) setBigTile(data.big_tile);
              if (data.small_tile_1) setSmallTile1(data.small_tile_1);
              if (data.small_tile_2) setSmallTile2(data.small_tile_2);
            }

            try {
              await AsyncStorage.setItem('user_data', JSON.stringify(transformedUserData));
              await AsyncStorage.setItem('is_driver', JSON.stringify(data.is_driver || false));
              if (data.city) await AsyncStorage.setItem('city', data.city);
              await AsyncStorage.setItem('is_admin', JSON.stringify(data.is_admin ?? false));
              if (data.user_city) await AsyncStorage.setItem('user_city', data.user_city);
            } catch (e) { console.error('AsyncStorage error:', e); }

            if (isMounted) {
              setUpcomingBirthdays(data.upcoming_birthdays || []);
              setUpcomingAnniversaries(data.upcoming_anniversary || []);

              if (Array.isArray(data.upcoming_reminder)) setReminders(data.upcoming_reminder);
              else if (data.upcoming_reminder && typeof data.upcoming_reminder === 'object') setReminders([data.upcoming_reminder]);
              else setReminders([]);

              setHoursWorked(data.hours_worked_last_7_attendance || []);
              setOvertimeHours(data.overtime_hours || []);
              setUpcomingEvents(getUpcomingEvents(data.upcoming_birthdays || [], data.upcoming_anniversary || []));

              const storedModules = await AsyncStorage.getItem('last_opened_modules');
              if (storedModules) {
                let modulesArray = JSON.parse(storedModules);
                if (data.modules?.length > 0) {
                  modulesArray = modulesArray.map((sm: any) => {
                    const bm = data.modules.find((m: any) => m.module_unique_name === sm.module_unique_name);
                    return bm ? { ...sm, iconUrl: bm.module_icon, title: bm.module_name.charAt(0).toUpperCase() + bm.module_name.slice(1).replace('_', ' ') } : sm;
                  });
                  const seen = new Set<string>();
                  const unique: any[] = [];
                  for (const m of modulesArray) {
                    if (!seen.has(m.module_unique_name)) { seen.add(m.module_unique_name); unique.push(m); }
                  }
                  modulesArray = unique.slice(0, 4);
                  await AsyncStorage.setItem('last_opened_modules', JSON.stringify(modulesArray));
                  setLastOpenedModules(modulesArray);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to fetch user data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUserData();
    return () => { isMounted = false; };
  }, []);

  // --------------------------------------------------------------------------
  // ANDROID HARDWARE BACK BUTTON
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (isWeb || Platform.OS !== 'android') return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navStack.length === 0) return false;

      setNavStack(prev => {
        if (prev.length === 0) return prev;
        const entry = prev[prev.length - 1];
        const next = prev.slice(0, -1);

        closeAllPages();

        if (entry.page === 'dashboard') {
          if (entry.menuWasOpen) { slideAnim.setValue(0); setIsMenuVisible(true); }
          else { slideAnim.setValue(-300); setIsMenuVisible(false); }
          setActiveMenuItem('Dashboard');
          setActiveNavItem('home');
        } else {
          slideAnim.setValue(-300);
          setIsMenuVisible(false);
          restorePage(entry.page);
        }

        setProfileModalToOpen(null);
        return next;
      });

      return true;
    });

    return () => sub.remove();
  }, [isWeb, navStack.length, closeAllPages, restorePage, slideAnim]);

  // --------------------------------------------------------------------------
  // UI HANDLERS
  // --------------------------------------------------------------------------
  const handleThemeToggle = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    Animated.timing(switchToggle, { toValue: isDark ? 0 : 1, duration: 300, useNativeDriver: true }).start();
    Animated.timing(circleScale, { toValue: 1, duration: 600, useNativeDriver: true }).start(() => {
      setIsDark(d => !d);
      circleScale.setValue(0);
      setIsAnimating(false);
    });
  }, [isAnimating, isDark, circleScale, switchToggle]);

  const handleModulePressWrapper = useCallback((moduleName: string, moduleUniqueName?: string) => {
    if (!isWeb) {
      const menuWasOpen = isMenuVisible;
      slideAnim.setValue(-300);
      setIsMenuVisible(false);
      setNavStack(prev => [...prev, { page: 'dashboard', menuWasOpen }]);
    }
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
      setShowAsset,
      setShowOffice,
      setShowAccess,
      Alert,
    });
  }, [modules, isWeb, isMenuVisible, slideAnim]);

  const handleLogout = useCallback(async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          if (!isWeb) {
            await BackgroundAttendanceService.stop();
            await GeofencingService.stop();
          }
          setNavStack([]);
          onLogout();
        },
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
      Animated.timing(slideAnim, { toValue: -300, duration: 300, useNativeDriver: true })
        .start(() => setIsMenuVisible(false));
    } else {
      setIsMenuVisible(false);
    }
  }, [isWeb, slideAnim]);

  const handleNavItemPress = useCallback((navItem: string) => {
    setActiveNavItem(navItem);
    if (navItem === 'message') {
      if (isWeb) setActivePage('messages');
      else navigateTo('dashboard', () => setShowChat(true));
    } else if (navItem === 'hr') {
      if (isWeb) setActivePage('hr');
      else navigateTo('dashboard', () => setShowHR(true));
    } else if (navItem === 'assets' || navItem === 'asset') {
      if (isWeb) setActivePage('assets');
      else navigateTo('dashboard', () => setShowAsset(true));
    } else if (navItem === 'support') {
      if (isWeb) setActivePage('support' as ActivePage);
      else navigateTo('dashboard', () => setShowSupport(true));
    } else if (navItem !== 'home') {
      Alert.alert('Coming Soon', `${navItem} feature will be available soon!`);
    }
  }, [isWeb, navigateTo]);

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

    const pageMap: Partial<Record<string, ActivePage>> = {
      profile: 'profile', settings: 'settings', validation: 'validation',
      notifications: 'notifications', messages: 'messages', privacy: 'privacy',
    };

    const targetPage = pageMap[item.id];
    if (!targetPage) return;

    if (isWeb) {
      setActivePage(targetPage);
    } else {
      const handlers: Partial<Record<ActivePage, () => void>> = {
        'profile': () => navigateTo('dashboard', () => setShowProfile(true)),
        'messages': () => navigateTo('dashboard', () => setShowChat(true)),
        'settings': () => navigateTo('dashboard', () => setShowSettings(true)),
        'notifications': () => navigateTo('dashboard', () => setShowNotifications(true)),
        'validation': () => navigateTo('dashboard', () => setShowValidation(true)),
        'privacy': () => navigateTo('dashboard', () => setShowPrivacy(true)),
        'assets': () => navigateTo('dashboard', () => setShowAsset(true)),
      };
      handlers[targetPage]?.();
    }
  }, [isWeb, closeMenu, navigateTo]);

  // --------------------------------------------------------------------------
  // COMPUTED VALUES
  // --------------------------------------------------------------------------
  const displayModules = useMemo(() => getDisplayModules(modules), [modules]);
  const filteredModules = useMemo(() =>
    displayModules.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase())),
    [displayModules, searchQuery]
  );

  const switchTranslate = switchToggle.interpolate({
    inputRange: [0, 1],
    outputRange: [4, screenWidth * 0.43 - 54],
  });

  // --------------------------------------------------------------------------
  // DYNAMIC TILE RENDERER
  // --------------------------------------------------------------------------
  const renderModuleTile = (moduleUniqueName: string, size: 'big' | 'small') => {
    const config = getModuleConfig(moduleUniqueName);
    const IconComponent =
      config.iconFamily === 'Ionicons' ? Ionicons :
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

  // --------------------------------------------------------------------------
  // LOADING / ERROR STATES
  // --------------------------------------------------------------------------
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
        <StatusBar barStyle="light-content" backgroundColor={currentColors.headerBg} />
        <Text style={[styles.errorText, { color: currentColors.text }, isWeb && styles.errorTextWeb]}>Failed to load data</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: currentColors.info }]}>
          <Text style={[styles.retryButtonText, { color: currentColors.white }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --------------------------------------------------------------------------
  // MOBILE PAGE RENDERS
  // --------------------------------------------------------------------------
  if (!isWeb) {
    if (showValidation) return <ValidationScreen onBack={handleBack} />;
    if (showChatRoom && selectedChatRoom)
      return <CitadelHub apiBaseUrl={BACKEND_URL} wsBaseUrl={BACKEND_URL_WEBSOCKET} token={token} currentUser={userData} />;
    if (showChat)
      return (
        <CitadelHub
          apiBaseUrl={BACKEND_URL}
          wsBaseUrl={BACKEND_URL_WEBSOCKET}
          token={token}
          onBack={() => {
            fetchUnreadMessageCount(); // refresh badge as user exits
            handleBack();
          }}
          currentUser={userData}
          onMessagesRead={fetchUnreadMessageCount} // fire whenever a room is opened
        />
      );

    if (showNotifications)
      return <Notifications onBack={handleBack} isDark={isDark} onBadgeUpdate={handleBadgeUpdate} onNavigateToModule={handleNavigateFromNotification} />;
    if (showDriverManager) return <DriverManager onBack={handleBack} />;
    if (showAsset) return <AssetModule onBack={handleBack} isDark={isDark} />;
    if (showAccess) return <AccessModule onBack={handleBack} />;
    if (showOffice) return <OfficeModule onBack={handleBack} isDark={isDark} />;
    if (showHrManager) return <HR_Manager onBack={handleBack} initialTab={hrManagerInitialTab} />;
    if (showAttendance)
      return <AttendanceWrapper key={attendanceKey} onBack={handleBack} attendanceKey={attendanceKey} initialShowLeaves={attendanceOpenLeaves} />;
    if (showProfile)
      return (
        <Profile
          onBack={handleBack}
          userData={userData}
          onProfileUpdate={(updatedData: UserData) => {
            setUserData({ ...userData!, ...updatedData });
            refreshUserData();
          }}
          initialModalToOpen={profileModalToOpen}
        />
      );
    if (showPrivacy) return <PrivacyPolicy onBack={handleBack} isDark={isDark} />;
    if (showAbout) return <About onBack={handleBack} isDark={isDark} appVersion="1.0.0" />;
    if (showHR) return <HR onBack={handleBack} />;
    if (showCab) return <Cab onBack={handleBack} />;
    if (showDriver) return <Driver onBack={handleBack} />;
    if (showBDT) return <BDT onBack={handleBack} />;
    if (showMedical) return <Medical onBack={handleBack} />;
    if (showScoutBoy) return <ScoutBoy onBack={handleBack} />;
    if (showReminder) return <Reminder onBack={handleBack} onReminderUpdate={handleReminderUpdate} />;
    if (showBUP) return <BUP onBack={handleBack} />;
    if (showSiteManager) return <SiteManager onBack={handleBack} />;
    if (showSettings)
      return (
        <Settings
          onBack={handleBack}
          isDark={isDark}
          onHelpCenter={() => navigateTo('settings', () => setShowSupport(true))}
          onReportProblem={() => navigateTo('settings', () => setShowSupport(true))}
          onPrivacyPolicy={() => navigateTo('settings', () => setShowPrivacy(true))}
          onAbout={() => navigateTo('settings', () => setShowAbout(true))}
        />
      );
    if (showEmployeeManagement) return <EmployeeManagement onBack={handleBack} />;
    if (showHREmployeeManager) return <HREmployeeManager onBack={handleBack} />;
    if (showSupport) return <Support onBack={handleBack} isDark={isDark} />;
  }

  // --------------------------------------------------------------------------
  // MAIN DASHBOARD SHELL
  // --------------------------------------------------------------------------
  return (
    <View style={[styles.safeContainer, { backgroundColor: theme.bgColor }, isWeb && styles.safeContainerWeb]}>
      <StatusBar barStyle="light-content" backgroundColor={currentColors.headerBg} translucent={false} />

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
              { opacity: circleScale, transform: [{ scale: circleScale }], backgroundColor: isDark ? '#e7e6e5' : '#050b18' },
            ]}
          />
        )}

        {isWeb ? (
          /* ================================================================
             WEB LAYOUT
          ================================================================ */
          <View style={[styles.webContainer, { backgroundColor: theme.bgColor }]}>
            {/* Left sidebar */}
            <View style={[styles.webLeftSide, { backgroundColor: theme.navBg }]}>
              <View style={[styles.webUserProfile, { backgroundColor: theme.navBg }]}>
                {userData?.profile_picture ? (
                  <Image source={{ uri: userData.profile_picture }} style={styles.webUserAvatar} />
                ) : (
                  <View style={[styles.webAvatarPlaceholder, { backgroundColor: currentColors.primaryBlue }]}>
                    <Text style={styles.webAvatarText}>{getInitials(userData?.full_name || 'User')}</Text>
                  </View>
                )}
                <View style={styles.webUserInfo}>
                  <Text style={[styles.webUserName, { color: theme.textMain }]}>{userData?.full_name || 'User'}</Text>
                  <Text style={[styles.webUserDesignation, { color: theme.textSub }]}>{userData?.designation || 'Employee'}</Text>
                </View>
                <TouchableOpacity style={[styles.webSettingsButton, { backgroundColor: theme.navBg }]} onPress={() => setActivePage('settings')}>
                  <Ionicons name="settings-outline" size={24} color={theme.textMain} />
                </TouchableOpacity>
              </View>

              <View style={styles.webNavigation}>
                {[
                  { id: 'dashboard', label: 'Home', icon: 'home', activeColor: currentColors.primaryBlue },
                  { id: 'profile', label: 'Profile', icon: 'person-circle-outline', activeColor: currentColors.primaryBlue },
                  { id: 'settings', label: 'Settings', icon: 'settings-outline', activeColor: currentColors.primaryBlue },
                  { id: 'notifications', label: 'Notifications', icon: 'notifications-outline', activeColor: currentColors.warning },
                  { id: 'privacy', label: 'Privacy Policy', icon: 'shield-checkmark-outline', activeColor: '#1E40AF' },
                  { id: 'messages', label: 'Messages', icon: 'chatbubbles-outline', activeColor: currentColors.success },
                ].map(item => {
                  const isActive = activePage === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.webNavItem, { backgroundColor: theme.navBg }, isActive && styles.webNavItemActive]}
                      onPress={() => { setActiveNavItem(item.id); setActivePage(item.id as ActivePage); }}
                    >
                      <View style={styles.webNavIconWrapper}>
                        <Ionicons name={item.icon as any} size={24} color={isActive ? item.activeColor : theme.textSub} />
                        {/* Unread badge on the Messages nav item (web sidebar) */}
                        {item.id === 'messages' && unreadNotificationCount > 0 && (
                          <View style={styles.webNavBadge}>
                            <Text style={styles.webNavBadgeText}>
                              {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.webNavText, { color: isActive ? item.activeColor : theme.textSub, fontWeight: isActive ? '600' : '400' }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Center content */}
            <ScrollView style={[styles.webCenterContent, { backgroundColor: theme.bgColor }]} showsVerticalScrollIndicator={false}>
              {activePage === 'dashboard' ? (
                <View style={styles.dashboardContainer}>
                  <LinearGradient
                    colors={isDark ? ['#000D24', '#000D24'] : ['#4A5568', '#2D3748']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.webHeader}
                  >
                    <Image source={require('../assets/bg.jpeg')} style={styles.webHeaderImage} resizeMode="cover" />
                    <View style={[styles.webHeaderOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.3)' }]} />
                    <View style={styles.webHeaderContent}>
                      <View style={styles.webTopNav}>
                        <View style={styles.webLogoContainer}>
                          <Text style={styles.webLogoText}>CITADEL</Text>
                        </View>
                      </View>
                      <View style={{ marginTop: 40 }}>
                        <Text style={styles.webWelcomeText}>Welcome back!</Text>
                        <Text style={styles.webEmployeeText}>{(userData?.first_name ?? '') + ' ' + (userData?.last_name ?? '')}</Text>
                      </View>
                    </View>
                  </LinearGradient>

                  <View style={{ paddingHorizontal: 20 }}>
                    <QuickActions lastOpenedModules={lastOpenedModules} modules={modules} theme={theme} handleModulePress={handleModulePressWrapper} />
                  </View>
                  <View style={{ paddingHorizontal: 20 }}>
                    <UpcomingReminder reminders={reminders} theme={theme} currentColors={currentColors} onPress={() => handleModulePressWrapper('Reminder')} />
                  </View>
                  <View style={{ paddingHorizontal: 20 }}>
                    <WorkStatistics hoursWorked={hoursWorked} overtimeHours={overtimeHours} userData={userData} theme={theme} currentColors={currentColors} />
                  </View>
                  <View style={{ paddingHorizontal: 20 }}>
                    <UpcomingEvents upcomingEvents={upcomingEvents} theme={theme} currentColors={currentColors} getInitials={getInitials} formatEventDate={formatEventDate} formatAnniversaryYears={formatAnniversaryYears} />
                  </View>
                </View>
              ) : (
                <View style={styles.embeddedPageWrapper}>
                  <View style={styles.webEmbeddedPage}>
                    {activePage === 'profile' && (
                      <Profile onBack={() => setActivePage('dashboard')} userData={userData}
                        onProfileUpdate={d => { setUserData(d); refreshUserData(); }}
                        initialModalToOpen={profileModalToOpen} />
                    )}
                    {activePage === 'settings' && (
                      <Settings onBack={() => setActivePage('dashboard')} isDark={isDark} />
                    )}
                    {activePage === 'notifications' && (
                      <Notifications onBack={() => setActivePage('dashboard')} isDark={isDark}
                        onBadgeUpdate={handleBadgeUpdate} onNavigateToModule={handleNavigateFromNotification} />
                    )}
                    {activePage === 'privacy' && (
                      <PrivacyPolicy onBack={() => setActivePage('dashboard')} isDark={isDark} />
                    )}
                    {activePage === 'messages' && (
                      <CitadelHub apiBaseUrl={BACKEND_URL} wsBaseUrl={BACKEND_URL_WEBSOCKET} token={token} currentUser={userData} />
                    )}
                    {activePage === 'attendance' && (
                      <AttendanceWrapper onBack={() => { setActivePage('dashboard'); setAttendanceOpenLeaves(false); }}
                        attendanceKey={attendanceKey} initialShowLeaves={attendanceOpenLeaves} />
                    )}
                    {activePage === 'asset' && <AssetModule onBack={() => setActivePage('dashboard')} isDark={isDark} />}
                    {activePage === 'office' && <OfficeModule onBack={() => setActivePage('dashboard')} isDark={isDark} />}
                    {activePage === 'hr' && <HR onBack={() => setActivePage('dashboard')} />}
                    {activePage === 'cab' && <Cab onBack={() => setActivePage('dashboard')} />}
                    {activePage === 'driver' && <Driver onBack={() => setActivePage('dashboard')} />}
                    {activePage === 'bdt' && <BDT onBack={() => setActivePage('dashboard')} />}
                    {activePage === 'medical' && <Medical onBack={() => setActivePage('dashboard')} />}
                    {activePage === 'scoutBoy' && <ScoutBoy onBack={() => setActivePage('dashboard')} />}
                    {activePage === 'reminder' && <Reminder onBack={() => setActivePage('dashboard')} onReminderUpdate={handleReminderUpdate} />}
                    {activePage === 'bup' && <BUP onBack={() => setActivePage('dashboard')} />}
                    {activePage === 'siteManager' && <SiteManager onBack={() => setActivePage('dashboard')} />}
                    {activePage === 'employeeManagement' && <EmployeeManagement onBack={() => setActivePage('dashboard')} />}
                    {activePage === 'hrEmployeeManager' && <HREmployeeManager onBack={() => setActivePage('dashboard')} />}
                    {activePage === 'driverManager' && <DriverManager onBack={() => setActivePage('dashboard')} />}
                    {activePage === 'hrManager' && <HR_Manager onBack={() => setActivePage('dashboard')} initialTab={hrManagerInitialTab} />}
                    {activePage === 'validation' && <ValidationScreen onBack={() => setActivePage('dashboard')} />}
                    {activePage === 'access' && <AccessModule onBack={() => setActivePage('dashboard')} />}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Right sidebar — all modules grid */}
            <View style={[styles.webRightSide, { backgroundColor: theme.navBg }]}>
              <View style={styles.modulesHeader}>
                <Text style={[styles.modulesGridTitle, { color: theme.textMain }]}>All Modules</Text>
                <TouchableOpacity style={styles.refreshButton} onPress={refreshUserData} disabled={refreshing}>
                  <Ionicons name="refresh" size={20} color={refreshing ? theme.textSub : theme.accentBlue} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modulesGridScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.modulesGridContainer}>
                  {filteredModules.map((module, index) => (
                    <TouchableOpacity
                      key={`${module.module_unique_name}-${index}`}
                      style={[styles.moduleGridItem, { backgroundColor: theme.cardBg }]}
                      onPress={() => handleModulePressWrapper(module.title, module.module_unique_name)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.moduleGridIconContainer, { backgroundColor: theme.cardBg === '#111a2d' ? 'rgba(255,255,255,0.05)' : '#f8f9fa' }]}>
                        <Image source={{ uri: module.iconUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }} style={styles.moduleGridIcon} resizeMode="contain" />
                      </View>
                      <Text style={[styles.moduleGridTitle, { color: theme.textMain }]} numberOfLines={2}>{module.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        ) : (
          /* ================================================================
             MOBILE LAYOUT
          ================================================================ */
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <LinearGradient
              colors={isDark ? ['#000D24', '#000D24'] : ['#4A5568', '#2D3748']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.headerBanner}
            >
              <Image
                source={require('../assets/background_dashboard.jpeg')}
                style={{ position: 'absolute', width: '100%', height: '100%', opacity: 1 }}
                resizeMode="cover"
              />
              <View style={[styles.headerOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.3)' }]} />
              <View style={[styles.headerContent, { paddingTop: Platform.OS === 'ios' ? 40 : 20 }]}>
                <View style={[styles.topNav, { marginBottom: 10, marginTop: Platform.OS === 'ios' ? 10 : 20 }]}>
                  <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
                    {[1, 2, 3].map(i => <View key={i} style={[styles.menuLine, { backgroundColor: 'white' }]} />)}
                  </TouchableOpacity>
                  <Text style={styles.logoText}>CITADEL</Text>
                  <View style={styles.headerSpacer} />
                </View>
                <View style={{ marginTop: 75 }}>
                  <Text style={styles.welcomeText}>Welcome!</Text>
                  <Text style={styles.employeeText}>{(userData?.first_name ?? '') + ' ' + (userData?.last_name ?? '')}</Text>
                </View>
              </View>
            </LinearGradient>

            <QuickActions lastOpenedModules={lastOpenedModules} modules={modules} theme={theme} handleModulePress={handleModulePressWrapper} />
            <UpcomingReminder reminders={reminders} theme={theme} currentColors={currentColors} onPress={() => handleModulePressWrapper('Reminder')} />

            {/* Dynamic module tiles */}
            <View style={styles.moduleGrid}>
              {renderModuleTile(bigTile, 'big')}
              <View style={styles.moduleColumn}>
                {renderModuleTile(smallTile1, 'small')}
                {renderModuleTile(smallTile2, 'small')}
              </View>
            </View>

            <TouchableOpacity style={[styles.viewAllContainer, { marginHorizontal: 20 }]} onPress={() => setAllModulesVisible(true)} activeOpacity={0.7}>
              <LinearGradient colors={[currentColors.gradientStart, currentColors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View all modules</Text>
                <View style={styles.chevronGroup}>
                  <Ionicons name="chevron-forward" size={16} color="white" />
                  <Ionicons name="chevron-forward" size={16} color="white" style={{ marginLeft: -8 }} />
                  <Ionicons name="chevron-forward" size={16} color="white" style={{ marginLeft: -8 }} />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <WorkStatistics hoursWorked={hoursWorked} overtimeHours={overtimeHours} userData={userData} theme={theme} currentColors={currentColors} />
            <UpcomingEvents upcomingEvents={upcomingEvents} theme={theme} currentColors={currentColors} getInitials={getInitials} formatEventDate={formatEventDate} formatAnniversaryYears={formatAnniversaryYears} />

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

      {/*
        BackgroundLocationDisclosure is rendered in App.tsx at the root level.
        It must NOT be rendered here to avoid duplicate modals and to ensure
        Google Play's scanner detects it before any permission API is called.
      */}
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
// STYLES
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
    position: 'absolute',
    top: height / 2,
    left: width / 2,
    width: Math.sqrt(width * width + height * height) * 2.5,
    height: Math.sqrt(width * width + height * height) * 2.5,
    borderRadius: Math.sqrt(width * width + height * height) * 1.25,
    marginLeft: -Math.sqrt(width * width + height * height) * 1.25,
    marginTop: -Math.sqrt(width * width + height * height) * 1.25,
    zIndex: 1000,
  },
  scrollContent: { paddingBottom: 100 },
  webContainer: { flex: 1, flexDirection: 'row', alignItems: 'stretch', minHeight: '100vh' as any, backgroundColor: 'transparent' },
  webLeftSide: { width: 280, height: '100vh' as any, flexDirection: 'column', borderRightWidth: 1, borderRightColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' },
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
  webNavigation: { flex: 1, overflow: 'auto' as any, paddingVertical: 16 },
  webNavItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, marginVertical: 2, position: 'relative' },
  webNavItemActive: { backgroundColor: 'rgba(0, 128, 105, 0.1)', borderLeftWidth: 3, borderLeftColor: '#008069' },
  // Wraps icon + badge together so the badge sits top-right of the icon only
  webNavIconWrapper: { position: 'relative' },
  // Web sidebar badge — compact dot with count
  webNavBadge: {
    position: 'absolute',
    top: -5,
    right: -8,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#F15C6D',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  webNavBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
  webNavText: { marginLeft: 12, fontSize: 14, flex: 1 },
  webCenterContent: { flex: 1, maxHeight: '100vh' as any, overflow: 'auto' as any, backgroundColor: 'transparent' },
  webRightSide: { width: 280, height: '100vh' as any, flexDirection: 'column', borderLeftWidth: 1, borderLeftColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' },
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
  moduleIconCircle: { width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 22.5, alignItems: 'center', justifyContent: 'center' },
  moduleTitle: { color: 'white', fontSize: 16, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  viewAllContainer: { marginBottom: 15 },
  viewAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, shadowColor: '#008069', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  viewAllText: { fontSize: 14, fontWeight: '600', color: 'white', marginRight: 8 },
  chevronGroup: { flexDirection: 'row', alignItems: 'center' },
  footer: { alignItems: 'center', paddingBottom: 30, paddingTop: 15 },
  footerLogo: { fontSize: 28, fontWeight: '700', letterSpacing: 5, color: '#a9a9a9b6', marginBottom: 5 },
  footerText: { fontSize: 10, color: '#666' },
});