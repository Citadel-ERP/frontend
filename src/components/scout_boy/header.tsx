import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  StatusBar, 
  TouchableOpacity, 
  Image, 
  Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeColors } from './types';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  title: string;
  onBack: () => void;
  onCreateSite: () => void;
  theme: ThemeColors;
  loading?: boolean;
  showCreateButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title,
  onBack,
  onCreateSite,
  theme,
  loading = false,
  showCreateButton = false,
}) => {
  return (
    <>
      <StatusBar 
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
          <Image
            source={require('../../assets/bdt.jpg')}
            style={styles.headerImage}
            resizeMode="cover"
          />
          
          <View style={styles.headerOverlay} />
          
          <View style={[styles.headerContent, { 
            paddingTop: Platform.OS === 'ios' ? 50 : 40 
          }]}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={onBack}
                disabled={loading}
              >
                <View style={styles.backIcon}>
                  <View style={styles.backArrow} />
                  <Text style={styles.backText}>Back</Text>
                </View>
              </TouchableOpacity>
              
              <Text style={styles.logoText}>CITADEL</Text>
              
              {showCreateButton && (
                <View style={styles.headerActions}>
                  <TouchableOpacity 
                    onPress={onCreateSite} 
                    style={styles.createButton}
                    disabled={loading}
                  >
                    <Ionicons 
                      name="add" 
                      size={24} 
                      color="#FFF" 
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          
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
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
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
    position: 'absolute',
    left: 0,
    zIndex: 2,
  },
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    position: 'absolute',
    right: 0,
    zIndex: 2,
  },
  createButton: {
    padding: 8,
  },
});

export default Header;