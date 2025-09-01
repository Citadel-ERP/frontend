import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows, commonStyles } from '../styles/theme';
import { BACKEND_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Attendance from './Attendance';
import Profile from './Profile'; 

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface DashboardProps {
  onLogout: () => void;
  token?: string; 
}

interface AttendanceCardProps {
  value: string;
  label: string;
}

interface EventAvatarProps {
  name: string;
  date: string;
  initials: string;
}

interface UpcomingEvent {
  name: string;
  date: string;
  initials: string;
}

interface ModuleItemProps {
  title: string;
  iconUrl: string; // Changed from icon to iconUrl
  onPress: () => void;
}

interface MenuItemType {
  title: string;
  icon: React.ReactNode;
  isActive?: boolean;
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
  home_address: {
    id: number;
    address: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
  office: {
    id: number;
    name: string;
    address: {
      id: number;
      address: string;
      city: string;
      state: string;
      country: string;
      zip_code: string;
    };
  };
  phone_number: string;
  profile_picture: string | null;
  current_location: {
    id: number;
    address: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
  is_approved_by_hr: boolean;
  is_approved_by_admin: boolean;
  approved_by_hr_at: string | null;
  approved_by_admin_at: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  earned_leaves: number;
  sick_leaves: number;
  casual_leaves: number;
  login_time: string | null;
  logout_time: string | null;
  first_login: boolean;
  bio: string;
  designation?: string; // Add designation field
  user_tags: Array<{
    id: number;
    tag: {
      id: number;
      tag_name: string;
      tag_id: string;
      tag_type: string;
      created_at: string;
      updated_at: string;
    };
    created_at: string;
    updated_at: string;
  }>;
  reporting_tags: Array<{
    id: number;
    reporting_tag: {
      id: number;
      tag_name: string;
      tag_id: string;
      tag_type: string;
      created_at: string;
      updated_at: string;
    };
    created_at: string;
    updated_at: string;
  }>;
}

interface ApiResponse {
  message: string;
  modules: Array<{
    module_name: string;
    is_generic: boolean;
    module_id: string;
    module_icon: string;
    created_at: string;
    updated_at: string;
  }>;
  user: UserData;
  upcoming_birthdays: UserData[];
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout}) => {
  const [token, setToken] = useState<string | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showProfile, setShowProfile] = useState(false); // Add state for Profile
  const insets = useSafeAreaInsets();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-300));
  const [activeMenuItem, setActiveMenuItem] = useState('Dashboard'); // Changed default to Dashboard
  const [activeNavItem, setActiveNavItem] = useState('home');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

  // Fetch user data from API
