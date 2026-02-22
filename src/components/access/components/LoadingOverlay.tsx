/**
 * Loading Overlay Component
 */

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WHATSAPP_COLORS } from '../constants';
import { styles } from '../styles';

interface LoadingOverlayProps {
  visible: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
    </View>
  );
};