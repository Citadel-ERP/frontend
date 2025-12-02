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
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
}

const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [reconfigureLoading, setReconfigureLoading] = useState(false);

  const isWeb = Platform.OS === 'web';

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

  const BackIcon = ({ color = colors.text, size = 24 }) => (
    <View style={{ width: size, height: size, justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.5,
          height: size * 0.5,
          borderLeftWidth: 2,
          borderBottomWidth: 2,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );

  const ChevronIcon = ({ color = colors.textSecondary, size = 20 }) => (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'flex-end' }}>
      <View
        style={{
          width: size * 0.4,
          height: size * 0.4,
          borderTopWidth: 2,
          borderRightWidth: 2,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );

  interface SettingItemProps {
    title: string;
    subtitle?: string;
    onPress: () => void;
    isDestructive?: boolean;
    showChevron?: boolean;
    isLoading?: boolean;
  }

  const SettingItem: React.FC<SettingItemProps> = ({
    title,
    subtitle,
    onPress,
    isDestructive = false,
    showChevron = true,
    isLoading = false,
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      <View style={styles.settingItemContent}>
        <Text style={[styles.settingTitle, isDestructive && styles.destructiveText]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        showChevron && <ChevronIcon />
      )}
    </TouchableOpacity>
  );

  interface SettingSectionProps {
    title: string;
    children: React.ReactNode;
  }

  const SettingSection: React.FC<SettingSectionProps> = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Account Settings */}
        <SettingSection title="Account">
          <SettingItem
            title="Profile Settings"
            subtitle="Edit your personal information"
            onPress={() => showComingSoon('Profile Settings')}
          />
          <SettingItem
            title="Change Password"
            subtitle="Update your password"
            onPress={() => showComingSoon('Change Password')}
          />
          <SettingItem
            title="Privacy Settings"
            subtitle="Manage your privacy preferences"
            onPress={() => showComingSoon('Privacy Settings')}
          />
        </SettingSection>

        {/* Device Settings */}
        <SettingSection title="Device">
          <SettingItem
            title="Reconfigure Device"
            subtitle={isWeb ? "Available only on mobile app" : "Update your device ID"}
            onPress={handleReconfigureDevice}
            isLoading={reconfigureLoading}
          />
          <SettingItem
            title="Device Information"
            subtitle="View device details"
            onPress={() => showComingSoon('Device Information')}
          />
        </SettingSection>

        {/* Notifications */}
        <SettingSection title="Notifications">
          <SettingItem
            title="Push Notifications"
            subtitle="Manage notification preferences"
            onPress={() => showComingSoon('Push Notifications')}
          />
          <SettingItem
            title="Email Notifications"
            subtitle="Configure email alerts"
            onPress={() => showComingSoon('Email Notifications')}
          />
        </SettingSection>

        {/* App Settings */}
        <SettingSection title="App">
          <SettingItem
            title="Language"
            subtitle="English (US)"
            onPress={() => showComingSoon('Language')}
          />
          <SettingItem
            title="Theme"
            subtitle="Light mode"
            onPress={() => showComingSoon('Theme')}
          />
          <SettingItem
            title="Data & Storage"
            subtitle="Manage app data"
            onPress={() => showComingSoon('Data & Storage')}
          />
        </SettingSection>

        {/* Support */}
        <SettingSection title="Support">
          <SettingItem
            title="Help Center"
            subtitle="Get help and support"
            onPress={() => showComingSoon('Help Center')}
          />
          <SettingItem
            title="Report a Problem"
            subtitle="Let us know about issues"
            onPress={() => showComingSoon('Report a Problem')}
          />
          <SettingItem
            title="Terms of Service"
            onPress={() => showComingSoon('Terms of Service')}
          />
          <SettingItem
            title="Privacy Policy"
            onPress={() => showComingSoon('Privacy Policy')}
          />
        </SettingSection>

        {/* About */}
        <SettingSection title="About">
          <SettingItem
            title="App Version"
            subtitle="1.0.0"
            onPress={() => showComingSoon('App Version')}
            showChevron={false}
          />
          <SettingItem
            title="Check for Updates"
            onPress={() => showComingSoon('Check for Updates')}
          />
        </SettingSection>

        {/* Danger Zone */}
        <SettingSection title="Danger Zone">
          <SettingItem
            title="Clear Cache"
            subtitle="Free up storage space"
            onPress={() => showComingSoon('Clear Cache')}
          />
          <SettingItem
            title="Delete Account"
            subtitle="Permanently delete your account"
            onPress={() => showComingSoon('Delete Account')}
            isDestructive={true}
          />
        </SettingSection>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginRight: 40,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  sectionContent: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingItemContent: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  destructiveText: {
    color: colors.error,
  },
  bottomPadding: {
    height: 32,
  },
});

export default Settings;