useEffect(() => {
  if (!token) return; // 🚀 Prevents calling with null token

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${BACKEND_URL}/core/getUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.message === "Get modules successful") {
        setUserData(data.user);
        setModules(data.modules);
        setUpcomingBirthdays(data.upcoming_birthdays || []);
      } else {
        throw new Error(data.message || 'Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch user data');
      Alert.alert('Error', 'Failed to load user data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  fetchUserData();
}, [token]); // 👈 runs only when token is non-null

  

  // Generate initials from full name
  const getInitials = (fullName: string): string => {
    return fullName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  };

  // Format date for birthdays (you might need to adjust this based on your date format)
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  // Map modules from API to display format
  const getDisplayModules = () => {
    console.log(modules);

    return modules.map(module => ({
      title: module.module_name.charAt(0).toUpperCase() + module.module_name.slice(1).replace('_', ' '),
      iconUrl: module.module_id === 'attendance' 
        ? 'https://cdn-icons-png.flaticon.com/512/8847/8847444.png' 
        : module.module_icon, // Use high-quality favicon for attendance
      module_id: module.module_id,
      is_generic: module.is_generic
    }));
  };

  const displayModules = getDisplayModules();

  // Custom Icon Components (keeping existing ones)
  const UserIcon = ({ color = colors.textSecondary, size = 20 }: { color?: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.6,
        height: size * 0.6,
        borderRadius: size * 0.3,
        borderWidth: 2,
        borderColor: color,
        marginBottom: 2,
      }} />
      <View style={{
        width: size * 0.9,
        height: size * 0.5,
        borderRadius: size * 0.45,
        borderWidth: 2,
        borderColor: color,
        borderTopColor: 'transparent',
      }} />
    </View>
  );

  const NotificationIcon = ({ color = colors.textSecondary, size = 20 }: { color?: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.7,
        height: size * 0.8,
        borderRadius: size * 0.1,
        borderWidth: 2,
        borderColor: color,
        borderBottomWidth: 4,
      }} />
      <View style={{
        position: 'absolute',
        top: size * 0.1,
        width: size * 0.3,
        height: 2,
        backgroundColor: color,
      }} />
    </View>
  );

  const HelpIcon = ({ color = colors.textSecondary, size = 20 }: { color?: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.8,
        height: size * 0.8,
        borderRadius: size * 0.4,
        borderWidth: 2,
        borderColor: color,
      }}>
        <Text style={{
          color: color,
          fontSize: size * 0.6,
          fontWeight: 'bold',
          textAlign: 'center',
          lineHeight: size * 0.75,
        }}>?</Text>
      </View>
    </View>
  );

  const LockIcon = ({ color = colors.textSecondary, size = 20 }: { color?: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.6,
        height: size * 0.5,
        borderRadius: size * 0.05,
        borderWidth: 2,
        borderColor: color,
        marginTop: size * 0.2,
      }} />
      <View style={{
        position: 'absolute',
        top: size * 0.1,
        width: size * 0.4,
        height: size * 0.3,
        borderRadius: size * 0.2,
        borderWidth: 2,
        borderColor: color,
        borderBottomColor: 'transparent',
      }} />
    </View>
  );

  const InfoIcon = ({ color = colors.textSecondary, size = 20 }: { color?: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.8,
        height: size * 0.8,
        borderRadius: size * 0.4,
        borderWidth: 2,
        borderColor: color,
      }}>
        <Text style={{
          color: color,
          fontSize: size * 0.6,
          fontWeight: 'bold',
          textAlign: 'center',
          lineHeight: size * 0.75,
        }}>i</Text>
      </View>
    </View>
  );

  // Updated Logout Icon (Door with arrow)
  const LogoutIcon = ({ color = colors.error, size = 20 }: { color?: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Door frame */}
      <View style={{
        width: size * 0.7,
        height: size * 0.8,
        borderWidth: 2,
        borderColor: color,
        borderRadius: size * 0.05,
        position: 'relative',
      }}>
        {/* Door handle */}
        <View style={{
          position: 'absolute',
          right: size * 0.1,
          top: '50%',
          width: size * 0.08,
          height: size * 0.08,
          borderRadius: size * 0.04,
          backgroundColor: color,
          transform: [{ translateY: -size * 0.04 }],
        }} />
      </View>
      {/* Exit arrow */}
      <View style={{
        position: 'absolute',
        right: -size * 0.1,
        width: size * 0.4,
        height: 2,
        backgroundColor: color,
      }}>
        <View style={{
          position: 'absolute',
          right: 0,
          top: -size * 0.05,
          width: size * 0.1,
          height: size * 0.1,
          borderTopWidth: 2,
          borderRightWidth: 2,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }} />
      </View>
    </View>
  );

  // Bottom Navigation Icons - Updated with new 5 icons
  const HomeIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.8,
        height: size * 0.7,
        borderWidth: 2,
        borderColor: color,
        borderBottomColor: 'transparent',
        borderTopLeftRadius: size * 0.15,
        borderTopRightRadius: size * 0.15,
        position: 'relative',
      }}>
        <View style={{
          position: 'absolute',
          top: -2,
          left: size * 0.25,
          right: size * 0.25,
          height: size * 0.3,
          borderWidth: 2,
          borderColor: color,
          borderBottomColor: 'transparent',
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          transform: [{ rotate: '45deg' }],
        }} />
      </View>
    </View>
  );

  // New Message Icon
  const MessageIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.8,
        height: size * 0.6,
        borderWidth: 2,
        borderColor: color,
        borderRadius: size * 0.1,
        position: 'relative',
      }}>
        {/* Message lines */}
        <View style={{
          position: 'absolute',
          top: size * 0.15,
          left: size * 0.15,
          right: size * 0.15,
          height: 1.5,
          backgroundColor: color,
        }} />
        <View style={{
          position: 'absolute',
          top: size * 0.25,
          left: size * 0.15,
          width: size * 0.35,
          height: 1.5,
          backgroundColor: color,
        }} />
      </View>
      {/* Message tail */}
      <View style={{
        position: 'absolute',
        bottom: size * 0.15,
        left: size * 0.25,
        width: size * 0.15,
        height: size * 0.15,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderColor: color,
        transform: [{ rotate: '-45deg' }],
      }} />
    </View>
  );

  // New Organisation Icon
  const OrganisationIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.8,
        height: size * 0.8,
        borderWidth: 2,
        borderColor: color,
        borderRadius: size * 0.05,
        position: 'relative',
      }}>
        {/* Building windows */}
        <View style={{
          position: 'absolute',
          top: size * 0.15,
          left: size * 0.15,
          width: size * 0.15,
          height: size * 0.15,
          borderWidth: 1,
          borderColor: color,
        }} />
        <View style={{
          position: 'absolute',
          top: size * 0.15,
          right: size * 0.15,
          width: size * 0.15,
          height: size * 0.15,
          borderWidth: 1,
          borderColor: color,
        }} />
        <View style={{
          position: 'absolute',
          top: size * 0.4,
          left: size * 0.15,
          width: size * 0.15,
          height: size * 0.15,
          borderWidth: 1,
          borderColor: color,
        }} />
        <View style={{
          position: 'absolute',
          top: size * 0.4,
          right: size * 0.15,
          width: size * 0.15,
          height: size * 0.15,
          borderWidth: 1,
          borderColor: color,
        }} />
      </View>
    </View>
  );

  // New AI Bot Icon
  const AIBotIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Robot head */}
      <View style={{
        width: size * 0.7,
        height: size * 0.6,
        borderWidth: 2,
        borderColor: color,
        borderRadius: size * 0.15,
        position: 'relative',
      }}>
        {/* Robot eyes */}
        <View style={{
          position: 'absolute',
          top: size * 0.15,
          left: size * 0.12,
          width: size * 0.12,
          height: size * 0.12,
          borderRadius: size * 0.06,
          backgroundColor: color,
        }} />
        <View style={{
          position: 'absolute',
          top: size * 0.15,
          right: size * 0.12,
          width: size * 0.12,
          height: size * 0.12,
          borderRadius: size * 0.06,
          backgroundColor: color,
        }} />
        {/* Robot mouth */}
        <View style={{
          position: 'absolute',
          bottom: size * 0.1,
          left: '50%',
          width: size * 0.25,
          height: 1.5,
          backgroundColor: color,
          transform: [{ translateX: -size * 0.125 }],
        }} />
      </View>
      {/* Robot antenna */}
      <View style={{
        position: 'absolute',
        top: size * 0.05,
        left: '50%',
        width: 1.5,
        height: size * 0.2,
        backgroundColor: color,
        transform: [{ translateX: -0.75 }],
      }}>
        <View style={{
          position: 'absolute',
          top: -size * 0.05,
          left: '50%',
          width: size * 0.08,
          height: size * 0.08,
          borderRadius: size * 0.04,
          backgroundColor: color,
          transform: [{ translateX: -size * 0.04 }],
        }} />
      </View>
    </View>
  );

  // Updated Help Icon for bottom nav
  const HelpNavIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.8,
        height: size * 0.8,
        borderRadius: size * 0.4,
        borderWidth: 2,
        borderColor: color,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Text style={{
          color: color,
          fontSize: size * 0.5,
          fontWeight: 'bold',
        }}>?</Text>
      </View>
    </View>
  );

  const menuItems: MenuItemType[] = [
    { 
      title: 'Profile', 
      icon: <UserIcon color={activeMenuItem === 'Profile' ? colors.primary : colors.textSecondary} />,
      isActive: activeMenuItem === 'Profile'
    },
    { 
      title: 'Notifications', 
      icon: <NotificationIcon color={activeMenuItem === 'Notifications' ? colors.primary : colors.textSecondary} />,
      isActive: activeMenuItem === 'Notifications'
    },
    { 
      title: 'Help & Support', 
      icon: <HelpIcon color={activeMenuItem === 'Help & Support' ? colors.primary : colors.textSecondary} />,
      isActive: activeMenuItem === 'Help & Support'
    },
    { 
      title: 'Privacy Policy', 
      icon: <LockIcon color={activeMenuItem === 'Privacy Policy' ? colors.primary : colors.textSecondary} />,
      isActive: activeMenuItem === 'Privacy Policy'
    },
    { 
      title: 'About', 
      icon: <InfoIcon color={activeMenuItem === 'About' ? colors.primary : colors.textSecondary} />,
      isActive: activeMenuItem === 'About'
    },
  ];

  const openMenu = () => {
    setIsMenuVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsMenuVisible(false);
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            closeMenu();
            onLogout();
          },
        },
      ]
    );
  };

  const handleMenuItemPress = (item: string) => {
    setActiveMenuItem(item);
    closeMenu();
    
    // Handle Profile navigation
    if (item === 'Profile') {
      setShowProfile(true);
    } else {
      Alert.alert('Coming Soon', `${item} feature will be available soon!`);
    }
  };

  const handleModulePress = (module: string, moduleId?: string) => {
    if (module.toLowerCase().includes('attendance') || moduleId === 'attendance') {
      setShowAttendance(true);
    } else {
      Alert.alert('Coming Soon', `${module} module will be available soon!`);
    }
  };

  // Add this function to handle back from attendance
  const handleBackFromAttendance = () => {
    setShowAttendance(false);
    setActiveMenuItem('Dashboard'); // Reset to Dashboard when coming back
  };

  // Add this function to handle back from profile
  const handleBackFromProfile = () => {
    setShowProfile(false);
    setActiveMenuItem('Dashboard'); // Reset to Dashboard when coming back
  };

  const handleNavItemPress = (navItem: string) => {
    setActiveNavItem(navItem);
    if (navItem !== 'home') {
      Alert.alert('Coming Soon', `${navItem} feature will be available soon!`);
    }
  };

  // Show loading screen
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" backgroundColor="#2D3748" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show error screen
  if (error || !userData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" backgroundColor="#2D3748" />
        <Text style={styles.errorText}>Failed to load data</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          // onPress={() => window.location.reload()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const AttendanceCard = ({ value, label }: AttendanceCardProps) => (
    <View style={styles.card}>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );

  const EventAvatar = ({ name, date, initials }: EventAvatarProps) => (
    <View style={styles.eventContainer}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
        <View style={styles.dateBadge}>
          <Text style={styles.dateText}>{date}</Text>
        </View>
      </View>
      <Text style={styles.eventName}>{name}</Text>
    </View>
  );

  const ModuleItem = ({ title, iconUrl, onPress }: ModuleItemProps) => (
    <TouchableOpacity style={styles.moduleItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.moduleIconContainer}>
        <Image 
          source={{ uri: iconUrl }}
          style={styles.moduleIconImage}
          resizeMode="contain"
          onError={(error) => {
            console.log('Error loading module icon:', error.nativeEvent.error);
          }}
        />
      </View>
      <Text style={styles.moduleTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const HamburgerMenu = () => (
    <Modal
      transparent
      visible={isMenuVisible}
      animationType="none"
      onRequestClose={closeMenu}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.overlayTouchable}
          activeOpacity={1} 
          onPress={closeMenu}
        />
        <Animated.View 
          style={[
            styles.menuContainer,
            {
              transform: [{ translateX: slideAnim }],
            }
          ]}
        >
          {/* Menu Header */}
          <View style={[styles.menuHeader, { paddingTop: insets.top }]}>
            <View style={styles.menuHeaderContent}>
              <View style={styles.menuUserAvatarCircle}>
                <UserIcon color={colors.white} size={24} />
              </View>
              <View style={styles.menuUserDetails}>
                <Text style={styles.menuUserRole}>
                  {userData.designation || userData.role || 'Employee'}
                </Text>
                <Text style={styles.menuUserName}>{userData.full_name}</Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <ScrollView 
            style={styles.menuItems} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.menuItemsContent}
          >
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  item.isActive && styles.menuItemActive
                ]}
                onPress={() => handleMenuItemPress(item.title)}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemIconContainer}>
                  {item.icon}
                </View>
                <Text style={[
                  styles.menuItemText,
                  item.isActive && styles.menuItemTextActive
                ]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Logout Section */}
          <View style={[styles.logoutSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.logoutDivider} />
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={styles.logoutIconContainer}>
                <LogoutIcon />
              </View>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  return (
  <KeyboardAvoidingView 
    style={{ flex: 1 }} 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    {showAttendance ? (
      <Attendance onBack={handleBackFromAttendance} />
    ) : showProfile ? (
      <Profile onBack={handleBackFromProfile} userData={userData} />
    ) : (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#2D3748" />
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.menuIcon} onPress={openMenu}>
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </TouchableOpacity>
            
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/logo_back.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.userInfo}>
            <View style={styles.userDetails}>
              <Text style={styles.userRole}>
                {userData.designation || userData.role || 'Employee'}
              </Text>
              <Text style={styles.userName}>{userData.full_name}</Text>
            </View>
          </View>
        </View>

        {/* Main Content - White Background */}
        <View style={styles.mainContent}>
          <ScrollView 
            style={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Attendance Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.blueBar} />
                <Text style={styles.sectionTitle}>Attendance</Text>
              </View>

              <View style={styles.cardGrid}>
                <View style={styles.cardRow}>
                  <AttendanceCard value="261" label="Days Present" />
                  <AttendanceCard 
                    value={String(userData.earned_leaves + userData.sick_leaves + userData.casual_leaves)} 
                    label="Leaves Applied" 
                  />
                </View>
                <View style={styles.cardRow}>
                  <AttendanceCard value="7" label="Holidays" />
                  <AttendanceCard value="0" label="Late" />
                </View>
              </View>

              <TouchableOpacity 
                style={styles.applyButton} 
                activeOpacity={0.8}
                onPress={() => setShowAttendance(true)}
              >
                <Text style={styles.applyButtonText}>Apply Leave</Text>
              </TouchableOpacity>
            </View>

            {/* Upcoming Birthdays Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.blueBar} />
                <Text style={styles.sectionTitle}>Upcoming Birthdays</Text>
              </View>

              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.eventsScroll}
                contentContainerStyle={styles.eventsScrollContent}
              >
                {upcomingBirthdays.length > 0 ? (
                  upcomingBirthdays.map((person, index) => (
                    <EventAvatar
                      key={index}
                      name={person.full_name}
                      date={formatDate(person.created_at)} // You might want to use a birthday field when available
                      initials={getInitials(person.full_name)}
                    />
                  ))
                ) : (
                  <Text style={styles.noBirthdaysText}>No upcoming birthdays</Text>
                )}
              </ScrollView>
            </View>

            {/* Modules Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.blueBar} />
                <Text style={styles.sectionTitle}>Modules</Text>
              </View>

              <View style={styles.modulesGrid}>
                {displayModules.length > 0 ? (
                  displayModules.map((module, index) => (
                    <ModuleItem
                      key={index}
                      title={module.title}
                      iconUrl={module.iconUrl}
                      onPress={() => handleModulePress(module.title, module.module_id)}
                    />
                  ))
                ) : (
                  <Text style={styles.noModulesText}>No modules available</Text>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Updated Bottom Navigation with 5 new icons */}
          <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
            <TouchableOpacity 
              style={styles.navItem} 
              onPress={() => handleNavItemPress('home')}
            >
              <HomeIcon color={activeNavItem === 'home' ? colors.primary : colors.textSecondary} />
              <Text style={[
                styles.navLabel,
                { color: activeNavItem === 'home' ? colors.primary : colors.textSecondary }
              ]}>
                Home
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => handleNavItemPress('message')}
            >
              <MessageIcon color={activeNavItem === 'message' ? colors.primary : colors.textSecondary} />
              <Text style={[
                styles.navLabel,
                { color: activeNavItem === 'message' ? colors.primary : colors.textSecondary }
              ]}>
                Message
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => handleNavItemPress('organisation')}
            >
              <OrganisationIcon color={activeNavItem === 'organisation' ? colors.primary : colors.textSecondary} />
              <Text style={[
                styles.navLabel,
                { color: activeNavItem === 'organisation' ? colors.primary : colors.textSecondary }
              ]}>
                Organisation
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => handleNavItemPress('ai-bot')}
            >
              <AIBotIcon color={activeNavItem === 'ai-bot' ? colors.primary : colors.textSecondary} />
              <Text style={[
                styles.navLabel,
                { color: activeNavItem === 'ai-bot' ? colors.primary : colors.textSecondary }
              ]}>
                AI Bot
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => handleNavItemPress('help')}
            >
              <HelpNavIcon color={activeNavItem === 'help' ? colors.primary : colors.textSecondary} />
              <Text style={[
                styles.navLabel,
                { color: activeNavItem === 'help' ? colors.primary : colors.textSecondary }
              ]}>
                Help
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hamburger Menu */}
        <HamburgerMenu />
      </View>
    )}
  </KeyboardAvoidingView>
);
};

