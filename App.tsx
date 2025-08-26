import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import AuthNavigator from './src/components/AuthNavigator';
import SplashScreen from './src/components/SplashScreen';
import authService from './src/services/authServices';
import { colors, commonStyles } from './src/styles/theme';

interface User {
  id: string;
  email: string;
  name: string;
}

function App(): React.JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSplashVisible, setIsSplashVisible] = useState(true); 

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };


  if (isSplashVisible) {
    return <SplashScreen onSplashComplete={() => setIsSplashVisible(false)} />;
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <AuthNavigator onAuthSuccess={handleAuthSuccess} />
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>CITADEL</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>Welcome to Citadel</Text>
            <Text style={styles.welcomeSubtitle}>
              Hello, {user?.name || user?.email}
            </Text>
            <Text style={styles.welcomeDescription}>
              You have successfully authenticated and can now access the application.
            </Text>
          </View>

          <View style={styles.featuresCard}>
            <Text style={styles.cardTitle}>Features</Text>
            <View style={styles.featureItem}>
              <Text style={styles.featureText}>✓ Secure Authentication</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureText}>✓ MPIN Support</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureText}>✓ Password Management</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureText}>✓ Token-based Security</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Change Password</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Reset MPIN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.error,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: 24,
    gap: 20,
  },
  welcomeCard: {
    ...commonStyles.card,
    alignItems: 'center',
    textAlign: 'center',
  },
  welcomeTitle: {
    ...commonStyles.h1,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    ...commonStyles.h3,
    color: colors.primary,
    marginBottom: 12,
  },
  welcomeDescription: {
    ...commonStyles.body,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  featuresCard: {
    ...commonStyles.card,
  },
  cardTitle: {
    ...commonStyles.h2,
    marginBottom: 16,
  },
  featureItem: {
    marginBottom: 8,
  },
  featureText: {
    ...commonStyles.body,
    color: colors.textSecondary,
  },
  infoCard: {
    ...commonStyles.card,
  },
  actionButton: {
    ...commonStyles.secondaryButton,
    marginBottom: 12,
  },
  actionButtonText: {
    ...commonStyles.secondaryButtonText,
  },
});

export default App;
