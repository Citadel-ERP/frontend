// VehicleImage.tsx
import React from 'react';
import { Image, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Vehicle } from './types';
import { getVehicleImageSource } from './utils';
import { styles } from './styles';

interface VehicleImageProps {
  vehicle: Vehicle;
  size?: 'small' | 'large';
}

export const VehicleImage: React.FC<VehicleImageProps> = ({ vehicle, size = 'small' }) => {
  const imageSource = getVehicleImageSource(vehicle);
  console.log('Vehicle image source:', vehicle);
  if (imageSource) {
    return (
      <Image
        source={imageSource}
        style={size === 'small' ? styles.vehicleImage : styles.vehicleImageLarge}
        resizeMode="contain"
      />
    );
  }
  
  return (
    <View style={size === 'small' ? styles.vehicleIconContainer : styles.vehicleIconContainerLarge}>
      <MaterialCommunityIcons 
        name="car" 
        size={size === 'small' ? 28 : 40} 
        color="#075E54" 
      />
    </View>
  );
};