export default Dashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary, 
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.white,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  noBirthdaysText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  noModulesText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.lg,
    width: '100%',
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  menuIcon: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: colors.white,
    marginVertical: 3,
    borderRadius: 1,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 90,
    height: 80,
    backgroundColor: 'transparent',
  },
  headerSpacer: {
    width: 36,
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userRole: {
    color: colors.textLight,
    fontSize: fontSize.sm,
    marginBottom: 2,
  },
  userName: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  blueBar: {
    width: 4,
    height: 20,
    backgroundColor: colors.info,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  cardGrid: {
    marginBottom: spacing.lg,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardValue: {
    fontSize: Math.min(screenWidth * 0.09, 36),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  applyButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  applyButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  eventsScroll: {
    marginTop: spacing.sm,
  },
  eventsScrollContent: {
    paddingRight: spacing.md,
  },
  eventContainer: {
    alignItems: 'center',
    marginRight: spacing.md,
    width: 70,
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 60,
    height: 60,
    backgroundColor: colors.info,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  dateBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 40,
    alignItems: 'center',
  },
  dateText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '500',
  },
  eventName: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  moduleItem: {
    width: (screenWidth - 52) / 2,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moduleIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  moduleIconImage: {
    width: 32,
    height: 32,
  },
  moduleTitle: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 4,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  navIcon: {
    fontSize: 22,
    color: colors.textLight,
  },
  navIconActive: {
    fontSize: 22,
    color: colors.primary,
  },
  // Improved Hamburger Menu Styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    width: 300,
    backgroundColor: colors.white,
    ...shadows.lg,
    flexDirection: 'column',
  },
  menuHeader: {
    backgroundColor: colors.primary,
    position: 'relative',
  },
  menuHeaderContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuUserAvatarCircle: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuUserDetails: {
    flex: 1,
  },
  menuUserRole: {
    color: colors.textLight,
    fontSize: fontSize.sm,
    marginBottom: 2,
  },
  menuUserName: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  menuItems: {
    flex: 1,
    backgroundColor: colors.white,
  },
  menuItemsContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  menuItemActive: {
    backgroundColor: colors.backgroundSecondary,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  menuItemIconContainer: {
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuItemText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  menuItemTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  logoutSection: {
    backgroundColor: colors.white,
    paddingTop: spacing.sm,
  },
  logoutDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FEF2F2',
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  logoutIconContainer: {
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  logoutButtonText: {
    fontSize: fontSize.md,
    color: colors.error,
    fontWeight: '600',
    flex: 1,
  },
});