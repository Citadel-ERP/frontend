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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './types';

interface HeaderProps {
  title: string;
  onBack: () => void;
  loading?: boolean;
  rightAction?: {
    label?: string;
    icon?: string;
    onPress: () => void;
    color?: string;
  };
}

const Header: React.FC<HeaderProps> = ({
  title,
  onBack,
  loading = false,
  rightAction,
}) => {
  const statusBarHeight = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight ?? 24;

  return (
    <View style={[styles.wrapper, { paddingTop: statusBarHeight }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} translucent={false} />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Subtle texture overlay */}
        <View style={styles.patternOverlay} />

        <View style={styles.row}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.logoText}>CITADEL</Text>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
          </View>

          {/* Right action */}
          {rightAction ? (
            <TouchableOpacity
              style={[styles.rightBtn, rightAction.color ? { backgroundColor: rightAction.color + '33' } : {}]}
              onPress={rightAction.onPress}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : rightAction.icon ? (
                <Ionicons name={rightAction.icon as any} size={20} color={COLORS.white} />
              ) : (
                <Text style={styles.rightBtnText}>{rightAction.label}</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.primary,
  },
  gradient: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  patternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  logoText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 1,
  },
  title: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rightBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  spacer: {
    width: 40,
  },
});

export default Header;