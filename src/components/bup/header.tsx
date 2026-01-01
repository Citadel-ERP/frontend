import React from 'react';
import { View, Text, StyleSheet, StatusBar,TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  onEdit,
  onSave,
  onAddPress,
  addButtonText = '+ Add',
  loading = false,
}) => {
  return (
    <><StatusBar 
        translucent 
        backgroundColor="transparent" 
        barStyle="light-content" 
      />
    <View style={styles.headerBanner}>
       
      <LinearGradient
        colors={['#4A5568', '#2D3748']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBanner}
      >
        {/* Background Image */}
        <Image
          source={require('../../assets/cars.jpeg')}
          style={styles.headerImage}
          resizeMode="cover"
        />
        
        {/* Dark overlay for better text visibility */}
        <View style={styles.headerOverlay} />
        
        {/* Header Content */}
        <View style={[styles.headerContent, { 
          paddingTop: Platform.OS === 'ios' ? 50 : 40 
        }]}>
          {/* Top row with back button and logo */}
          <View style={styles.headerTopRow}>
            {showBackButton && onBack && (
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <BackIcon />
              </TouchableOpacity>
            )}
            
            <Text style={styles.logoText}>CITADEL</Text>
            
            <View style={styles.headerActions}>
              {showEditButton && onEdit && (
                <TouchableOpacity 
                  style={styles.editButton} 
                  onPress={onEdit}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
              {showSaveButton && onSave && (
                <TouchableOpacity 
                  style={[styles.saveButton, loading && styles.buttonDisabled]} 
                  onPress={onSave}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              )}
              {showAddButton && onAddPress && (
                <TouchableOpacity 
                  style={styles.addButton} 
                  onPress={onAddPress}
                >
                  <Text style={styles.addButtonText}>{addButtonText}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      </LinearGradient>
    </View>
    </>
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
    opacity: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    position: 'relative',
    zIndex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'center', // Changed to center
    alignItems: 'center',
    position: 'relative', // Added
  },
  logoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
    position: 'absolute', // Added
    left: 0, // Added
    zIndex: 2, // Added
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
    fontSize: 14,
    marginLeft: 2,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'absolute', // Added
    right: 0, // Added
    zIndex: 2, // Added
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default Header;