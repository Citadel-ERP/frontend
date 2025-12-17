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
import Attendance from './attendance/Attendance';
import Profile from './Profile';
import HR from './HR';
import Cab from './Cab';
import Driver from './Driver';
import BDT from './BDT';
import Medical from './Medical';
import ScoutBoy from './ScoutBoy';
import CreateSite from './CreateSite';
import Reminder from './Reminder';
import BUP from './BUP/BUP';
import ChatScreen from './chat/ChatScreen';
import ChatRoomScreen from './chat/ChatRoomScreen';
import Settings from './Settings';
import AttendanceWrapper from './AttendanceWrapper';
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
  const baseSpacing = isDesktop ? 32 : isTablet ? 24 : 20;
  const baseFontSize = isDesktop ? 16 : isTablet ? 15 : 14;
  
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
      {/* Wave effect with multiple layers for better animation */}
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
        {/* Wave pattern overlay */}
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
      
      {/* Tabs container */}
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

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [token, setToken] = useState<string | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined)
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined)

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

  // Add these state variables
  const [showChat, setShowChat] = useState(false);
  const [showChatRoom, setShowChatRoom] = useState(false);
  const [selectedChatRoom, setSelectedChatRoom] = useState<any>(null);

  const TOKEN_2_KEY = 'token_2';

  // Function to auto-mark attendance
  const autoMarkAttendance = async () => {
    console.log('🎯 AUTO-MARK ATTENDANCE: Starting automatic attendance marking...');
    try {
      console.log('Background attendance task started');

      // Check if it's the right time (10:00 AM - 11:00 AM, Mon-Fri)
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

      // Check if it's Monday to Friday (1-5) and between 10:00-11:00 AM
      // Get stored token
      const token = await AsyncStorage.getItem(TOKEN_2_KEY);
      if (!token) {
        console.log('No token found');
      }

      // Request location permission and get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        // Try to get background location permission
        const bgStatus = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus.status !== 'granted') {
          console.log('Background location permission denied');
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
      });

      // Make API call to mark attendance
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
        console.log('Attendance marked successfully:', result);

        // Store last attendance check time
        await AsyncStorage.setItem('lastAttendanceCheck', now.toISOString());
      } else {
        console.log('Failed to mark attendance:', response.status);
      }

    } catch (error) {
      console.error('Background attendance task error:', error);
    }
  };

  const debugLog = async (message: string, data?: any) => {
    console.log(message, data);
    // Store logs in AsyncStorage for later viewing
    try {
      const logs = await AsyncStorage.getItem('debug_logs') || '[]';
      const logArray = JSON.parse(logs);
      logArray.push({
        timestamp: new Date().toISOString(),
        message,
        data: data ? JSON.stringify(data) : null
      });
      // Keep only last 50 logs
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

      // Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2D3748',
        });
        await debugLog('[Push Token] Notification channel created');
      }

      // Request permissions
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

      // Get Expo Push Token
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

    // Handle special actions that don't show UI
    if (page === 'autoMarkAttendance') {
      console.log('🎯 SPECIAL CODE: Auto-marking attendance...');
      return; // Don't show any page
    }

    // Handle regular page navigation
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

        const savedToken = await AsyncStorage.getItem('expo_push_token');
        await debugLog('Saved token from storage', savedToken);

        const pushToken = await registerForPushNotificationsAsync();
        await debugLog('Registration result', { pushToken: !!pushToken, isMounted });

        if (pushToken && isMounted) {
          setExpoPushToken(pushToken);
          await debugLog('Calling sendTokenToBackend');
          await sendTokenToBackend(pushToken, token);
        } else {
          await debugLog('Skipping backend call', { pushToken: !!pushToken, isMounted });
        }

        // Listener for notifications received while app is foregrounded
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
          debugLog('📱 Notification received in foreground', notification);
          setNotification(notification);

          const data = notification.request.content.data;
          if (data?.page === 'autoMarkAttendance') {
            debugLog('🎯 AUTO-MARK: Detected autoMarkAttendance');
            autoMarkAttendance();
          }
        });

        // Listener for when user taps on notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
          debugLog('👆 Notification tapped', response);
          const data = response.notification.request.content.data;
          if (data?.page) {
            handleNotificationNavigation(data.page as string);
          }
        });

        // Check if app was opened from a notification
        const lastNotificationResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastNotificationResponse) {
          debugLog('📬 App opened from notification', lastNotificationResponse);
          const data = lastNotificationResponse.notification.request.content.data;
          if (data?.page) {
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
      if (notificationListener.current) {
        notificationListener.current?.remove();
      }
      if (responseListener.current) {
        responseListener.current?.remove();
      }
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
          // Save driver field to AsyncStorage
          try {
            await AsyncStorage.setItem('is_driver', JSON.stringify(data.is_driver || false));
            console.log('Driver status saved:', data.is_driver);
          } catch (storageError) {
            console.error('Error saving driver status to storage:', storageError);
          }
          setUpcomingAnniversaries(data.upcoming_anniversary || []);

          // Generate upcoming events (birthdays + anniversaries)
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
    type: 'user' | 'notification' | 'help' | 'lock' | 'info' | 'settings';
    color?: string;
    size?: number;
  }

  const Icon: React.FC<IconProps> = ({ type, color = colors.textSecondary, size = 20 }) => {
    const iconStyles = {
      user: { width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3, borderWidth: 2, borderColor: color },
      notification: { width: size * 0.7, height: size * 0.8, borderRadius: size * 0.1, borderWidth: 2, borderColor: color },
      help: { width: size * 0.8, height: size * 0.8, borderRadius: size * 0.4, borderWidth: 2, borderColor: color },
      lock: { width: size * 0.6, height: size * 0.5, borderRadius: size * 0.05, borderWidth: 2, borderColor: color },
      info: { width: size * 0.8, height: size * 0.8, borderRadius: size * 0.4, borderWidth: 2, borderColor: color },
      settings: { width: size * 0.8, height: size * 0.8, borderRadius: size * 0.1, borderWidth: 2, borderColor: color },
    };
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={iconStyles[type]} />
        {type === 'help' && <Text style={{ color, fontSize: size * 0.6, fontWeight: 'bold', position: 'absolute' }}>?</Text>}
        {type === 'info' && <Text style={{ color, fontSize: size * 0.6, fontWeight: 'bold', position: 'absolute' }}>i</Text>}
        {type === 'settings' && (
          <View style={{ position: 'absolute' }}>
            <View style={{ width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15, backgroundColor: color }} />
          </View>
        )}
      </View>
    );
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

  const LogoutIcon = ({ color = colors.error, size = 20 }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.7, height: size * 0.8, borderWidth: 2, borderColor: color, borderRadius: size * 0.05 }}>
        <View style={{ position: 'absolute', right: size * 0.1, top: '50%', width: size * 0.08, height: size * 0.08, borderRadius: size * 0.04, backgroundColor: color, transform: [{ translateY: -size * 0.04 }] }} />
      </View>
      <View style={{ position: 'absolute', right: -size * 0.1, width: size * 0.4, height: 2, backgroundColor: color }}>
        <View style={{ position: 'absolute', right: 0, top: -size * 0.05, width: size * 0.1, height: size * 0.1, borderTopWidth: 2, borderRightWidth: 2, borderColor: color, transform: [{ rotate: '45deg' }] }} />
      </View>
    </View>
  );

  const menuItems = [
    { title: 'Profile', icon: <Icon type="user" color={activeMenuItem === 'Profile' ? colors.primary : colors.textSecondary} />, isActive: activeMenuItem === 'Profile' },
    { title: 'Settings', icon: <Icon type="settings" color={activeMenuItem === 'Settings' ? colors.primary : colors.textSecondary} />, isActive: activeMenuItem === 'Settings' },
    { title: 'Notifications', icon: <Icon type="notification" color={activeMenuItem === 'Notifications' ? colors.primary : colors.textSecondary} />, isActive: activeMenuItem === 'Notifications' },
    { title: 'Help & Support', icon: <Icon type="help" color={activeMenuItem === 'Help & Support' ? colors.primary : colors.textSecondary} />, isActive: activeMenuItem === 'Help & Support' },
    { title: 'Privacy Policy', icon: <Icon type="lock" color={activeMenuItem === 'Privacy Policy' ? colors.primary : colors.textSecondary} />, isActive: activeMenuItem === 'Privacy Policy' },
    { title: 'About', icon: <Icon type="info" color={activeMenuItem === 'About' ? colors.primary : colors.textSecondary} />, isActive: activeMenuItem === 'About' },
  ];

  const openMenu = () => {
    setIsMenuVisible(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, { toValue: -300, duration: 300, useNativeDriver: true }).start(() => setIsMenuVisible(false));
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => { closeMenu(); onLogout(); } },
    ]);
  };

  const handleMenuItemPress = (item: string) => {
    setActiveMenuItem(item);
    closeMenu();
    if (item === 'Profile') {
      setShowProfile(true);
    } else if (item === 'Settings') {
      setShowSettings(true);
    } else {
      Alert.alert('Coming Soon', `${item} feature will be available soon!`);
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" backgroundColor="#2D3748" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (error || !userData) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" backgroundColor="#2D3748" />
        <Text style={styles.errorText}>Failed to load data</Text>
        <TouchableOpacity style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
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
        { fontSize: isDesktop ? 52 : isTablet ? 44 : 40 }
      ]}>{value}</Text>
      <Text style={[
        styles.cardLabel,
        { fontSize: isDesktop ? 15 : isTablet ? 14 : 13 }
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
        { fontSize: isDesktop ? 14 : isTablet ? 13 : 12 }
      ]} numberOfLines={2}>{name}</Text>
      <Text style={[
        styles.eventType,
        { fontSize: isDesktop ? 12 : isTablet ? 11 : 10 }
      ]}>{type === 'birthday' ? '🎂 Birthday' : '💼 Anniversary'}</Text>
    </View>
  );

  interface ModuleItemProps {
    title: string;
    iconUrl: string;
    onPress: () => void;
  }

  const ModuleItem: React.FC<ModuleItemProps> = ({ title, iconUrl, onPress }) => (
    <TouchableOpacity style={[
      styles.moduleItem,
      {
        width: isDesktop ? 150 : isTablet ? 130 : 110,
        padding: isDesktop ? 18 : isTablet ? 16 : 12,
        minHeight: isDesktop ? 150 : isTablet ? 130 : 110,
      }
    ]} onPress={onPress} activeOpacity={0.7}>
      <View style={[
        styles.moduleIconContainer,
        {
          width: isDesktop ? 60 : isTablet ? 56 : 48,
          height: isDesktop ? 60 : isTablet ? 56 : 48,
        }
      ]}>
        <Image source={{ uri: iconUrl }} style={[
          styles.moduleIconImage,
          {
            width: isDesktop ? 40 : isTablet ? 36 : 32,
            height: isDesktop ? 40 : isTablet ? 36 : 32,
          }
        ]} resizeMode="contain" />
      </View>
      <Text style={[
        styles.moduleTitle,
        { fontSize: isDesktop ? 14 : isTablet ? 13 : 12 }
      ]} numberOfLines={2}>{title}</Text>
    </TouchableOpacity>
  );

  const HamburgerMenu = () => (
    <Modal transparent visible={isMenuVisible} animationType="none" onRequestClose={closeMenu}>
      <SafeAreaView style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={closeMenu} />
        <Animated.View style={[
          styles.menuContainer,
          {
            width: isDesktop ? 400 : isTablet ? 350 : 300,
            transform: [{ translateX: slideAnim }]
          }
        ]}>
          <View style={[styles.menuHeader, { paddingTop: insets.top }]}>
            <View style={styles.menuHeaderContent}>
              <View style={[
                styles.menuUserAvatarCircle,
                {
                  width: isDesktop ? 70 : isTablet ? 64 : 56,
                  height: isDesktop ? 70 : isTablet ? 64 : 56,
                }
              ]}>
                <Icon type="user" color={colors.white} size={isDesktop ? 28 : 24} />
              </View>
              <View style={styles.menuUserDetails}>
                <Text style={[
                  styles.menuUserRole,
                  { fontSize: isDesktop ? 16 : isTablet ? 14 : 13 }
                ]}>{userData.designation || userData.role || 'Employee'}</Text>
                <Text style={[
                  styles.menuUserName,
                  { fontSize: isDesktop ? 22 : isTablet ? 20 : 18 }
                ]}>{userData.full_name}</Text>
              </View>
            </View>
          </View>
          <ScrollView style={styles.menuItems} showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuItemsContent}>
            {menuItems.map((item, index) => (
              <TouchableOpacity key={index} style={[
                styles.menuItem,
                item.isActive && styles.menuItemActive,
                {
                  paddingHorizontal: isDesktop ? 28 : isTablet ? 24 : 20,
                  paddingVertical: isDesktop ? 18 : isTablet ? 16 : 14,
                }
              ]} onPress={() => handleMenuItemPress(item.title)} activeOpacity={0.7}>
                <View style={[
                  styles.menuItemIconContainer,
                  {
                    width: isDesktop ? 40 : isTablet ? 36 : 32,
                    marginRight: isDesktop ? 24 : isTablet ? 20 : 16,
                  }
                ]}>{item.icon}</View>
                <Text style={[
                  styles.menuItemText,
                  item.isActive && styles.menuItemTextActive,
                  { fontSize: isDesktop ? 18 : isTablet ? 16 : 15 }
                ]}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={[styles.logoutSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.logoutDivider} />
            <TouchableOpacity style={[
              styles.logoutButton,
              {
                paddingHorizontal: isDesktop ? 28 : isTablet ? 24 : 20,
                paddingVertical: isDesktop ? 18 : isTablet ? 16 : 14,
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
                { fontSize: isDesktop ? 18 : isTablet ? 16 : 15 }
              ]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );

  const displayModules = getDisplayModules();

  // WaveBottomBar configuration
  const waveBottomBarTabs = [
    {
      routeName: 'home',
      tabLabel: 'Home',
      tabIcon: (isFocused: boolean) => (
        <HomeIcon color={isFocused ? colors.primary : colors.textSecondary} size={responsive.iconSize} />
      ),
    },
    {
      routeName: 'message',
      tabLabel: 'Messages',
      tabIcon: (isFocused: boolean) => (
        <MessageIcon color={isFocused ? colors.primary : colors.textSecondary} size={responsive.iconSize} />
      ),
    },
    {
      routeName: 'team',
      tabLabel: 'Organisation',
      tabIcon: (isFocused: boolean) => (
        <TeamIcon color={isFocused ? colors.primary : colors.textSecondary} size={responsive.iconSize} />
      ),
    },
    {
      routeName: 'ai-bot',
      tabLabel: 'AI Bot',
      tabIcon: (isFocused: boolean) => (
        <BotIcon color={isFocused ? colors.primary : colors.textSecondary} size={responsive.iconSize} />
      ),
    },
    {
      routeName: 'support',
      tabLabel: 'Support',
      tabIcon: (isFocused: boolean) => (
        <SupportIcon color={isFocused ? colors.primary : colors.textSecondary} size={responsive.iconSize} />
      ),
    },
  ];

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
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#2D3748" />
          <View style={[
            styles.header,
            {
              paddingTop: Math.max(insets.top, isDesktop ? 20 : isTablet ? 16 : 12),
              paddingBottom: isDesktop ? 28 : isTablet ? 24 : 20,
              paddingHorizontal: responsive.horizontalPadding,
            }
          ]}>
            <View style={styles.headerTop}>
              <TouchableOpacity style={styles.menuIcon} onPress={openMenu}>
                {[1, 2, 3].map(i => (
                  <View key={i} style={[
                    styles.menuLine,
                    {
                      width: isDesktop ? 24 : isTablet ? 22 : 20,
                      height: 2,
                    }
                  ]} />
                ))}
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Image source={require('../assets/logo_back.png')} style={[
                  styles.logo,
                  {
                    width: responsive.logoSize,
                    height: responsive.logoSize * 0.8,
                  }
                ]} resizeMode="contain" />
              </View>
              <View style={[
                styles.headerSpacer,
                { width: isDesktop ? 44 : isTablet ? 40 : 36 }
              ]} />
            </View>
            <View style={styles.userInfo}>
              <View style={styles.userDetails}>
                <Text style={[
                  styles.greeting,
                  { fontSize: isDesktop ? 18 : isTablet ? 16 : 14 }
                ]}>Hi</Text>
                <Text style={[
                  styles.userName,
                  { fontSize: isDesktop ? 36 : isTablet ? 32 : 28 }
                ]}>{userData.full_name.split(' ')[0]},</Text>
                <Text style={[
                  styles.userRole,
                  { fontSize: isDesktop ? 19 : isTablet ? 17 : 15 }
                ]}>{userData.designation || userData.role || 'Employee'}</Text>
              </View>
            </View>
          </View>
          <View style={styles.mainContent}>
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
              <View style={[
                styles.section,
                { marginBottom: responsive.sectionSpacing }
              ]}>
                <Text style={[
                  styles.sectionTitle,
                  { fontSize: isDesktop ? 26 : isTablet ? 24 : 20 }
                ]}>Attendance</Text>
                <View style={[
                  styles.attendanceGrid,
                  {
                    gap: responsive.cardSpacing,
                    marginBottom: isDesktop ? 20 : isTablet ? 16 : 12,
                  }
                ]}>
                  <AttendanceCard value={String(userData.days_present)} label="Days Present" color="#A7F3D0" />
                  <AttendanceCard
                    value={String(userData.leaves_applied)}
                    label="Leaves Applied"
                    color="#FED7AA"
                  />
                  <AttendanceCard value={String(userData.holidays)} label="Holidays" color="#DDD6FE" />
                  <AttendanceCard value={String(userData.late_arrivals)} label="Late Arrivals" color="#FBCFE8" />
                </View>
              </View>
              <View style={[
                styles.sectionModules,
                {
                  marginTop: Platform.OS === 'android' && isSmallScreen ? -40 : 0,
                  marginBottom: responsive.sectionSpacing,
                }
              ]}>
                <Text style={[
                  styles.sectionTitle,
                  { fontSize: isDesktop ? 26 : isTablet ? 24 : 20 }
                ]}>Modules</Text>
                {displayModules.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[
                      styles.modulesScrollContent,
                      { gap: responsive.cardSpacing }
                    ]}
                  >
                    {displayModules.map((module, index) => (
                      <ModuleItem
                        key={index}
                        title={module.title}
                        iconUrl={module.iconUrl}
                        onPress={() => handleModulePress(module.title, module.module_unique_name)}
                      />
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={[
                    styles.noModulesText,
                    { fontSize: isDesktop ? 16 : isTablet ? 15 : 14 }
                  ]}>No modules available</Text>
                )}
              </View>
              <View style={[
                styles.section,
                { marginBottom: responsive.sectionSpacing }
              ]}>
                <Text style={[
                  styles.sectionTitle,
                  { fontSize: isDesktop ? 26 : isTablet ? 24 : 20 }
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
                  <View style={styles.noEventsContainer}>
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
                      { fontSize: isDesktop ? 18 : isTablet ? 16 : 14 }
                    ]}>No upcoming events</Text>
                  </View>
                )}
              </View>
            </ScrollView>
            
            {/* Custom Wave Bottom Bar */}
            <CustomWaveBottomBar
              data={waveBottomBarTabs}
              selectedTab={activeNavItem}
              onTabPress={(routeName: string) => handleNavItemPress(routeName)}
              waveColor={colors.primary}
              backgroundColor={colors.white}
              barColor={colors.white}
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
        </SafeAreaView>
      )}
    </KeyboardAvoidingView>
  );
};

