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
  showAddEmployee?: () => void;
  showHolidayManagement?: () => void;
  showAssetsManagement?: () => void;
  variant?: 'main' | 'details';
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  onRefresh,
  showBack = true,
  showRefresh = true,
  showAddEmployee,
  showHolidayManagement,
  showAssetsManagement,
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
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.centerSection}>
              <Text style={styles.logoText}>HR MANAGER</Text>
            </View>
            
            <View style={styles.rightSection}>
              {variant === 'main' && showAddEmployee && (
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={showAddEmployee}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="person-add" size={20} color="#fff" />
                </TouchableOpacity>
              )}
              {showRefresh && onRefresh && (
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={onRefresh}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="refresh" size={20} color="#fff" />
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

        {variant === 'main' && (showHolidayManagement || showAssetsManagement) && (
          <View style={styles.headerActions}>
            {showHolidayManagement && (
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={showHolidayManagement}
              >
                <Ionicons name="calendar" size={16} color="#fff" />
                <Text style={styles.headerActionText}>Holidays</Text>
              </TouchableOpacity>
            )}
            {showAssetsManagement && (
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={showAssetsManagement}
              >
                <Ionicons name="briefcase" size={16} color="#fff" />
                <Text style={styles.headerActionText}>Assets</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </LinearGradient>
    </View>
  );
};