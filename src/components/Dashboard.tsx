import React, { useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, borderRadius, shadows, commonStyles } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface DashboardProps {
  onLogout: () => void;
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
  icon: string;
  onPress: () => void;
}

interface MenuItemType {
  title: string;
  icon: React.ReactNode;
  isActive?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const insets = useSafeAreaInsets();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-300));
  const [activeMenuItem, setActiveMenuItem] = useState('Profile');
  const [activeNavItem, setActiveNavItem] = useState('home'); // State for bottom navigation
  
  const upcomingEvents: UpcomingEvent[] = [
    { name: 'Priyanka C', date: '25 Jul', initials: 'PC' },
    { name: 'Ashritha', date: '26 Jul', initials: 'AS' },
    { name: 'Sushma', date: '1 Aug', initials: 'SU' },
    { name: 'Biju Unni', date: '19 Aug', initials: 'BU' },
    { name: 'Priyanka Raj', date: '19 Aug', initials: 'PR' },
  ];

  const modules = [
    { title: 'Attendance', icon: '📅' },
    { title: 'Leave Management', icon: '🗓️' },
    { title: 'Payroll', icon: '💰' },
    { title: 'Performance', icon: '📊' },
    { title: 'Training', icon: '🎓' },
    { title: 'Documents', icon: '📄' },
    { title: 'Directory', icon: '📞' },
    { title: 'Reports', icon: '📈' },
  ];

  // Custom Icon Components
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

  const SettingsIcon = ({ color = colors.textSecondary, size = 20 }: { color?: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.8,
        height: size * 0.8,
        borderRadius: size * 0.4,
        borderWidth: 2,
        borderColor: color,
      }}>
        <View style={{
          position: 'absolute',
          top: size * 0.3,
          left: size * 0.3,
          width: size * 0.2,
          height: size * 0.2,
          borderRadius: size * 0.1,
          backgroundColor: color,
        }} />
      </View>
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

  const LogoutIcon = ({ color = colors.error, size = 20 }: { color?: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.8,
        height: size * 0.6,
        borderWidth: 2,
        borderColor: color,
        borderRadius: size * 0.05,
        borderRightColor: 'transparent',
      }} />
      <View style={{
        position: 'absolute',
        right: size * 0.1,
        width: size * 0.3,
        height: 2,
        backgroundColor: color,
      }} />
      <View style={{
        position: 'absolute',
        right: size * 0.15,
        top: size * 0.25,
        width: size * 0.15,
        height: size * 0.15,
        borderTopWidth: 2,
        borderRightWidth: 2,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
      }} />
    </View>
  );

  // Bottom Navigation Icons
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

  const CalendarIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.8,
        height: size * 0.7,
        borderWidth: 2,
        borderColor: color,
        borderRadius: size * 0.1,
      }}>
        <View style={{
          position: 'absolute',
          top: -size * 0.15,
          left: size * 0.15,
          width: 2,
          height: size * 0.25,
          backgroundColor: color,
        }} />
        <View style={{
          position: 'absolute',
          top: -size * 0.15,
          right: size * 0.15,
          width: 2,
          height: size * 0.25,
          backgroundColor: color,
        }} />
        <View style={{
          position: 'absolute',
          top: size * 0.2,
          left: size * 0.15,
          right: size * 0.15,
          height: 1,
          backgroundColor: color,
        }} />
      </View>
    </View>
  );

  const LocationIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.6,
        height: size * 0.8,
        borderRadius: size * 0.3,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderWidth: 2,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
      }}>
        <View style={{
          position: 'absolute',
          top: size * 0.15,
          left: size * 0.15,
          width: size * 0.2,
          height: size * 0.2,
          borderRadius: size * 0.1,
          backgroundColor: color,
        }} />
      </View>
    </View>
  );

  const HandshakeIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size * 0.8,
        height: size * 0.6,
        borderWidth: 2,
        borderColor: color,
        borderRadius: size * 0.1,
        position: 'relative',
      }}>
        <View style={{
          position: 'absolute',
          top: size * 0.1,
          left: size * 0.1,
          width: size * 0.2,
          height: size * 0.2,
          borderRadius: size * 0.1,
          backgroundColor: color,
        }} />
        <View style={{
          position: 'absolute',
          top: size * 0.1,
          right: size * 0.1,
          width: size * 0.2,
          height: size * 0.2,
          borderRadius: size * 0.1,
          backgroundColor: color,
        }} />
      </View>
    </View>
  );

  const TeamIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: size * 0.15,
          borderWidth: 2,
          borderColor: color,
          marginRight: -size * 0.1,
        }} />
        <View style={{
          width: size * 0.35,
          height: size * 0.35,
          borderRadius: size * 0.175,
          borderWidth: 2,
          borderColor: color,
          backgroundColor: 'transparent',
          zIndex: 1,
        }} />
        <View style={{
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: size * 0.15,
          borderWidth: 2,
          borderColor: color,
          marginLeft: -size * 0.1,
        }} />
      </View>
      <View style={{
        width: size * 0.7,
        height: size * 0.3,
        borderWidth: 2,
        borderColor: color,
        borderRadius: size * 0.15,
        marginTop: size * 0.1,
        borderTopColor: 'transparent',
      }} />
    </View>
  );

  const menuItems: MenuItemType[] = [
    { 
      title: 'Profile', 
      icon: <UserIcon color={activeMenuItem === 'Profile' ? colors.primary : colors.textSecondary} />,
      isActive: activeMenuItem === 'Profile'
    },
    { 
      title: 'Settings', 
      icon: <SettingsIcon color={activeMenuItem === 'Settings' ? colors.primary : colors.textSecondary} />,
      isActive: activeMenuItem === 'Settings'
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
    Alert.alert('Coming Soon', `${item} feature will be available soon!`);
  };

  const handleModulePress = (module: string) => {
    Alert.alert('Coming Soon', `${module} module will be available soon!`);
  };

  const handleNavItemPress = (navItem: string) => {
    setActiveNavItem(navItem);
    Alert.alert('Coming Soon', `${navItem} feature will be available soon!`);
  };

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

  const ModuleItem = ({ title, icon, onPress }: ModuleItemProps) => (
    <TouchableOpacity style={styles.moduleItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.moduleIconContainer}>
        <Text style={styles.moduleIcon}>{icon}</Text>
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
          {/* Menu Header - No Logo */}
          <View style={[styles.menuHeader, { paddingTop: insets.top }]}>
            <View style={styles.menuHeaderContent}>
              <View style={styles.menuUserAvatarCircle}>
                <UserIcon color={colors.white} size={24} />
              </View>
              <View style={styles.menuUserDetails}>
                <Text style={styles.menuUserRole}>Director</Text>
                <Text style={styles.menuUserName}>Priyanka Raj</Text>
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
                source={require('../assets/Logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.userInfo}>
            <View style={styles.userDetails}>
              <Text style={styles.userRole}>Director</Text>
              <Text style={styles.userName}>Priyanka Raj</Text>
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
                  <AttendanceCard value="3" label="Leaves Applied" />
                </View>
                <View style={styles.cardRow}>
                  <AttendanceCard value="7" label="Holidays" />
                  <AttendanceCard value="0" label="Late" />
                </View>
              </View>

              <TouchableOpacity style={styles.applyButton} activeOpacity={0.8}>
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
                {upcomingEvents.map((event, index) => (
                  <EventAvatar
                    key={index}
                    name={event.name}
                    date={event.date}
                    initials={event.initials}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Modules Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.blueBar} />
                <Text style={styles.sectionTitle}>Modules</Text>
              </View>

              <View style={styles.modulesGrid}>
                {modules.map((module, index) => (
                  <ModuleItem
                    key={index}
                    title={module.title}
                    icon={module.icon}
                    onPress={() => handleModulePress(module.title)}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Navigation with Custom Icons and Labels */}
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
              onPress={() => handleNavItemPress('calendar')}
            >
              <CalendarIcon color={activeNavItem === 'calendar' ? colors.primary : colors.textSecondary} />
              <Text style={[
                styles.navLabel,
                { color: activeNavItem === 'calendar' ? colors.primary : colors.textSecondary }
              ]}>
                Calendar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => handleNavItemPress('location')}
            >
              <LocationIcon color={activeNavItem === 'location' ? colors.primary : colors.textSecondary} />
              <Text style={[
                styles.navLabel,
                { color: activeNavItem === 'location' ? colors.primary : colors.textSecondary }
              ]}>
                Location
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => handleNavItemPress('handshake')}
            >
              <HandshakeIcon color={activeNavItem === 'handshake' ? colors.primary : colors.textSecondary} />
              <Text style={[
                styles.navLabel,
                { color: activeNavItem === 'handshake' ? colors.primary : colors.textSecondary }
              ]}>
                Partners
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navItem}
              onPress={() => handleNavItemPress('team')}
            >
              <TeamIcon color={activeNavItem === 'team' ? colors.primary : colors.textSecondary} />
              <Text style={[
                styles.navLabel,
                { color: activeNavItem === 'team' ? colors.primary : colors.textSecondary }
              ]}>
                Team
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hamburger Menu */}
        <HamburgerMenu />
      </View>
    </KeyboardAvoidingView>
  );
};

export default Dashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary, 
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
    width: 70,
    height: 70,
    backgroundColor: 'transparent', // Remove any background
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
  },
  moduleIcon: {
    fontSize: 24,
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
    gap: 4, // Space between icon and label
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