export default Dashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: colors.white,
    fontSize: isDesktop ? 18 : isTablet ? 16 : 14,
    marginTop: 16
  },
  errorText: {
    color: colors.white,
    fontSize: isDesktop ? 18 : isTablet ? 16 : 14,
    textAlign: 'center',
    marginBottom: 24
  },
  retryButton: {
    backgroundColor: colors.white,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: colors.primary,
    fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
    fontWeight: '600'
  },
  noModulesText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 32,
    width: '100%'
  },
  header: {
    backgroundColor: colors.primary,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isDesktop ? 28 : isTablet ? 24 : 20,
  },
  menuIcon: {
    padding: 8,
    borderRadius: 4
  },
  menuLine: {
    backgroundColor: colors.white,
    marginVertical: 3,
    borderRadius: 1
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logo: {
    backgroundColor: 'transparent'
  },
  headerSpacer: {
    width: 36
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  userDetails: {
    flex: 1
  },
  greeting: {
    color: colors.textLight,
    marginBottom: 4
  },
  userName: {
    color: colors.white,
    fontWeight: '700',
    marginBottom: 4
  },
  userRole: {
    color: colors.textLight,
    fontWeight: '400'
  },
  mainContent: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
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
  sectionTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: isDesktop ? 24 : isTablet ? 20 : 16,
    letterSpacing: -0.5
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
    color: colors.text,
    marginBottom: 6,
    zIndex: 1,
    letterSpacing: -1
  },
  cardLabel: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    zIndex: 1
  },
  modulesScrollContent: {
    paddingRight: isDesktop ? 24 : isTablet ? 20 : 16,
  },
  moduleItem: {
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    color: colors.text,
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
    backgroundColor: colors.info,
    borderRadius: isDesktop ? 40 : isTablet ? 35 : 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  avatarAnniversary: {
    backgroundColor: '#8B5CF6'
  },
  avatarInitials: {
    color: colors.white,
    fontWeight: 'bold'
  },
  dateBadge: {
    position: 'absolute',
    bottom: -12,
    backgroundColor: colors.primary,
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
  dateBadgeAnniversary: {
    backgroundColor: '#7C3AED'
  },
  dateText: {
    color: colors.white,
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
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: isDesktop ? 20 : isTablet ? 18 : 16,
    fontWeight: '500',
    marginBottom: 4
  },
  eventType: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    opacity: 0.7
  },
  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: colors.white,
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
    color: colors.textSecondary,
    fontStyle: 'italic'
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    backgroundColor: colors.white,
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
    backgroundColor: colors.primary,
    position: 'relative'
  },
  menuHeaderContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center'
  },
  menuUserAvatarCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  menuUserDetails: {
    flex: 1
  },
  menuUserRole: {
    color: colors.textLight,
    marginBottom: 4
  },
  menuUserName: {
    color: colors.white,
    fontWeight: '600'
  },
  menuItems: {
    flex: 1,
    backgroundColor: colors.white
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
    backgroundColor: colors.backgroundSecondary,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary
  },
  menuItemIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1
  },
  menuItemTextActive: {
    color: colors.primary,
    fontWeight: '600'
  },
  logoutSection: {
    backgroundColor: colors.white,
    paddingTop: 12
  },
  logoutDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
    marginBottom: 12
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.error
  },
  logoutIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.error,
    fontWeight: '600',
    flex: 1
  }
});