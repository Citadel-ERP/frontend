import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as NotificationsExpo from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Import all the pages
import Profile from './Profile';
import HR from './hr/HR';
import Cab from './cab/Cab';
import Driver from './driver/Driver';
import BDT from './bdt/BDT';
import Medical from './Medical';
import ScoutBoy from './ScoutBoy';
import CreateSite from './CreateSite';
import Reminder from './reminder/Reminder';
import BUP from './bup/BUP';
import ChatScreen from './chat/ChatScreen';
import ChatRoomScreen from './chat/ChatRoomScreen';
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
import { BACKEND_URL } from '../config/config';

const { width, height } = Dimensions.get('window');
const TOKEN_2_KEY = 'token_2';

// Interfaces
interface IconItem {
  name: string;
  color: string;
  icon: string;
  library: 'fa5' | 'mci';
  module_unique_name?: string;
  iconUrl?: string;
}

interface Event {
  name: string;
  date: string;
  image: string;
  type?: 'birthday' | 'anniversary';
  years?: number;
}

interface UserData {
  role: string;
  employee_id: string;
  email: string;
  token: string;
  first_name: string;
  last_name: string;
  full_name: string;
  mpin: string;
  home_address: any;
  office: any;
  phone_number: string;
  profile_picture: string | undefined;
  current_location: any;
  is_approved_by_hr: boolean;
  is_approved_by_admin: boolean;
  approved_by_hr_at: string | null;
  approved_by_admin_at: string | null;
  is_archived: boolean;
  created_at: string;
  birth_date: string;
  joining_date: string;
  updated_at: string;
  earned_leaves: number;
  sick_leaves: number;
  casual_leaves: number;
  login_time: string | null;
  logout_time: string | null;
  first_login: boolean;
  bio: string;
  designation?: string;
  user_tags: Array<any>;
  reporting_tags: Array<any>;
  days_present: number;
  leaves_applied: number;
  holidays: number;
  late_arrivals: number;
}

interface Module {
  title: string;
  iconUrl: string;
  module_unique_name: string;
  is_generic: boolean;
}

interface ReminderItem {
  id: string;
  title: string;
  reminder_date: string;
  description?: string;
  created_by?: any;
  color?: string;
  is_completed?: boolean;
}

interface UpcomingEvent {
  full_name: string;
  date: string;
  type: 'birthday' | 'anniversary';
  years?: number;
  anniversaryYears?: number;
}

interface ApiResponse {
  message: string;
  modules: Array<{
    module_name: string;
    is_generic: boolean;
    module_id: string;
    module_unique_name: string;
    module_icon: string;
    created_at: string;
    updated_at: string;
  }>;
  user: any;
  upcoming_birthdays: any[];
  is_driver: boolean;
  upcoming_anniversary: any[];
  autoReconfigure: boolean;
  hours_worked_last_7_attendance: any[];
  overtime_hours: any[];
  upcoming_reminder: any[];
  city?: string;
}

// Theme Colors
const lightColors = {
  primary: '#e7e6e5',
  backgroundSecondary: '#F8F9FA',
  white: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E5E7EB',
  info: '#3B82F6',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  attendanceGreen: '#00D492',
  hrPink: '#FF637F',
  cabOrange: '#FFBB64',
  headerBg: '#2D3748',
  primaryBlue: '#008069',
  gradientStart: '#086755ff',
  gradientEnd: '#036c59ff',
};

const darkColors = {
  primary: '#000D24',
  backgroundSecondary: '#0C1D33',
  white: '#0C1D33',
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textLight: '#999999',
  border: '#404040',
  info: '#3B82F6',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  attendanceGreen: '#00D492',
  hrPink: '#FF637F',
  cabOrange: '#FFBB64',
  headerBg: '#141414ff',
  primaryBlue: '#008069',
  gradientStart: '#086755ff',
  gradientEnd: '#036c59ff',
  headerBgLight: '#d8d8d8ff',
};

// WhatsApp-style Hamburger Menu Component
interface HamburgerMenuProps {
  isVisible: boolean;
  onClose: () => void;
  userData: UserData | null;
  menuItems: any[];
  activeMenuItem: string;
  onMenuItemPress: (item: any) => void;
  onLogout: () => void;
  isDark: boolean;
  slideAnim: Animated.Value;
  getInitials: (fullName: string) => string;
  currentColors: any;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isVisible,
  onClose,
  userData,
  menuItems,
  activeMenuItem,
  onMenuItemPress,
  onLogout,
  isDark,
  slideAnim,
  getInitials,
  currentColors,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { width: screenWidth } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  // WhatsApp-style menu items with icons and colors
  const whatsappMenuItems = [
    { id: 'profile', title: 'Profile', icon: 'person-circle-outline', color: '#008069' },
    { id: 'settings', title: 'Settings', icon: 'settings-outline', color: '#008069' },
    { id: 'notifications', title: 'Notifications', icon: 'notifications-outline', color: '#F59E0B' },
    { id: 'privacy', title: 'Privacy Policy', icon: 'shield-checkmark-outline', color: '#1E40AF' },
    { id: 'messages', title: 'Messages', icon: 'chatbubbles-outline', color: '#10B981' },
    { id: 'logout', title: 'Logout', icon: 'log-out-outline', color: '#EF4444' },
  ];

