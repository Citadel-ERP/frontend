import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles';

export const BackIcon: React.FC = () => (
  <View style={styles.backIcon}>
    <View style={styles.backArrow} />
    <Text style={styles.backText}>Back</Text>
  </View>
);