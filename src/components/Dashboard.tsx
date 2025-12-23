import React, { useState, useEffect, useRef } from 'react';
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
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Import all the pages
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
import { BackgroundAttendanceService } from '../services/backgroundAttendance';
import { BackgroundLocationService } from '../services/backgroundLocationTracking';
import { BACKEND_URL } from '../config/config';

const { width, height } = Dimensions.get('window');

// Backend URL from config
const TOKEN_2_KEY = 'token_2';

// Interfaces (same as before)
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
  time: string;
  icon: string;
  meeting_with?: string;
  meeting_time?: string;
}

interface UpcomingEvent {
  full_name: string;
  date: string;
  type: 'birthday' | 'anniversary';
  years?: number;
  anniversaryYears?: number;
}

// Theme Colors
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
  headerBg: '#2D3748',
  primaryBlue: '#007AFF',
  gradientStart: '#007AFF',
  gradientEnd: '#0056CC',
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
  headerBg: '#000D24',
  primaryBlue: '#007AFF',
  gradientStart: '#007AFF',
  gradientEnd: '#0056CC',
};

// Main Dashboard Component
function DashboardContent({ onLogout }: { onLogout: () => void }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  // State from old dashboard
  const [token, setToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([]);
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastOpenedModules, setLastOpenedModules] = useState<Module[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [topModules, setTopModules] = useState<any[]>([]);
  const [attendanceKey, setAttendanceKey] = useState(0);
  
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
  const [showChat, setShowChat] = useState(false);
  const [showChatRoom, setShowChatRoom] = useState(false);
  const [selectedChatRoom, setSelectedChatRoom] = useState<any>(null);
  
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
  
  // Animations
  const circleScale = useRef(new Animated.Value(0)).current;
  const switchToggle = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-300)).current;
  
  // Current theme colors
  const currentColors = isDark ? darkColors : lightColors;
  
  // New dashboard theme mapping
  const theme = {
    bgColor: isDark ? '#050b18' : '#f8f9fa',
    cardBg: isDark ? '#111a2d' : '#ffffff',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    accentBlue: isDark ? '#3262f1' : '#007bff',
    navBg: isDark ? '#0a111f' : '#ffffff',
  };

  // Default modules for new users
  const defaultLastOpened: IconItem[] = [
    { name: 'HR', color: '#00d285', icon: 'user-tie', library: 'fa5', module_unique_name: 'hr' },
    { name: 'Cab', color: '#ffb157', icon: 'car', library: 'fa5', module_unique_name: 'cab' },
    { name: 'Attendance', color: '#ff5e7a', icon: 'book', library: 'fa5', module_unique_name: 'attendance' },
    { name: 'BDT', color: '#1da1f2', icon: 'network-wired', library: 'fa5', module_unique_name: 'bdt' },
  ];

  // Updated chart data with proper day alignment
  const chartData = [
    { day: 'Mon', hours: 5.5, target: 6.0 },
    { day: 'Tue', hours: 7.2, target: 5.8 },
    { day: 'Wed', hours: 6.8, target: 7.5 },
    { day: 'Thu', hours: 8.5, target: 6.2 },
    { day: 'Fri', hours: 7.0, target: 7.8 },
    { day: 'Sat', hours: 6.2, target: 6.5 },
    { day: 'Sun', hours: 5.8, target: 7.2 },
  ];

  // Responsive font sizes
  const responsiveFont = (size: number) => {
    const scale = Math.min(screenWidth / 375, 1.2);
    return size * scale;
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
          const data = await response.json();
          if (data.message === "Get modules successful") {
            const transformedUserData: UserData = {
              ...data.user,
              profile_picture: data.user.profile_picture || undefined
            };
            setUserData(transformedUserData);
            setModules(data.modules || []);
            setUpcomingBirthdays(data.upcoming_birthdays || []);
            setUpcomingAnniversaries(data.upcoming_anniversary || []);
            
            // Combine and sort events
            const events = getUpcomingEvents(data.upcoming_birthdays || [], data.upcoming_anniversary || []);
            setUpcomingEvents(events);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

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
          const mappedReminders: ReminderItem[] = data.reminders?.slice(0, 3).map((reminder: any) => ({
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

    fetchToken();
    fetchUserData();
    loadLastOpenedModules();
    fetchReminders();
  }, []);
  const requestLocationPermissions = async () => {
  try {
    // 1️⃣ Foreground permission (MANDATORY FIRST)
    const foreground = await Location.requestForegroundPermissionsAsync();

    if (foreground.status !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'Location access is required to mark attendance.'
      );
      return;
    }

    // 2️⃣ Background permission (REQUIRED FOR GEOFENCING)
    const background = await Location.requestBackgroundPermissionsAsync();

    if (background.status !== 'granted') {
      Alert.alert(
        'Background Location Required',
        'Please allow "Always Allow" location access to enable automatic attendance.'
      );
    }

    console.log('✅ Location permissions granted');
  } catch (error) {
    console.error('❌ Location permission error:', error);
  }
};

  // Initialize background services with proper error handling
  useEffect(() => {
    if (!token || !userData) return;
    
    const initializeBackgroundServices = async () => {
      try {
        console.log('🚀 Initializing background services...');
        await requestLocationPermissions();
        // Check if running in Expo Go
        const isExpoGo = Constants.appOwnership === 'expo';
        
        if (!isExpoGo) {
          try {
            // Check location permissions
            const { status } = await Location.requestForegroundPermissionsAsync();
            
            if (status === 'granted') {
              await BackgroundAttendanceService.initializeAll();
              
              if (userData?.office) {
                const officeLocation = userData.office;
                if (officeLocation.latitude && officeLocation.longitude) {
                  await BackgroundAttendanceService.setOfficeLocation(
                    officeLocation.latitude,
                    officeLocation.longitude,
                    50
                  );
                }
              }

              // Initialize location tracking
              await BackgroundLocationService.initialize();
            } else {
              console.log('⚠️ Location permission not granted');
            }
          } catch (error) {
            console.warn('⚠️ Background services not available in this environment:', error);
          }
        } else {
          console.log('⚠️ Running in Expo Go - background services limited');
        }
      } catch (error) {
        console.warn('⚠️ Failed to initialize background services:', error);
      }
    };

    initializeBackgroundServices();
  }, [token, userData]);

  // Function to get upcoming events with proper date formatting
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
        const anniversaryDate = new Date(user.joining_date);
        const years = today.getFullYear() - anniversaryDate.getFullYear();
        events.push({
          full_name: user.full_name,
          date: user.joining_date,
          type: 'anniversary',
          years: years,
          anniversaryYears: years + 1 // Next anniversary year
        });
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
    // This would come from backend in real implementation
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

    // Save to last opened modules
    const moduleData = {
      title: moduleName,
      iconUrl: getIconUrl({ name: moduleName, color: '#007bff', icon: 'apps', library: 'fa5' }),
      module_unique_name: moduleUniqueName || moduleName.toLowerCase()
    };
    saveLastOpenedModule(moduleData);

    // Navigate to appropriate module
    if (key.includes('attendance')) {
      setAttendanceKey(prev => prev + 1);
      setShowAttendance(true);
    } else if (key.includes('hr')) {
      setShowHR(true);
    } else if (key.includes('cab')) {
      setShowCab(true);
    } else if (key.includes('driver')) {
      setShowDriver(true);
    } else if (key.includes('bdt')) {
      setShowBDT(true);
    } else if (key.includes('mediclaim') || key.includes('medical')) {
      setShowMedical(true);
    } else if (key.includes('scout')) {
      setShowScoutBoy(true);
    } else if (key.includes('reminder')) {
      setShowReminder(true);
    } else if (key.includes('bup') || key.includes('business update')) {
      setShowBUP(true);
    } else if (key.includes('employee_management')) {
      setShowEmployeeManagement(true);
    } else {
      Alert.alert('Coming Soon', `${moduleName} module will be available soon!`);
    }
  };

  // Save last opened module
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
    setShowSettings(false);
    setShowEmployeeManagement(false);
    setShowChat(false);
    setShowChatRoom(false);
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
          await BackgroundAttendanceService.stopAll();
          await BackgroundLocationService.stop();
          onLogout();
        }
      },
    ]);
  };

  // Open menu
  const openMenu = () => {
    setIsMenuVisible(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  // Close menu
  const closeMenu = () => {
    Animated.timing(slideAnim, { toValue: -300, duration: 300, useNativeDriver: true }).start(() => setIsMenuVisible(false));
  };

  // Menu items - Updated to only show required items
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
    } else if (item.id === 'messages') {
      setShowChat(true);
    } else {
      Alert.alert('Coming Soon', `${item.title} feature will be available soon!`);
    }
  };

  // Handle nav item press
  const handleNavItemPress = (navItem: string) => {
    setActiveNavItem(navItem);
    if (navItem === 'message') {
      setShowChat(true);
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
    // Default modules if none from backend
    return defaultLastOpened.map(item => ({
      title: item.name,
      iconUrl: getIconUrl(item),
      module_unique_name: item.module_unique_name || item.name.toLowerCase(),
      is_generic: true
    }));
  };

  // Filter modules based on search query
  const filteredModules = getDisplayModules().filter(module =>
    module.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render icon helper
  const renderIcon = (item: IconItem) => {
    if (item.library === 'fa5') {
      return <FontAwesome5 name={item.icon as any} size={20} color="white" />;
    }
    return <MaterialCommunityIcons name={item.icon as any} size={20} color="white" />;
  };

  // Render chart with proper day alignment
  const renderChart = () => {
    const maxValue = 10;
    const chartHeight = 100;

    return (
      <View style={styles.chartContainer}>
        {chartData.map((item, index) => {
          const hoursHeight = (item.hours / maxValue) * chartHeight;
          const targetHeight = (item.target / maxValue) * chartHeight;

          return (
            <View key={index} style={[styles.chartBar, { flex: 1 }]}>
              <Text style={[styles.chartDay, { color: theme.textSub, fontSize: 12, textAlign: 'center' }]}>
                {item.day}
              </Text>
              <View style={[styles.barWrapper, { height: chartHeight }]}>
                <View style={[styles.targetBar, { height: targetHeight, backgroundColor: 'rgba(255, 94, 122, 0.3)' }]} />
                <View style={[styles.hoursBar, { height: hoursHeight, backgroundColor: currentColors.primaryBlue }]} />
              </View>
            </View>
          );
        })}
      </View>
    );
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
      <View style={[styles.loadingContainer, { backgroundColor: theme.bgColor }]}>
        <ActivityIndicator size="large" color={theme.accentBlue} />
        <Text style={[styles.loadingText, { color: theme.textMain }]}>Loading...</Text>
      </View>
    );
  }

  // Render different pages based on state
  if (showChatRoom && selectedChatRoom) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgColor }}>
        <ChatRoomScreen
          chatRoom={selectedChatRoom}
          onBack={handleBackFromPage}
          currentUserId={userData?.employee_id ? parseInt(userData.employee_id) : 1}
        />
      </SafeAreaView>
    );
  }

  if (showChat) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgColor }}>
        <ChatScreen
          onBack={handleBackFromPage}
          onOpenChatRoom={setSelectedChatRoom}
          currentUserId={userData?.employee_id ? parseInt(userData.employee_id) : 1}
        />
      </SafeAreaView>
    );
  }

  if (showAttendance) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <AttendanceWrapper key={attendanceKey} onBack={handleBackFromPage} attendanceKey={attendanceKey} />
      </SafeAreaView>
    );
  }

  if (showProfile) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Profile onBack={handleBackFromPage} userData={userData} />
      </SafeAreaView>
    );
  }

  if (showHR) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <HR onBack={handleBackFromPage} />
      </SafeAreaView>
    );
  }

  if (showCab) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Cab onBack={handleBackFromPage} />
      </SafeAreaView>
    );
  }

  if (showDriver) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Driver onBack={handleBackFromPage} />
      </SafeAreaView>
    );
  }

  if (showBDT) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <BDT onBack={handleBackFromPage} />
      </SafeAreaView>
    );
  }

  if (showMedical) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Medical onBack={handleBackFromPage} />
      </SafeAreaView>
    );
  }

  if (showScoutBoy) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScoutBoy onBack={handleBackFromPage} />
      </SafeAreaView>
    );
  }

  if (showReminder) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Reminder onBack={handleBackFromPage} />
      </SafeAreaView>
    );
  }

  if (showBUP) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <BUP onBack={handleBackFromPage} />
      </SafeAreaView>
    );
  }

  if (showSettings) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Settings onBack={handleBackFromPage} />
      </SafeAreaView>
    );
  }

  if (showEmployeeManagement) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <EmployeeManagement onBack={handleBackFromPage} />
      </SafeAreaView>
    );
  }

  if (showCreateSite) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <CreateSite onBack={handleBackFromPage} />
      </SafeAreaView>
    );
  }

  // Main dashboard render
  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={currentColors.headerBg} 
        translucent={false}
      />
      
      {/* Hamburger Menu Modal */}
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

      <View style={[styles.mainContent, { backgroundColor: theme.bgColor }]}>
        {/* Animated Circle Overlay */}
        {isAnimating && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.circleOverlay,
              {
                opacity: circleScale,
                transform: [{ scale: circleScale }],
                backgroundColor: isDark ? '#f8f9fa' : '#050b18',
              },
            ]}
          />
        )}

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Banner with background.png - Fixed for dark theme */}
          <LinearGradient
            colors={isDark ? ['#000D24', '#000D24'] : ['#2D3748', '#2D3748']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerBanner}
          >
            <Image
              source={require('../assets/background.png')}
              style={[
                styles.headerImage,
                { 
                  tintColor: isDark ? 'rgba(255,255,255,0.2)' : undefined,
                  opacity: isDark ? 0.3 : 0.8 
                }
              ]}
              resizeMode="cover"
            />
            <View style={[styles.headerContent, { paddingTop: Platform.OS === 'ios' ? 10 : 20 }]}>
              <View style={[styles.topNav, { marginBottom: 10 }]}>
                <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
                  {[1, 2, 3].map(i => (
                    <View key={i} style={[styles.menuLine, { backgroundColor: 'white' }]} />
                  ))}
                </TouchableOpacity>
                <Text style={styles.logoText}>CITADEL</Text>
                <View style={styles.headerSpacer} />
              </View>
              <View style={{ marginTop: 10 }}>
                <Text style={styles.welcomeText}>Welcome!</Text>
                <Text style={styles.employeeText}>Employee</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Profile Card - Tappable Section */}
          <TouchableOpacity 
            style={[styles.profileCard, { backgroundColor: theme.cardBg }]}
            onPress={() => setShowProfile(true)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={[styles.userName, { color: theme.textMain }]}>
                Hi {userData?.first_name || 'User'}!
              </Text>
              <Text style={[styles.userRole, { color: theme.textSub }]}>
                {userData?.designation || userData?.role || 'SOFTWARE ENGINEER'}
              </Text>
            </View>
            <View>
              {userData?.profile_picture ? (
                <Image
                  source={{ uri: userData.profile_picture }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImagePlaceholder, { backgroundColor: currentColors.primaryBlue }]}>
                  <Text style={styles.profileInitials}>
                    {getInitials(userData?.full_name || 'User')}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Last Opened Section - Improved spacing */}
          {lastOpenedModules.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.labelSmall, { color: theme.textSub }]}>LAST OPENED</Text>
              <View style={[styles.iconGrid, { justifyContent: 'flex-start', gap: 10 }]}>
                {lastOpenedModules.slice(0, 4).map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.iconItem, { width: '23%' }]}
                    onPress={() => handleModulePress(item.title, item.module_unique_name)}
                  >
                    <View style={[styles.iconBox, { backgroundColor: getModuleColor(item.title) }]}>
                      <Image 
                        source={{ uri: item.iconUrl }} 
                        style={styles.iconImage}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={[styles.iconLabel, { color: theme.textMain }]}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Upcoming Reminder */}
          <View style={[styles.sectionCard, styles.reminderCard, { backgroundColor: theme.cardBg }]}>
            <View style={styles.reminderContent}>
              <View style={[styles.reminderBorder, { backgroundColor: currentColors.primaryBlue }]} />
              <View style={styles.reminderText}>
                <Text style={[styles.labelSmall, { color: theme.textSub }]}>UPCOMING REMINDERS</Text>
                {reminders.length > 0 ? (
                  <>
                    <Text style={[styles.reminderTitle, { color: theme.textMain }]}>
                      {reminders[0].title}
                    </Text>
                    <Text style={[styles.reminderTime, { color: theme.textSub }]}>
                      <Ionicons name="time-outline" size={12} /> {reminders[0].time}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.reminderTitle, { color: theme.textMain }]}>
                      Meeting with Zsolt
                    </Text>
                    <Text style={[styles.reminderTime, { color: theme.textSub }]}>
                      <Ionicons name="time-outline" size={12} /> 9:00 AM - 10:00 AM
                    </Text>
                  </>
                )}
              </View>
            </View>
            <View style={styles.calendarIcon}>
              <Ionicons name="calendar-outline" size={40} color={currentColors.primaryBlue} />
              <Text style={[styles.calendarDate, { color: currentColors.primaryBlue }]}>{new Date().getDate()}</Text>
            </View>
          </View>

          {/* Module Grid with Diagonal Arrows */}
          <View style={styles.moduleGrid}>
            {/* Attendance Module */}
            <TouchableOpacity 
              style={styles.moduleAttendance}
              onPress={() => handleModulePress('Attendance', 'attendance')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#00d285', '#00b872']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.moduleGradient}
              >
                <Ionicons 
                  name="arrow-up" 
                  size={20} 
                  color="white" 
                  style={[styles.moduleArrow, { transform: [{ rotate: '45deg' }] }]} 
                />
                <View style={styles.moduleIconCircle}>
                  <FontAwesome5 name="book-open" size={24} color="white" />
                </View>
                <Text style={styles.moduleTitle}>Attendance</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.moduleColumn}>
              {/* Cab Module */}
              <TouchableOpacity 
                style={styles.moduleSmall}
                onPress={() => handleModulePress('Cab', 'cab')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#ff5e7a', '#ff4168']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.moduleGradient}
                >
                  <Ionicons 
                    name="arrow-up" 
                    size={18} 
                    color="white" 
                    style={[styles.moduleArrow, { transform: [{ rotate: '45deg' }] }]} 
                  />
                  <View style={styles.moduleIconCircle}>
                    <FontAwesome5 name="id-card" size={20} color="white" />
                  </View>
                  <Text style={styles.moduleTitle}>Cab</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* HR Module */}
              <TouchableOpacity 
                style={styles.moduleSmall}
                onPress={() => handleModulePress('HR', 'hr')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#ffb157', '#ff9d3f']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.moduleGradient}
                >
                  <Ionicons 
                    name="arrow-up" 
                    size={18} 
                    color="white" 
                    style={[styles.moduleArrow, { transform: [{ rotate: '45deg' }] }]} 
                  />
                  <View style={styles.moduleIconCircle}>
                    <FontAwesome5 name="users" size={20} color="white" />
                  </View>
                  <Text style={styles.moduleTitle}>HR</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* View All Modules Button */}
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

          {/* Stats Section - Fixed day alignment */}
          <View style={[styles.sectionCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.labelSmall, { color: theme.textSub }]}>STATS</Text>
            <View style={styles.statsContent}>
              {renderChart()}
              <View style={[styles.statsNumbers, { marginLeft: 20 }]}>
                <Text style={[styles.statsValue, { color: theme.textMain }]}>
                  {userData?.days_present || '60'}%
                </Text>
                <Text style={[styles.statsLabel, { color: theme.textSub, textAlign: 'right' }]}>DAYS PRESENT</Text>
                <Text style={[styles.statsValue, { color: theme.textMain, marginTop: 15 }]}>
                  {userData?.leaves_applied || '6.8'}
                </Text>
                <Text style={[styles.statsLabel, { color: theme.textSub, textAlign: 'right' }]}>LEAVES APPLIED</Text>
              </View>
            </View>
          </View>

          {/* Upcoming Events - Improved design */}
          <View style={[styles.sectionCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.labelSmall, { color: theme.textSub }]}>UPCOMING EVENTS</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.eventsScroll}
              contentContainerStyle={styles.eventsScrollContent}
            >
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event, index) => {
                  const formattedDate = formatEventDate(event.date);
                  return (
                    <View key={index} style={styles.eventItem}>
                      <View style={[styles.eventCard, { backgroundColor: 'transparent' }]}>
                        <View style={styles.eventAvatarWrapper}>
                          <View style={[
                            styles.eventAvatar,
                            { 
                              backgroundColor: event.type === 'anniversary' ? '#8B5CF6' : currentColors.primaryBlue,
                              width: 70,
                              height: 70,
                            }
                          ]}>
                            <Text style={[styles.eventAvatarInitials, { fontSize: 20 }]}>
                              {getInitials(event.full_name)}
                            </Text>
                          </View>
                          
                          {/* Date Badge - Improved design */}
                          <View style={[
                            styles.eventDateBadge,
                            { 
                              top: -5,
                              right: -5,
                              backgroundColor: theme.cardBg,
                              paddingHorizontal: 6,
                              paddingVertical: 4,
                              borderRadius: 6,
                            }
                          ]}>
                            <Text style={[styles.eventDateDay, { fontSize: 12 }]}>{formattedDate.day}</Text>
                            <Text style={[styles.eventDateMonth, { fontSize: 9 }]}>{formattedDate.month}</Text>
                          </View>
                          
                          {/* Anniversary Badge */}
                          {event.type === 'anniversary' && event.anniversaryYears && (
                            <View style={[
                              styles.anniversaryBadge,
                              { 
                                bottom: -5,
                                left: -5,
                              }
                            ]}>
                              <Text style={[styles.anniversaryText, { fontSize: 9 }]}>
                                {formatAnniversaryYears(event.anniversaryYears)}
                              </Text>
                            </View>
                          )}
                        </View>
                        
                        <Text style={[styles.eventName, { color: theme.textMain, fontSize: 12, marginTop: 8 }]} numberOfLines={1}>
                          {event.full_name}
                        </Text>
                        <View style={[styles.eventTypeContainer, { marginTop: 4 }]}>
                          <Ionicons 
                            name={event.type === 'birthday' ? "cake-outline" : "briefcase-outline"} 
                            size={12} 
                            color={theme.textSub} 
                          />
                          <Text style={[styles.eventType, { color: theme.textSub, fontSize: 10, marginLeft: 4 }]}>
                            {event.type === 'birthday' ? 'Birthday' : 'Anniversary'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                // Hardcoded events if none from backend - Improved design
                [
                  { name: 'Ananya Vishnoi', date: '2023-12-20', type: 'birthday' as const },
                  { name: 'Kriti Kharbanda', date: '2023-12-26', type: 'birthday' as const },
                  { name: 'Anup Khanna', date: '2024-01-13', type: 'anniversary' as const, years: 3 },
                ].map((event, index) => {
                  const formattedDate = formatEventDate(event.date);
                  return (
                    <View key={index} style={styles.eventItem}>
                      <View style={[styles.eventCard, { backgroundColor: 'transparent' }]}>
                        <View style={styles.eventAvatarWrapper}>
                          <View style={[
                            styles.eventAvatar,
                            { 
                              backgroundColor: event.type === 'anniversary' ? '#8B5CF6' : currentColors.primaryBlue,
                              width: 70,
                              height: 70,
                            }
                          ]}>
                            <Text style={[styles.eventAvatarInitials, { fontSize: 20 }]}>
                              {getInitials(event.name)}
                            </Text>
                          </View>
                          
                          <View style={[
                            styles.eventDateBadge,
                            { 
                              top: -5,
                              right: -5,
                              backgroundColor: theme.cardBg,
                              paddingHorizontal: 6,
                              paddingVertical: 4,
                              borderRadius: 6,
                            }
                          ]}>
                            <Text style={[styles.eventDateDay, { fontSize: 12 }]}>{formattedDate.day}</Text>
                            <Text style={[styles.eventDateMonth, { fontSize: 9 }]}>{formattedDate.month}</Text>
                          </View>
                          
                          {event.type === 'anniversary' && (
                            <View style={[
                              styles.anniversaryBadge,
                              { 
                                bottom: -5,
                                left: -5,
                              }
                            ]}>
                              <Text style={[styles.anniversaryText, { fontSize: 9 }]}>
                                {formatAnniversaryYears(event.years || 1)}
                              </Text>
                            </View>
                          )}
                        </View>
                        
                        <Text style={[styles.eventName, { color: theme.textMain, fontSize: 12, marginTop: 8 }]} numberOfLines={1}>
                          {event.name}
                        </Text>
                        <View style={[styles.eventTypeContainer, { marginTop: 4 }]}>
                          <Ionicons 
                            name={event.type === 'birthday' ? "cake-outline" : "briefcase-outline"} 
                            size={12} 
                            color={theme.textSub} 
                          />
                          <Text style={[styles.eventType, { color: theme.textSub, fontSize: 10, marginLeft: 4 }]}>
                            {event.type === 'birthday' ? 'Birthday' : 'Anniversary'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* Theme Switcher */}
          <View style={styles.themeSwitcher}>
            <TouchableOpacity
              style={[styles.lightSwitch, { 
                backgroundColor: isDark ? '#1a1a1a' : '#e0e0e0',
                width: screenWidth * 0.43,
              }]}
              onPress={handleThemeToggle}
              activeOpacity={0.8}
            >
              <View style={styles.switchTrack}>
                <Animated.View
                  style={[
                    styles.switchToggleButton,
                    {
                      backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
                      transform: [{ translateX: switchTranslate }],
                      shadowColor: isDark ? '#000' : '#666',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 3,
                      elevation: 3,
                    },
                  ]}
                >
                  <View style={[
                    styles.switchNotch,
                    { backgroundColor: isDark ? '#6b7cff' : '#ffa500' }
                  ]} />
                </Animated.View>
              </View>
              
              <View style={[styles.switchIcons, { width: '100%' }]}>
                <View style={[styles.switchIconContainer, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons 
                    name="sunny" 
                    size={22} 
                    color={isDark ? '#666' : '#ffa500'} 
                    style={{ alignSelf: 'center' }}
                  />
                </View>
                <View style={[styles.switchIconContainer, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons 
                    name="moon" 
                    size={22} 
                    color={isDark ? '#6b7cff' : '#999'} 
                    style={{ alignSelf: 'center' }}
                  />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerLogo}>CITADEL</Text>
            <Text style={styles.footerText}>Made with ❤️</Text>
          </View>
        </ScrollView>
      </View>

      {/* Updated Bottom Bar */}
      <View style={[styles.bottomNavContainer, { backgroundColor: 'transparent' }]}>
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.1)']}
          style={styles.bottomNavGradient}
        >
          <View style={[styles.bottomNav, { 
            backgroundColor: theme.navBg,
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -5 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
          }]}>
            {[
              { icon: 'home', label: 'Home' },
              { icon: 'chatbubbles', label: 'Message' },
              { icon: 'people', label: 'HR' },
              { icon: 'headset', label: 'Support' },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.navItem}
                onPress={() => handleNavItemPress(item.label.toLowerCase())}
                activeOpacity={0.7}
              >
                {activeNavItem === item.label.toLowerCase() ? (
                  <LinearGradient
                    colors={[currentColors.gradientStart, currentColors.gradientEnd]}
                    style={styles.floatingCircle}
                  >
                    <Ionicons 
                      name={item.icon as any} 
                      size={22} 
                      color="white" 
                    />
                  </LinearGradient>
                ) : (
                  <>
                    <Ionicons 
                      name={item.icon as any} 
                      size={20} 
                      color={theme.textSub} 
                    />
                    <Text style={[styles.navLabel, { color: theme.textSub }]}>
                      {item.label}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

// Main Export with SafeAreaProvider
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
    case 'cab':
      return '#ffb157';
    case 'attendance':
      return '#ff5e7a';
    case 'bdt':
      return '#1da1f2';
    default:
      return '#007AFF';
  }
};

// Hamburger Menu Component
const HamburgerMenu = ({ 
  isVisible, 
  onClose, 
  userData, 
  menuItems, 
  activeMenuItem, 
  onMenuItemPress,
  onLogout,
  isDark,
  slideAnim 
}: any) => {
  if (!isVisible) return null;

  const currentColors = isDark ? darkColors : lightColors;

  return (
    <Modal transparent visible={isVisible} animationType="none" onRequestClose={onClose}>
      <SafeAreaView style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[
          styles.menuContainer,
          {
            width: 300,
            transform: [{ translateX: slideAnim }],
            backgroundColor: currentColors.white,
          }
        ]}>
          <View style={[styles.menuHeader, { backgroundColor: currentColors.headerBg }]}>
            <View style={styles.menuHeaderContent}>
              {userData?.profile_picture ? (
                <Image 
                  source={{ uri: userData.profile_picture }} 
                  style={styles.menuUserAvatar}
                />
              ) : (
                <View style={[styles.menuUserAvatarCircle, { backgroundColor: currentColors.info }]}>
                  <Text style={styles.menuUserAvatarText}>
                    {userData?.full_name ? 
                      userData.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 
                      'U'
                    }
                  </Text>
                </View>
              )}
              <View style={styles.menuUserDetails}>
                <Text style={[styles.menuUserName, { color: currentColors.white }]}>
                  {userData?.full_name || 'User'}
                </Text>
                <Text style={[styles.menuUserRole, { color: currentColors.textLight }]}>
                  {userData?.designation || userData?.role || 'Employee'}
                </Text>
              </View>
            </View>
          </View>
          <ScrollView style={[styles.menuItems, { backgroundColor: currentColors.white }]} 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.menuItemsContent}
          >
            {menuItems.map((item: any, index: number) => (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.menuItem,
                  activeMenuItem === item.title && styles.menuItemActive,
                  {
                    backgroundColor: activeMenuItem === item.title ? currentColors.backgroundSecondary : 'transparent',
                  }
                ]} 
                onPress={() => onMenuItemPress(item)} 
                activeOpacity={0.7}
              >
                <View style={styles.menuItemIconContainer}>
                  <Ionicons 
                    name={item.icon as any} 
                    size={22} 
                    color={activeMenuItem === item.title ? currentColors.info : currentColors.textSecondary}
                  />
                </View>
                <Text style={[
                  styles.menuItemText,
                  activeMenuItem === item.title && styles.menuItemTextActive,
                  { color: activeMenuItem === item.title ? currentColors.info : currentColors.textSecondary }
                ]}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={[styles.logoutSection, { backgroundColor: currentColors.white }]}>
            <View style={[styles.logoutDivider, { backgroundColor: currentColors.border }]} />
            <TouchableOpacity 
              style={[styles.logoutButton, { backgroundColor: '#FEF2F2' }]} 
              onPress={onLogout} 
              activeOpacity={0.7}
            >
              <View style={styles.logoutIconContainer}>
                <Ionicons name="log-out-outline" size={22} color={currentColors.error} />
              </View>
              <Text style={[styles.logoutButtonText, { color: currentColors.error }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

// All Modules Modal Component
const AllModulesModal = ({ 
  isVisible, 
  onClose, 
  modules, 
  searchQuery, 
  onSearchChange, 
  onModulePress, 
  theme, 
  currentColors 
}: any) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const numColumns = screenWidth > 400 ? 4 : 3;
  const itemWidth = (screenWidth - 48) / numColumns;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={isVisible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.bgColor }]}>
        <LinearGradient
          colors={[currentColors.headerBg, currentColors.headerBg]}
          style={styles.modalHeaderGradient}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <TouchableOpacity onPress={onClose} style={styles.modalBackButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>All Modules</Text>
            </View>
            <Text style={styles.modalSubtitle}>{modules.length} Available</Text>
          </View>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
              <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.7)" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search modules..."
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={searchQuery}
                onChangeText={onSearchChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => onSearchChange('')}>
                  <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>
        
        <ScrollView 
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.modalContentContainer,
            { paddingBottom: Platform.OS === 'ios' ? 100 : 80 }
          ]}
        >
          {modules.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={60} color={theme.textSub} />
              <Text style={[styles.noResultsText, { color: theme.textMain }]}>
                No modules found
              </Text>
              <Text style={[styles.noResultsSubtext, { color: theme.textSub }]}>
                Try searching with different keywords
              </Text>
            </View>
          ) : (
            <View style={styles.allModulesGrid}>
              {modules.map((module: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.moduleItemModal,
                    { 
                      backgroundColor: theme.cardBg,
                      width: itemWidth,
                      marginBottom: 16,
                      marginHorizontal: (screenWidth - (itemWidth * numColumns) - 32) / (numColumns * 2),
                    }
                  ]}
                  onPress={() => {
                    onModulePress(module.title, module.module_unique_name);
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[currentColors.gradientStart + '20', currentColors.gradientEnd + '20']}
                    style={styles.moduleIconContainerModal}
                  >
                    <Image 
                      source={{ uri: module.iconUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }} 
                      style={styles.moduleIconImageModal}
                      resizeMode="contain"
                    />
                  </LinearGradient>
                  <Text style={[styles.moduleTitleModal, { color: theme.textMain }]} numberOfLines={2}>
                    {module.title}
                  </Text>
                  <View style={styles.moduleArrowContainer}>
                    <Ionicons 
                      name="arrow-up" 
                      size={16} 
                      color={currentColors.primaryBlue} 
                      style={{ transform: [{ rotate: '45deg' }] }}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Decorative Footer */}
          <View style={styles.modalFooter}>
            <LinearGradient
              colors={['transparent', currentColors.gradientStart + '20']}
              style={styles.modalFooterGradient}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#000D24',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  mainContent: {
    flex: 1,
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
  headerBanner: {
    height: 180,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  headerImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  headerContent: {
    padding: 20,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerSpacer: {
    width: 40,
  },
  welcomeText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
  },
  employeeText: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  profileCard: {
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 15,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  profileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  profileInitials: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  labelSmall: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    fontWeight: '600',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  iconItem: {
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconImage: {
    width: 25,
    height: 25,
  },
  iconLabel: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  reminderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderContent: {
    flexDirection: 'row',
    flex: 1,
  },
  reminderBorder: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  reminderText: {
    flex: 1,
  },
  reminderTitle: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 8,
  },
  reminderTime: {
    fontSize: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  calendarDate: {
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: -20,
  },
  moduleGrid: {
    marginHorizontal: 20,
    marginBottom: 15,
    flexDirection: 'row',
    height: 250,
    gap: 12,
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
  moduleColumn: {
    flex: 1,
    gap: 12,
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
  moduleGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  moduleArrow: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  moduleIconCircle: {
    width: 45,
    height: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 22.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  viewAllContainer: {
    marginBottom: 15,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginRight: 8,
  },
  chevronGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 90,
    alignItems: 'flex-end',
    flex: 1,
  },
  chartBar: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartDay: {
    marginBottom: 4,
    fontWeight: '500',
  },
  barWrapper: {
    width: 10,
    justifyContent: 'flex-end',
    position: 'relative',
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: 2,
  },
  hoursBar: {
    width: '100%',
    borderRadius: 5,
    position: 'absolute',
    bottom: 0,
  },
  targetBar: {
    width: '100%',
    borderRadius: 5,
    position: 'absolute',
    bottom: 0,
  },
  statsNumbers: {
    alignItems: 'flex-end',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statsLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
    fontWeight: '500',
  },
  eventsScroll: {
    marginHorizontal: -5,
  },
  eventsScrollContent: {
    paddingHorizontal: 5,
  },
  eventItem: {
    marginHorizontal: 8,
    width: 100,
  },
  eventCard: {
    alignItems: 'center',
  },
  eventAvatarWrapper: {
    position: 'relative',
    marginBottom: 0,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventAvatar: {
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  eventAvatarInitials: {
    color: 'white',
    fontWeight: 'bold',
  },
  eventDateBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventDateDay: {
    color: '#FF5E7A',
    fontWeight: '700',
    lineHeight: 14,
  },
  eventDateMonth: {
    color: '#666666',
    fontWeight: '600',
    lineHeight: 11,
  },
  eventDateYear: {
    color: '#8B5CF6',
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
  },
  anniversaryBadge: {
    position: 'absolute',
    backgroundColor: '#FCD34D',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  anniversaryText: {
    color: '#78350F',
    fontWeight: '700',
  },
  eventName: {
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  eventTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventType: {
    textAlign: 'center',
    fontWeight: '500',
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
    paddingLeft:20,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 30,
    paddingTop: 15,
  },
  footerLogo: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 5,
    color: '#a9a9a9b6',
    marginBottom: 5,
  },
  footerText: {
    fontSize: 10,
    color: '#666',
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomNavGradient: {
    height: 75,
    justifyContent: 'flex-end',
  },
  bottomNav: {
    height: 65,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  floatingCircle: {
    position: 'absolute',
    top: -20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  navLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  // Hamburger Menu Styles
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  overlayTouchable: {
    flex: 1,
  },
  menuContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  menuHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
  },
  menuHeaderContent: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuUserAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  menuUserAvatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  menuUserAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuUserDetails: {
    flex: 1,
    marginLeft: 16,
  },
  menuUserRole: {
    fontSize: 13,
    marginBottom: 4,
  },
  menuUserName: {
    fontSize: 18,
    fontWeight: '600',
  },
  menuItems: {
    flex: 1,
  },
  menuItemsContent: {
    paddingTop: 20,
    paddingBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  menuItemActive: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  menuItemIconContainer: {
    width: 32,
    marginRight: 16,
  },
  menuItemText: {
    fontWeight: '500',
    flex: 1,
    fontSize: 15,
  },
  menuItemTextActive: {
    fontWeight: '600',
  },
  logoutSection: {
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  logoutDivider: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  logoutIconContainer: {
    width: 32,
    marginRight: 16,
  },
  logoutButtonText: {
    fontWeight: '600',
    flex: 1,
    fontSize: 15,
  },
  // All Modules Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeaderGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    paddingBottom: 20,
  },
  modalHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    marginLeft: 10,
    padding: 0,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 16,
  },
  allModulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 10,
  },
  moduleItemModal: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: 150,
    position: 'relative',
  },
  moduleIconContainerModal: {
    width: 70,
    height: 70,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleIconImageModal: {
    width: 35,
    height: 35,
  },
  moduleTitleModal: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  moduleArrowContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  modalFooter: {
    height: 50,
    marginTop: 20,
  },
  modalFooterGradient: {
    height: '100%',
    borderRadius: 25,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  noResultsText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});