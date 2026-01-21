import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Employee } from './types';
import { WHATSAPP_COLORS, getAvatarColor, formatDate, calculateExperience } from './constants';
import { styles } from './styles';

interface OverviewProps {
  employee: Employee;
  employeeDetails: any;
}

export const Overview: React.FC<OverviewProps> = ({ employee, employeeDetails }) => {
  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  };

  return (
    <ScrollView 
      style={styles.detailsContent}
      showsVerticalScrollIndicator={false}
    >
      {/* WhatsApp-style Profile Info */}
      <View style={styles.profileHeader}>
        <View style={styles.profileHeaderContent}>
          <View style={styles.profileAvatarContainer}>
            {employee.profile_picture ? (
              <Image
                source={{ uri: employee.profile_picture }}
                style={styles.profileAvatarImage}
              />
            ) : (
              <View style={[styles.profileAvatarDefault, 
                { backgroundColor: getAvatarColor(employee.employee_id) }
              ]}>
                <Text style={styles.profileAvatarInitials}>
                  {getInitials(employee.first_name, employee.last_name)}
                </Text>
              </View>
            )}
            <View style={[
              styles.profileStatusIndicator,
              { backgroundColor: employee.is_active ? WHATSAPP_COLORS.statusOnline : WHATSAPP_COLORS.statusOffline }
            ]} />
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{employee.full_name}</Text>
            <Text style={styles.profileDesignation}>
              {employee.designation || employee.role}
            </Text>
            <Text style={styles.profileId}>ID: {employee.employee_id}</Text>
          </View>
        </View>
      </View>

      {/* WhatsApp-style Info Cards */}
      <View style={styles.infoCardsContainer}>
        {/* Contact Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="information-circle" size={24} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.infoCardTitle}>Contact Information</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{employee.email}</Text>
            </View>
          </View>
          
          <View style={styles.infoDivider} />
          
          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{employee.phone_number}</Text>
            </View>
          </View>
          
          <View style={styles.infoDivider} />
          
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Joining Date</Text>
              <Text style={styles.infoValue}>{formatDate(employee.joining_date)}</Text>
            </View>
          </View>
          
          <View style={styles.infoDivider} />
          
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Experience</Text>
              <Text style={styles.infoValue}>{calculateExperience(employee.joining_date)}</Text>
            </View>
          </View>
        </View>

        {/* Leave Balance Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="leaf-outline" size={24} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.infoCardTitle}>Leave Balance</Text>
          </View>
          
          <View style={styles.leaveBalanceContainer}>
            <View style={[styles.leaveBalanceItem, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.leaveBalanceValue, { color: '#2E7D32' }]}>
                {employee.earned_leaves}
              </Text>
              <Text style={[styles.leaveBalanceLabel, { color: '#2E7D32' }]}>
                Earned
              </Text>
            </View>
            
            <View style={[styles.leaveBalanceItem, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[styles.leaveBalanceValue, { color: '#EF6C00' }]}>
                {employee.sick_leaves}
              </Text>
              <Text style={[styles.leaveBalanceLabel, { color: '#EF6C00' }]}>
                Sick
              </Text>
            </View>
            
            <View style={[styles.leaveBalanceItem, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.leaveBalanceValue, { color: '#1565C0' }]}>
                {employee.casual_leaves}
              </Text>
              <Text style={[styles.leaveBalanceLabel, { color: '#1565C0' }]}>
                Casual
              </Text>
            </View>
          </View>
        </View>

        {/* Additional Info */}
        {employeeDetails && employeeDetails.assigned_assets && employeeDetails.assigned_assets.length > 0 && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="briefcase-outline" size={24} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.infoCardTitle}>
                Assigned Assets ({employeeDetails.total_assigned_assets})
              </Text>
            </View>
            
            {employeeDetails.assigned_assets.map((asset: any, index: number) => (
              <View key={index}>
                {index > 0 && <View style={styles.infoDivider} />}
                <View style={styles.infoItem}>
                  <Ionicons name="cube-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{asset.asset.name}</Text>
                    <Text style={styles.infoValue}>
                      {asset.asset.type} • Serial: {asset.asset.serial_number}
                    </Text>
                    <Text style={styles.infoSubtext}>
                      Assigned on {formatDate(asset.assigned_at)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};