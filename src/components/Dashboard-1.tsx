import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar,
  Alert, Modal, Animated, KeyboardAvoidingView, Platform, Dimensions, Image, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';
import { BACKEND_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { BackgroundLocationService } from '../services/backgroundLocationTracking';
import Profile from './Profile';
import HR from './HR';
import Cab from './Cab';
import Driver from './Driver';
import BDT from './BDT';
import Medical from './Medical';
import ScoutBoy from './ScoutBoy';
import CreateSite from './CreateSite';
import Reminder from './Reminder';
import BUP from './BUP';
import ChatScreen from './chat/ChatScreen';
import ChatRoomScreen from './chat/ChatRoomScreen';
import Settings from './Settings';
import AttendanceWrapper from './AttendanceWrapper';
import { BackgroundAttendanceService } from '../services/backgroundAttendance';
import EmployeeManagement from './EmployeeManagement';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;
const isSmallScreen = screenHeight < 600;
const isWeb = Platform.OS === 'web';

// Get device type for responsive design
const getDeviceType = () => {
  if (isWeb) {
    if (screenWidth >= 1024) return 'desktop';
    if (screenWidth >= 768) return 'tablet';
    return 'mobile';
  }
  return isTablet ? 'tablet' : 'mobile';
};

const deviceType = getDeviceType();
const isDesktop = deviceType === 'desktop';
const isMobile = deviceType === 'mobile';

// Get responsive values based on device type
const getResponsiveValues = () => {
  return {
    horizontalPadding: isDesktop ? 30 : isTablet ? 24 : 16,
    verticalPadding: isDesktop ? 24 : isTablet ? 20 : 16,
    sectionSpacing: isDesktop ? 28 : isTablet ? 24 : 20,
    cardSpacing: isDesktop ? 16 : isTablet ? 14 : 12,
    logoSize: isDesktop ? 120 : isTablet ? 100 : 80,
    avatarSize: isDesktop ? 80 : isTablet ? 70 : 60,
    iconSize: isDesktop ? 28 : isTablet ? 24 : 22,
    bottomBarHeight: isDesktop ? 90 : isTablet ? 80 : 70,
    waveHeight: isDesktop ? 60 : isTablet ? 50 : 40,
  };
};

const responsive = getResponsiveValues();

// Theme colors
const lightColors = {
  primary: '#FFFFFF',
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
  headerBg: '#2D3748', // Dark blue header for light mode
};

const darkColors = {
  primary: '#000D24', // Dark theme background
  backgroundSecondary: '#0C1D33', // Boxes color with 77% opacity
  white: '#0C1D33', // Box background
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
  headerBg: '#000D24', // Darker blue header for dark mode
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface DashboardProps {
  onLogout: () => void;
  token?: string;
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
  autoReconfigure: boolean
}

interface UpcomingEvent {
  full_name: string;
  date: string;
  type: 'birthday' | 'anniversary';
  years?: number;
}

// Add interface for reminders
interface Reminder {
  id: string;
  title: string;
  time: string;
  icon: string;
  meeting_with?: string;
  meeting_time?: string;
}

// Add this type for drawer menu items
interface MenuItem {
  id: string;
  title: string;
  icon: string;
  screen?: string;
}

// Custom Wave Bottom Bar Component
interface WaveBottomBarProps {
  data: Array<{
    routeName: string;
    tabLabel: string;
    tabIcon: (isFocused: boolean) => React.ReactNode;
  }>;
  selectedTab: string;
  onTabPress: (routeName: string) => void;
  waveColor: string;
  backgroundColor: string;
  barColor: string;
  containerStyle?: any;
  tabButtonStyle?: any;
  tabTextStyle?: any;
  animatedWaveStyle?: any;
}

const CustomWaveBottomBar: React.FC<WaveBottomBarProps> = ({
  data,
  selectedTab,
  onTabPress,
  waveColor,
  backgroundColor,
  barColor,
  containerStyle,
  tabButtonStyle,
  tabTextStyle,
  animatedWaveStyle
}) => {
  const waveAnim = React.useRef(new Animated.Value(0)).current;
  const waveHeight = responsive.waveHeight;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const waveTranslateY = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15]
  });

  const waveScaleX = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.05, 1]
  });

  const opacity = waveAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 0.9, 0.7]
  });

  return (
    <View style={[styles.customBarContainer, containerStyle, { backgroundColor: barColor }]}>
      <Animated.View 
        style={[
          styles.waveEffect,
          animatedWaveStyle,
          {
            backgroundColor: waveColor,
            height: waveHeight,
            opacity: opacity,
            transform: [
              { translateY: waveTranslateY },
              { scaleX: waveScaleX }
            ]
          }
        ]}
      >
        <View style={styles.wavePattern}>
          {[...Array(10)].map((_, i) => (
            <View key={i} style={[styles.waveCircle, { 
              left: `${i * 10}%`,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              width: waveHeight * 0.6,
              height: waveHeight * 0.6,
              borderRadius: waveHeight * 0.3,
            }]} />
          ))}
        </View>
      </Animated.View>
      
      <View style={[styles.tabsContainer, {
        backgroundColor,
        paddingBottom: Platform.OS === 'ios' ? Math.max(responsive.bottomBarHeight * 0.4, 30) : responsive.bottomBarHeight * 0.3,
        paddingTop: 12,
      }]}>
        {data.map((item, index) => {
          const isFocused = selectedTab === item.routeName;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.tabButton,
                tabButtonStyle,
                {
                  paddingVertical: isDesktop ? 12 : isTablet ? 10 : 8,
                }
              ]}
              onPress={() => onTabPress(item.routeName)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.tabIconContainer,
                isFocused && styles.tabIconContainerActive,
                {
                  backgroundColor: isFocused ? `${waveColor}15` : 'transparent',
                  padding: isDesktop ? 10 : isTablet ? 8 : 6,
                  borderRadius: isDesktop ? 16 : isTablet ? 14 : 12,
                }
              ]}>
                {item.tabIcon(isFocused)}
              </View>
              <Text style={[
                styles.tabLabel,
                tabTextStyle,
                {
                  color: isFocused ? waveColor : '#666',
                  fontSize: isDesktop ? 12 : isTablet ? 11 : 10,
                  marginTop: isDesktop ? 6 : isTablet ? 5 : 4,
                  fontWeight: isFocused ? '600' : '500',
                }
              ]}>
                {item.tabLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Theme Toggle Component
const ThemeToggle: React.FC<{
  isDarkMode: boolean;
  onToggle: () => void;
  colors: any;
}> = ({ isDarkMode, onToggle, colors }) => {
  const [animValue] = useState(new Animated.Value(isDarkMode ? 1 : 0));

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: isDarkMode ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isDarkMode]);

  const circleBgColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFD700', '#4A5568']
  });

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30]
  });

  const moonOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  const sunOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0]
  });

  return (
    <TouchableOpacity
      style={[
        styles.themeToggleContainer,
        { backgroundColor: colors.border }
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Animated.View style={[
        styles.themeToggleCircle,
        { 
          backgroundColor: circleBgColor,
          transform: [{ translateX }]
        }
      ]}>
        <Animated.View style={[
          styles.themeIconContainer,
          { opacity: sunOpacity }
        ]}>
          <Text style={styles.themeIcon}>☀️</Text>
        </Animated.View>
        <Animated.View style={[
          styles.themeIconContainer,
          { opacity: moonOpacity }
        ]}>
          <Text style={styles.themeIcon}>🌙</Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [token, setToken] = useState<string | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

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

  const insets = useSafeAreaInsets();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-300));
  const [activeMenuItem, setActiveMenuItem] = useState('Dashboard');
  const [activeNavItem, setActiveNavItem] = useState('home');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([]);
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceKey, setAttendanceKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastOpenedModules, setLastOpenedModules] = useState<any[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [topModules, setTopModules] = useState<any[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [showChatRoom, setShowChatRoom] = useState(false);
  const [selectedChatRoom, setSelectedChatRoom] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [allModulesVisible, setAllModulesVisible] = useState(false);

  const TOKEN_2_KEY = 'token_2';

  // Get current theme colors
  const currentColors = isDarkMode ? darkColors : lightColors;

  // Function to fetch reminders from backend
  const fetchReminders = async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_2_KEY);
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/core/getReminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        const mappedReminders: Reminder[] = data.reminders?.slice(0, 3).map((reminder: any) => ({
          id: reminder.id,
          title: reminder.title || reminder.meeting_with || 'Reminder',
          time: reminder.time || reminder.meeting_time || 'All day',
          icon: reminder.icon || 'bell'
        })) || [];
        setReminders(mappedReminders);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  // Function to fetch all modules from backend
  const fetchAllModules = async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_2_KEY);
      if (!token) return [];

      const response = await fetch(`${BACKEND_URL}/core/getModules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.modules || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching all modules:', error);
      return [];
    }
  };

  // Function to fetch top modules for Modules section
  const fetchTopModules = () => {
    const attendanceModule = modules.find(m => 
      m.module_name.toLowerCase().includes('attendance') || 
      m.module_unique_name.toLowerCase().includes('attendance')
    );
    
    const otherModules = modules.filter(m => 
      !m.module_name.toLowerCase().includes('attendance') && 
      !m.module_unique_name.toLowerCase().includes('attendance')
    ).slice(0, 2);
    
    return { attendanceModule, otherModules };
  };

  // Function to save last opened module
  const saveLastOpenedModule = async (module: any) => {
    try {
      const storedModules = await AsyncStorage.getItem('last_opened_modules');
      let modulesArray = storedModules ? JSON.parse(storedModules) : [];
      
      modulesArray = modulesArray.filter((m: any) => m.module_unique_name !== module.module_unique_name);
      modulesArray.unshift(module);
      
      if (modulesArray.length > 4) {
        modulesArray = modulesArray.slice(0, 4);
      }
      
      await AsyncStorage.setItem('last_opened_modules', JSON.stringify(modulesArray));
      setLastOpenedModules(modulesArray);
    } catch (error) {
      console.error('Error saving last opened module:', error);
    }
  };

  // Function to load last opened modules
  const loadLastOpenedModules = async () => {
    try {
      const storedModules = await AsyncStorage.getItem('last_opened_modules');
      if (storedModules) {
        setLastOpenedModules(JSON.parse(storedModules));
      }
    } catch (error) {
      console.error('Error loading last opened modules:', error);
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
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2D3748',
        });
        await debugLog('[Push Token] Notification channel created');
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      await debugLog('[Push Token] Existing permission status', existingStatus);

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
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

      const tokenData = await Notifications.getExpoPushTokenAsync({
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

  const handleBackFromEmployeeManagement = () => {
    setShowEmployeeManagement(false);
    setActiveMenuItem('Dashboard');
  };

  const handleNotificationNavigation = (page: string) => {
    console.log('Handling notification navigation for page:', page);

    if (page === 'autoMarkAttendance') {
      console.log('🎯 SPECIAL CODE: Auto-marking attendance...');
      return;
    }

    switch (page.toLowerCase()) {
      case 'attendance':
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
      default:
        console.log('Unknown page:', page);
    }
  };

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

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
          debugLog('📱 Notification received in foreground', notification);
          setNotification(notification);

          const data = notification.request.content.data;
          if (data?.page === 'autoMarkAttendance') {
            debugLog('🎯 AUTO-MARK: Detected autoMarkAttendance from notification');
            autoMarkAttendance();
          }
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
          debugLog('👆 Notification tapped', response);
          const data = response.notification.request.content.data;

          if (data?.page === 'autoMarkAttendance') {
            autoMarkAttendance();
          } else if (data?.page) {
            handleNotificationNavigation(data.page as string);
          }
        });

        const lastNotificationResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastNotificationResponse) {
          debugLog('📬 App opened from notification', lastNotificationResponse);
          const data = lastNotificationResponse.notification.request.content.data;

          if (data?.page === 'autoMarkAttendance') {
            setTimeout(() => {
              autoMarkAttendance();
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

    setupNotifications();

    return () => {
      isMounted = false;
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [token]);

  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token_2');
        setToken(storedToken);
      } catch (error) {
        console.error('Error getting token:', error);
      }
    };
    getToken();
  }, []);

  // Load last opened modules on mount
  useEffect(() => {
    loadLastOpenedModules();
  }, []);

  // Fetch reminders on mount
  useEffect(() => {
    if (token) {
      fetchReminders();
    }
  }, [token]);

  // Update top modules when modules change
  useEffect(() => {
    if (modules.length > 0) {
      const { attendanceModule, otherModules } = fetchTopModules();
      setTopModules([attendanceModule, ...otherModules].filter(Boolean));
    }
  }, [modules]);

  // Function to calculate years that will be completed on the anniversary date
  const calculateYearsOnAnniversary = (dateString: string): number => {
    const joiningDate = new Date(dateString);
    const today = new Date();

    let anniversaryThisYear = new Date(today.getFullYear(), joiningDate.getMonth(), joiningDate.getDate());

    if (anniversaryThisYear < today) {
      anniversaryThisYear = new Date(today.getFullYear() + 1, joiningDate.getMonth(), joiningDate.getDate());
    }

    const years = anniversaryThisYear.getFullYear() - joiningDate.getFullYear();
    return years;
  };

  // Function to get upcoming events (birthdays and anniversaries)
  const getUpcomingEvents = (birthdays: any[], anniversaries: any[]): UpcomingEvent[] => {
    const events: UpcomingEvent[] = [];
    const today = new Date();

    birthdays.forEach(user => {
      if (user.birth_date) {
        events.push({
          full_name: user.full_name,
          date: user.birth_date,
          type: 'birthday'
        });
      }
    });

    anniversaries.forEach(user => {
      if (user.joining_date) {
        const years = calculateYearsOnAnniversary(user.joining_date);
        events.push({
          full_name: user.full_name,
          date: user.joining_date,
          type: 'anniversary',
          years: years
        });
      }
    });

    events.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      const today = new Date();

      const thisYearA = new Date(today.getFullYear(), dateA.getMonth(), dateA.getDate());
      const thisYearB = new Date(today.getFullYear(), dateB.getMonth(), dateB.getDate());

      const eventDateA = thisYearA >= today ? thisYearA : new Date(today.getFullYear() + 1, dateA.getMonth(), dateA.getDate());
      const eventDateB = thisYearB >= today ? thisYearB : new Date(today.getFullYear() + 1, dateB.getMonth(), dateB.getDate());

      return eventDateA.getTime() - eventDateB.getTime();
    });

    return events;
  };

  const setAutoReconfigure = async () => {
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

  // Fetch user data
  useEffect(() => {
    if (!token) return;
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${BACKEND_URL}/core/getUser`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: ApiResponse = await response.json();
        if (data.message === "Get modules successful") {
          console.log('User data:', data.user);
          const transformedUserData: UserData = {
            ...data.user,
            profile_picture: data.user.profile_picture || undefined
          };
          setUserData(transformedUserData);
          setModules(data.modules);
          setUpcomingBirthdays(data.upcoming_birthdays || []);
          if (data.autoReconfigure) {
            setAutoReconfigure();
          }
          try {
            await AsyncStorage.setItem('is_driver', JSON.stringify(data.is_driver || false));
            console.log('Driver status saved:', data.is_driver);
          } catch (storageError) {
            console.error('Error saving driver status to storage:', storageError);
          }
          setUpcomingAnniversaries(data.upcoming_anniversary || []);

          const birthdays = data.upcoming_birthdays || [];
          const anniversaries = data.upcoming_anniversary || [];
          const events = getUpcomingEvents(birthdays, anniversaries);
          setUpcomingEvents(events);
        } else {
          throw new Error(data.message || 'Failed to fetch user data');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [token]);

  // Initialize background services AFTER user data is fetched
  useEffect(() => {
    if (!token || !userData) return;

    const initializeBackgroundServices = async () => {
      try {
        console.log('🚀 Initializing all background attendance services...');

        const results = await BackgroundAttendanceService.initializeAll();

        console.log('📊 Background services status:', results);

        if (userData?.office && !results.geofencing) {
          const officeLocation = userData.office;
          if (officeLocation.latitude && officeLocation.longitude) {
            await BackgroundAttendanceService.setOfficeLocation(
              officeLocation.latitude,
              officeLocation.longitude,
              50
            );
            console.log('✅ Office location set from user data');
          }
        }

      } catch (error) {
        console.error('❌ Failed to initialize background services:', error);
      }
    };

    initializeBackgroundServices();
  }, [token, userData]);

  // Initialize random location tracking AFTER user data is fetched
  useEffect(() => {
    if (!token || !userData) return;

    const initializeLocationTracking = async () => {
      try {
        console.log('🎯 Initializing random location tracking service...');

        const initialized = await BackgroundLocationService.initialize();

        if (initialized) {
          console.log('✅ Random location tracking initialized successfully');

          const info = await BackgroundLocationService.getLastTrackedInfo();
          console.log('📊 Random location tracking status:', info);

        } else {
          console.log('❌ Failed to initialize random location tracking');
        }
      } catch (error) {
        console.error('❌ Error initializing random location tracking:', error);
      }
    };

    initializeLocationTracking();

    return () => {
      console.log('🧹 Dashboard unmounting - location service continues in background');
    };
  }, [token, userData]);

  // ============================================================================
  // CLEANUP ON LOGOUT
  // ============================================================================
  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await BackgroundAttendanceService.stopAll();
          await BackgroundLocationService.stop();
          closeMenu();
          onLogout();
        }
      },
    ]);
  };

  const getInitials = (fullName: string): string => {
    return fullName.split(' ').map(name => name.charAt(0).toUpperCase()).join('').substring(0, 2);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const getDisplayModules = () => {
    console.log('modules', modules);
    return modules.map(module => ({
      title: module.module_name.charAt(0).toUpperCase() + module.module_name.slice(1).replace('_', ' '),
      iconUrl: module.module_icon,
      module_unique_name: module.module_unique_name,
      is_generic: module.is_generic
    }));
  };

  interface IconProps {
    type: 'user' | 'notification' | 'help' | 'lock' | 'info' | 'settings' | 'home' | 'calendar' | 'bell' | 'shield' | 'users' | 'credit-card' | 'file-text' | 'briefcase' | 'edit' | 'car' | 'wallet' | 'map' | 'heart' | 'star';
    color?: string;
    size?: number;
  }

  const Icon: React.FC<IconProps> = ({ type, color = currentColors.textSecondary, size = 20 }) => {
    switch (type) {
      case 'edit':
        return (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: size * 0.5, fontWeight: 'bold' }}>✏️</Text>
          </View>
        );
      case 'car':
        return (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: size * 0.5, fontWeight: 'bold' }}>🚗</Text>
          </View>
        );
      case 'wallet':
        return (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: size * 0.5, fontWeight: 'bold' }}>💳</Text>
          </View>
        );
      case 'map':
        return (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: size * 0.5, fontWeight: 'bold' }}>🗺️</Text>
          </View>
        );
      case 'heart':
        return (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#EC4899', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: size * 0.5, fontWeight: 'bold' }}>❤️</Text>
          </View>
        );
      case 'star':
        return (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#FBBF24', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: size * 0.5, fontWeight: 'bold' }}>⭐</Text>
          </View>
        );
      case 'user':
        return (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: size * 0.6, fontWeight: 'bold' }}>U</Text>
          </View>
        );
      case 'settings':
        return (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#6B7280', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: size * 0.5, fontWeight: 'bold' }}>⚙️</Text>
          </View>
        );
      case 'notification':
        return (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: size * 0.5, fontWeight: 'bold' }}>🔔</Text>
          </View>
        );
      case 'help':
        return (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#EC4899', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: size * 0.7, fontWeight: 'bold' }}>?</Text>
          </View>
        );
      case 'lock':
        return (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#1E40AF', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: size * 0.5, fontWeight: 'bold' }}>🔒</Text>
          </View>
        );
      case 'info':
        return (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: size * 0.7, fontWeight: 'bold' }}>i</Text>
          </View>
        );
      case 'bell':
        return (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: size * 0.5, fontWeight: 'bold' }}>⏰</Text>
          </View>
        );
      default:
        return (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
        );
    }
  };

  const HomeIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.75, height: size * 0.65, borderWidth: 2, borderColor: color, borderBottomWidth: 3, borderTopColor: 'transparent', position: 'relative',
      }}>
        <View style={{
          position: 'absolute', top: -size * 0.25, left: -size * 0.125, right: -size * 0.125, height: size * 0.35, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: color, transform: [{ rotate: '0deg' }],
        }}>
          <View style={{
            position: 'absolute', top: -2, left: '50%', width: 0, height: 0, borderLeftWidth: size * 0.2, borderRightWidth: size * 0.2, borderBottomWidth: size * 0.15, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color, transform: [{ translateX: -size * 0.2 }],
          }} />
        </View>
        <View style={{
          position: 'absolute', bottom: size * 0.05, left: '50%', width: size * 0.15, height: size * 0.25, backgroundColor: color, transform: [{ translateX: -size * 0.075 }],
        }} />
      </View>
    </View>
  );

  const MessageIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.8, height: size * 0.6, borderWidth: 2, borderColor: color, borderRadius: size * 0.12, position: 'relative' }}>
        <View style={{ position: 'absolute', top: size * 0.12, left: size * 0.12, right: size * 0.12, height: 2, backgroundColor: color }} />
        <View style={{ position: 'absolute', top: size * 0.22, left: size * 0.12, width: size * 0.35, height: 2, backgroundColor: color }} />
        <View style={{
          position: 'absolute', bottom: -size * 0.08, left: size * 0.2, width: 0, height: 0, borderTopWidth: size * 0.12, borderLeftWidth: size * 0.08, borderRightWidth: size * 0.08, borderTopColor: color, borderLeftColor: 'transparent', borderRightColor: 'transparent',
        }} />
      </View>
    </View>
  );

  const TeamIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: size * 0.25, height: size * 0.25, borderRadius: size * 0.125, borderWidth: 2, borderColor: color, marginRight: -size * 0.05 }} />
        <View style={{ width: size * 0.35, height: size * 0.35, borderRadius: size * 0.175, borderWidth: 2, borderColor: color, zIndex: 1, backgroundColor: 'white' }} />
        <View style={{ width: size * 0.25, height: size * 0.25, borderRadius: size * 0.125, borderWidth: 2, borderColor: color, marginLeft: -size * 0.05 }} />
      </View>
      <View style={{ position: 'absolute', bottom: size * 0.1, width: size * 0.8, height: size * 0.25, borderWidth: 2, borderColor: color, borderRadius: size * 0.125, borderTopColor: 'transparent' }} />
    </View>
  );

  const BotIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.7, height: size * 0.6, borderWidth: 2, borderColor: color, borderRadius: size * 0.15, position: 'relative' }}>
        <View style={{ position: 'absolute', top: size * 0.12, left: size * 0.12, width: size * 0.1, height: size * 0.1, borderRadius: size * 0.05, backgroundColor: color }} />
        <View style={{ position: 'absolute', top: size * 0.12, right: size * 0.12, width: size * 0.1, height: size * 0.1, borderRadius: size * 0.05, backgroundColor: color }} />
        <View style={{ position: 'absolute', bottom: size * 0.1, left: '50%', width: size * 0.2, height: 2, backgroundColor: color, transform: [{ translateX: -size * 0.1 }] }} />
      </View>
      <View style={{ position: 'absolute', top: size * 0.05, left: '50%', width: 2, height: size * 0.15, backgroundColor: color, transform: [{ translateX: -1 }] }}>
        <View style={{ position: 'absolute', top: -size * 0.04, left: '50%', width: size * 0.06, height: size * 0.06, borderRadius: size * 0.03, backgroundColor: color, transform: [{ translateX: -size * 0.03 }] }} />
      </View>
    </View>
  );

  const SupportIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.8, height: size * 0.8, borderRadius: size * 0.4, borderWidth: 2, borderColor: color, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        <View style={{ position: 'absolute', top: size * 0.15, width: size * 0.25, height: size * 0.25, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: color, borderTopLeftRadius: size * 0.2, borderTopRightRadius: size * 0.2 }} />
        <View style={{ position: 'absolute', top: size * 0.38, width: size * 0.12, height: size * 0.12, borderRadius: size * 0.06, backgroundColor: color }} />
        <View style={{ position: 'absolute', bottom: size * 0.12, width: size * 0.06, height: size * 0.12, backgroundColor: color, borderRadius: size * 0.03 }} />
      </View>
    </View>
  );

  const LogoutIcon = ({ color = currentColors.error, size = 20 }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.7, height: size * 0.8, borderWidth: 2, borderColor: color, borderRadius: size * 0.05 }}>
        <View style={{ position: 'absolute', right: size * 0.1, top: '50%', width: size * 0.08, height: size * 0.08, borderRadius: size * 0.04, backgroundColor: color, transform: [{ translateY: -size * 0.04 }] }} />
      </View>
      <View style={{ position: 'absolute', right: -size * 0.1, width: size * 0.4, height: 2, backgroundColor: color }}>
        <View style={{ position: 'absolute', right: 0, top: -size * 0.05, width: size * 0.1, height: size * 0.1, borderTopWidth: 2, borderRightWidth: 2, borderColor: color, transform: [{ rotate: '45deg' }] }} />
      </View>
    </View>
  );

  // Updated drawer menu items with colorful icons as per the design image
  const drawerMenuItems = [
    { id: 'profile', title: 'Profile', icon: 'user', color: '#3B82F6' },
    { id: 'edit', title: 'Edit Personal Info', icon: 'edit', color: '#3B82F6' },
    { id: 'dibi', title: 'Dibi Pass', icon: 'car', color: '#10B981' },
    { id: 'trips', title: 'My Trips', icon: 'map', color: '#F59E0B' },
    { id: 'payment', title: 'Payment', icon: 'wallet', color: '#8B5CF6' },
    { id: 'help', title: 'Help', icon: 'help', color: '#EC4899' },
    { id: 'messages', title: 'Messages', icon: 'notification', color: '#F59E0B' },
    { id: 'safety', title: 'Safety Center', icon: 'shield', color: '#1E40AF' },
    { id: 'settings', title: 'Settings', icon: 'settings', color: '#6B7280' },
    { id: 'invite', title: 'Invite Friends', icon: 'users', color: '#10B981' },
    { id: 'drive', title: 'Drive with Us', icon: 'car', color: '#10B981' },
    { id: 'discounts', title: 'Discounts', icon: 'star', color: '#FBBF24' },
    { id: 'velocity', title: 'Velocity Points', icon: 'star', color: '#FBBF24' },
    { id: 'scan', title: 'Scan', icon: 'credit-card', color: '#8B5CF6' },
  ];

  const openMenu = () => {
    setIsMenuVisible(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, { toValue: -300, duration: 300, useNativeDriver: true }).start(() => setIsMenuVisible(false));
  };

  const handleMenuItemPress = (item: any) => {
    setActiveMenuItem(item.title);
    closeMenu();
    
    if (item.id === 'profile') {
      setShowProfile(true);
    } else if (item.id === 'settings') {
      setShowSettings(true);
    } else if (item.id === 'edit') {
      Alert.alert('Edit Personal Info', 'Edit Personal Info feature will be available soon!');
    } else if (item.id === 'dibi') {
      Alert.alert('Dibi Pass', 'Dibi Pass feature will be available soon!');
    } else if (item.id === 'trips') {
      Alert.alert('My Trips', 'My Trips feature will be available soon!');
    } else if (item.id === 'payment') {
      Alert.alert('Payment', 'Payment feature will be available soon!');
    } else if (item.id === 'messages') {
      Alert.alert('Messages', 'Messages feature will be available soon!');
    } else {
      Alert.alert('Coming Soon', `${item.title} feature will be available soon!`);
    }
  };

  const handleBackFromSettings = () => {
    setShowSettings(false);
    setActiveMenuItem('Dashboard');
  };

  const handleBackFromCreateSite = () => {
    setShowCreateSite(false);
    setShowScoutBoy(true);
    setActiveMenuItem('Dashboard');
  };

  const handleModulePress = (module: string, moduleUniqueName?: string) => {
    const key = moduleUniqueName?.toLowerCase() ?? '';

    // Save to last opened modules
    const moduleData = modules.find(m => m.module_unique_name === moduleUniqueName);
    if (moduleData) {
      saveLastOpenedModule({
        title: module,
        iconUrl: moduleData.module_icon,
        module_unique_name: moduleData.module_unique_name
      });
    }

    if (key.includes('attendance')) {
      setAttendanceKey(prev => prev + 1);
      setShowAttendance(true);
    } else if (key.includes('hr')) {
      setShowHR(true);
    } else if (key.includes('cab')) {
      setShowCab(true);
    } else if (key === 'employee_management') {
      setShowEmployeeManagement(true);
    } else if (key.includes('driver')) {
      setShowDriver(true);
    } else if (key.includes('bdt')) {
      setShowBDT(true);
    } else if (key.includes('mediclaim')) {
      setShowMedical(true);
    } else if (key.includes('scout')) {
      setShowScoutBoy(true);
    } else if (key.includes('reminder')) {
      setShowReminder(true);
    } else if (key.includes('bup') || key.includes('business update')) {
      setShowBUP(true);
    } else {
      Alert.alert('Coming Soon', `${module} module will be available soon!`);
    }
  };

  const handleBackFromAttendance = () => {
    setShowAttendance(false);
    setActiveMenuItem('Dashboard');
  };

  const handleBackFromProfile = () => {
    setShowProfile(false);
    setActiveMenuItem('Dashboard');
  };

  const handleBackFromHR = () => {
    setShowHR(false);
    setActiveMenuItem('Dashboard');
  };

  const handleBackFromCab = () => {
    setShowCab(false);
    setActiveMenuItem('Dashboard');
  };

  const handleBackFromDriver = () => {
    setShowDriver(false);
    setActiveMenuItem('Dashboard');
  };

  const handleBackFromBDT = () => {
    setShowBDT(false);
    setActiveMenuItem('Dashboard');
  };

  const handleBackFromMedical = () => {
    setShowMedical(false);
    setActiveMenuItem('Dashboard');
  };

  const handleBackFromScoutBoy = () => {
    setShowScoutBoy(false);
    setActiveMenuItem('Dashboard');
  };

  const handleBackFromReminder = () => {
    setShowReminder(false);
    setActiveMenuItem('Dashboard');
  };

  const handleBackFromBUP = () => {
    setShowBUP(false);
    setActiveMenuItem('Dashboard');
  };

  const handleBackFromChat = () => {
    setShowChat(false);
    setActiveNavItem('home');
  };

  const handleOpenChatRoom = (chatRoom: any) => {
    setSelectedChatRoom(chatRoom);
    setShowChatRoom(true);
  };

  const handleBackFromChatRoom = () => {
    setShowChatRoom(false);
    setSelectedChatRoom(null);
    setShowChat(true);
  };

  // Update the handleNavItemPress function
  const handleNavItemPress = (navItem: string) => {
    setActiveNavItem(navItem);
    if (navItem === 'message') {
      setShowChat(true);
    } else if (navItem !== 'home') {
      Alert.alert('Coming Soon', `${navItem} feature will be available soon!`);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleViewAllModules = async () => {
    setAllModulesVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent, { backgroundColor: currentColors.headerBg }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={currentColors.headerBg} />
        <ActivityIndicator size="large" color={currentColors.info} />
        <Text style={[styles.loadingText, { color: currentColors.text }]}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (error || !userData) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent, { backgroundColor: currentColors.headerBg }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={currentColors.headerBg} />
        <Text style={[styles.errorText, { color: currentColors.text }]}>Failed to load data</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: currentColors.info }]}>
          <Text style={[styles.retryButtonText, { color: currentColors.white }]}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  interface AttendanceCardProps {
    value: string;
    label: string;
    color: string;
  }

  const AttendanceCard: React.FC<AttendanceCardProps> = ({ value, label, color }) => (
    <View style={[
      styles.card,
      {
        backgroundColor: color,
        width: isDesktop ? '23%' : isTablet ? '48%' : (screenWidth - responsive.horizontalPadding * 2 - responsive.cardSpacing) / 2,
        minHeight: isSmallScreen ? 90 : isDesktop ? 140 : isTablet ? 120 : 110,
      }
    ]}>
      <View style={styles.cardCircle} />
      <View style={styles.cardCircleSmall} />
      <Text style={[
        styles.cardValue,
        { 
          fontSize: isDesktop ? 52 : isTablet ? 44 : 40,
          color: currentColors.text
        }
      ]}>{value}</Text>
      <Text style={[
        styles.cardLabel,
        { 
          fontSize: isDesktop ? 15 : isTablet ? 14 : 13,
          color: currentColors.textSecondary
        }
      ]}>{label}</Text>
    </View>
  );

  interface EventAvatarProps {
    name: string;
    date: string;
    initials: string;
    type: 'birthday' | 'anniversary';
    years?: number;
  }

  const EventAvatar: React.FC<EventAvatarProps> = ({ name, date, initials, type, years }) => (
    <View style={[
      styles.eventContainer,
      { width: isDesktop ? 120 : isTablet ? 100 : 90 }
    ]}>
      <View style={styles.avatarContainer}>
        <View style={[
          styles.avatar,
          type === 'anniversary' && styles.avatarAnniversary,
          {
            width: isDesktop ? 80 : isTablet ? 70 : 60,
            height: isDesktop ? 80 : isTablet ? 70 : 60,
            backgroundColor: type === 'anniversary' ? '#8B5CF6' : currentColors.info,
          }
        ]}>
          <Text style={[
            styles.avatarInitials,
            { fontSize: isDesktop ? 22 : isTablet ? 20 : 18 }
          ]}>{initials}</Text>
        </View>
        <View style={[
          styles.dateBadge,
          type === 'anniversary' && styles.dateBadgeAnniversary,
          {
            paddingHorizontal: isDesktop ? 14 : isTablet ? 12 : 10,
            paddingVertical: isDesktop ? 8 : isTablet ? 6 : 5,
            backgroundColor: type === 'anniversary' ? '#7C3AED' : currentColors.info,
          }
        ]}>
          <Text style={[
            styles.dateText,
            { fontSize: isDesktop ? 13 : isTablet ? 12 : 11 }
          ]}>{date}</Text>
        </View>
        {type === 'anniversary' && years !== undefined && (
          <View style={styles.anniversaryBadge}>
            <Text style={[
              styles.anniversaryText,
              { fontSize: isDesktop ? 12 : isTablet ? 11 : 10 }
            ]}>🎉 {years}yr{years !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>
      <Text style={[
        styles.eventName,
        { 
          fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
          color: currentColors.text
        }
      ]} numberOfLines={2}>{name}</Text>
      <Text style={[
        styles.eventType,
        { 
          fontSize: isDesktop ? 12 : isTablet ? 11 : 10,
          color: currentColors.textSecondary
        }
      ]}>{type === 'birthday' ? '🎂 Birthday' : '💼 Anniversary'}</Text>
    </View>
  );

  interface ModuleItemProps {
    title: string;
    iconUrl: string;
    onPress: () => void;
    isSmall?: boolean;
  }

  const ModuleItem: React.FC<ModuleItemProps> = ({ title, iconUrl, onPress, isSmall = false }) => (
    <TouchableOpacity style={[
      styles.moduleItem,
      {
        width: isSmall ? (isDesktop ? 120 : isTablet ? 110 : 100) : (isDesktop ? 150 : isTablet ? 130 : 110),
        padding: isSmall ? (isDesktop ? 12 : isTablet ? 10 : 8) : (isDesktop ? 18 : isTablet ? 16 : 12),
        minHeight: isSmall ? (isDesktop ? 120 : isTablet ? 100 : 90) : (isDesktop ? 150 : isTablet ? 130 : 110),
        backgroundColor: isDarkMode ? 'rgba(12, 29, 51, 0.77)' : currentColors.white,
        borderWidth: 0, // Remove border
      }
    ]} onPress={onPress} activeOpacity={0.7}>
      <View style={[
        styles.moduleIconContainer,
        {
          width: isSmall ? (isDesktop ? 40 : isTablet ? 36 : 32) : (isDesktop ? 60 : isTablet ? 56 : 48),
          height: isSmall ? (isDesktop ? 40 : isTablet ? 36 : 32) : (isDesktop ? 60 : isTablet ? 56 : 48),
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : currentColors.backgroundSecondary,
        }
      ]}>
        <Image source={{ uri: iconUrl }} style={[
          styles.moduleIconImage,
          {
            width: isSmall ? (isDesktop ? 24 : isTablet ? 22 : 20) : (isDesktop ? 40 : isTablet ? 36 : 32),
            height: isSmall ? (isDesktop ? 24 : isTablet ? 22 : 20) : (isDesktop ? 40 : isTablet ? 36 : 32),
          }
        ]} resizeMode="contain" />
      </View>
      <Text style={[
        styles.moduleTitle,
        { 
          fontSize: isSmall ? (isDesktop ? 12 : isTablet ? 11 : 10) : (isDesktop ? 14 : isTablet ? 13 : 12),
          color: currentColors.text
        }
      ]} numberOfLines={2}>{title}</Text>
    </TouchableOpacity>
  );

  // Quick Action Item Component
  interface QuickActionItemProps {
    title: string;
    iconUrl: string;
    onPress: () => void;
  }

  const QuickActionItem: React.FC<QuickActionItemProps> = ({ title, iconUrl, onPress }) => (
    <TouchableOpacity style={[
      styles.quickActionItem,
      {
        width: isDesktop ? 100 : isTablet ? 90 : 80,
        height: isDesktop ? 100 : isTablet ? 90 : 80,
        backgroundColor: isDarkMode ? 'rgba(12, 29, 51, 0.77)' : currentColors.white,
        borderWidth: 0, // Remove border
      }
    ]} onPress={onPress} activeOpacity={0.7}>
      <View style={[
        styles.quickActionIconContainer,
        {
          width: isDesktop ? 50 : isTablet ? 45 : 40,
          height: isDesktop ? 50 : isTablet ? 45 : 40,
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : currentColors.backgroundSecondary,
        }
      ]}>
        <Image source={{ uri: iconUrl }} style={[
          styles.quickActionIcon,
          {
            width: isDesktop ? 30 : isTablet ? 28 : 24,
            height: isDesktop ? 30 : isTablet ? 28 : 24,
          }
        ]} resizeMode="contain" />
      </View>
      <Text style={[
        styles.quickActionText,
        { 
          fontSize: isDesktop ? 12 : isTablet ? 11 : 10,
          color: currentColors.text
        }
      ]} numberOfLines={2}>{title}</Text>
    </TouchableOpacity>
  );

  // Reminder Item Component
  interface ReminderItemProps {
    title: string;
    time: string;
    icon: string;
  }

  const ReminderItem: React.FC<ReminderItemProps> = ({ title, time, icon }) => (
    <TouchableOpacity style={[
      styles.reminderItem,
      {
        padding: isDesktop ? 16 : isTablet ? 14 : 12,
        borderRadius: isDesktop ? 12 : isTablet ? 10 : 8,
        backgroundColor: isDarkMode ? 'rgba(12, 29, 51, 0.77)' : currentColors.backgroundSecondary,
        borderWidth: 0, // Remove border
      }
    ]} activeOpacity={0.7}>
      <View style={styles.reminderContent}>
        <View style={[
          styles.reminderIconContainer,
          {
            width: isDesktop ? 40 : isTablet ? 36 : 32,
            height: isDesktop ? 40 : isTablet ? 36 : 32,
            borderRadius: isDesktop ? 20 : isTablet ? 18 : 16,
            backgroundColor: isDarkMode ? 'rgba(209, 250, 229, 0.2)' : '#D1FAE5',
          }
        ]}>
          <Icon type="bell" color={isDarkMode ? '#10B981' : '#10B981'} size={isDesktop ? 20 : isTablet ? 18 : 16} />
        </View>
        <View style={styles.reminderTextContainer}>
          <Text style={[
            styles.reminderTitle,
            { 
              fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
              color: currentColors.text
            }
          ]} numberOfLines={1}>{title}</Text>
          <Text style={[
            styles.reminderTime,
            { 
              fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
              color: currentColors.textSecondary
            }
          ]}>{time}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const HamburgerMenu = () => (
    <Modal transparent visible={isMenuVisible} animationType="none" onRequestClose={closeMenu}>
      <SafeAreaView style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={closeMenu} />
        <Animated.View style={[
          styles.menuContainer,
          {
            width: isDesktop ? 400 : isTablet ? 350 : 300,
            transform: [{ translateX: slideAnim }],
            backgroundColor: currentColors.white,
          }
        ]}>
          <View style={[styles.menuHeader, { paddingTop: insets.top, backgroundColor: currentColors.headerBg }]}>
            <View style={styles.menuHeaderContent}>
              <TouchableOpacity onPress={() => {
                closeMenu();
                setShowProfile(true);
              }}>
                {userData.profile_picture ? (
                  <Image 
                    source={{ uri: userData.profile_picture }} 
                    style={[
                      styles.menuUserAvatar,
                      {
                        width: isDesktop ? 70 : isTablet ? 64 : 56,
                        height: isDesktop ? 70 : isTablet ? 64 : 56,
                        borderRadius: isDesktop ? 35 : isTablet ? 32 : 28,
                      }
                    ]} 
                  />
                ) : (
                  <View style={[
                    styles.menuUserAvatarCircle,
                    {
                      width: isDesktop ? 70 : isTablet ? 64 : 56,
                      height: isDesktop ? 70 : isTablet ? 64 : 56,
                      backgroundColor: currentColors.info,
                    }
                  ]}>
                    <Text style={[
                      styles.menuUserAvatarText,
                      { fontSize: isDesktop ? 22 : isTablet ? 20 : 18 }
                    ]}>
                      {getInitials(userData.full_name)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.menuUserDetails}>
                <Text style={[
                  styles.menuUserRole,
                  { 
                    fontSize: isDesktop ? 16 : isTablet ? 14 : 13,
                    color: currentColors.textLight
                  }
                ]}>{userData.designation || userData.role || 'Employee'}</Text>
                <Text style={[
                  styles.menuUserName,
                  { 
                    fontSize: isDesktop ? 22 : isTablet ? 20 : 18,
                    color: currentColors.white
                  }
                ]}>{userData.full_name}</Text>
              </View>
            </View>
          </View>
          <ScrollView style={[styles.menuItems, { backgroundColor: currentColors.white }]} showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuItemsContent}>
            {drawerMenuItems.map((item, index) => (
              <TouchableOpacity key={index} style={[
                styles.menuItem,
                activeMenuItem === item.title && styles.menuItemActive,
                {
                  paddingHorizontal: isDesktop ? 28 : isTablet ? 24 : 20,
                  paddingVertical: isDesktop ? 18 : isTablet ? 16 : 14,
                  backgroundColor: activeMenuItem === item.title ? currentColors.backgroundSecondary : 'transparent',
                }
              ]} onPress={() => handleMenuItemPress(item)} activeOpacity={0.7}>
                <View style={[
                  styles.menuItemIconContainer,
                  {
                    width: isDesktop ? 40 : isTablet ? 36 : 32,
                    marginRight: isDesktop ? 24 : isTablet ? 20 : 16,
                  }
                ]}>
                  <Icon 
                    type={item.icon as any} 
                    color={activeMenuItem === item.title ? currentColors.info : item.color} 
                    size={isDesktop ? 22 : 20} 
                  />
                </View>
                <Text style={[
                  styles.menuItemText,
                  activeMenuItem === item.title && styles.menuItemTextActive,
                  { 
                    fontSize: isDesktop ? 18 : isTablet ? 16 : 15,
                    color: activeMenuItem === item.title ? currentColors.info : currentColors.textSecondary
                  }
                ]}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={[styles.logoutSection, { 
            backgroundColor: currentColors.white,
            paddingBottom: Math.max(insets.bottom, 16) 
          }]}>
            <View style={[styles.logoutDivider, { backgroundColor: currentColors.border }]} />
            <TouchableOpacity style={[
              styles.logoutButton,
              {
                paddingHorizontal: isDesktop ? 28 : isTablet ? 24 : 20,
                paddingVertical: isDesktop ? 18 : isTablet ? 16 : 14,
                backgroundColor: '#FEF2F2',
              }
            ]} onPress={handleLogout} activeOpacity={0.7}>
              <View style={[
                styles.logoutIconContainer,
                {
                  width: isDesktop ? 40 : isTablet ? 36 : 32,
                  marginRight: isDesktop ? 24 : isTablet ? 20 : 16,
                }
              ]}><LogoutIcon /></View>
              <Text style={[
                styles.logoutButtonText,
                { 
                  fontSize: isDesktop ? 18 : isTablet ? 16 : 15,
                  color: currentColors.error
                }
              ]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );

  const displayModules = getDisplayModules();
  const { attendanceModule, otherModules } = fetchTopModules();

  // WaveBottomBar configuration
  const waveBottomBarTabs = [
    {
      routeName: 'home',
      tabLabel: 'Home',
      tabIcon: (isFocused: boolean) => (
        <HomeIcon color={isFocused ? currentColors.info : currentColors.textSecondary} size={responsive.iconSize} />
      ),
    },
    {
      routeName: 'message',
      tabLabel: 'Messages',
      tabIcon: (isFocused: boolean) => (
        <MessageIcon color={isFocused ? currentColors.info : currentColors.textSecondary} size={responsive.iconSize} />
      ),
    },
    {
      routeName: 'team',
      tabLabel: 'Organisation',
      tabIcon: (isFocused: boolean) => (
        <TeamIcon color={isFocused ? currentColors.info : currentColors.textSecondary} size={responsive.iconSize} />
      ),
    },
    {
      routeName: 'ai-bot',
      tabLabel: 'AI Bot',
      tabIcon: (isFocused: boolean) => (
        <BotIcon color={isFocused ? currentColors.info : currentColors.textSecondary} size={responsive.iconSize} />
      ),
    },
    {
      routeName: 'support',
      tabLabel: 'Support',
      tabIcon: (isFocused: boolean) => (
        <SupportIcon color={isFocused ? currentColors.info : currentColors.textSecondary} size={responsive.iconSize} />
      ),
    },
  ];

  // All Modules Modal
  const AllModulesModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={allModulesVisible}
      onRequestClose={() => setAllModulesVisible(false)}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: currentColors.primary }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: currentColors.text }]}>All Modules</Text>
          <TouchableOpacity onPress={() => setAllModulesVisible(false)}>
            <Text style={[styles.closeButton, { color: currentColors.info }]}>Close</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <View style={styles.allModulesGrid}>
            {displayModules.map((module, index) => (
              <ModuleItem
                key={index}
                title={module.title}
                iconUrl={module.iconUrl}
                onPress={() => {
                  handleModulePress(module.title, module.module_unique_name);
                  setAllModulesVisible(false);
                }}
                isSmall={true}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {showChatRoom && selectedChatRoom ? (
        <ChatRoomScreen
          chatRoom={selectedChatRoom}
          onBack={handleBackFromChatRoom}
          currentUserId={userData?.employee_id ? parseInt(userData.employee_id) : 1}
        />
      ) : showChat ? (
        <ChatScreen
          onBack={handleBackFromChat}
          onOpenChatRoom={handleOpenChatRoom}
          currentUserId={userData?.employee_id ? parseInt(userData.employee_id) : 1}
        />
      ) : showAttendance ? (
        <AttendanceWrapper key={attendanceKey} onBack={handleBackFromAttendance} attendanceKey={attendanceKey} />
      ) : showSettings ? (
        <Settings onBack={handleBackFromSettings} />
      ) : showProfile ? (
        <Profile onBack={handleBackFromProfile} userData={userData} />
      ) : showHR ? (
        <HR onBack={handleBackFromHR} />
      ) : showCab ? (
        <Cab onBack={handleBackFromCab} />
      ) : showDriver ? (
        <Driver onBack={handleBackFromDriver} />
      ) : showBDT ? (
        <BDT onBack={handleBackFromBDT} />
      ) : showMedical ? (
        <Medical onBack={handleBackFromMedical} />
      ) : showScoutBoy ? (
        <ScoutBoy onBack={handleBackFromScoutBoy} />
      ) : showCreateSite ? (
        <CreateSite
          onBack={handleBackFromCreateSite}
          colors={colors}
          spacing={spacing}
          fontSize={fontSize}
          borderRadius={borderRadius}
          shadows={shadows}
        />
      ) : showReminder ? (
        <Reminder onBack={handleBackFromReminder} />
      ) : showBUP ? (
        <BUP onBack={handleBackFromBUP} />
      ) : showEmployeeManagement ? (
        <EmployeeManagement onBack={handleBackFromEmployeeManagement} />
      ) : (
        <SafeAreaView style={[styles.container, { backgroundColor: currentColors.headerBg }]}>
          <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={currentColors.headerBg} />
          
          {/* Section 1: Header with logo and hamburger icon */}
          <View style={[
            styles.header,
            {
              paddingTop: Math.max(insets.top, isDesktop ? 20 : isTablet ? 16 : 12),
              paddingBottom: isDesktop ? 20 : isTablet ? 16 : 12,
              paddingHorizontal: responsive.horizontalPadding,
              backgroundColor: currentColors.headerBg,
            }
          ]}>
            {/* Background image for light mode */}
            {!isDarkMode ? (
              <Image 
                source={require('../assets/background.png')}
                style={[
                  styles.headerBackground,
                  {
                    width: '100%',
                    height: '100%',
                    resizeMode: 'cover',
                  }
                ]}
              />
            ) : (
              // Dark mode background
              <View style={[
                styles.headerBackground,
                {
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#000D24',
                }
              ]} />
            )}
            
            <View style={styles.headerTop}>
              <TouchableOpacity style={styles.menuIcon} onPress={openMenu}>
                {[1, 2, 3].map(i => (
                  <View key={i} style={[
                    styles.menuLine,
                    {
                      width: isDesktop ? 24 : isTablet ? 22 : 20,
                      height: 2,
                      backgroundColor: currentColors.white,
                    }
                  ]} />
                ))}
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Text style={[
                  styles.logoText,
                  { 
                    fontSize: isDesktop ? 32 : isTablet ? 28 : 24,
                    color: currentColors.white,
                    fontWeight: 'bold'
                  }
                ]}>CITADEL</Text>
              </View>
              <View style={[
                styles.headerSpacer,
                { width: isDesktop ? 44 : isTablet ? 40 : 36 }
              ]} />
            </View>
            
            {/* Welcome text in the center of the image */}
            <View style={styles.welcomeContainer}>
              <Text style={[
                styles.welcomeText,
                { 
                  fontSize: isDesktop ? 28 : isTablet ? 24 : 20,
                  color: currentColors.white,
                  fontWeight: 'bold',
                  textAlign: 'center'
                }
              ]}>Welcome!</Text>
            </View>

            {/* User profile section with image, name, and designation */}
            <View style={styles.userProfileSection}>
              <TouchableOpacity 
                style={[
                  styles.userProfileCard,
                  { backgroundColor: isDarkMode ? 'rgba(12, 29, 51, 0.77)' : 'rgba(255, 255, 255, 0.1)' }
                ]}
                onPress={() => setShowProfile(true)}
                activeOpacity={0.8}
              >
                {userData.profile_picture ? (
                  <Image 
                    source={{ uri: userData.profile_picture }} 
                    style={[
                      styles.userProfileImage,
                      {
                        width: responsive.avatarSize + 20,
                        height: responsive.avatarSize + 20,
                        borderRadius: (responsive.avatarSize + 20) / 2,
                      }
                    ]} 
                  />
                ) : (
                  <View style={[
                    styles.userProfileImagePlaceholder,
                    {
                      width: responsive.avatarSize + 20,
                      height: responsive.avatarSize + 20,
                      borderRadius: (responsive.avatarSize + 20) / 2,
                      backgroundColor: currentColors.info,
                    }
                  ]}>
                    <Text style={[
                      styles.userProfileInitials,
                      { fontSize: isDesktop ? 28 : isTablet ? 24 : 20 }
                    ]}>
                      {getInitials(userData.full_name)}
                    </Text>
                  </View>
                )}
                <View style={styles.userProfileInfo}>
                  <Text style={[
                    styles.greeting,
                    { 
                      fontSize: isDesktop ? 16 : isTablet ? 14 : 12,
                      color: currentColors.textLight
                    }
                  ]}>Hi {userData.full_name.split(' ')[0]}!</Text>
                  <Text style={[
                    styles.userDesignation,
                    { 
                      fontSize: isDesktop ? 18 : isTablet ? 16 : 14,
                      color: currentColors.textLight
                    }
                  ]}>{userData.designation || userData.role || 'Employee'}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={[styles.mainContent, { backgroundColor: currentColors.backgroundSecondary }]}>
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContainer,
                {
                  paddingHorizontal: responsive.horizontalPadding,
                  paddingTop: responsive.verticalPadding,
                  paddingBottom: insets.bottom + responsive.bottomBarHeight + 20,
                }
              ]}
              keyboardShouldPersistTaps="handled"
            >
              {/* Quick Actions Section */}
              <View style={[
                styles.section,
                { marginBottom: responsive.sectionSpacing }
              ]}>
                <View style={styles.sectionHeader}>
                  <Text style={[
                    styles.sectionTitle,
                    { 
                      fontSize: isDesktop ? 20 : isTablet ? 18 : 16,
                      color: currentColors.text
                    }
                  ]}>QUICK ACTIONS</Text>
                  <TouchableOpacity onPress={() => {
                    // Show all quick actions
                    Alert.alert('All Quick Actions', 'This will show all available quick actions');
                  }}>
                    <Text style={[
                      styles.viewAllText,
                      { 
                        fontSize: isDesktop ? 14 : isTablet ? 13 : 12,
                        color: currentColors.info
                      }
                    ]}>VIEW ALL →</Text>
                  </TouchableOpacity>
                </View>
                <View style={[
                  styles.quickActionsRow,
                  {
                    gap: isDesktop ? 16 : isTablet ? 14 : 12,
                    marginTop: isDesktop ? 16 : isTablet ? 14 : 12,
                  }
                ]}>
                  {lastOpenedModules.length > 0 ? (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.quickActionsScrollContent}
                    >
                      {lastOpenedModules.map((module, index) => (
                        <QuickActionItem
                          key={index}
                          title={module.title}
                          iconUrl={module.iconUrl}
                          onPress={() => handleModulePress(module.title, module.module_unique_name)}
                        />
                      ))}
                    </ScrollView>
                  ) : (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.quickActionsScrollContent}
                    >
                      {displayModules.slice(0, 4).map((module, index) => (
                        <QuickActionItem
                          key={index}
                          title={module.title}
                          iconUrl={module.iconUrl}
                          onPress={() => handleModulePress(module.title, module.module_unique_name)}
                        />
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>

              {/* Reminders Section */}
              <View style={[
                styles.section,
                { marginBottom: responsive.sectionSpacing }
              ]}>
                <Text style={[
                  styles.sectionTitle,
                  { 
                    fontSize: isDesktop ? 20 : isTablet ? 18 : 16,
                    color: currentColors.text
                  }
                ]}>UPCOMING REMINDERS</Text>
                <View style={[
                  styles.remindersContainer,
                  { 
                    marginTop: isDesktop ? 16 : isTablet ? 14 : 12,
                    backgroundColor: isDarkMode ? 'rgba(12, 29, 51, 0.77)' : currentColors.white,
                    borderWidth: 0, // Remove border
                  }
                ]}>
                  {reminders.length > 0 ? (
                    reminders.map((reminder, index) => (
                      <ReminderItem
                        key={index}
                        title={reminder.title}
                        time={reminder.time}
                        icon={reminder.icon}
                      />
                    ))
                  ) : (
                    <View style={[
                      styles.noRemindersContainer,
                      {
                        padding: isDesktop ? 24 : isTablet ? 20 : 16,
                        borderRadius: isDesktop ? 12 : isTablet ? 10 : 8,
                        backgroundColor: isDarkMode ? 'rgba(12, 29, 51, 0.77)' : currentColors.backgroundSecondary,
                      }
                    ]}>
                      <Icon type="bell" color={currentColors.textSecondary} size={isDesktop ? 32 : isTablet ? 28 : 24} />
                      <Text style={[
                        styles.noRemindersText,
                        { 
                          fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
                          color: currentColors.textSecondary
                        }
                      ]}>No reminders for now</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Modules Section - Updated with 2 columns layout */}
              <View style={[
                styles.section,
                { marginBottom: responsive.sectionSpacing }
              ]}>
                <Text style={[
                  styles.sectionTitle,
                  { 
                    fontSize: isDesktop ? 20 : isTablet ? 18 : 16,
                    color: currentColors.text
                  }
                ]}>Modules</Text>
                <View style={[
                  styles.modulesContainer,
                  { 
                    marginTop: isDesktop ? 16 : isTablet ? 14 : 12,
                    backgroundColor: isDarkMode ? 'rgba(12, 29, 51, 0.77)' : currentColors.white,
                    borderWidth: 0, // Remove border
                  }
                ]}>
                  <View style={[
                    styles.modulesRow,
                    { flexDirection: 'row', flexWrap: 'wrap' }
                  ]}>
                    {/* First Column: Attendance Module */}
                    {attendanceModule && (
                      <View style={[
                        styles.column,
                        { width: '50%', paddingRight: 8 }
                      ]}>
                        <TouchableOpacity 
                          style={[
                            styles.attendanceModule,
                            {
                              backgroundColor: '#00D492',
                              padding: isDesktop ? 24 : isTablet ? 20 : 16,
                              borderRadius: isDesktop ? 16 : isTablet ? 14 : 12,
                              height: '100%',
                              borderWidth: 0, // Remove border
                            }
                          ]}
                          onPress={() => handleModulePress(
                            attendanceModule.module_name.charAt(0).toUpperCase() + attendanceModule.module_name.slice(1).replace('_', ' '),
                            attendanceModule.module_unique_name
                          )}
                          activeOpacity={0.7}
                        >
                          <View style={styles.attendanceModuleHeader}>
                            <View style={[
                              styles.attendanceIconContainer,
                              {
                                width: isDesktop ? 60 : isTablet ? 56 : 48,
                                height: isDesktop ? 60 : isTablet ? 56 : 48,
                                borderRadius: isDesktop ? 30 : isTablet ? 28 : 24,
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                              }
                            ]}>
                              <Image 
                                source={{ uri: attendanceModule.module_icon }} 
                                style={[
                                  styles.attendanceIcon,
                                  {
                                    width: isDesktop ? 32 : isTablet ? 28 : 24,
                                    height: isDesktop ? 32 : isTablet ? 28 : 24,
                                  }
                                ]} 
                                resizeMode="contain" 
                              />
                            </View>
                            <TouchableOpacity 
                              style={[
                                styles.arrowButton,
                                {
                                  width: isDesktop ? 40 : isTablet ? 36 : 32,
                                  height: isDesktop ? 40 : isTablet ? 36 : 32,
                                  borderRadius: isDesktop ? 20 : isTablet ? 18 : 16,
                                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                  transform: [{ rotate: '-50deg' }],
                                }
                              ]}
                              onPress={() => {
                                setAttendanceKey(prev => prev + 1);
                                setShowAttendance(true);
                              }}
                            >
                              <Text style={[
                                styles.arrowText,
                                { fontSize: isDesktop ? 20 : isTablet ? 18 : 16 }
                              ]}>→</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={[
                            styles.attendanceModuleTitle,
                            { 
                              fontSize: isDesktop ? 20 : isTablet ? 18 : 16,
                              color: currentColors.white
                            }
                          ]}>
                            {attendanceModule.module_name.charAt(0).toUpperCase() + attendanceModule.module_name.slice(1).replace('_', ' ')}
                          </Text>
                          
                            
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Second Column: Two smaller modules stacked vertically */}
                    <View style={[
                      styles.column,
                      { 
                        width: '50%',
                        paddingLeft: 8
                      }
                    ]}>
                      {otherModules.slice(0, 2).map((module, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.smallModule,
                            {
                              backgroundColor: index === 0 ? '#FF637F' : '#FFBB64',
                              padding: isDesktop ? 20 : isTablet ? 16 : 12,
                              borderRadius: isDesktop ? 12 : isTablet ? 10 : 8,
                              marginBottom: index === 0 ? 8 : 0,
                              borderWidth: 0, // Remove border
                            }
                          ]}
                          onPress={() => handleModulePress(
                            module.module_name.charAt(0).toUpperCase() + module.module_name.slice(1).replace('_', ' '),
                            module.module_unique_name
                          )}
                          activeOpacity={0.7}
                        >
                          <View style={[
                            styles.smallModuleIconContainer,
                            {
                              width: isDesktop ? 50 : isTablet ? 45 : 40,
                              height: isDesktop ? 50 : isTablet ? 45 : 40,
                              borderRadius: isDesktop ? 25 : isTablet ? 22.5 : 20,
                              marginBottom: isDesktop ? 12 : isTablet ? 10 : 8,
                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            }
                          ]}>
                            <Image 
                              source={{ uri: module.module_icon }} 
                              style={[
                                styles.smallModuleIcon,
                                {
                                  width: isDesktop ? 28 : isTablet ? 24 : 20,
                                  height: isDesktop ? 28 : isTablet ? 24 : 20,
                                }
                              ]} 
                              resizeMode="contain" 
                            />
                          </View>
                          <Text style={[
                            styles.smallModuleTitle,
                            { 
                              fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
                              color: currentColors.white
                            }
                          ]} numberOfLines={2}>
                            {module.module_name.charAt(0).toUpperCase() + module.module_name.slice(1).replace('_', ' ')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* View All Modules Button */}
                  <TouchableOpacity 
                    style={[
                      styles.viewAllModulesButton,
                      {
                        marginTop: isDesktop ? 24 : isTablet ? 20 : 16,
                        paddingVertical: isDesktop ? 14 : isTablet ? 12 : 10,
                        borderRadius: isDesktop ? 12 : isTablet ? 10 : 8,
                        backgroundColor: isDarkMode ? 'rgba(12, 29, 51, 0.77)' : currentColors.backgroundSecondary,
                        borderWidth: 0, // Remove border
                      }
                    ]}
                    onPress={handleViewAllModules}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.viewAllModulesText,
                      { 
                        fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
                        color: currentColors.info
                      }
                    ]}>View all modules →</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Upcoming Events Section */}
              <View style={[
                styles.section,
                { marginBottom: responsive.sectionSpacing }
              ]}>
                <Text style={[
                  styles.sectionTitle,
                  { 
                    fontSize: isDesktop ? 20 : isTablet ? 18 : 16,
                    color: currentColors.text
                  }
                ]}>Upcoming Events</Text>
                {upcomingEvents.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.eventsScroll}
                    contentContainerStyle={[
                      styles.eventsScrollContent,
                      { gap: isDesktop ? 24 : isTablet ? 20 : 16 }
                    ]}
                  >
                    {upcomingEvents.map((event, index) => (
                      <EventAvatar
                        key={index}
                        name={event.full_name}
                        date={formatDate(event.date)}
                        initials={getInitials(event.full_name)}
                        type={event.type}
                        years={event.years}
                      />
                    ))}
                  </ScrollView>
                ) : (
                  <View style={[
                    styles.noEventsContainer,
                    {
                      backgroundColor: isDarkMode ? 'rgba(12, 29, 51, 0.77)' : currentColors.white,
                      borderWidth: 0, // Remove border
                    }
                  ]}>
                    <Image
                      source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2965/2965140.png' }}
                      style={[
                        styles.noEventsImage,
                        {
                          width: isDesktop ? 120 : isTablet ? 100 : 80,
                          height: isDesktop ? 120 : isTablet ? 100 : 80,
                        }
                      ]}
                      resizeMode="contain"
                    />
                    <Text style={[
                      styles.noEventsText,
                      { 
                        fontSize: isDesktop ? 18 : isTablet ? 16 : 14,
                        color: currentColors.textSecondary
                      }
                    ]}>No upcoming events</Text>
                  </View>
                )}
              </View>

              {/* Theme Toggle Section */}
              <View style={[
                styles.section,
                { 
                  marginBottom: responsive.sectionSpacing,
                  alignItems: 'center',
                  justifyContent: 'center',
                }
              ]}>
                <ThemeToggle 
                  isDarkMode={isDarkMode} 
                  onToggle={toggleTheme}
                  colors={currentColors}
                />
              </View>
            </ScrollView>

            {/* Custom Wave Bottom Bar */}
            <CustomWaveBottomBar
              data={waveBottomBarTabs}
              selectedTab={activeNavItem}
              onTabPress={(routeName: string) => handleNavItemPress(routeName)}
              waveColor={currentColors.info}
              backgroundColor={currentColors.white}
              barColor={currentColors.white}
              containerStyle={[
                styles.waveBarContainer,
                { height: responsive.bottomBarHeight }
              ]}
              tabButtonStyle={styles.waveTabButton}
              tabTextStyle={styles.waveTabText}
              animatedWaveStyle={[
                styles.waveAnimation,
                { height: responsive.waveHeight }
              ]}
            />
          </View>
          <HamburgerMenu />
          <AllModulesModal />
        </SafeAreaView>
      )}
    </KeyboardAvoidingView>
  );
};

export default Dashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: isDesktop ? 18 : isTablet ? 16 : 14,
    marginTop: 16
  },
  errorText: {
    fontSize: isDesktop ? 18 : isTablet ? 16 : 14,
    textAlign: 'center',
    marginBottom: 24
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
    fontWeight: '600'
  },
  noModulesText: {
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 32,
    width: '100%'
  },
  header: {
    position: 'relative',
    overflow: 'hidden',
  },
  headerBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isDesktop ? 10 : isTablet ? 8 : 6,
  },
  menuIcon: {
    padding: 8,
    borderRadius: 4,
    zIndex: 1,
  },
  menuLine: {
    marginVertical: 3,
    borderRadius: 1
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoText: {
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 36
  },
  welcomeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: isDesktop ? 10 : isTablet ? 8 : 6,
  },
  welcomeText: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  userProfileSection: {
    marginTop: isDesktop ? 10 : isTablet ? 8 : 6,
  },
  userProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isDesktop ? 16 : isTablet ? 14 : 12,
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  userProfileImage: {
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  userProfileImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  userProfileInitials: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  userProfileInfo: {
    flex: 1,
    marginLeft: isDesktop ? 20 : isTablet ? 16 : 12,
  },
  greeting: {
    marginBottom: 4,
    fontWeight: '600'
  },
  userDesignation: {
    fontWeight: '400'
  },
  mainContent: {
    flex: 1,
    borderTopLeftRadius: isDesktop ? 40 : isTablet ? 32 : 28,
    borderTopRightRadius: isDesktop ? 40 : isTablet ? 32 : 28,
    marginTop: -16,
    position: 'relative',
  },
  scrollContent: {
    flex: 1
  },
  scrollContainer: {
    flexGrow: 1,
  },
  section: {
    width: '100%',
  },
  sectionModules: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isDesktop ? 20 : isTablet ? 16 : 12,
  },
  sectionTitle: {
    fontWeight: '700',
    letterSpacing: -0.5
  },
  viewAllText: {
    fontWeight: '600',
  },
  quickActionsRow: {
    width: '100%',
  },
  quickActionsScrollContent: {
    flexDirection: 'row',
    gap: isDesktop ? 16 : isTablet ? 14 : 12,
    paddingRight: isDesktop ? 24 : isTablet ? 20 : 16,
  },
  quickActionItem: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIconContainer: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionIcon: {
    width: '100%',
    height: '100%',
  },
  quickActionText: {
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  remindersContainer: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reminderItem: {
    marginBottom: 8,
  },
  reminderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reminderTextContainer: {
    flex: 1,
  },
  reminderTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  reminderTime: {
    fontWeight: '500',
  },
  noRemindersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noRemindersText: {
    marginTop: 8,
    fontStyle: 'italic',
  },
  modulesContainer: {
    borderRadius: 16,
    padding: isDesktop ? 24 : isTablet ? 20 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  modulesRow: {
    width: '100%',
    height: '70%',
  },
  column: {
    flexDirection: 'column',
  },
  attendanceModule: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  attendanceModuleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  attendanceIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendanceIcon: {
    width: '100%',
    height: '100%',
  },
  arrowButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontWeight: 'bold',
  },
  attendanceModuleTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  attendanceModuleStats: {
    marginBottom: 8,
    lineHeight: 20,
  },
  attendanceModuleEvents: {
    lineHeight: 20,
  },
  statsBold: {
    fontWeight: '700',
  },
  smallModule: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  smallModuleIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallModuleIcon: {
    width: '100%',
    height: '100%',
  },
  smallModuleTitle: {
    fontWeight: '600',
    textAlign: 'center',
  },
  viewAllModulesButton: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  viewAllModulesText: {
    fontWeight: '600',
  },
  attendanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  card: {
    borderRadius: 20,
    padding: isDesktop ? 28 : isTablet ? 24 : 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cardCircle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: isDesktop ? 120 : isTablet ? 100 : 80,
    height: isDesktop ? 120 : isTablet ? 100 : 80,
    borderRadius: isDesktop ? 60 : isTablet ? 50 : 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)'
  },
  cardCircleSmall: {
    position: 'absolute',
    bottom: -10,
    left: -10,
    width: isDesktop ? 70 : isTablet ? 60 : 50,
    height: isDesktop ? 70 : isTablet ? 60 : 50,
    borderRadius: isDesktop ? 35 : isTablet ? 30 : 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  cardValue: {
    fontWeight: '800',
    marginBottom: 6,
    zIndex: 1,
    letterSpacing: -1
  },
  cardLabel: {
    textAlign: 'center',
    fontWeight: '600',
    zIndex: 1
  },
  modulesScrollContent: {
    paddingRight: isDesktop ? 24 : isTablet ? 20 : 16,
  },
  moduleItem: {
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  moduleIconContainer: {
    borderRadius: isDesktop ? 16 : isTablet ? 14 : 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isDesktop ? 14 : isTablet ? 12 : 10,
    overflow: 'hidden'
  },
  moduleIconImage: {
    width: '100%',
    height: '100%',
  },
  moduleTitle: {
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: isDesktop ? 20 : isTablet ? 18 : 16
  },
  eventsScroll: {
    marginTop: 8
  },
  eventsScrollContent: {
    paddingRight: isDesktop ? 24 : isTablet ? 20 : 16,
    paddingTop: 4,
    paddingBottom: 4
  },
  eventContainer: {
    alignItems: 'center',
    paddingTop: 12
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8
  },
  avatar: {
    borderRadius: isDesktop ? 40 : isTablet ? 35 : 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  avatarAnniversary: {},
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  dateBadge: {
    position: 'absolute',
    bottom: -12,
    borderRadius: 10,
    minWidth: isDesktop ? 60 : isTablet ? 56 : 52,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3
  },
  dateBadgeAnniversary: {},
  dateText: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  anniversaryBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#FCD34D',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3
  },
  anniversaryText: {
    color: '#78350F',
    fontWeight: '700'
  },
  eventName: {
    textAlign: 'center',
    lineHeight: isDesktop ? 20 : isTablet ? 18 : 16,
    fontWeight: '500',
    marginBottom: 4
  },
  eventType: {
    textAlign: 'center',
    fontWeight: '600',
    opacity: 0.7
  },
  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  noEventsImage: {
    marginBottom: 16,
    opacity: 0.5
  },
  noEventsText: {
    fontStyle: 'italic'
  },
  // Theme Toggle Styles
  themeToggleContainer: {
    width: 80,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    padding: 4,
    position: 'relative',
  },
  themeToggleCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  themeIconContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeIcon: {
    fontSize: 18,
  },
  // Custom Wave Bottom Bar Styles
  customBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  waveEffect: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  wavePattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  waveCircle: {
    position: 'absolute',
    opacity: 0.3,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconContainerActive: {},
  tabLabel: {
    textAlign: 'center',
  },
  // Wave Bar Container Styles
  waveBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  waveTabButton: {
    paddingVertical: 10,
  },
  waveTabText: {
    fontWeight: '600',
  },
  waveAnimation: {
    height: 60,
  },
  overlay: {
    flex: 1,
    flexDirection: 'row'
  },
  overlayTouchable: {
    flex: 1
  },
  menuContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    flexDirection: 'column'
  },
  menuHeader: {
    position: 'relative'
  },
  menuHeaderContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center'
  },
  menuUserAvatar: {
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  menuUserAvatarCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  menuUserAvatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  menuUserDetails: {
    flex: 1,
    marginLeft: 16
  },
  menuUserRole: {
    marginBottom: 4
  },
  menuUserName: {
    fontWeight: '600'
  },
  menuItems: {
    flex: 1,
  },
  menuItemsContent: {
    paddingTop: 20,
    paddingBottom: 12
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4
  },
  menuItemActive: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6'
  },
  menuItemIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontWeight: '500',
    flex: 1
  },
  menuItemTextActive: {
    fontWeight: '600'
  },
  logoutSection: {
    paddingTop: 12
  },
  logoutDivider: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 12
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444'
  },
  logoutIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    fontWeight: '600',
    flex: 1
  },
  // All Modules Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  allModulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
});


