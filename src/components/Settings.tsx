import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, fontSize } from '../styles/theme';
import { BACKEND_URL } from '../config/config';

// Conditional import for expo-secure-store (not available on web)
let SecureStore: any = null;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

interface SettingsProps {
  onBack: () => void;
  isDark?: boolean;
}

const Settings: React.FC<SettingsProps> = ({ onBack, isDark = false }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [reconfigureLoading, setReconfigureLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(isDark);
  const [appVersion] = useState('1.0.0');

  const isWeb = Platform.OS === 'web';

  // Load notification setting on component mount
  useEffect(() => {
    loadNotificationSetting();
  }, []);

  const loadNotificationSetting = async () => {
    try {
      const storedSetting = await AsyncStorage.getItem('notifications_enabled');
      if (storedSetting !== null) {
        setNotificationsEnabled(storedSetting === 'true');
      } else {
        // Default to true if not set
        await AsyncStorage.setItem('notifications_enabled', 'true');
        setNotificationsEnabled(true);
      }
    } catch (error) {
      console.error('Error loading notification setting:', error);
      setNotificationsEnabled(true); // Default to enabled on error
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    try {
      setNotificationsEnabled(value);
      await AsyncStorage.setItem('notifications_enabled', value.toString());
      
      // Show confirmation message
      Alert.alert(
        'Notifications ' + (value ? 'Enabled' : 'Disabled'),
        'Notification settings have been updated. ' + 
        (value ? 'You will receive notifications as usual.' : 'You will no longer receive any notifications.'),
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving notification setting:', error);
      // Revert UI state on error
      setNotificationsEnabled(!value);
      Alert.alert('Error', 'Failed to update notification settings. Please try again.');
    }
  };

  // WhatsApp-style colors
  const whatsappColors = {
    dark: {
      background: '#111B21',
      card: '#202C33',
      text: '#E9EDEF',
      textSecondary: '#8696A0',
      border: '#2A3942',
      primary: '#008069',
      accent: '#00A884',
      header: '#202C33',
      icon: '#AEBAC1',
      danger: '#F15C6D',
      warning: '#FFB347',
    },
    light: {
      background: '#e7e6e5',
      card: '#F0F2F5',
      text: '#111B21',
      textSecondary: '#667781',
      border: '#E1E8ED',
      primary: '#008069',
      accent: '#00A884',
      header: '#008069',
      icon: '#8696A0',
      danger: '#F15C6D',
      warning: '#FFB347',
    }
  };

  const currentTheme = darkMode ? whatsappColors.dark : whatsappColors.light;

  const handleReconfigureDevice = async () => {
    if (isWeb) {
      Alert.alert(
        'Not Available on Web',
        'Device reconfiguration is only available on the mobile app. Please use the mobile application to reconfigure your device.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Reconfigure Device',
      'This will update your device ID. Are you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reconfigure',
          style: 'default',
          onPress: async () => {
            try {
              setReconfigureLoading(true);

              // Get token from AsyncStorage
              const token = await AsyncStorage.getItem('token_2');
              
              if (!token) {
                Alert.alert('Error', 'Authentication token not found. Please login again.');
                return;
              }

              // Call the API
              const response = await fetch(`${BACKEND_URL}/core/updateDeviceId`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token }),
              });

              const data = await response.json();

              if (response.status === 200 && data.device_id) {
                // Store device_id in expo-secure-store
                if (SecureStore) {
                  await SecureStore.setItemAsync('device_id', data.device_id);
                }
                
                Alert.alert(
                  'Success',
                  'Device reconfigured successfully!',
                  [{ text: 'OK' }]
                );
              } else if (response.status === 403) {
                // Show not permitted screen
                Alert.alert(
                  'Action Not Permitted',
                  'Sorry, this action is not permitted. Kindly raise an HR ticket for device reconfiguration to access this feature.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Error', data.message || 'Failed to reconfigure device');
              }
            } catch (error) {
              console.error('Reconfigure device error:', error);
              Alert.alert('Error', 'Failed to reconfigure device. Please try again.');
            } finally {
              setReconfigureLoading(false);
            }
          },
        },
      ]
    );
  };

  const showComingSoon = (feature: string) => {
    Alert.alert('Coming Soon', `${feature} feature will be available soon!`, [
      { text: 'OK' },
    ]);
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
      <Text style={styles.backText}>Back</Text>
    </View>
  );

  const renderHeader = () => (
  <View style={[styles.header, { 
    backgroundColor: currentTheme.header,
    paddingTop: Platform.OS === 'ios' 
      ? insets.top 
      : Platform.OS === 'android' 
        ? (StatusBar.currentHeight ?? 0) 
        : 0,
  }]}>
      <View style={styles.headerContent}>
        <TouchableOpacity 
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>
    </View>
  );

  const renderSettingItem = ({
    icon,
    title,
    subtitle,
    rightComponent,
    onPress,
    showChevron = true,
    isDestructive = false,
    isLoading = false,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    rightComponent?: React.ReactNode;
    onPress: () => void;
    showChevron?: boolean;
    isDestructive?: boolean;
    isLoading?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { 
        backgroundColor: currentTheme.card,
        borderBottomColor: currentTheme.border,
      }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      <View style={[styles.settingIcon, { backgroundColor: currentTheme.primary + '20' }]}>
        <Ionicons name={icon as any} size={20} color={currentTheme.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[
          styles.settingTitle, 
          { color: isDestructive ? currentTheme.danger : currentTheme.text }
        ]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: currentTheme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color={currentTheme.primary} />
      ) : rightComponent ? (
        rightComponent
      ) : showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={currentTheme.icon} />
      ) : null}
    </TouchableOpacity>
  );

  const renderSwitch = (value: boolean, onValueChange: (val: boolean) => void) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: currentTheme.textSecondary + '40', true: currentTheme.accent }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={currentTheme.textSecondary + '40'}
    />
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: currentTheme.textSecondary }]}>
        {title}
      </Text>
      <View style={[styles.sectionContent, { backgroundColor: currentTheme.card }]}>
        {children}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar 
        barStyle={"light-content"} 
        backgroundColor={currentTheme.header} 
      />
      
      {/* Fixed Header */}
      {renderHeader()}
      
      {/* Main Content with SafeArea */}
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Notifications */}
          {renderSection("NOTIFICATIONS", (
            <>
              {renderSettingItem({
                icon: "notifications-outline",
                title: "Notifications",
                subtitle: "Enable or disable all notifications",
                onPress: () => handleNotificationToggle(!notificationsEnabled),
                rightComponent: renderSwitch(notificationsEnabled, handleNotificationToggle),
                showChevron: false,
              })}
            </>
          ))}

          {/* Device */}
          {renderSection("DEVICE", (
            <>
              {renderSettingItem({
                icon: "phone-portrait-outline",
                title: "App Language",
                subtitle: "English (phone's language)",
                onPress: () => showComingSoon('App Language'),
              })}
              {renderSettingItem({
                icon: "moon-outline",
                title: "Dark Mode",
                subtitle: darkMode ? "On" : "Off",
                onPress: () => setDarkMode(!darkMode),
                rightComponent: renderSwitch(darkMode, setDarkMode),
                showChevron: false,
              })}
              {renderSettingItem({
                icon: "refresh-outline",
                title: "Reconfigure Device",
                subtitle: isWeb ? "Available only on mobile app" : "Update your device ID",
                onPress: handleReconfigureDevice,
                isLoading: reconfigureLoading,
              })}
            </>
          ))}

          {/* Help */}
          {renderSection("HELP", (
            <>
              {renderSettingItem({
                icon: "help-circle-outline",
                title: "Help Center",
                subtitle: "Help, contact info, privacy policy",
                onPress: () => showComingSoon('Help Center'),
              })}
              {renderSettingItem({
                icon: "flag-outline",
                title: "Report a Problem",
                subtitle: "Report bugs and issues",
                onPress: () => showComingSoon('Report a Problem'),
              })}
            </>
          ))}

          {/* About */}
          {renderSection("ABOUT", (
            <>
              {renderSettingItem({
                icon: "information-circle-outline",
                title: "About Citadel Hub",
                subtitle: `Version ${appVersion}`,
                onPress: () => showComingSoon('About'),
                showChevron: false,
              })}
              {renderSettingItem({
                icon: "shield-checkmark-outline",
                title: "Terms & Privacy Policy",
                onPress: () => showComingSoon('Terms & Privacy Policy'),
              })}
            </>
          ))}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginTop: Platform.OS === 'ios' ? -60 : Platform.OS === 'android' ? -30 : 0,
  },
  headerContent: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: 52,
},
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: -15,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  bottomSpacing: {
    height: 32,
  },
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 2,
  },
});

export default Settings;