// driver_manager/DriverManager.tsx
import React, { useState, useEffect } from 'react';
import { View, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { styles } from './styles';
import { TOKEN_KEY } from './types';
import CitySelection from './city';
import Vehicles from './Vehicles';
import Bookings from './Bookings';

interface DriverManagerProps {
  onBack: () => void;
}

const DriverManager: React.FC<DriverManagerProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'vehicles' | 'bookings'>('vehicles');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false); // prevents flicker

  useEffect(() => {
    const initialize = async () => {
      try {
        const [storedToken, storedIsAdmin, storedUserCity] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem('is_admin'),
          AsyncStorage.getItem('user_city'),
        ]);

        setToken(storedToken);

        const adminFlag = storedIsAdmin ? JSON.parse(storedIsAdmin) : false;
        setIsAdmin(adminFlag);

        if (!adminFlag && storedUserCity) {
          // Non-admin: auto-select their office city, skip city.tsx entirely
          setSelectedCity(storedUserCity);
        }
        // Admin: selectedCity stays null → city.tsx will render
      } catch (error) {
        console.error('DriverManager: Error reading AsyncStorage:', error);
      } finally {
        setIsReady(true);
      }
    };

    initialize();
  }, []);

  // Avoid flickering while AsyncStorage is being read
  if (!isReady) {
    return null;
  }

  // Admin without a city selected → show city picker
  if (!selectedCity) {
    return (
      <CitySelection
        onCitySelect={setSelectedCity}
        onBack={onBack}
      />
    );
  }

  // City is known (either auto-selected for non-admin, or picked by admin)
  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />

      {activeTab === 'vehicles' ? (
        <Vehicles
          token={token}
          city={selectedCity}
          onBack={() => {
            if (isAdmin) {
              // Admin goes back to city selection
              setSelectedCity(null);
            } else {
              // Non-admin goes back to dashboard
              onBack();
            }
          }}
          setActiveTab={setActiveTab}
          activeTab={activeTab}
          setLoading={setLoading}
          loading={loading}
        />
      ) : (
        <Bookings
          token={token}
          city={selectedCity}
          onBack={() => {
            if (isAdmin) {
              setSelectedCity(null);
            } else {
              onBack();
            }
          }}
          setActiveTab={setActiveTab}
          activeTab={activeTab}
          setLoading={setLoading}
          loading={loading}
        />
      )}
    </View>
  );
};

export default DriverManager;