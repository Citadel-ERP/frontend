/**
 * City Section Component
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Employee } from '../types';
import { EmployeeCard } from './EmployeeCard';
import { styles } from '../styles';

interface CitySectionProps {
  city: string;
  employees: Employee[];
  onEmployeePress: (employee: Employee) => void;
}

export const CitySection: React.FC<CitySectionProps> = ({ 
  city, 
  employees, 
  onEmployeePress 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCollapsed(!isCollapsed);
  };

  return (
    <View style={styles.citySection}>
      <TouchableOpacity
        style={styles.cityHeader}
        onPress={toggleCollapse}
        activeOpacity={0.7}
      >
        <View style={styles.cityHeaderLeft}>
          <Ionicons name="business" size={20} color="#FFFFFF" style={styles.cityIcon} />
          <View>
            <Text style={styles.cityName}>{city}</Text>
            <Text style={styles.cityEmployeeCount}>
              {employees.length} employee{employees.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <Ionicons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={24}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      {!isCollapsed && (
        <View style={styles.cityEmployeesContainer}>
          {employees.map((employee) => (
            <EmployeeCard
              key={employee.employee_id}
              employee={employee}
              onPress={onEmployeePress}
            />
          ))}
        </View>
      )}
    </View>
  );
};