  // Filter menu items based on search
  const filteredMenuItems = whatsappMenuItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity
        style={[styles.menuBackdrop, isWeb && styles.menuBackdropWeb]}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.menuContainer,
            isWeb && styles.menuContainerWeb,
            {
              transform: [{ translateX: slideAnim }],
              backgroundColor: isDark ? '#111B21' : '#e7e6e5',
              width: isWeb ? Math.min(screenWidth * 0.3, 400) : width * 0.85,
              maxWidth: isWeb ? 400 : undefined,
            },
          ]}
        >
          {/* Header Section - WhatsApp Style */}
          <View style={[styles.menuHeader, { backgroundColor: isDark ? '#202C33' : '#008069' }, isWeb && styles.menuHeaderWeb]}>
            <View style={[styles.userInfoContainer, isWeb && styles.userInfoContainerWeb]}>
              {userData?.profile_picture ? (
                <Image
                  source={{ uri: userData.profile_picture }}
                  style={[styles.userAvatar, isWeb && styles.userAvatarWeb]}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: '#0c4036ff' }, isWeb && styles.avatarPlaceholderWeb]}>
                  <Text style={styles.avatarText}>
                    {getInitials(userData?.full_name || 'User')}
                  </Text>
                </View>
              )}

              <View style={[styles.userDetails, isWeb && styles.userDetailsWeb]}>
                <Text style={[styles.userName, isWeb && styles.userNameWeb]} numberOfLines={1}>
                  {userData?.full_name || 'User'}
                </Text>
                <Text style={[styles.userStatus, isWeb && styles.userStatusWeb]} numberOfLines={1}>
                  {userData?.designation || 'Employee'}
                </Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <ScrollView style={[styles.menuItemsContainer, isWeb && styles.menuItemsContainerWeb]}>
            {filteredMenuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  isWeb && styles.menuItemWeb,
                  activeMenuItem === item.title && styles.activeMenuItem,
                  index === filteredMenuItems.length - 1 && styles.lastMenuItem,
                ]}
                onPress={() => {
                  if (item.id === 'logout') {
                    onLogout();
                  } else {
                    onMenuItemPress(item);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: isDark ? '#2A3942' : '#F0F2F5' }, isWeb && styles.menuIconContainerWeb]}>
                  <Ionicons
                    name={item.icon as any}
                    size={isWeb ? 24 : 22}
                    color={item.color}
                  />
                </View>
                <Text style={[styles.menuItemText, { color: isDark ? '#E9EDEF' : '#111B21' }, isWeb && styles.menuItemTextWeb]}>
                  {item.title}
                </Text>

                {item.id !== 'logout' && (
                  <Ionicons
                    name="chevron-forward"
                    size={isWeb ? 20 : 18}
                    color={isDark ? '#8696A0' : '#667781'}
                    style={styles.chevronIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Footer - App Version */}
          <View style={[styles.menuFooter, { borderTopColor: isDark ? '#2A3942' : '#F0F2F5' }, isWeb && styles.menuFooterWeb]}>
            <Text style={[styles.versionText, { color: isDark ? '#8696A0' : '#667781' }, isWeb && styles.versionTextWeb]}>
              Citadel v1.0.0
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </>
  );
};

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

