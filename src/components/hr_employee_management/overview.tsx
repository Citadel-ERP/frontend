// hr_employee_management/overview.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Employee } from './types';
import { WHATSAPP_COLORS, getAvatarColor, formatDate, calculateExperience } from './constants';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';
import MediclaimModal from './mediclaimModal';
import AssetsModal from './assets';
import OffboardingModal from './offboardingModal';
import PayslipModal from './payslip';
import DocumentModal from './document';
import EditEmployeeModal from './editEmployee';

interface OverviewProps {
  employee: Employee;
  employeeDetails: any;
  token: string;
  onRefresh: () => void;
  onEditLeaves: () => void;
}

export const Overview: React.FC<OverviewProps> = ({
  employee,
  employeeDetails,
  token,
  onRefresh,
  onEditLeaves
}) => {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showMediclaimModal, setShowMediclaimModal] = useState(false);
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [showOffboardingModal, setShowOffboardingModal] = useState(false);
  const [showSpecialAttendanceModal, setShowSpecialAttendanceModal] = useState(false);
  const [showUnlockDeviceModal, setShowUnlockDeviceModal] = useState(false);
  const [showExemptAttendanceModal, setShowExemptAttendanceModal] = useState(false);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);
  const [specialAttendanceDate, setSpecialAttendanceDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  };

  const markGiftBasketSent = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/manager/markGiftBasketSent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Gift basket marked as sent');
        onRefresh();
      } else {
        Alert.alert('Error', 'Failed to mark gift basket');
      }
    } catch (error) {
      console.error('Error marking gift basket:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const handleSpecialAttendance = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/manager/allowSpecialAttendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id,
          date: specialAttendanceDate.toISOString().split('T')[0],
          reason: 'HR Approved'
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Special attendance allowed');
        setShowSpecialAttendanceModal(false);
      } else {
        Alert.alert('Error', 'Failed to allow special attendance');
      }
    } catch (error) {
      console.error('Error allowing special attendance:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const handleUnlockDevice = async () => {
    Alert.alert(
      'Unlock Device',
      'If you unlock this device, the user will be able to log in from a new device. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/manager/unlockDevice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  employee_id: employee.employee_id
                }),
              });

              if (response.ok) {
                Alert.alert('Success', 'Device unlocked successfully');
                setShowUnlockDeviceModal(false);
              } else {
                Alert.alert('Error', 'Failed to unlock device');
              }
            } catch (error) {
              console.error('Error unlocking device:', error);
              Alert.alert('Error', 'Network error occurred');
            }
          }
        }
      ]
    );
  };

  const uploadPayslip = async () => {
    setShowPayslipModal(true);
  };

  const uploadDocument = async () => {
    setShowDocumentModal(true);
  }

  const downloadAttendance = async () => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const response = await fetch(`${BACKEND_URL}/manager/downloadAttendanceReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id,
          month: currentMonth,
          year: currentYear
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', 'Attendance report downloaded');
      } else {
        Alert.alert('Error', 'Failed to download attendance');
      }
    } catch (error) {
      console.error('Error downloading attendance:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const handleEditEmployeeSuccess = () => {
    setShowEditEmployeeModal(false);
    // Trigger refresh to fetch updated employee details
    onRefresh();
  };

  const actionMenuItems: Array<{
    label: string;
    icon: string;
    action: () => void;
    color?: string;
    hidden?: boolean;
  }> = [
    {
      label: 'Payslip',
      icon: 'document-text-outline',
      action: () => {
        setShowActionMenu(false);
        uploadPayslip();
      }
    },
    {
      label: 'Documents',
      icon: 'folder-outline',
      action: () => {
        setShowActionMenu(false);
        uploadDocument();
      }
    },
    // {
    //   label: 'Mark Gift Basket Sent',
    //   icon: 'gift-outline',
    //   action: () => {
    //     setShowActionMenu(false);
    //     markGiftBasketSent();
    //   },
    //   hidden: employee.gift_basket_sent
    // },
    {
      label: 'Mediclaim',
      icon: 'medkit-outline',
      action: () => {
        setShowActionMenu(false);
        setShowMediclaimModal(true);
      }
    },
    {
      label: 'Assets',
      icon: 'cube-outline',
      action: () => {
        setShowActionMenu(false);
        setShowAssetsModal(true);
      }
    },
    {
      label: 'Special Attendance',
      icon: 'calendar-outline',
      action: () => {
        setShowActionMenu(false);
        setShowSpecialAttendanceModal(true);
      }
    },
    {
      label: 'Unlock Device',
      icon: 'lock-open-outline',
      action: () => {
        setShowActionMenu(false);
        handleUnlockDevice();
      }
    },
    {
      label: 'Edit Employee',
      icon: 'settings-outline',
      action: () => {
        setShowActionMenu(false);
        setShowEditEmployeeModal(true);
      }
    },
    {
      label: 'Offboard Employee',
      icon: 'person-remove-outline',
      action: () => {
        setShowActionMenu(false);
        setShowOffboardingModal(true);
      },
      color: '#D32F2F'
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.detailsContent}
        showsVerticalScrollIndicator={false}
      >
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
                {employee.designation || employee.designation}
              </Text>
              <Text style={styles.profileId}>ID: {employee.employee_id}</Text>
            </View>

            <TouchableOpacity
              style={styles.actionMenuButton}
              onPress={() => setShowActionMenu(!showActionMenu)}
            >
              <Ionicons name="ellipsis-vertical" size={24} color={WHATSAPP_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoCardsContainer}>
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

          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="medical-outline" size={24} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.infoCardTitle}>Mediclaim Information</Text>
              <TouchableOpacity
                style={styles.viewUpdateButton}
                onPress={() => setShowMediclaimModal(true)}
              >
                <Text style={styles.viewUpdateButtonText}>
                  {employeeDetails?.mediclaim?.update_allowed ? 'Update' : 'View'}
                </Text>
              </TouchableOpacity>
            </View>

            {employeeDetails?.mediclaim ? (
              <>
                <View style={styles.infoItem}>
                  <Ionicons name="document-text-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Policy Number</Text>
                    <Text style={styles.infoValue}>{employeeDetails.mediclaim.policy_number}</Text>
                  </View>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoItem}>
                  <Ionicons name="business-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Provider</Text>
                    <Text style={styles.infoValue}>{employeeDetails.mediclaim.insurance_provider_name}</Text>
                  </View>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoItem}>
                  <Ionicons name="shield-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Sum Insured</Text>
                    <Text style={styles.infoValue}>₹{employeeDetails.mediclaim.sum_insured_opted}</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No mediclaim information available</Text>
              </View>
            )}
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="briefcase-outline" size={24} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.infoCardTitle}>Assets</Text>
              <TouchableOpacity
                style={styles.viewUpdateButton}
                onPress={() => setShowAssetsModal(true)}
              >
                <Text style={styles.viewUpdateButtonText}>Manage</Text>
              </TouchableOpacity>
            </View>

            {employeeDetails?.assigned_assets?.length > 0 ? (
              employeeDetails.assigned_assets.map((asset: any, index: number) => (
                <View key={index}>
                  {index > 0 && <View style={styles.infoDivider} />}
                  <View style={styles.infoItem}>
                    <Ionicons name="cube-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>{asset.asset.name}</Text>
                      <Text style={styles.infoValue}>
                        {asset.asset.type} • Qty: {asset.asset_count}
                      </Text>
                      <Text style={styles.infoSubtext}>
                        Assigned on {formatDate(asset.assigned_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No assets assigned</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Menu Modal - This appears on top */}
     <Modal
  visible={showActionMenu}
  transparent
  animationType="fade"
  onRequestClose={() => setShowActionMenu(false)}
>
  <TouchableOpacity
    style={{
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
      alignItems: Platform.OS === 'web' ? 'center' : 'flex-end',
    }}
    activeOpacity={1}
    onPress={() => setShowActionMenu(false)}
  >
    <View
      style={{
        position: Platform.OS === 'web' ? 'relative' : 'absolute',
        top: Platform.OS === 'web' ? 0 : 295,
        right: Platform.OS === 'web' ? 0 : 16,
        backgroundColor: WHATSAPP_COLORS.surface,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        minWidth: 220,
        maxWidth: 280,
      }}
    >
            {actionMenuItems.filter(item => !item.hidden).map((item, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  gap: 12,
                  borderBottomWidth: index < actionMenuItems.filter(i => !i.hidden).length - 1 ? 1 : 0,
                  borderBottomColor: WHATSAPP_COLORS.border,
                }}
                onPress={item.action}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={item.color || WHATSAPP_COLORS.textPrimary}
                />
                <Text style={{
                  fontSize: 14,
                  color: item.color || WHATSAPP_COLORS.textPrimary,
                  fontWeight: '500',
                }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <MediclaimModal
        visible={showMediclaimModal}
        onClose={() => setShowMediclaimModal(false)}
        employee={employee}
        token={token}
      />

      <AssetsModal
        visible={showAssetsModal}
        onClose={() => setShowAssetsModal(false)}
        employee={employee}
        token={token}
        assignedAssets={employeeDetails?.assigned_assets || []}
        onRefresh={onRefresh}
      />

      <OffboardingModal
        visible={showOffboardingModal}
        onClose={() => setShowOffboardingModal(false)}
        employee={employee}
        token={token}
        onSuccess={onRefresh}
      />

      <Modal
        visible={showSpecialAttendanceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSpecialAttendanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Allow Special Attendance</Text>
            </View>

            <Text style={styles.modalDescription}>
              Select date for special attendance:
            </Text>

            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datePickerText}>
                {specialAttendanceDate.toDateString()}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={specialAttendanceDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setSpecialAttendanceDate(date);
                }}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSpecialAttendanceModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSpecialAttendance}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>Allow</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PayslipModal
        visible={showPayslipModal}
        onClose={() => setShowPayslipModal(false)}
        employee={employee}
        token={token}
      />
      <DocumentModal
        visible={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        employee={employee}
        token={token}
      />

      <EditEmployeeModal
        visible={showEditEmployeeModal}
        onClose={() => setShowEditEmployeeModal(false)}
        employee={employee}
        employeeDetails={employeeDetails}
        token={token}
        onSuccess={handleEditEmployeeSuccess}
      />
    </View>
  );
};