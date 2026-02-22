/**
 * Employee Card Component
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Employee } from '../types';
import { WHATSAPP_COLORS } from '../constants';
import { getInitials, getAvatarColor } from '../utils';
import { styles } from '../styles';

interface EmployeeCardProps {
  employee: Employee;
  onPress: (employee: Employee) => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.employeeCard}
      onPress={() => onPress(employee)}
      activeOpacity={0.7}
    >
      <View style={styles.employeeCardContent}>
        <View style={styles.avatarContainer}>
          {employee.profile_picture ? (
            <Image
              source={{ uri: employee.profile_picture }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatarDefault, { backgroundColor: getAvatarColor(employee.employee_id) }]}>
              <Text style={styles.avatarInitials}>
                {getInitials(employee.full_name)}
              </Text>
            </View>
          )}
          <View style={[styles.statusIndicator, { backgroundColor: WHATSAPP_COLORS.statusOnline }]} />
        </View>

        <View style={styles.employeeInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.employeeName} numberOfLines={1}>
              {employee.full_name}
            </Text>
          </View>
          
          <Text style={styles.employeeDesignation} numberOfLines={1}>
            {employee.designation || 'Employee'}
          </Text>
          
          <View style={styles.employeeMetaRow}>
            <Text style={styles.employeeId} numberOfLines={1}>
              ID: {employee.employee_id}
            </Text>
          </View>
        </View>

        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={WHATSAPP_COLORS.textTertiary} 
          style={styles.chevronIcon}
        />
      </View>
    </TouchableOpacity>
  );
};