// Main Dashboard Component
function DashboardContent({ onLogout }: { onLogout: () => void }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  // State
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

  // Page visibility states
  const [showAttendance, setShowAttendance] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHR, setShowHR] = useState(false);
  const [showCab, setShowCab] = useState(false);
  const [showDriver, setShowDriver] = useState(false);
  const [showBDT, setShowBDT] = useState(false);
  const [showMedical, setShowMedical] = useState(false);
  const [showScoutBoy, setShowScoutBoy] = useState(false);
  const [showCreateSite, setShowCreateSite] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [showBUP, setShowBUP] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEmployeeManagement, setShowEmployeeManagement] = useState(false);
  const [showHREmployeeManager, setShowHREmployeeManagement] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showChatRoom, setShowChatRoom] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedChatRoom, setSelectedChatRoom] = useState<any>(null);
  const [showDriverManager, setShowDriverManager] = useState(false);
  const [showHrManager, setShowHrManager] = useState(false);

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

  // Animations
  const circleScale = useRef(new Animated.Value(0)).current;
  const switchToggle = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isWeb ? 0 : -300)).current;
  const bulgeAnim = useRef(new Animated.Value(0)).current;

  // Current theme colors
  const currentColors = isDark ? darkColors : lightColors;

  // New dashboard theme mapping
  const theme = {
    bgColor: isDark ? '#050b18' : '#ece5dd',
    cardBg: isDark ? '#111a2d' : '#f6f6f6',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    accentBlue: isDark ? '#008069' : '#008069',
    navBg: isDark ? '#0a111f' : '#ffffff',
  };

  // Default modules for new users
  const defaultLastOpened: IconItem[] = [
    { name: 'Attendance', color: '#ffb157', icon: 'book', library: 'fa5', module_unique_name: 'attendance' },
  ];

  // NEW: Function to refresh user data from backend
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
          
          // Update state
          setUserData(transformedUserData);
          setModules(data.modules || []);
          
          // Update AsyncStorage
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

          // Update last opened modules with fresh data
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

  // NEW: Auto-refresh when returning from Profile screen
  useEffect(() => {
    if (!showProfile && userData) {
      // Refresh data when coming back from Profile screen
      refreshUserData();
    }
  }, [showProfile, refreshUserData]);

  // Debug logging function
  const debugLog = async (message: string, data?: any) => {
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
  };

  // Function to register for push notifications
  async function registerForPushNotificationsAsync() {
    let token;
    try {
      await debugLog('[Push Token] Starting registration...');
      if (!Device.isDevice) {
        await debugLog('[Push Token] Not a physical device');
        Alert.alert('Debug', 'Not a physical device');
        return undefined;
      }
      await debugLog('[Push Token] Device check passed');

      if (Platform.OS === 'android') {
        await NotificationsExpo.setNotificationChannelAsync('default', {
          name: 'default',
          importance: NotificationsExpo.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2D3748',
        });
        await debugLog('[Push Token] Notification channel created');
      }

      const { status: existingStatus } = await NotificationsExpo.getPermissionsAsync();
      await debugLog('[Push Token] Existing permission status', existingStatus);
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await NotificationsExpo.requestPermissionsAsync();
        finalStatus = status;
        await debugLog('[Push Token] New permission status', status);
      }

      if (finalStatus !== 'granted') {
        await debugLog('[Push Token] Permission denied');
        Alert.alert('Permission Denied', 'Please enable notifications in settings');
        return undefined;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId
        || Constants.easConfig?.projectId;
      await debugLog('[Push Token] Project ID', projectId);

      if (!projectId) {
        await debugLog('[Push Token] ERROR: No project ID found');
        Alert.alert(
          'Configuration Error',
          'Project ID missing. Please contact support.'
        );
        return undefined;
      }

      await debugLog('[Push Token] Getting token for project', projectId);
      const tokenData = await NotificationsExpo.getExpoPushTokenAsync({
        projectId
      });
      token = tokenData.data;
      await debugLog('[Push Token] Success', token);
      return token;
    } catch (error: any) {
      await debugLog('[Push Token Error]', error.message);
      return undefined;
    }
  };

  // Function to send token to backend
  const sendTokenToBackend = async (expoToken: string, userToken: string) => {
    await debugLog('=== SENDING TOKEN TO BACKEND ===');
    await debugLog('Expo Token', expoToken);
    await debugLog('User Token exists', !!userToken);

    if (!expoToken || !userToken) {
      await debugLog('ERROR: Missing tokens', { expoToken: !!expoToken, userToken: !!userToken });
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
      const data = await response.json();
      await debugLog('Backend response', data);

      if (response.ok) {
        await debugLog('✅ Push token registered successfully');
        await AsyncStorage.setItem('expo_push_token', expoToken);
      } else {
        await debugLog('❌ Failed to register push token', data.message);
      }
    } catch (error: any) {
      await debugLog('❌ Network error', error.message);
    }
  };

  // Function to auto-mark attendance
  const autoMarkAttendance = async () => {
    console.log('🎯 AUTO-MARK ATTENDANCE: Starting automatic attendance marking...');
    try {
      const token = await AsyncStorage.getItem(TOKEN_2_KEY);
      if (!token) {
        console.log('❌ No token found');
        return;
      }

      const lastMarked = await AsyncStorage.getItem('last_attendance_marked');
      if (lastMarked) {
        const lastDate = new Date(lastMarked);
        const today = new Date();
        if (
          lastDate.getDate() === today.getDate() &&
          lastDate.getMonth() === today.getMonth() &&
          lastDate.getFullYear() === today.getFullYear()
        ) {
          console.log('✅ Attendance already marked today via notification');
          return;
        }
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Location permission denied');
        const bgStatus = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus.status !== 'granted') {
          console.log('❌ Background location permission also denied');
          return;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
      });

      console.log('📍 Location obtained:', location.coords);
      const response = await fetch(`${BACKEND_URL}/core/markAutoAttendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          latitude: location.coords.latitude.toString(),
          longitude: location.coords.longitude.toString(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Attendance marked successfully:', result);
        await AsyncStorage.setItem('last_attendance_marked', new Date().toISOString());
        Alert.alert(
          'Attendance Marked',
          'Your attendance has been marked automatically!',
          [{ text: 'OK' }]
        );
      } else {
        console.log('❌ Failed to mark attendance:', response.status);
      }
    } catch (error) {
      console.error('❌ Auto-mark attendance error:', error);
    }
  };

  useEffect(() => {
    const navItems = ['home', 'message', 'hrpedia', 'support'];
    const activeIndex = navItems.indexOf(activeNavItem);
    Animated.spring(bulgeAnim, {
      toValue: activeIndex,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [activeNavItem]);

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
        }

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
          } else if (data?.page) {
            handleNotificationNavigation(data.page as string);
          }
        });

        const lastNotificationResponse = await NotificationsExpo.getLastNotificationResponseAsync();
        if (lastNotificationResponse) {
          debugLog('📬 App opened from notification', lastNotificationResponse);
          const data = lastNotificationResponse.notification.request.content.data;
          if (data?.page === 'autoMarkAttendance') {
            setTimeout(() => {
              AttendanceUtils.executeAttendanceFlow('manual', true);
            }, 1000);
          } else if (data?.page) {
            setTimeout(() => {
              handleNotificationNavigation(data.page as string);
            }, 500);
          }
        }
      } catch (error: any) {
        await debugLog('Error in setupNotifications', error.message);
      }
    };

    if (!isWeb) {
      setupNotifications();
    }

    return () => {
      isMounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [token]);

  // Function to handle notification navigation
  const handleNotificationNavigation = (page: string) => {
    console.log('Handling notification navigation for page:', page);
    if (page === 'autoMarkAttendance') {
      console.log('🎯 SPECIAL CODE: Auto-marking attendance...');
      return;
    }

    switch (page.toLowerCase()) {
      case 'attendance':
        setAttendanceKey(prev => prev + 1);
        setShowAttendance(true);
        break;
      case 'hr':
        setShowHR(true);
        break;
      case 'cab':
        setShowCab(true);
        break;
      case 'profile':
        setShowProfile(true);
        break;
      case 'driver':
        setShowDriver(true);
        break;
      case 'bdt':
        setShowBDT(true);
        break;
      case 'medical':
      case 'mediclaim':
        setShowMedical(true);
        break;
      case 'scoutboy':
      case 'scout_boy':
        setShowScoutBoy(true);
        break;
      case 'reminder':
        setShowReminder(true);
        break;
      case 'bup':
        setShowBUP(true);
        break;
      case 'employee_management':
        setShowEmployeeManagement(true);
        break;
      case 'driver_manager':
        setShowDriverManager(true);
        break;
      case 'hr_manager':
        setShowHrManager(true)
        break;
      case 'hr_employee_management':
        setShowHREmployeeManagement(true);
        break;
      default:
        console.log('Unknown page:', page);
    }
  };

  // Function to set autoReconfigure
  const setAutoReconfigure = async () => {
    if (!token) return;
    const response = await fetch(`${BACKEND_URL}/core/updateDeviceId`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    let SecureStore: any = null;
    if (Platform.OS !== 'web') {
      SecureStore = require('expo-secure-store');
    }

    if (response.ok) {
      console.log('Device ID updated successfully');
      const data = await response.json();
      if (SecureStore) {
        await SecureStore.setItemAsync('device_id', data.device_id);
      }
    } else {
      console.error('Failed to update device ID');
    }
  };

  // Fetch user data from backend
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_2_KEY);
        setToken(storedToken);
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

        setLoading(true);
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

            if (data.autoReconfigure) {
              setAutoReconfigure();
            }

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
                if (modulesArray.length < 4 && data.modules.length > 0) {
                  populateMissingLastOpenedModules();
                }
              }
            } else {
              populateMissingLastOpenedModules();
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
    fetchUserData();
  }, []);

  const loadLastOpenedModules = async () => {
    try {
      const storedModules = await AsyncStorage.getItem('last_opened_modules');
      if (storedModules) {
        let modulesArray = JSON.parse(storedModules);
        const uniqueModules: any[] = [];
        const seen = new Set();
        for (const module of modulesArray) {
          if (!seen.has(module.module_unique_name)) {
            seen.add(module.module_unique_name);
            uniqueModules.push(module);
          }
        }
        modulesArray = uniqueModules.slice(0, 4);
        if (modules.length > 0) {
          modulesArray = modulesArray.map((storedModule: any) => {
            const backendModule = modules.find(
              m => m.module_unique_name === storedModule.module_unique_name ||
                m.module_name.toLowerCase().replace('_', ' ') === storedModule.title.toLowerCase()
            );
            if (backendModule) {
              return {
                ...storedModule,
                title: backendModule.module_name.charAt(0).toUpperCase() +
                  backendModule.module_name.slice(1).replace('_', ' '),
                iconUrl: backendModule.module_icon,
                module_unique_name: backendModule.module_unique_name
              };
            }
            const partialMatch = modules.find(m =>
              m.module_name.toLowerCase().includes(storedModule.title.toLowerCase()) ||
              storedModule.title.toLowerCase().includes(m.module_name.toLowerCase())
            );
            if (partialMatch) {
              return {
                ...storedModule,
                title: partialMatch.module_name.charAt(0).toUpperCase() +
                  partialMatch.module_name.slice(1).replace('_', ' '),
                iconUrl: partialMatch.module_icon,
                module_unique_name: partialMatch.module_unique_name
              };
            }
            return storedModule;
          });
          await AsyncStorage.setItem('last_opened_modules', JSON.stringify(modulesArray));
        }
        setLastOpenedModules(modulesArray);
        if (modulesArray.length < 4) {
          populateMissingLastOpenedModules();
        }
      } else {
        populateMissingLastOpenedModules();
      }
    } catch (error) {
      console.error('Error loading last opened modules:', error);
    }
  };

  // Initialize background services
  useEffect(() => {
    if (!token || !userData || isWeb) return;

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
  }, [token, userData]);

  // Function to get upcoming events
  const getUpcomingEvents = (birthdays: any[], anniversaries: any[]): UpcomingEvent[] => {
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
  };

  // Function to get initials from name
  const getInitials = (fullName: string): string => {
    return fullName.split(' ').map(name => name.charAt(0).toUpperCase()).join('').substring(0, 2);
  };

  // Function to format date beautifully
  const formatEventDate = (dateString: string): { day: string, month: string, year?: string } => {
    const date = new Date(dateString);
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      year: date.getFullYear().toString()
    };
  };

  // Function to format anniversary years
  const formatAnniversaryYears = (years: number): string => {
    if (years === 1) return '1st';
    if (years === 2) return '2nd';
    if (years === 3) return '3rd';
    return `${years}th`;
  };

  // Get icon URL helper
  const getIconUrl = (item: IconItem): string => {
    if (item.iconUrl) return item.iconUrl;
    return `https://cdn-icons-png.flaticon.com/512/3135/3135715.png`;
  };

  // Handle theme toggle with animation
  const handleThemeToggle = () => {
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
  };

  // Handle module press
  const handleModulePress = (moduleName: string, moduleUniqueName?: string) => {
    const key = moduleUniqueName?.toLowerCase() || moduleName.toLowerCase();
    let moduleData = null;
    if (modules.length > 0) {
      const backendModule = modules.find(
        m => m.module_unique_name === moduleUniqueName ||
          m.module_name.toLowerCase().replace('_', ' ') === moduleName.toLowerCase()
      );
      if (backendModule) {
        moduleData = {
          title: backendModule.module_name.charAt(0).toUpperCase() +
            backendModule.module_name.slice(1).replace('_', ' '),
          iconUrl: backendModule.module_icon,
          module_unique_name: backendModule.module_unique_name
        };
      }
    }
    if (!moduleData) {
      moduleData = {
        title: moduleName,
        iconUrl: `https://cdn-icons-png.flaticon.com/512/3135/3135715.png`,
        module_unique_name: moduleUniqueName || moduleName.toLowerCase()
      };
    }

    saveLastOpenedModule(moduleData);

    if (key.includes('attendance')) {
      setAttendanceKey(prev => prev + 1);
      setShowAttendance(true);
    } else if (key.includes('hr') && key != "hr_manager" && key !="hr_employee_management") {
      setShowHR(true);
    } else if (key.includes('cab')) {
      setShowCab(true);
    } else if (key.includes('driver') && key != "driver_manager") {
      setShowDriver(true);
    } else if (key.includes('bdt')) {
      setShowBDT(true);
    } else if (key.includes('mediclaim') || key.includes('medical')) {
      setShowMedical(true);
    } else if (key.includes('scout')) {
      setShowScoutBoy(true);
      // Alert.alert('Scout Boy', 'Scout Boy feature will be available soon!');
    } else if (key.includes('reminder')) {
      setShowReminder(true);
    } else if (key.includes('bup') || key.includes('business update')) {
      setShowBUP(true);
    } else if (key.includes('employee_management') && key != "hr_employee_management") {
      setShowEmployeeManagement(true);
    }
    else if(key.includes('hr_employee_management')){
      setShowHREmployeeManagement(true)
    }
    else if (key.includes('driver_manager') || key.includes('driver manager')) {
      setShowDriverManager(true);
    }
    else if(key.includes('hr_manager') || key.includes('hr manager')) {
      setShowHrManager(true);
    }
    else {
      Alert.alert('Coming Soon', `${moduleName} module will be available soon!`);
    }
  };

  const populateMissingLastOpenedModules = async () => {
    try {
      const storedModules = await AsyncStorage.getItem('last_opened_modules');
      let modulesArray = storedModules ? JSON.parse(storedModules) : [];
      if (modulesArray.length < 4 && modules.length > 0) {
        const existingModuleNames = new Set(modulesArray.map((m: any) => m.module_unique_name));
        const availableBackendModules = modules.filter(
          (backendModule: any) => !existingModuleNames.has(backendModule.module_unique_name)
        );
        const shuffledModules = [...availableBackendModules].sort(() => 0.5 - Math.random());
        while (modulesArray.length < 4 && shuffledModules.length > 0) {
          const randomModule = shuffledModules.pop();
          if (randomModule) {
            modulesArray.push({
              title: randomModule.module_name.charAt(0).toUpperCase() +
                randomModule.module_name.slice(1).replace('_', ' '),
              iconUrl: randomModule.module_icon,
              module_unique_name: randomModule.module_unique_name
            });
          }
        }
        if (modulesArray.length < 4) {
          const defaultModules = [...defaultLastOpened];
          const shuffledDefaults = [...defaultModules].sort(() => 0.5 - Math.random());
          while (modulesArray.length < 4 && shuffledDefaults.length > 0) {
            const defaultModule = shuffledDefaults.pop();
            if (defaultModule) {
              const alreadyExists = modulesArray.some(
                (m: any) => m.module_unique_name === defaultModule.module_unique_name
              );
              if (!alreadyExists) {
                const backendModule = modules.find(
                  (m: any) => m.module_unique_name === defaultModule.module_unique_name
                );
                if (backendModule) {
                  modulesArray.push({
                    title: backendModule.module_name.charAt(0).toUpperCase() +
                      backendModule.module_name.slice(1).replace('_', ' '),
                    iconUrl: backendModule.module_icon,
                    module_unique_name: backendModule.module_unique_name
                  });
                } else {
                  modulesArray.push({
                    title: defaultModule.name,
                    iconUrl: getIconUrl(defaultModule),
                    module_unique_name: defaultModule.module_unique_name || defaultModule.name.toLowerCase()
                  });
                }
              }
            }
          }
        }
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
    } catch (error) {
      console.error('Error populating missing modules:', error);
    }
  };

  // Save last opened module
  const saveLastOpenedModule = async (module: any) => {
    try {
      const storedModules = await AsyncStorage.getItem('last_opened_modules');
      let modulesArray = storedModules ? JSON.parse(storedModules) : [];

      let moduleData = module;
      if (modules.length > 0) {
        const backendModule = modules.find(
          m => m.module_unique_name === module.module_unique_name ||
            m.module_name.toLowerCase().replace('_', ' ') === module.title.toLowerCase()
        );
        if (backendModule) {
          moduleData = {
            title: backendModule.module_name.charAt(0).toUpperCase() +
              backendModule.module_name.slice(1).replace('_', ' '),
            iconUrl: backendModule.module_icon,
            module_unique_name: backendModule.module_unique_name
          };
        } else if (module.module_unique_name) {
          const backendModuleByName = modules.find(
            m => m.module_unique_name === module.module_unique_name
          );
          if (backendModuleByName) {
            moduleData = {
              title: backendModuleByName.module_name.charAt(0).toUpperCase() +
                backendModuleByName.module_name.slice(1).replace('_', ' '),
              iconUrl: backendModuleByName.module_icon,
              module_unique_name: backendModuleByName.module_unique_name
            };
          }
        }
      }

      modulesArray = modulesArray.filter((m: any) =>
        m.module_unique_name !== moduleData.module_unique_name
      );

      modulesArray.unshift(moduleData);

      if (modulesArray.length > 4) {
        modulesArray = modulesArray.slice(0, 4);
      }

      await AsyncStorage.setItem('last_opened_modules', JSON.stringify(modulesArray));
      setLastOpenedModules(modulesArray);
    } catch (error) {
      console.error('Error saving last opened module:', error);
    }
  };

  const [showValidation, setShowValidation] = useState(false);

  // Handle back from pages
  const handleBackFromPage = () => {
    setShowAttendance(false);
    setShowProfile(false);
    setShowHR(false);
    setShowCab(false);
    setShowDriver(false);
    setShowBDT(false);
    setShowMedical(false);
    setShowScoutBoy(false);
    setShowCreateSite(false);
    setShowReminder(false);
    setShowBUP(false);
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
  };

  // Handle logout
  const handleLogout = async () => {
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
  };

  // Open menu
  const openMenu = () => {
    setIsMenuVisible(true);
    if (!isWeb) {
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  };

  // Close menu
  const closeMenu = () => {
    if (!isWeb) {
      Animated.timing(slideAnim, { toValue: -300, duration: 300, useNativeDriver: true }).start(() => setIsMenuVisible(false));
    } else {
      setIsMenuVisible(false);
    }
  };

  // Handle nav item press
  const handleNavItemPress = (navItem: string) => {
    setActiveNavItem(navItem);
    if (navItem === 'message') {
      Alert.alert('Support', 'Citadel Hub will be available soon!');
    } else if (navItem === 'hr') {
      setShowHR(true);
    } else if (navItem === 'support') {
      Alert.alert('Support', 'Support feature will be available soon!');
    } else if (navItem !== 'home') {
      Alert.alert('Coming Soon', `${navItem} feature will be available soon!`);
    }
  };

  // Get display modules
  const getDisplayModules = () => {
    if (modules.length > 0) {
      return modules.map(module => ({
        title: module.module_name.charAt(0).toUpperCase() + module.module_name.slice(1).replace('_', ' '),
        iconUrl: module.module_icon,
        module_unique_name: module.module_unique_name,
        is_generic: module.is_generic
      }));
    }
    return defaultLastOpened.map(item => {
      const backendModule = modules.find(m =>
        m.module_unique_name === item.module_unique_name ||
        m.module_name.toLowerCase().replace('_', ' ') === item.name.toLowerCase()
      );
      return {
        title: item.name,
        iconUrl: backendModule ? backendModule.module_icon : getIconUrl(item),
        module_unique_name: item.module_unique_name || item.name.toLowerCase(),
        is_generic: true
      };
    });
  };

  // Filter modules based on search query
  const filteredModules = getDisplayModules().filter(module =>
    module.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Menu items for the old menu (keeping for reference but not used)
  const drawerMenuItems = [
    { id: 'profile', title: 'Profile', icon: 'user', color: '#3B82F6' },
    { id: 'settings', title: 'Settings', icon: 'settings', color: '#3B82F6' },
    { id: 'notifications', title: 'Notifications', icon: 'notification', color: '#F59E0B' },
    { id: 'privacy', title: 'Privacy Policy', icon: 'shield', color: '#1E40AF' },
    { id: 'messages', title: 'Messages', icon: 'chatbubbles', color: '#10B981' },
  ];

  const handleMenuItemPress = (item: any) => {
    setActiveMenuItem(item.title);
    closeMenu();
    if (item.id === 'profile') {
      setShowProfile(true);
    } else if (item.id === 'settings') {
      setShowSettings(true);
    } else if (item.id === 'validation') {
      setShowValidation(true);
    } else if (item.id === 'messages') {
      Alert.alert('Coming Soon', `${item.title} feature will be available soon!`);
    } else if (item.id === 'notifications') {
      setShowNotifications(true);
    } else if (item.id === 'logout') {
      handleLogout();
    } else {
      Alert.alert('Coming Soon', `${item.title} feature will be available soon!`);
    }
  };

  // Animation values
  const maxRadius = Math.sqrt(screenWidth * screenWidth + screenHeight * screenHeight);
  const circleSize = circleScale.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxRadius * 2.5],
  });

  const switchTranslate = switchToggle.interpolate({
    inputRange: [0, 1],
    outputRange: [4, screenWidth * 0.43 - 54],
  });

  // Loading state
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bgColor }, isWeb && styles.loadingContainerWeb]}>
        <ActivityIndicator size="large" color={theme.accentBlue} />
        <Text style={[styles.loadingText, { color: theme.textMain }, isWeb && styles.loadingTextWeb]}>Loading...</Text>
      </View>
    );
  }

  // Error state
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

  if (showValidation) {
    return (
      <ValidationScreen onBack={handleBackFromPage} />
    );
  }

  // Render different pages
  if (showChatRoom && selectedChatRoom) {
    return (
      <ChatRoomScreen
        chatRoom={selectedChatRoom}
        onBack={handleBackFromPage}
        currentUserId={userData?.employee_id ? parseInt(userData.employee_id) : 1}
      />
    );
  }

  if (showChat) {
    return (
      <ChatScreen
        onBack={handleBackFromPage}
        onOpenChatRoom={setSelectedChatRoom}
        currentUserId={userData?.employee_id ? parseInt(userData.employee_id) : 1}
      />
    );
  }

  if (showNotifications) {
    return (
      <Notifications onBack={handleBackFromPage} isDark={isDark} />
    );
  }

  if (showDriverManager) {
    return (
      <DriverManager onBack={handleBackFromPage} />
    );
  }

  if(showHrManager){
    return (
      <HR_Manager onBack={handleBackFromPage} />
    );
  }

  if (showAttendance) {
    return (
      <AttendanceWrapper key={attendanceKey} onBack={handleBackFromPage} attendanceKey={attendanceKey} />
    );
  }

  // UPDATED: Profile component with callback for real-time updates
  if (showProfile) {
    return (
      <Profile 
        onBack={handleBackFromPage} 
        userData={userData} 
        onProfileUpdate={(updatedData) => {
          // Update Dashboard's userData immediately
          setUserData(updatedData);
          // Also refresh from backend to get all latest data
          refreshUserData();
        }}
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

  if (showReminder) {
    return (
      <Reminder onBack={handleBackFromPage} />
    );
  }

  if (showBUP) {
    return (
      <BUP onBack={handleBackFromPage} />
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

  if (showHREmployeeManager){
    return (
      <HREmployeeManager onBack={handleBackFromPage} />
    );
  }

  if (showCreateSite) {
    return (
      <CreateSite onBack={handleBackFromPage} colors={undefined} spacing={undefined} fontSize={undefined} borderRadius={undefined} shadows={undefined} />
    );
  }

  // Module Grid - Responsive version
  const ModuleGrid = () => {
    if (isWeb) {
      // Web layout - 4 modules in a row
      return (
        <View style={[styles.moduleGrid, isWeb && styles.moduleGridWeb]}>
          {(['attendance', 'cab', 'hr', 'medical'] as const).map((moduleType, index) => {
            const moduleInfo = {
              attendance: { name: 'Attendance', icon: 'book-open', gradient: ['#00d285', '#00b872'] },
              cab: { name: 'Car', icon: 'car', gradient: ['#ff5e7a', '#ff4168'] },
              hr: { name: 'HR', icon: 'users', gradient: ['#ffb157', '#ff9d3f'] },
              medical: { name: 'Medical', icon: 'heartbeat', gradient: ['#1da1f2', '#1a8cd8'] }
            }[moduleType];
            
            if (!moduleInfo) return null;
              return (
                <TouchableOpacity
                  key={moduleType}
                  style={[styles.moduleSmall, isWeb && styles.moduleWeb]}
                  onPress={() => handleModulePress(moduleInfo.name, moduleType)}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={moduleInfo.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.moduleGradient, isWeb && styles.moduleGradientWeb]}
                  >
                    <Ionicons
                      name="arrow-up"
                      size={isWeb ? 18 : 16}
                      color="white"
                      style={[styles.moduleArrow, { transform: [{ rotate: '45deg' }] }]}
                    />
                    <View style={[styles.moduleIconCircle, isWeb && styles.moduleIconCircleWeb]}>
                      <FontAwesome5 name={moduleInfo.icon as any} size={isWeb ? 20 : 18} color="white" />
                    </View>
                    <Text style={[styles.moduleTitle, isWeb && styles.moduleTitleWeb]}>{moduleInfo.name}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      }

    // Mobile layout - Original design
    return (
      <View style={[styles.moduleGrid, isWeb && styles.moduleGridWeb]}>
        <TouchableOpacity
          style={[styles.moduleAttendance, isWeb && styles.moduleAttendanceWeb]}
          onPress={() => handleModulePress('Attendance', 'attendance')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#00d285', '#00b872']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.moduleGradient, isWeb && styles.moduleGradientWeb]}
          >
            <Ionicons
              name="arrow-up"
              size={isWeb ? 22 : 18}
              color="white"
              style={[styles.moduleArrow, { transform: [{ rotate: '45deg' }] }]}
            />
            <View style={[styles.moduleIconCircle, isWeb && styles.moduleIconCircleWeb]}>
              <FontAwesome5 name="book-open" size={isWeb ? 26 : 22} color="white" />
            </View>
            <Text style={[styles.moduleTitle, isWeb && styles.moduleTitleWeb]}>Attendance</Text>
          </LinearGradient>
        </TouchableOpacity>
        <View style={[styles.moduleColumn, isWeb && styles.moduleColumnWeb]}>
          <TouchableOpacity
            style={[styles.moduleSmall, isWeb && styles.moduleWeb]}
            onPress={() => handleModulePress('Car', 'cab')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#ff5e7a', '#ff4168']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.moduleGradient, isWeb && styles.moduleGradientWeb]}
            >
              <Ionicons
                name="arrow-up"
                size={isWeb ? 18 : 16}
                color="white"
                style={[styles.moduleArrow, { transform: [{ rotate: '45deg' }] }]}
              />
              <View style={[styles.moduleIconCircle, isWeb && styles.moduleIconCircleWeb]}>
                <FontAwesome5 name="car" size={isWeb ? 20 : 18} color="white" />
              </View>
              <Text style={[styles.moduleTitle, isWeb && styles.moduleTitleWeb]}>Car</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.moduleSmall, isWeb && styles.moduleWeb]}
            onPress={() => handleModulePress('HR', 'hr')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#ffb157', '#ff9d3f']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.moduleGradient, isWeb && styles.moduleGradientWeb]}
            >
              <Ionicons
                name="arrow-up"
                size={isWeb ? 18 : 16}
                color="white"
                style={[styles.moduleArrow, { transform: [{ rotate: '45deg' }] }]}
              />
              <View style={[styles.moduleIconCircle, isWeb && styles.moduleIconCircleWeb]}>
                <FontAwesome5 name="users" size={isWeb ? 20 : 18} color="white" />
              </View>
              <Text style={[styles.moduleTitle, isWeb && styles.moduleTitleWeb]}>HR</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // View All Modules Button - Responsive
  const ViewAllModulesButton = () => (
    <TouchableOpacity
      style={[styles.viewAllContainer, { marginHorizontal: isWeb ? 'auto' : 20 }, isWeb && styles.viewAllContainerWeb]}
      onPress={() => setAllModulesVisible(true)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[currentColors.gradientStart, currentColors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.viewAllButton, isWeb && styles.viewAllButtonWeb]}
      >
        <Text style={[styles.viewAllText, isWeb && styles.viewAllTextWeb]}>View all modules</Text>
        <View style={styles.chevronGroup}>
          <Ionicons name="chevron-forward" size={isWeb ? 18 : 16} color="white" />
          <Ionicons name="chevron-forward" size={isWeb ? 18 : 16} color="white" style={{ marginLeft: -8 }} />
          <Ionicons name="chevron-forward" size={isWeb ? 18 : 16} color="white" style={{ marginLeft: -8 }} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // NEW: Refresh button component for Dashboard header
  const RefreshButton = () => (
    <TouchableOpacity 
      onPress={refreshUserData}
      style={styles.refreshButton}
      disabled={refreshing}
    >
      {refreshing ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Ionicons name="refresh" size={24} color="white" />
      )}
    </TouchableOpacity>
  );

  // Main dashboard render
  return (
    <View style={[styles.safeContainer, isWeb && styles.safeContainerWeb]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'light-content'}
        backgroundColor={currentColors.headerBg}
        translucent={false}
      />

      {/* WhatsApp-style Hamburger Menu */}
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

      {/* All Modules Modal */}
      <AllModulesModal
        isVisible={allModulesVisible}
        onClose={() => setAllModulesVisible(false)}
        modules={filteredModules}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onModulePress={handleModulePress}
        theme={theme}
        currentColors={currentColors}
      />

      <View style={[styles.mainContent, { backgroundColor: theme.bgColor }, isWeb && styles.mainContentWeb]}>
        {/* Animated Circle Overlay */}
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

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, isWeb && styles.scrollContentWeb]}
          style={isWeb && styles.scrollViewWeb}
        >
          {/* Header Banner with dark overlay */}
          <LinearGradient
            colors={isDark ? ['#000D24', '#000D24'] : ['#4A5568', '#2D3748']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerBanner, isWeb && styles.headerBannerWeb]}
          >
            <Image
              source={require('../assets/bg.jpeg')}
              style={[styles.headerImage, isWeb && styles.headerImageWeb] as any}
              resizeMode="cover"
            />
            <View style={[styles.headerOverlay, {
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.3)'
            }, isWeb && styles.headerOverlayWeb]} />
            <View style={[styles.headerContent, { paddingTop: Platform.OS === 'ios' ? 40 : 20 }, isWeb && styles.headerContentWeb]}>
              <View style={[styles.topNav, { marginBottom: 10, marginTop: Platform.OS === 'ios' ? 10 : 20 }, isWeb && styles.topNavWeb]}>
                <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
                  {[1, 2, 3].map(i => (
                    <View key={i} style={[styles.menuLine, { backgroundColor: 'white' }]} />
                  ))}
                </TouchableOpacity>
                <Text style={[styles.logoText, isWeb && styles.logoTextWeb]}>CITADEL</Text>
                <View style={styles.headerSpacer} />
                {/* NEW: Add refresh button */}
                {/* <RefreshButton /> */}
              </View>
              <View style={{ marginTop: isWeb ? 20 : 75 }}>
                <Text style={[styles.welcomeText, isWeb && styles.welcomeTextWeb]}>Welcome!</Text>
                <Text style={[styles.employeeText, isWeb && styles.employeeTextWeb]}>{userData?.first_name + ' ' + userData?.last_name || 'User'}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Quick Actions */}
          <QuickActions
            lastOpenedModules={lastOpenedModules}
            modules={modules}
            theme={theme}
            handleModulePress={handleModulePress}
          />

          {/* Upcoming Reminder */}
          <UpcomingReminder
            reminders={reminders}
            theme={theme}
            currentColors={currentColors}
            onPress={() => handleModulePress('Reminder')}
          />

          {/* Module Grid */}
          <ModuleGrid />

          {/* View All Modules Button */}
          <ViewAllModulesButton />

          {/* Work Statistics */}
          <WorkStatistics
            hoursWorked={hoursWorked}
            overtimeHours={overtimeHours}
            userData={userData}
            theme={theme}
            currentColors={currentColors}
          />

          {/* Upcoming Events */}
          <UpcomingEvents
            upcomingEvents={upcomingEvents}
            theme={theme}
            currentColors={currentColors}
            getInitials={getInitials}
            formatEventDate={formatEventDate}
            formatAnniversaryYears={formatAnniversaryYears}
          />

          {/* Footer */}
          <View style={[styles.footer, isWeb && styles.footerWeb]}>
            <Text style={[styles.footerLogo, isWeb && styles.footerLogoWeb]}>CITADEL</Text>
            <Text style={[styles.footerText, isWeb && styles.footerTextWeb]}>Made with ❤️</Text>
          </View>
        </ScrollView>
      </View>

      {/* Bottom Bar - Only show on mobile */}
      {!isWeb && (
        <BottomBar
          activeNavItem={activeNavItem}
          handleNavItemPress={handleNavItemPress}
          theme={theme}
          currentColors={currentColors}
          bulgeAnim={bulgeAnim}
          screenWidth={screenWidth}
        />
      )}
    </View>
  );
}

// Main Export
export default function CitadelDashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <SafeAreaProvider>
      <DashboardContent onLogout={onLogout} />
    </SafeAreaProvider>
  );
}

// Helper function to get module color
const getModuleColor = (moduleName: string): string => {
  switch (moduleName.toLowerCase()) {
    case 'hr':
      return '#00d285';
    case 'car':
      return '#ff5e7a';
    case 'attendance':
      return '#ffb157';
    case 'bdt':
      return '#1da1f2';
    default:
      return '#008069';
  }
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#000D24',
  },
  safeContainerWeb: {
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  container: {
    flex: 1,
  },
  containerWeb: {
    maxWidth: 1200,
    marginHorizontal: 'auto',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainerWeb: {
    minHeight: Dimensions.get('window').height,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  loadingTextWeb: {
    fontSize: 18,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24
  },
  errorTextWeb: {
    fontSize: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600'
  },
  mainContent: {
    flex: 1,
  },
  mainContentWeb: {
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
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
  scrollContent: {
    paddingBottom: 100,
  },
  scrollContentWeb: {
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  scrollViewWeb: {
    maxWidth: 1200,
    marginHorizontal: 'auto',
  },
  headerBanner: {
    height: 250,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  headerBannerWeb: {
    height: 300,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 20,
  },
  headerImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 1,
  },
  headerImageWeb: {
    borderRadius: 20,
  },
  headerOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  headerOverlayWeb: {
    borderRadius: 20,
  },
  headerContent: {
    padding: 20,
    position: 'relative',
    zIndex: 1,
  },
  headerContentWeb: {
    padding: 40,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topNavWeb: {
    marginTop: 10,
  },
  menuButton: {
    padding: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLine: {
    width: 24,
    height: 2,
    marginVertical: 3,
    borderRadius: 1,
  },
  logoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  logoTextWeb: {
    fontSize: 24,
  },
  headerSpacer: {
    width: 40,
  },
  welcomeText: {
    color: 'white',
    fontSize: 30,
    fontWeight: '700',
  },
  welcomeTextWeb: {
    fontSize: 36,
  },
  employeeText: {
    color: 'white',
    fontSize: 18,
    opacity: 0.8,
    marginTop: 2,
  },
  employeeTextWeb: {
    fontSize: 22,
  },
  moduleGrid: {
    marginHorizontal: 20,
    marginBottom: 15,
    flexDirection: 'row',
    height: 220,
    gap: 12,
  },
  moduleGridWeb: {
    height: 'auto',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 20,
  },
  moduleAttendance: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  moduleAttendanceWeb: {
    flex: 0,
    width: '48%',
    height: 180,
  },
  moduleColumn: {
    flex: 1,
    gap: 12,
  },
  moduleColumnWeb: {
    flex: 0,
    width: '48%',
    gap: 20,
  },

  moduleSmall: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  moduleWeb: {
    flex: 0,
    width: '100%',
    height: 180,
  },
  moduleGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  moduleGradientWeb: {
    padding: 24,
  },
  moduleArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  moduleIconCircle: {
    width: 45,
    height: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 22.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleIconCircleWeb: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  moduleTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  moduleTitleWeb: {
    fontSize: 20,
  },
  viewAllContainer: {
    marginBottom: 15,
  },
  viewAllContainerWeb: {
    width: '90%',
    maxWidth: 400,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    shadowColor: '#008069',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  viewAllButtonWeb: {
    padding: 18,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginRight: 8,
  },
  viewAllTextWeb: {
    fontSize: 16,
  },
  chevronGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 30,
    paddingTop: 15,
  },
  footerWeb: {
    paddingBottom: 50,
  },
  footerLogo: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 5,
    color: '#a9a9a9b6',
    marginBottom: 5,
  },
  footerLogoWeb: {
    fontSize: 32,
  },
  footerText: {
    fontSize: 10,
    color: '#666',
  },
  footerTextWeb: {
    fontSize: 12,
  },
  themeSwitcher: {
    alignItems: 'center',
    marginVertical: 25,
    paddingHorizontal: 20,
  },
  lightSwitch: {
    height: 56,
    borderRadius: 28,
    padding: 6,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    justifyContent: 'center',
  },
  switchTrack: {
    position: 'absolute',
    left: 6,
    top: 6,
    right: 6,
    bottom: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  switchToggleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchNotch: {
    width: 0,
    borderRadius: 3,
  },
  switchIcons: {
    position: 'absolute',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  switchIconContainer: {
    width: 44,
    height: 44,
    paddingLeft: 20,
  },
  // NEW: Refresh button styles
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // WhatsApp-style Hamburger Menu Styles - Web responsive
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  menuBackdropWeb: {
    position: 'fixed',
  },
  menuContainerWeb: {
    position: 'fixed',
    width: '30%',
    minWidth: 300,
    maxWidth: 400,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.85,
    maxWidth: 340,
    zIndex: 1001,
  },

  menuHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  menuHeaderWeb: {
    paddingTop: 60,
    paddingBottom: 30,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfoContainerWeb: {
    alignItems: 'flex-start',
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  userAvatarWeb: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderWeb: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
    marginLeft: 16,
  },
  userDetailsWeb: {
    marginTop: 10,
  },
  userName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  userNameWeb: {
    fontSize: 22,
  },
  userStatus: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  userStatusWeb: {
    fontSize: 16,
  },
  menuItemsContainer: {
    flex: 1,
  },
  menuItemsContainerWeb: {
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemWeb: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  activeMenuItem: {
    backgroundColor: 'rgba(0, 128, 105, 0.1)',
  },
  lastMenuItem: {
    marginBottom: 0,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuIconContainerWeb: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  menuItemTextWeb: {
    fontSize: 18,
  },
  chevronIcon: {
    marginLeft: 8,
  },
  menuFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  menuFooterWeb: {
    padding: 24,
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
  },
  versionTextWeb: {
    fontSize: 14,
  },
});