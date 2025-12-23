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
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

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
};

export default function CitadelDashboard({ onLogout }: { onLogout: () => void }) {
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

  // Hardcoded stats data (will come from backend)
  const chartData = [
    { day: 'Mon', hours: 5.5, target: 6.0 },
    { day: 'Tue', hours: 7.2, target: 5.8 },
    { day: 'Wed', hours: 6.8, target: 7.5 },
    { day: 'Thu', hours: 8.5, target: 6.2 },
    { day: 'Fri', hours: 7.0, target: 7.8 },
    { day: 'Sat', hours: 6.2, target: 6.5 },
    { day: 'Sun', hours: 5.8, target: 7.2 },
  ];

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
        console.log("jio")
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
        } else {
          // Use default modules if none stored
          setLastOpenedModules(defaultLastOpened.map(item => ({
            title: item.name,
            iconUrl: getIconUrl(item),
            module_unique_name: item.module_unique_name || item.name.toLowerCase()
          })));
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

  // Initialize background services
  useEffect(() => {
    if (!token || !userData) return;

    const initializeBackgroundServices = async () => {
      try {
        console.log('🚀 Initializing background services...');
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
      } catch (error) {
        console.error('❌ Failed to initialize background services:', error);
      }
    };

    initializeBackgroundServices();
  }, [token, userData]);

  // Function to get upcoming events
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
      
      const thisYearA = new Date(today.getFullYear(), dateA.getMonth(), dateA.getDate());
      const thisYearB = new Date(today.getFullYear(), dateB.getMonth(), dateB.getDate());

      const eventDateA = thisYearA >= today ? thisYearA : new Date(today.getFullYear() + 1, dateA.getMonth(), dateA.getDate());
      const eventDateB = thisYearB >= today ? thisYearB : new Date(today.getFullYear() + 1, dateB.getMonth(), dateB.getDate());

      return eventDateA.getTime() - eventDateB.getTime();
    });

    return events.slice(0, 3); // Return only top 3 events
  };

  const calculateYearsOnAnniversary = (dateString: string): number => {
    const joiningDate = new Date(dateString);
    const today = new Date();
    let anniversaryThisYear = new Date(today.getFullYear(), joiningDate.getMonth(), joiningDate.getDate());

    if (anniversaryThisYear < today) {
      anniversaryThisYear = new Date(today.getFullYear() + 1, joiningDate.getMonth(), joiningDate.getDate());
    }

    return anniversaryThisYear.getFullYear() - joiningDate.getFullYear();
  };

  // Function to get initials from name
  const getInitials = (fullName: string): string => {
    return fullName.split(' ').map(name => name.charAt(0).toUpperCase()).join('').substring(0, 2);
  };

  // Function to format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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

  // Menu items
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

  const handleMenuItemPress = (item: any) => {
    setActiveMenuItem(item.title);
    closeMenu();
    
    if (item.id === 'profile') {
      setShowProfile(true);
    } else if (item.id === 'settings') {
      setShowSettings(true);
    } else {
      Alert.alert('Coming Soon', `${item.title} feature will be available soon!`);
    }
  };

  // Handle nav item press
  const handleNavItemPress = (navItem: string) => {
    setActiveNavItem(navItem);
    if (navItem === 'message') {
      setShowChat(true);
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

  // Render icon helper
  const renderIcon = (item: IconItem) => {
    if (item.library === 'fa5') {
      return <FontAwesome5 name={item.icon as any} size={20} color="white" />;
    }
    return <MaterialCommunityIcons name={item.icon as any} size={20} color="white" />;
  };

  // Render chart
  const renderChart = () => {
    const maxValue = 10;
    const chartHeight = 100;

    return (
      <View style={styles.chartContainer}>
        {chartData.map((item, index) => {
          const hoursHeight = (item.hours / maxValue) * chartHeight;
          const targetHeight = (item.target / maxValue) * chartHeight;

          return (
            <View key={index} style={styles.chartBar}>
              <View style={[styles.barWrapper, { height: chartHeight }]}>
                <View style={[styles.targetBar, { height: targetHeight, backgroundColor: 'rgba(255, 94, 122, 0.3)' }]} />
                <View style={[styles.hoursBar, { height: hoursHeight, backgroundColor: 'rgba(94, 200, 255, 0.5)' }]} />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Animation values
  const maxRadius = Math.sqrt(width * width + height * height);
  const circleSize = circleScale.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxRadius * 2.5],
  });

  const switchTranslate = switchToggle.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 77],
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

  if (showAttendance) {
    return <AttendanceWrapper key={attendanceKey} onBack={handleBackFromPage} attendanceKey={attendanceKey} />;
  }

  if (showProfile) {
    return <Profile onBack={handleBackFromPage} userData={userData} />;
  }

  if (showHR) {
    return <HR onBack={handleBackFromPage} />;
  }

  if (showCab) {
    return <Cab onBack={handleBackFromPage} />;
  }

  if (showDriver) {
    return <Driver onBack={handleBackFromPage} />;
  }

  if (showBDT) {
    return <BDT onBack={handleBackFromPage} />;
  }

  if (showMedical) {
    return <Medical onBack={handleBackFromPage} />;
  }

  if (showScoutBoy) {
    return <ScoutBoy onBack={handleBackFromPage} />;
  }

  if (showReminder) {
    return <Reminder onBack={handleBackFromPage} />;
  }

  if (showBUP) {
    return <BUP onBack={handleBackFromPage} />;
  }

  if (showSettings) {
    return <Settings onBack={handleBackFromPage} />;
  }

  if (showEmployeeManagement) {
    return <EmployeeManagement onBack={handleBackFromPage} />;
  }

  if (showCreateSite) {
    return <CreateSite onBack={handleBackFromPage} />;
  }

  // Main dashboard render
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={currentColors.headerBg} />
      
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
        modules={getDisplayModules()}
        onModulePress={handleModulePress}
        theme={theme}
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
          {/* Header Banner */}
          <LinearGradient
            colors={[currentColors.headerBg, currentColors.headerBg]}
            style={styles.headerBanner}
          >
            {!isDark && (
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80' }}
                style={styles.headerImage}
              />
            )}
            <View style={styles.headerContent}>
              <View style={styles.topNav}>
                <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
                  {[1, 2, 3].map(i => (
                    <View key={i} style={[styles.menuLine, { backgroundColor: 'white' }]} />
                  ))}
                </TouchableOpacity>
                <Text style={styles.logoText}>CITADEL</Text>
                <View style={styles.headerSpacer} />
              </View>
              <Text style={styles.welcomeText}>Welcome!</Text>
              <Text style={styles.employeeText}>Employee</Text>
            </View>
          </LinearGradient>

          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: theme.cardBg }]}>
            <View>
              <Text style={[styles.userName, { color: theme.textMain }]}>
                Hi {userData?.first_name || 'User'}!
              </Text>
              <Text style={[styles.userRole, { color: theme.textSub }]}>
                {userData?.designation || userData?.role || 'SOFTWARE ENGINEER'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowProfile(true)}>
              {userData?.profile_picture ? (
                <Image
                  source={{ uri: userData.profile_picture }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.accentBlue }]}>
                  <Text style={styles.profileInitials}>
                    {getInitials(userData?.full_name || 'User')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Last Opened Section */}
          <View style={[styles.sectionCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.labelSmall, { color: theme.textSub }]}>LAST OPENED</Text>
            <View style={styles.iconGrid}>
              {lastOpenedModules.slice(0, 4).map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.iconItem}
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

          {/* Upcoming Reminder */}
          <View style={[styles.sectionCard, styles.reminderCard, { backgroundColor: theme.cardBg }]}>
            <View style={styles.reminderContent}>
              <View style={styles.reminderBorder} />
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
              <Ionicons name="calendar-outline" size={40} color="#1da1f2" />
              <Text style={styles.calendarDate}>{new Date().getDate()}</Text>
            </View>
          </View>

          {/* Module Grid */}
          <View style={styles.moduleGrid}>
            {/* Attendance Module */}
            <TouchableOpacity 
              style={styles.moduleAttendance}
              onPress={() => handleModulePress('Attendance', 'attendance')}
            >
              <LinearGradient
                colors={['#00d285', '#00b872']}
                style={styles.moduleGradient}
              >
                <Ionicons name="arrow-forward" size={18} color="white" style={styles.moduleArrow} />
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
              >
                <LinearGradient
                  colors={['#ff5e7a', '#ff4168']}
                  style={styles.moduleGradient}
                >
                  <Ionicons name="arrow-forward" size={18} color="white" style={styles.moduleArrow} />
                  <View style={styles.moduleIconCircle}>
                    <FontAwesome5 name="id-card" size={24} color="white" />
                  </View>
                  <Text style={styles.moduleTitle}>Cab</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* HR Module */}
              <TouchableOpacity 
                style={styles.moduleSmall}
                onPress={() => handleModulePress('HR', 'hr')}
              >
                <LinearGradient
                  colors={['#ffb157', '#ff9d3f']}
                  style={styles.moduleGradient}
                >
                  <Ionicons name="arrow-forward" size={18} color="white" style={styles.moduleArrow} />
                  <View style={styles.moduleIconCircle}>
                    <FontAwesome5 name="users" size={24} color="white" />
                  </View>
                  <Text style={styles.moduleTitle}>HR</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* View All Modules */}
          <TouchableOpacity 
            style={styles.viewAllContainer}
            onPress={() => setAllModulesVisible(true)}
          >
            <Text style={[styles.viewAllText, { color: theme.textSub }]}>
              View all modules
            </Text>
            <View style={styles.chevronGroup}>
              <Ionicons name="chevron-forward" size={14} color={theme.textSub} />
              <Ionicons name="chevron-forward" size={14} color={theme.textSub} style={{ marginLeft: -8 }} />
              <Ionicons name="chevron-forward" size={14} color={theme.textSub} style={{ marginLeft: -8 }} />
            </View>
          </TouchableOpacity>

          {/* Stats Section */}
          <View style={[styles.sectionCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.labelSmall, { color: theme.textSub }]}>STATS</Text>
            <View style={styles.statsContent}>
              {renderChart()}
              <View style={styles.statsNumbers}>
                <Text style={[styles.statsValue, { color: theme.textMain }]}>
                  {userData?.days_present || '60'}%
                </Text>
                <Text style={[styles.statsLabel, { color: theme.textSub }]}>DAYS PRESENT</Text>
                <Text style={[styles.statsValue, { color: theme.textMain, marginTop: 15 }]}>
                  {userData?.leaves_applied || '6.8'}
                </Text>
                <Text style={[styles.statsLabel, { color: theme.textSub }]}>LEAVES APPLIED</Text>
              </View>
            </View>
          </View>

          {/* Upcoming Events */}
          <View style={[styles.sectionCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.labelSmall, { color: theme.textSub }]}>UPCOMING EVENTS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventsScroll}>
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event, index) => (
                  <View key={index} style={styles.eventItem}>
                    <View style={styles.eventAvatarWrapper}>
                      <View style={[
                        styles.eventAvatar,
                        { 
                          backgroundColor: event.type === 'anniversary' ? '#8B5CF6' : theme.accentBlue,
                          width: 80,
                          height: 80,
                          borderRadius: 40,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }
                      ]}>
                        <Text style={styles.eventAvatarInitials}>
                          {getInitials(event.full_name)}
                        </Text>
                      </View>
                      <View style={styles.eventDateBadge}>
                        <Text style={styles.eventDateText}>{formatDate(event.date)}</Text>
                      </View>
                      {event.type === 'anniversary' && event.years && (
                        <View style={styles.anniversaryBadge}>
                          <Text style={styles.anniversaryText}>🎉 {event.years}yr</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.eventName, { color: theme.textMain }]} numberOfLines={2}>
                      {event.full_name}
                    </Text>
                    <Text style={[styles.eventType, { color: theme.textSub }]}>
                      {event.type === 'birthday' ? '🎂 Birthday' : '💼 Anniversary'}
                    </Text>
                  </View>
                ))
              ) : (
                // Hardcoded events if none from backend
                [
                  { name: 'Ananya Vishnoi', date: '20 Dec', image: '' },
                  { name: 'Kriti Kharbanda', date: '26 Dec', image: '' },
                  { name: 'Anup Khanna', date: '13 Jan', image: '' },
                ].map((event, index) => (
                  <View key={index} style={styles.eventItem}>
                    <View style={styles.eventAvatarWrapper}>
                      <View style={[
                        styles.eventAvatarPlaceholder,
                        { backgroundColor: theme.accentBlue }
                      ]}>
                        <Text style={styles.eventAvatarInitials}>
                          {getInitials(event.name)}
                        </Text>
                      </View>
                      <View style={styles.eventDateBadge}>
                        <Text style={styles.eventDateText}>{event.date}</Text>
                      </View>
                    </View>
                    <Text style={[styles.eventName, { color: theme.textMain }]} numberOfLines={2}>
                      {event.name}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>

          {/* Horizontal Light Switch Theme Switcher */}
          <View style={styles.themeSwitcher}>
            <TouchableOpacity
              style={[styles.lightSwitch, { backgroundColor: isDark ? '#1a1a1a' : '#e0e0e0' }]}
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
                    },
                  ]}
                >
                  <View style={styles.switchNotch} />
                </Animated.View>
              </View>
              
              <View style={styles.switchIcons}>
                <Ionicons 
                  name="sunny" 
                  size={22} 
                  color={isDark ? '#666' : '#ffa500'} 
                />
                <Ionicons 
                  name="moon" 
                  size={22} 
                  color={isDark ? '#6b7cff' : '#999'} 
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerLogo}>CITADEL</Text>
            <Text style={styles.footerText}>Made with ❤️</Text>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={[styles.bottomNav, { backgroundColor: theme.navBg }]}>
          {[
            { icon: 'home', label: 'Home' },
            { icon: 'chatbubbles', label: 'Message' },
            { icon: 'person', label: 'HR' },
            { icon: 'headset', label: 'Support' },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.navItem}
              onPress={() => handleNavItemPress(item.label.toLowerCase())}
            >
              {activeNavItem === item.label.toLowerCase() && (
                <View style={styles.floatingCircle}>
                  <Ionicons name={item.icon as any} size={22} color="white" />
                </View>
              )}
              {activeNavItem !== item.label.toLowerCase() && (
                <>
                  <Ionicons name={item.icon as any} size={20} color="#999" />
                  <Text style={styles.navLabel}>{item.label}</Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
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
      return '#3262f1';
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
              <TouchableOpacity onPress={() => {
                onClose();
                // Navigate to profile
              }}>
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
              </TouchableOpacity>
              <View style={styles.menuUserDetails}>
                <Text style={[styles.menuUserRole, { color: currentColors.textLight }]}>
                  {userData?.designation || userData?.role || 'Employee'}
                </Text>
                <Text style={[styles.menuUserName, { color: currentColors.white }]}>
                  {userData?.full_name || 'User'}
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
                  <Text style={{ fontSize: 20 }}>{item.icon === 'user' ? '👤' : 
                    item.icon === 'edit' ? '✏️' : 
                    item.icon === 'car' ? '🚗' : 
                    item.icon === 'map' ? '🗺️' : 
                    item.icon === 'wallet' ? '💳' : 
                    item.icon === 'help' ? '❓' : 
                    item.icon === 'notification' ? '🔔' : 
                    item.icon === 'shield' ? '🛡️' : 
                    item.icon === 'settings' ? '⚙️' : 
                    item.icon === 'users' ? '👥' : 
                    item.icon === 'star' ? '⭐' : 
                    item.icon === 'credit-card' ? '💳' : '📱'}</Text>
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
                <Text style={{ fontSize: 20, color: currentColors.error }}>🚪</Text>
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
const AllModulesModal = ({ isVisible, onClose, modules, onModulePress, theme }: any) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.bgColor }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.textMain }]}>All Modules</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.accentBlue} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <View style={styles.allModulesGrid}>
            {modules.map((module: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.moduleItemModal,
                  { backgroundColor: theme.cardBg }
                ]}
                onPress={() => {
                  onModulePress(module.title, module.module_unique_name);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.moduleIconContainerModal,
                  { backgroundColor: theme.bgColor }
                ]}>
                  <Image 
                    source={{ uri: module.iconUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }} 
                    style={styles.moduleIconImageModal}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.moduleTitleModal, { color: theme.textMain }]} numberOfLines={2}>
                  {module.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    height: 220,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
    position: 'relative',
  },
  headerImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  headerContent: {
    padding: 30,
    paddingTop: 50,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuButton: {
    padding: 8,
  },
  menuLine: {
    width: 24,
    height: 2,
    marginVertical: 3,
    borderRadius: 1,
  },
  logoText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 36,
  },
  welcomeText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 20,
  },
  employeeText: {
    color: 'white',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 5,
  },
  profileCard: {
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
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
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 5,
  },
  userRole: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
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
    marginBottom: 15,
  },
  iconGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 55,
    height: 55,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconImage: {
    width: 30,
    height: 30,
  },
  iconLabel: {
    fontSize: 11,
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
    backgroundColor: '#1da1f2',
    borderRadius: 2,
    marginRight: 15,
  },
  reminderText: {
    flex: 1,
  },
  reminderTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 10,
  },
  reminderTime: {
    fontSize: 12,
  },
  calendarIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDate: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#1da1f2',
    marginTop: -25,
  },
  moduleGrid: {
    marginHorizontal: 20,
    marginBottom: 20,
    flexDirection: 'row',
    height: 295,
    gap: 15,
  },
  moduleAttendance: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  moduleColumn: {
    flex: 1,
    gap: 15,
  },
  moduleSmall: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  moduleGradient: {
    flex: 1,
    padding: 25,
    justifyContent: 'space-between',
  },
  moduleArrow: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  moduleIconCircle: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  viewAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
  },
  chevronGroup: {
    flexDirection: 'row',
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 100,
    alignItems: 'flex-end',
    gap: 8,
    flex: 1,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    width: '100%',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  hoursBar: {
    width: '100%',
    borderRadius: 4,
    position: 'absolute',
    bottom: 0,
  },
  targetBar: {
    width: '100%',
    borderRadius: 4,
    position: 'absolute',
    bottom: 0,
  },
  statsNumbers: {
    alignItems: 'flex-end',
  },
  statsValue: {
    fontSize: 29,
    fontWeight: '700',
  },
  statsLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  eventsScroll: {
    marginHorizontal: -5,
  },
  eventItem: {
    alignItems: 'center',
    marginHorizontal: 10,
    width: 90,
  },
  eventAvatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  eventAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  eventAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventAvatarInitials: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  eventDateBadge: {
    position: 'absolute',
    top: -5,
    left: '50%',
    transform: [{ translateX: -25 }],
    backgroundColor: '#ff5e7a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#ff5e7a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  anniversaryBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#FCD34D',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  anniversaryText: {
    color: '#78350F',
    fontSize: 10,
    fontWeight: '700',
  },
  eventDateText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
  },
  eventName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  eventType: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  themeSwitcher: {
    alignItems: 'center',
    marginVertical: 30,
  },
  lightSwitch: {
    width: 160,
    height: 70,
    borderRadius: 35,
    padding: 8,
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
    left: 8,
    top: 8,
    right: 8,
    bottom: 8,
  },
  switchToggleButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  switchNotch: {
    width: 4,
    height: 30,
    borderRadius: 2,
  },
  switchIcons: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerLogo: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 5,
    color: '#a9a9a9b6',
  },
  footerText: {
    fontSize: 10,
    marginTop: 5,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  floatingCircle: {
    position: 'absolute',
    top: -22,
    width: 60,
    height: 60,
    backgroundColor: '#007bff',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  navLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 5,
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
    paddingTop: 50,
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
  moduleItemModal: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  moduleIconContainerModal: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleIconImageModal: {
    width: 40,
    height: 40,
  },
  moduleTitleModal: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});