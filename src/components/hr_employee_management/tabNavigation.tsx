// hr_employee_management/tabNavigation.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActiveTab } from './types';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';

interface TabNavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs = [
    { key: 'overview' as ActiveTab, label: 'Overview', icon: 'person-outline' },
    { key: 'attendance' as ActiveTab, label: 'Attendance', icon: 'calendar-outline' },
    { key: 'leaves' as ActiveTab, label: 'Leaves', icon: 'leaf-outline' }
  ];

  return (
    <View style={styles.tabNavigation}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => onTabChange(tab.key)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={tab.icon as any}
            size={20}
            color={activeTab === tab.key ? WHATSAPP_COLORS.accent : WHATSAPP_COLORS.textTertiary}
          />
          <Text style={[
            styles.tabLabel,
            activeTab === tab.key && styles.activeTabLabel
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};