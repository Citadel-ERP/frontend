import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Platform,
  useWindowDimensions,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserData } from './DashboardTypes';

const { width } = Dimensions.get('window');

// WhatsApp-style Hamburger Menu Component - Only for mobile
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

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
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

  if (!isVisible || isWeb) return null; // Hide on web

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity
        style={[styles.menuBackdrop]}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.menuContainer,
            {
              transform: [{ translateX: slideAnim }],
              backgroundColor: isDark ? '#111B21' : '#e7e6e5',
              width: width * 0.85,
            },
          ]}
        >
          {/* Header Section - WhatsApp Style */}
          <View style={[styles.menuHeader, { backgroundColor: isDark ? '#202C33' : '#008069' }]}>
            <View style={styles.userInfoContainer}>
              {userData?.profile_picture ? (
                <Image
                  source={{ uri: userData.profile_picture }}
                  style={styles.userAvatar}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: '#0c4036ff' }]}>
                  <Text style={styles.avatarText}>
                    {getInitials(userData?.full_name || 'User')}
                  </Text>
                </View>
              )}

              <View style={styles.userDetails}>
                <Text style={styles.userName} numberOfLines={1}>
                  {userData?.full_name || 'User'}
                </Text>
                <Text style={styles.userStatus} numberOfLines={1}>
                  {userData?.designation || 'Employee'}
                </Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <ScrollView style={styles.menuItemsContainer}>
            {filteredMenuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
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
                <View style={[styles.menuIconContainer, { backgroundColor: isDark ? '#2A3942' : '#F0F2F5' }]}>
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={item.color}
                  />
                </View>
                <Text style={[styles.menuItemText, { color: isDark ? '#E9EDEF' : '#111B21' }]}>
                  {item.title}
                </Text>

                {item.id !== 'logout' && (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={isDark ? '#8696A0' : '#667781'}
                    style={styles.chevronIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Footer - App Version */}
          <View style={[styles.menuFooter, { borderTopColor: isDark ? '#2A3942' : '#F0F2F5' }]}>
            <Text style={[styles.versionText, { color: isDark ? '#8696A0' : '#667781' }]}>
              Citadel v1.0.0
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
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
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
  userName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  userStatus: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  menuItemsContainer: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  chevronIcon: {
    marginLeft: 8,
  },
  menuFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
  },
});