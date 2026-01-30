import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './styles';
import { WHATSAPP_COLORS } from './constants';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  showBack?: boolean;
  rightButton?: {
    icon: string;
    onPress: () => void;
    disabled?: boolean;
  };
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
  showBack = true,
  rightButton
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        {showBack && <BackIcon onPress={onBack} />}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{title}</Text>
          {/* {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>} */}
        </View>
        <View style={styles.headerRight}>
          {rightButton && (
            <TouchableOpacity
              onPress={rightButton.onPress}
              disabled={rightButton.disabled}
              style={[
                styles.headerAddButton,
                rightButton.disabled && styles.headerAddButtonDisabled
              ]}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name="plus"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.headerAddButtonText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};