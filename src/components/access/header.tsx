// access/header.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  loading?: boolean;
  rightAction?: {
    label?: string;
    icon?: string;
    onPress: () => void;
    color?: string;
  };
}

const BackIcon = () => (
  <View style={styles.backIcon}>
    <View style={styles.backArrow} />
    <Text style={styles.backText}>Back</Text>
  </View>
);

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  loading = false,
  rightAction,
}) => {
  const statusBarHeight = Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ?? 24;

  return (
    <View style={[styles.wrapper, { height: 250 + statusBarHeight, paddingTop: statusBarHeight,marginTop:-40 }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <LinearGradient
        colors={['#4A5568', '#2D3748']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.wrapper, { height: 250 + statusBarHeight, paddingTop: statusBarHeight }]}
      >
      {/* Background image */}
      <Image
        source={require('../../assets/cars.jpeg')}
        style={styles.bgImage}
        resizeMode="cover"
      />

      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* Top row: Back | CITADEL | Right action */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <BackIcon />
        </TouchableOpacity>

        <Text style={styles.logoText}>CITADEL</Text>

        {/* Right action button (e.g. "+ Add") */}
        {rightAction ? (
          <TouchableOpacity
            style={styles.rightBtn}
            onPress={rightAction.onPress}
            activeOpacity={0.85}
          >
            <Text style={styles.rightBtnText}>
              {rightAction.icon === 'add' ? '+ ' : ''}{rightAction.label ?? ''}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      {/* Title section */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
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
  logoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  rightBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rightBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  spacer: {
    width: 60,
  },
  titleSection: {
    position: 'absolute',
    bottom: 62,
    left: 16,
    right: 16,
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
});

export default Header;