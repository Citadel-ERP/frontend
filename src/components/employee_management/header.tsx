import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
  StyleSheet,
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

// Custom BackIcon Component
const BackIcon = () => (
  <View style={backIconStyles.backIcon}>
    <View style={backIconStyles.backArrow} />
    <Text style={backIconStyles.backText}>Back</Text>
  </View>
);

const backIconStyles = StyleSheet.create({
  backIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 2,
  },
});

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
            <View style={[styles.leftSection, { zIndex: 10 }]}>
              {showBack && (
                <TouchableOpacity 
                  style={[
                    styles.backButton,
                    {
                      paddingVertical: 16,
                      paddingHorizontal: 12,
                      marginLeft: -12,
                      marginTop: -16,
                      minWidth: 100,
                      minHeight: 50,
                      justifyContent: 'center',
                      alignItems: 'flex-start',
                    },
                    Platform.OS === 'web' && {
                      cursor: 'pointer',
                    }
                  ]} 
                  onPress={onBack}
                  hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityLabel="Go back"
                  accessibilityRole="button"
                >
                  <BackIcon />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Center - Logo */}
            <View style={[styles.centerSectionFull, { pointerEvents: 'none' }]}>
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