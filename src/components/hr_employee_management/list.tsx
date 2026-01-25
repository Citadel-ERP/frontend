// hr_employee_management/list.tsx
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Employee } from './types';
import { WHATSAPP_COLORS, getAvatarColor, getInitials, calculateExperience } from './constants';
import { styles } from './styles';

interface EmployeeListProps {
  employees: Employee[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  searchQuery: string;
  onRefresh: () => void;
  onEmployeePress: (employee: Employee) => void;
  onClearSearch: () => void;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({
  employees,
  loading,
  refreshing,
  error,
  searchQuery,
  onRefresh,
  onEmployeePress,
  onClearSearch,
}) => {
  if (loading && employees.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading employees...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={64} color={WHATSAPP_COLORS.error} />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRefresh}
          activeOpacity={0.8}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (employees.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyStateIcon}>
          <Ionicons name="people-outline" size={80} color={WHATSAPP_COLORS.border} />
        </View>
        <Text style={styles.emptyStateTitle}>
          {searchQuery ? 'No employees found' : 'No employees'}
        </Text>
        <Text style={styles.emptyStateMessage}>
          {searchQuery
            ? 'Try adjusting your search terms'
            : 'No employees are currently in the system'}
        </Text>
        {searchQuery && (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={onClearSearch}
            activeOpacity={0.8}
          >
            <Text style={styles.clearSearchButtonText}>Clear Search</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[WHATSAPP_COLORS.accent]}
          tintColor={WHATSAPP_COLORS.accent}
          progressBackgroundColor={WHATSAPP_COLORS.background}
        />
      }
    >
      <View style={styles.employeesList}>
        {/* <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Employees</Text>
          <Text style={styles.listSubtitle}>
            {searchQuery ? `Results for "${searchQuery}"` : 'All employees'}
          </Text>
        </View> */}
        
        {employees.map((employee) => (
          <TouchableOpacity
            key={employee.employee_id}
            style={styles.employeeCard}
            onPress={() => onEmployeePress(employee)}
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
                  <View style={[styles.avatarDefault, 
                    { backgroundColor: getAvatarColor(employee.employee_id) }
                  ]}>
                    <Text style={styles.avatarInitials}>
                      {getInitials(employee.full_name)}
                    </Text>
                  </View>
                )}
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: employee.is_active ? WHATSAPP_COLORS.statusOnline : WHATSAPP_COLORS.statusOffline }
                ]} />
              </View>

              <View style={styles.employeeInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.employeeName} numberOfLines={1}>
                    {employee.full_name}
                  </Text>
                  <Text style={styles.employeeTime}>
                    {calculateExperience(employee.joining_date)}
                  </Text>
                </View>
                
                <Text style={styles.employeeDesignation} numberOfLines={1}>
                  {employee.designation || employee.designation}
                </Text>
                
                <Text style={styles.employeeLastMessage} numberOfLines={1}>
                  ID: {employee.employee_id} • {employee.email}
                </Text>
                
                <View style={styles.leaveBadges}>
                  <View style={[styles.leaveBadge, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.leaveBadgeText, { color: '#2E7D32' }]}>
                      E: {employee.earned_leaves}
                    </Text>
                  </View>
                  <View style={[styles.leaveBadge, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={[styles.leaveBadgeText, { color: '#EF6C00' }]}>
                      S: {employee.sick_leaves}
                    </Text>
                  </View>
                  <View style={[styles.leaveBadge, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={[styles.leaveBadgeText, { color: '#1565C0' }]}>
                      C: {employee.casual_leaves}
                    </Text>
                  </View>
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
        ))}
        
        <View style={styles.listFooter}>
          <Text style={styles.listFooterText}>
            End of list • {employees.length} employee{employees.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};