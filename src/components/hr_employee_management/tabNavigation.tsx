// hr_employee_management/tabNavigation.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActiveTab, Employee } from './types';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';

interface TabNavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  employee?: Employee; // Add employee prop to check for pending actions
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  employee,
}) => {
  // Check if there are pending leave actions
  const hasPendingLeaves = employee?.leaves?.some(
    leave => leave.status === 'pending' || leave.status === 'approved_by_manager'
  ) || false;

  const tabs = [
    { key: 'overview' as ActiveTab, label: 'Overview', icon: 'person-outline' },
    { key: 'attendance' as ActiveTab, label: 'Attendance', icon: 'calendar-outline' },
    { key: 'leaves' as ActiveTab, label: 'Leaves', icon: 'leaf-outline', hasAction: hasPendingLeaves }
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[
              styles.tabLabel,
              activeTab === tab.key && styles.activeTabLabel
            ]}>
              {tab.label}
            </Text>
            {/* Action indicator dot */}
            {tab.hasAction && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#FF9800',
                  marginLeft: 6,
                }}
              />
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};