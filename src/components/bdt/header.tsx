import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image, 
  Platform ,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from './types';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  onThemeToggle?: () => void;
  isDarkMode: boolean;
  theme: ThemeColors;
  showBackButton?: boolean;
  showEditButton?: boolean;
  showSaveButton?: boolean;
  showAddButton?: boolean;
  showThemeToggle?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onAddPress?: () => void;
  addButtonText?: string;
  loading?: boolean;
}

const BackIcon = () => (
  <View style={styles.backIcon}>
    <View style={styles.backArrow} />
    <Text style={styles.backText}>Back</Text>
  </View>
);

const Header: React.FC<HeaderProps> = ({
  title,
  onBack,
  onThemeToggle,
  isDarkMode,
  theme,
  showBackButton = false,
  showEditButton = false,
  showSaveButton = false,
  showAddButton = false,
  showThemeToggle = false,
  onEdit,
  onSave,
  onAddPress,
  addButtonText = 'Add',
  loading = false,
}) => {
  
  return (
    <View style={styles.headerBanner}>
      <StatusBar
                barStyle="light-content"
                backgroundColor="#075E54"
                translucent={false}
            />
      <LinearGradient
        colors={['#4A5568', '#2D3748']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBanner}
      >
        {/* Background Image */}
        <Image
          source={require('../../assets/bdt.jpg')}
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
              {showBackButton && onBack && (
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
            <View style={styles.centerSection}>
              <Text style={styles.logoText}>CITADEL</Text>
            </View>
            
            {/* Right side - Action buttons */}
            <View style={styles.rightSection}>
              {showEditButton && onEdit && (
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={onEdit}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
              
              {showSaveButton && onSave && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.saveButton, loading && styles.buttonDisabled]} 
                  onPress={onSave}
                  disabled={loading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={[styles.actionButtonText, styles.saveButtonText]}>Save</Text>
                  )}
                </TouchableOpacity>
              )}
              
              {showAddButton && onAddPress && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.addButton]} 
                  onPress={onAddPress}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" style={styles.addIcon} />
                  <Text style={[styles.actionButtonText, styles.addButtonText]}>{addButtonText}</Text>
                </TouchableOpacity>
              )}
              
              {/* {showThemeToggle && onThemeToggle && (
                <TouchableOpacity 
                  onPress={onThemeToggle} 
                  style={[styles.actionButton, styles.themeToggleButton]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.themeIcon}>
                    {isDarkMode ? '☀️' : '🌙'}
                  </Text>
                </TouchableOpacity>
              )} */}
            </View>
          </View>
        </View>
        
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  headerBanner: {
    height: 250,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  headerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    position: 'relative',
    zIndex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 44, // Fixed height for consistent spacing
  },
  leftSection: {
    width: 80,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  logoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  addButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',  
  paddingHorizontal: 16,
  paddingVertical: 8,
  gap: 6,
  borderRadius: 8,
  whiteSpace: 'nowrap',
},
  addIcon: {
    marginRight: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#1DA1F2', // Blue color for Save button
  },
  saveButtonText: {
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  themeToggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  themeIcon: {
    fontSize: 20,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'center',
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

export default Header;