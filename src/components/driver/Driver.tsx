import React, { useState, useEffect } from 'react';
import { View, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { styles } from './styles';
import { DriverProps, TOKEN_KEY } from './types';
import { BACKEND_URL } from '../../config/config';
import Vehicles from './Vehicles';
import Bookings from './Bookings';

const Driver: React.FC<DriverProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
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

  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#075E54" />
      
      {activeTab === 'vehicles' ? (
        <Vehicles
          token={token}
          onBack={onBack}
          setActiveTab={setActiveTab}
          activeTab={activeTab}
          setLoading={setLoading}
          loading={loading}
        />
      ) : (
        <Bookings
          token={token}
          onBack={onBack}
          setActiveTab={setActiveTab}
          activeTab={activeTab}
          setLoading={setLoading}
          loading={loading}
        />
      )}
    </View>
  );
};

export default Driver;