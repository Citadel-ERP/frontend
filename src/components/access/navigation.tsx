// access/navigation.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActiveTab, COLORS } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  employeeCount: number;
  moduleCount: number;
}

const TABS: { key: ActiveTab; label: string; icon: string; activeIcon: string }[] = [
  { key: 'employees', label: 'Employees', icon: 'people-outline', activeIcon: 'people' },
  { key: 'modules', label: 'Modules', icon: 'bookmark-outline', activeIcon: 'bookmark' },
];

const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  employeeCount,
  moduleCount,
}) => {
  const counts: Record<ActiveTab, number> = {
    employees: employeeCount,
    modules: moduleCount,
  };

  const activeIndex = TABS.findIndex((t) => t.key === activeTab);
  const pillAnim = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(pillAnim, {
      toValue: activeIndex,
      useNativeDriver: true,
      tension: 68,
      friction: 11,
    }).start();
  }, [activeIndex]);

  // pill translates across the container width (minus padding)
  const containerInnerWidth = SCREEN_WIDTH - 32 - 8; // horizontal padding 16*2, inner padding 4*2
  const pillWidth = containerInnerWidth / TABS.length;

  const pillTranslateX = pillAnim.interpolate({
    inputRange: [0, TABS.length - 1],
    outputRange: [0, pillWidth * (TABS.length - 1)],
  });

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        {/* Animated sliding pill */}
        <Animated.View
          style={[
            styles.pill,
            {
              width: pillWidth,
              transform: [{ translateX: pillTranslateX }],
            },
          ]}
        />

        {TABS.map((tab, idx) => {
          const isActive = activeTab === tab.key;
          const count = counts[tab.key];

          // Interpolate icon/label color based on pill position
          const colorAnim = pillAnim.interpolate({
            inputRange: TABS.map((_, i) => i),
            outputRange: TABS.map((_, i) => (i === idx ? 1 : 0)),
            extrapolate: 'clamp',
          });

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => onTabChange(tab.key)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={(isActive ? tab.activeIcon : tab.icon) as any}
                size={18}
                color={isActive ? COLORS.white : COLORS.textSecondary}
              />
              <Animated.Text
                style={[
                  styles.tabLabel,
                  isActive && styles.activeTabLabel,
                ]}
              >
                {tab.label}
                {count > 0 ? ` (${count})` : ''}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 30,
    padding: 4,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    zIndex: 0,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 25,
    gap: 6,
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabLabel: {
    color: '#fff',
  },
});

export default Navigation;