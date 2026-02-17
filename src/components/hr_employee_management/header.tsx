// hr_employee_management/header.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';
import alert from '../../utils/Alert';

interface HeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  showBack?: boolean;
  showAddEmployee?: () => void;
  variant?: 'main' | 'details';
}

const BackIcon = () => (
  <View style={styles.backIcon}>
    <View style={styles.backArrow} />
    <Text style={styles.backText}>Back</Text>
  </View>
);

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  showBack = true,
  showAddEmployee,
  variant = 'main',
}) => {
  const headerStyle = variant === 'details' ? styles.detailsHeaderBanner : styles.headerBanner;

  return (
    <View style={headerStyle}>
      <LinearGradient
        colors={['#4A5568', '#2D3748']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={headerStyle}
      >
        <Image
          source={require('../../assets/bg.jpeg')}
          style={styles.headerImage}
          resizeMode="cover"
        />
        
        <View style={styles.headerOverlay} />
        
        <View style={[styles.headerContent, { 
          paddingTop: Platform.OS === 'ios' ? 50 : 40 
        }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.leftSection}>
              {showBack && (
                <TouchableOpacity 
                  style={styles.backButton} 
                  onPress={onBack}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <BackIcon />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.centerSection}>
              <Text style={styles.logoText}>CITADEL</Text>
            </View>
            
            <View style={styles.rightSection}>
              {variant === 'main' && showAddEmployee && (
                <TouchableOpacity 
                  style={styles.addButton} 
                  onPress={showAddEmployee}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        
        <View style={variant === 'details' ? styles.detailsTitleSection : styles.titleSection}>
          <Text style={variant === 'details' ? styles.detailsSectionTitle : styles.sectionTitle}>
            {title}
          </Text>
          <Text style={variant === 'details' ? styles.detailsSectionSubtitle : styles.sectionSubtitle}>
            {subtitle}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};