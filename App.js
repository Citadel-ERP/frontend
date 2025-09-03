// Import background service at the very top to ensure TaskManager task is defined
import './src/services/backgroundAttendance';

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { View, Text, AppState } from 'react-native';
import { BackgroundAttendanceService } from './src/services/backgroundAttendance';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, marginBottom: 10 }}>Something went wrong!</Text>
          <Text style={{ textAlign: 'center', color: 'red' }}>
            {this.state.error?.toString()}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Background service initialization component
const BackgroundServiceInitializer = () => {
  useEffect(() => {
    const initializeBackgroundService = async () => {
      try {
        // Initialize background attendance service
        const isAuthenticated = await BackgroundAttendanceService.isUserAuthenticated();
        
        if (isAuthenticated) {
          const registered = await BackgroundAttendanceService.registerBackgroundTask();
          console.log('Background attendance service initialized:', registered ? 'success' : 'failed');
        } else {
          console.log('User not authenticated, background service not initialized');
        }
      } catch (error) {
        console.error('Failed to initialize background service:', error);
      }
    };

    initializeBackgroundService();

    // Handle app state changes
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'active') {
        // Re-initialize background service when app becomes active
        const isAuthenticated = await BackgroundAttendanceService.isUserAuthenticated();
        if (isAuthenticated) {
          await BackgroundAttendanceService.registerBackgroundTask();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  return null;
};

export default function App() {
  try {
    return (
      <ErrorBoundary>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <BackgroundServiceInitializer />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('App initialization error:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, color: 'red' }}>Failed to initialize app</Text>
        <Text style={{ textAlign: 'center', marginTop: 10 }}>{error.toString()}</Text>
      </View>
    );
  }
}