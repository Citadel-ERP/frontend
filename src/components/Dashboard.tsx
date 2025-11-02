import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar,
  Alert, Modal, Animated, KeyboardAvoidingView, Platform, Dimensions, Image, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';
import { BACKEND_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Attendance from './attendance/Attendance';
import Profile from './Profile';
import HR from './HR';
import Cab from './Cab';
import Driver from './Driver';
import BDT from './BDT';
import Medical from './Medical';
import ScoutBoy from './ScoutBoy';

const { width: screenWidth } = Dimensions.get('window');

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
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [token, setToken] = useState<string | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHR, setShowHR] = useState(false);
  const [showCab, setShowCab] = useState(false);
  const [showDriver, setShowDriver] = useState(false);
  const [showBDT, setShowBDT] = useState(false);
  const [showMedical, setShowMedical] = useState(false);
  const [showScoutBoy, setShowScoutBoy] = useState(false);
  const insets = useSafeAreaInsets();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-300));
  const [activeMenuItem, setActiveMenuItem] = useState('Dashboard');
  const [activeNavItem, setActiveNavItem] = useState('home');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceKey, setAttendanceKey] = useState(0);
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
          const transformedUserData: UserData = {
            ...data.user,
            profile_picture: data.user.profile_picture || undefined
          };
          setUserData(transformedUserData);
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
  }, [token]);

  const getInitials = (fullName: string): string => {
    return fullName.split(' ').map(name => name.charAt(0).toUpperCase()).join('').substring(0, 2);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const getDisplayModules = () => {
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
    } else {
      Alert.alert('Coming Soon', `${item} feature will be available soon!`);
    }
  };

  const handleModulePress = (module: string, moduleUniqueName?: string) => {
    if (module.toLowerCase().includes('attendance') || moduleUniqueName === 'attendance') {
      setAttendanceKey(prev => prev + 1);
      setShowAttendance(true);
    } else if (moduleUniqueName === 'hr' || module.toLowerCase().includes('hr')) {
      setShowHR(true);
    } else if (moduleUniqueName === 'cab' || module.toLowerCase().includes('cab')) {
      setShowCab(true);
    } else if (moduleUniqueName === 'driver' || module.toLowerCase().includes('driver')) {
      setShowDriver(true);
    } else if (moduleUniqueName === 'bdt' || module.toLowerCase().includes('bdt')) {
      setShowBDT(true);
    } else if (moduleUniqueName === 'mediclaim' || module.toLowerCase().includes('mediclaim')) {
      setShowMedical(true);
    } else if (moduleUniqueName === 'scout_boy' || module.toLowerCase().includes('scout')) {
      setShowScoutBoy(true);
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

  const handleNavItemPress = (navItem: string) => {
    setActiveNavItem(navItem);
    if (navItem !== 'home') {
      Alert.alert('Coming Soon', `${navItem} feature will be available soon!`);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" backgroundColor="#2D3748" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error || !userData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" backgroundColor="#2D3748" />
        <Text style={styles.errorText}>Failed to load data</Text>
        <TouchableOpacity style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  interface AttendanceCardProps {
    value: string;
    label: string;
    color: string;
  }

  const AttendanceCard: React.FC<AttendanceCardProps> = ({ value, label, color }) => (
    <View style={[styles.card, { backgroundColor: color }]}>
      <View style={styles.cardCircle} />
      <View style={styles.cardCircleSmall} />
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );

  interface EventAvatarProps {
    name: string;
    date: string;
    initials: string;
  }

  const EventAvatar: React.FC<EventAvatarProps> = ({ name, date, initials }) => (
    <View style={styles.eventContainer}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
        <View style={styles.dateBadge}>
          <Text style={styles.dateText}>{date}</Text>
        </View>
      </View>
      <Text style={styles.eventName} numberOfLines={2}>{name}</Text>
    </View>
  );

  interface ModuleItemProps {
    title: string;
    iconUrl: string;
    onPress: () => void;
  }
  const ModuleItem: React.FC<ModuleItemProps> = ({ title, iconUrl, onPress }) => (
    <TouchableOpacity style={styles.moduleItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.moduleIconContainer}>
        <Image source={{ uri: iconUrl }} style={styles.moduleIconImage} resizeMode="contain" />
      </View>
      <Text style={styles.moduleTitle} numberOfLines={2}>{title}</Text>
    </TouchableOpacity>
  );

  const HamburgerMenu = () => (
    <Modal transparent visible={isMenuVisible} animationType="none" onRequestClose={closeMenu}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={closeMenu} />
        <Animated.View style={[styles.menuContainer, { transform: [{ translateX: slideAnim }] }]}>
          <View style={[styles.menuHeader, { paddingTop: insets.top }]}>
            <View style={styles.menuHeaderContent}>
              <View style={styles.menuUserAvatarCircle}>
                <Icon type="user" color={colors.white} size={24} />
              </View>
              <View style={styles.menuUserDetails}>
                <Text style={styles.menuUserRole}>{userData.designation || userData.role || 'Employee'}</Text>
                <Text style={styles.menuUserName}>{userData.full_name}</Text>
              </View>
            </View>
          </View>
          <ScrollView style={styles.menuItems} showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuItemsContent}>
            {menuItems.map((item, index) => (
              <TouchableOpacity key={index} style={[styles.menuItem, item.isActive && styles.menuItemActive]} onPress={() => handleMenuItemPress(item.title)} activeOpacity={0.7}>
                <View style={styles.menuItemIconContainer}>{item.icon}</View>
                <Text style={[styles.menuItemText, item.isActive && styles.menuItemTextActive]}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={[styles.logoutSection, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.logoutDivider} />
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
              <View style={styles.logoutIconContainer}><LogoutIcon /></View>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  const displayModules = getDisplayModules();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {showAttendance ? (
        <Attendance key={attendanceKey} onBack={handleBackFromAttendance} />
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
      ) : (
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <StatusBar barStyle="light-content" backgroundColor="#2D3748" />
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity style={styles.menuIcon} onPress={openMenu}>
                {[1, 2, 3].map(i => <View key={i} style={styles.menuLine} />)}
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Image source={require('../assets/logo_back.png')} style={styles.logo} resizeMode="contain" />
              </View>
              <View style={styles.headerSpacer} />
            </View>
            <View style={styles.userInfo}>
              <View style={styles.userDetails}>
                <Text style={styles.greeting}>Hi</Text>
                <Text style={styles.userName}>{userData.full_name.split(' ')[0]},</Text>
                <Text style={styles.userRole}>{userData.designation || userData.role || 'Employee'}</Text>
              </View>
            </View>
          </View>
          <View style={styles.mainContent}>
            <ScrollView 
              style={styles.scrollContent} 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={styles.scrollContainer} 
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Attendance</Text>
                <View style={styles.attendanceGrid}>
                  <AttendanceCard value="261" label="Days Present" color="#A7F3D0" />
                  <AttendanceCard 
                    value={String(userData.earned_leaves + userData.sick_leaves + userData.casual_leaves)} 
                    label="Leaves Applied" 
                    color="#FED7AA" 
                  />
                  <AttendanceCard value="7" label="Holidays" color="#DDD6FE" />
                  <AttendanceCard value="0" label="Late Arrivals" color="#FBCFE8" />
                </View>
              </View>
              <View style={styles.sectionModules}>
                <Text style={styles.sectionTitle}>Modules</Text>
                {displayModules.length > 0 ? (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.modulesScrollContent}
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
                  <Text style={styles.noModulesText}>No modules available</Text>
                )}
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
                {upcomingBirthdays.length > 0 ? (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.eventsScroll} 
                    contentContainerStyle={styles.eventsScrollContent}
                  >
                    {upcomingBirthdays.map((person, index) => (
                      <EventAvatar 
                        key={index} 
                        name={person.full_name} 
                        date={formatDate(person.birth_date)} 
                        initials={getInitials(person.full_name)} 
                      />
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.noEventsContainer}>
                    <Image 
                      source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2965/2965140.png' }} 
                      style={styles.noEventsImage} 
                      resizeMode="contain"
                    />
                    <Text style={styles.noEventsText}>No upcoming events</Text>
                  </View>
                )}
              </View>
            </ScrollView>
            <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
              <TouchableOpacity style={styles.navItem} onPress={() => handleNavItemPress('home')}>
                <HomeIcon color={activeNavItem === 'home' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.navLabel, { color: activeNavItem === 'home' ? colors.primary : colors.textSecondary }]}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem} onPress={() => handleNavItemPress('message')}>
                <MessageIcon color={activeNavItem === 'message' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.navLabel, { color: activeNavItem === 'message' ? colors.primary : colors.textSecondary }]}>Messages</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem} onPress={() => handleNavItemPress('team')}>
                <TeamIcon color={activeNavItem === 'team' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.navLabel, { color: activeNavItem === 'team' ? colors.primary : colors.textSecondary }]}>Organisation</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem} onPress={() => handleNavItemPress('ai-bot')}>
                <BotIcon color={activeNavItem === 'ai-bot' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.navLabel, { color: activeNavItem === 'ai-bot' ? colors.primary : colors.textSecondary }]}>AI Bot</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem} onPress={() => handleNavItemPress('support')}>
                <SupportIcon color={activeNavItem === 'support' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.navLabel, { color: activeNavItem === 'support' ? colors.primary : colors.textSecondary }]}>Support</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    backgroundColor: colors.primary
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: colors.white,
    fontSize: fontSize.md,
    marginTop: 16
  },
  errorText: {
    color: colors.white,
    fontSize: fontSize.md,
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
    fontSize: fontSize.md,
    fontWeight: '600'
  },
  noModulesText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 32,
    width: '100%'
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 28
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8
  },
  menuIcon: {
    padding: 8,
    borderRadius: 4
  },
  menuLine: {
    width: 20,
    height: 2,
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
    width: 90,
    height: 80,
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
    fontSize: 14,
    marginBottom: 4
  },
  userName: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4
  },
  userRole: {
    color: colors.textLight,
    fontSize: 15,
    fontWeight: '400'
  },
  mainContent: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -16
  },
  scrollContent: {
    flex: 1
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20
  },
  section: {
    marginBottom: 32
  },
  sectionModules: {
    marginTop: Platform.OS === 'android' ? -50 : 0,
    marginBottom: 32
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: -0.5
  },
  attendanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8
  },
  card: {
    flex: 1,
    minWidth: (screenWidth - 40 - 12) / 2,
    maxWidth: (screenWidth - 40 - 12) / 2,
    aspectRatio: Platform.OS === 'android' ? 1 : undefined,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'ios' ? 110 : undefined,
    position: 'relative',
    overflow: 'hidden'
  },
  cardCircle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)'
  },
  cardCircleSmall: {
    position: 'absolute',
    bottom: -10,
    left: -10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  cardValue: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
    zIndex: 1,
    letterSpacing: -1
  },
  cardLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    zIndex: 1
  },
  modulesScrollContent: {
    paddingRight: 16,
    gap: 12
  },
  moduleItem: {
    width: 110,
    padding: 12,
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
    minHeight: 110
  },
  moduleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden'
  },
  moduleIconImage: {
    width: 32,
    height: 32
  },
  moduleTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 14
  },
  eventsScroll: {
    marginTop: 8
  },
  eventsScrollContent: {
    paddingRight: 16,
    gap: 16
  },
  eventContainer: {
    alignItems: 'center',
    width: 80
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 12
  },
  avatar: {
    width: 68,
    height: 68,
    backgroundColor: colors.info,
    borderRadius: 34,
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
  avatarInitials: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold'
  },
  dateBadge: {
    position: 'absolute',
    bottom: -12,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 52,
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
  dateText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700'
  },
  eventName: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '500'
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
    width: 80,
    height: 80,
    marginBottom: 16,
    opacity: 0.5
  },
  noEventsText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic'
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2
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
    width: 300,
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
    width: 56,
    height: 56,
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
    fontSize: 13,
    marginBottom: 4
  },
  menuUserName: {
    color: colors.white,
    fontSize: 18,
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
    paddingHorizontal: 20,
    paddingVertical: 14,
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
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  menuItemText: {
    fontSize: 15,
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FEF2F2',
    marginHorizontal: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.error
  },
  logoutIconContainer: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  logoutButtonText: {
    fontSize: 15,
    color: colors.error,
    fontWeight: '600',
    flex: 1
  }
});