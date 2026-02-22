// access/navigation.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActiveTab, COLORS } from './types';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  employeeCount: number;
  moduleCount: number;
}

const TABS: { key: ActiveTab; label: string; icon: string; activeIcon: string }[] = [
  { key: 'employees', label: 'Employees', icon: 'people-outline', activeIcon: 'people' },
  { key: 'modules', label: 'Modules', icon: 'grid-outline', activeIcon: 'grid' },
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

  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={(isActive ? tab.activeIcon : tab.icon) as any}
              size={18}
              color={isActive ? COLORS.white : COLORS.textSecondary}
              style={styles.tabIcon}
            />
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
              {tab.label}
            </Text>
            {counts[tab.key] > 0 && (
              <View style={[styles.badge, isActive ? styles.activeBadge : styles.inactiveBadge]}>
                <Text style={[styles.badgeText, isActive && styles.activeBadgeText]}>
                  {counts[tab.key]}
                </Text>
              </View>
            )}
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    position: 'relative',
    gap: 6,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabIcon: {
    marginRight: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabLabel: {
    color: COLORS.white,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  activeBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  inactiveBadge: {
    backgroundColor: COLORS.primary + '20',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  activeBadgeText: {
    color: COLORS.white,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.secondary,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
});

export default Navigation;