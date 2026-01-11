import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './styles';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  showBack?: boolean;
}

const BackIcon: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.backIconContainer}>
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
      <Text style={styles.backText}>Back</Text>
    </View>
  </TouchableOpacity>
);

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  subtitle, 
  onBack, 
  showBack = true 
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        {showBack && <BackIcon onPress={onBack} />}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>
    </View>
  );
};