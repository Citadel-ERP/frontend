import React, { useState, useEffect } from 'react';
import { View, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { styles } from './styles';
import { TOKEN_KEY } from './types';
import { BACKEND_URL } from '../../config/config';
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

  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        setToken(storedToken);
      } catch (error) {
        console.error('Error getting token:', error);
      }
    };
    getToken();
  }, []);

  if (!selectedCity) {
    return <CitySelection onCitySelect={setSelectedCity} onBack={onBack} />;
  }
  console.log("correct path")
  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      
      {activeTab === 'vehicles' ? (
        <Vehicles
          token={token}
          city={selectedCity}
          onBack={() => setSelectedCity(null)}
          setActiveTab={setActiveTab}
          activeTab={activeTab}
          setLoading={setLoading}
          loading={loading}
        />
      ) : (
        <Bookings
          token={token}
          city={selectedCity}
          onBack={() => setSelectedCity(null)}
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