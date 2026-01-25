import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';

interface HeaderProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  onRefresh?: () => void;
  showBack?: boolean;
  showRefresh?: boolean;
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
  onRefresh,
  showBack = true,
  showRefresh = true,
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
        {/* Background Image */}
        <Image
          source={require('../../assets/bg.jpeg')}
          style={styles.headerImage}
          resizeMode="cover"
        />
        
        {/* Dark overlay for better text visibility */}
        <View style={styles.headerOverlay} />
        
        {/* Header Content */}
        <View style={[styles.headerContent, { 
          paddingTop: Platform.OS === 'ios' ? 50 : 40 
        }]}>
          {/* Top row with back button, logo, and actions */}
          <View style={styles.headerTopRow}>
            {/* Left side - Back button */}
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
            
            {/* Center - Logo */}
            <View style={styles.centerSectionFull}>
              <Text style={styles.logoText}>CITADEL</Text>
            </View>
            
            {/* Right side - Action buttons */}
            {/* <View style={styles.rightSection}>
              {showRefresh && onRefresh && (
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={onRefresh}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="refresh" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View> */}
          </View>
        </View>
        
        {/* Title Section */}
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

export default Header;