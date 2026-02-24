// hr_employee_management/editEmployee.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BACKEND_URL } from '../../config/config';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';
import alert from '../../utils/Alert';

// ==================== INTERFACES ====================

interface Employee {
  employee_id: string;
  full_name: string;
  earned_leaves: number;
  sick_leaves: number;
  casual_leaves: number;
  birth_date?: string;
  joining_date?: string;
  email?: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
}

interface Office {
  id: number;
  name: string;
  address?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface Tag {
  id?: number;
  tag_id: string;
  tag_name: string;
  tag_type: string;
}

interface ReportingTag {
  id: number;
  reporting_tag: Tag;
  created_at: string;
  updated_at: string;
}

interface EmployeeDetails {
  login_time?: string;
  logout_time?: string;
  office?: {
    id: number;
    name: string;
  };
  reporting_tags?: ReportingTag[];
  home_address?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zip_code?: string;
    latitude?: number;
    longitude?: number;
  };
  current_location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zip_code?: string;
    latitude?: number;
    longitude?: number;
  };
}

interface EditEmployeeProps {
  visible: boolean;
  onClose: () => void;
  employee: Employee;
  employeeDetails: EmployeeDetails | null;
  token: string;
  onSuccess: () => void;
}

// ==================== WEB DATE INPUT ====================

const WebDateInput: React.FC<{
  value: Date | null;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time';
  style?: any;
}> = ({ value, onChange, mode = 'date', style }) => {
  if (Platform.OS !== 'web') return null;

  const formatValueForInput = () => {
    if (!value) return '';
    if (mode === 'time') {
      const hours = value.getHours().toString().padStart(2, '0');
      const minutes = value.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return value.toISOString().split('T')[0];
  };

  const handleChange = (e: any) => {
    const inputValue = e.target.value;
    if (!inputValue) return;
    if (mode === 'time') {
      const [hours, minutes] = inputValue.split(':');
      const newDate = new Date(value || new Date());
      newDate.setHours(parseInt(hours), parseInt(minutes), 0);
      onChange(newDate);
    } else {
      onChange(new Date(inputValue));
    }
  };

  return (
    <input
      type={mode}
      value={formatValueForInput()}
      onChange={handleChange}
      style={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        padding: 12,
        borderRadius: 8,
        border: '1px solid #E0E0E0',
        fontSize: 16,
        backgroundColor: '#fff',
        outline: 'none',
        fontFamily: 'inherit',
        ...style,
      }}
    />
  );
};

// ==================== TAG BADGE ====================

const TagBadge: React.FC<{
  tag: Tag;
  isSelected: boolean;
  onPress: () => void;
}> = ({ tag, isSelected, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      marginRight: 8,
      marginBottom: 8,
      borderWidth: 1.5,
      borderColor: isSelected ? WHATSAPP_COLORS.primary : '#D0D0D0',
      backgroundColor: isSelected ? WHATSAPP_COLORS.primary : '#F8F8F8',
    }}
    activeOpacity={0.7}
  >
    {isSelected && (
      <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginRight: 5 }} />
    )}
    <Text
      style={{
        fontSize: 13,
        fontWeight: '500',
        color: isSelected ? '#fff' : WHATSAPP_COLORS.textPrimary,
      }}
    >
      {tag.tag_name}
    </Text>
    <Text
      style={{
        fontSize: 10,
        marginLeft: 5,
        color: isSelected ? 'rgba(255,255,255,0.75)' : WHATSAPP_COLORS.textTertiary,
      }}
    >
      {tag.tag_type}
    </Text>
  </TouchableOpacity>
);

// ==================== MAIN COMPONENT ====================

const EditEmployeeModal: React.FC<EditEmployeeProps> = ({
  visible,
  onClose,
  employee,
  employeeDetails,
  token,
  onSuccess,
}) => {
  // ----- Leave Balances -----
  const [earnedLeaves, setEarnedLeaves] = useState(employee.earned_leaves.toString());
  const [sickLeaves, setSickLeaves] = useState(employee.sick_leaves.toString());
  const [casualLeaves, setCasualLeaves] = useState(employee.casual_leaves.toString());

  // ----- Personal Info -----
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');

  // ----- Work Timings -----
  const [loginTime, setLoginTime] = useState<Date>(new Date());
  const [logoutTime, setLogoutTime] = useState<Date>(new Date());
  const [showLoginTimePicker, setShowLoginTimePicker] = useState(false);
  const [showLogoutTimePicker, setShowLogoutTimePicker] = useState(false);

  // ----- Office -----
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);
  const [showOfficePicker, setShowOfficePicker] = useState(false);
  const [loadingOffices, setLoadingOffices] = useState(false);

  // ----- Reporting Tags -----
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedReportingTagIds, setSelectedReportingTagIds] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);

  // ----- Dates -----
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [joiningDate, setJoiningDate] = useState<Date | null>(null);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [showJoiningDatePicker, setShowJoiningDatePicker] = useState(false);
  const [activePickerType, setActivePickerType] = useState<
    'birth' | 'joining' | 'loginTime' | 'logoutTime' | null
  >(null);

  // ----- Account Reset -----
  const [resetPassword, setResetPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showResetSection, setShowResetSection] = useState(false);

  const [loading, setLoading] = useState(false);

  // Picker timeout refs (iOS)
  const birthDatePickerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const joiningDatePickerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loginTimePickerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimePickerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== EFFECTS ====================

  useEffect(() => {
    if (visible) {
      initializeData();
      fetchOffices();
      fetchTags();
    }
  }, [visible, employee, employeeDetails]);

  useEffect(() => {
    return () => {
      [
        birthDatePickerTimeoutRef,
        joiningDatePickerTimeoutRef,
        loginTimePickerTimeoutRef,
        logoutTimePickerTimeoutRef,
      ].forEach(ref => {
        if (ref.current) clearTimeout(ref.current);
      });
    };
  }, []);

  // ==================== HELPERS ====================

  const parseTimeString = (timeString: string): Date => {
    const date = new Date();
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      date.setHours(parseInt(parts[0], 10));
      date.setMinutes(parseInt(parts[1], 10));
      date.setSeconds(parts.length === 3 ? parseInt(parts[2], 10) : 0);
    }
    return date;
  };

  const formatTimeToString = (date: Date): string => {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const formatDateToISO = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return 'Not set';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTimeForDisplay = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // ==================== INIT ====================

  const initializeData = () => {
    setEarnedLeaves(employee.earned_leaves.toString());
    setSickLeaves(employee.sick_leaves.toString());
    setCasualLeaves(employee.casual_leaves.toString());

    setEmail(employee.email || '');
    setPhoneNumber(employee.phone_number || '');
    setNewEmployeeId(employee.employee_id || '');
    setFirstName(employee.first_name || '');
    setLastName(employee.last_name || '');

    const defaultLogin = new Date();
    defaultLogin.setHours(9, 0, 0);
    setLoginTime(
      employeeDetails?.login_time
        ? parseTimeString(employeeDetails.login_time)
        : defaultLogin
    );

    const defaultLogout = new Date();
    defaultLogout.setHours(18, 0, 0);
    setLogoutTime(
      employeeDetails?.logout_time
        ? parseTimeString(employeeDetails.logout_time)
        : defaultLogout
    );

    setSelectedOfficeId(employeeDetails?.office?.id ?? null);

    // Pre-select current reporting tags
    if (employeeDetails?.reporting_tags && employeeDetails.reporting_tags.length > 0) {
      setSelectedReportingTagIds(
        employeeDetails.reporting_tags.map(rt => rt.reporting_tag.tag_id)
      );
    } else {
      setSelectedReportingTagIds([]);
    }

    if (employee.birth_date) setBirthDate(new Date(employee.birth_date));
    if (employee.joining_date) setJoiningDate(new Date(employee.joining_date));

    setResetPassword('');
    setConfirmPassword('');
    setShowResetSection(false);
    setActivePickerType(null);
    setShowOfficePicker(false);
    setShowTagPicker(false);
  };

  // ==================== FETCHERS ====================

  const fetchOffices = async () => {
    setLoadingOffices(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/HrgetOffices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (response.ok) {
        const data = await response.json();
        setOffices(data.offices || []);
      }
    } catch (error) {
      console.error('Error fetching offices:', error);
    } finally {
      setLoadingOffices(false);
    }
  };

  const fetchTags = async () => {
    setLoadingTags(true);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getTags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (response.ok) {
        const data = await response.json();
        setAllTags(data.tags || []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  // ==================== DATE/TIME PICKER ====================

  const handleDateChange = (
    event: any,
    selectedDate: Date | undefined,
    pickerType: 'birth' | 'joining' | 'loginTime' | 'logoutTime'
  ) => {
    if (Platform.OS === 'android') {
      setShowBirthDatePicker(false);
      setShowJoiningDatePicker(false);
      setShowLoginTimePicker(false);
      setShowLogoutTimePicker(false);
    }
    if (!selectedDate) return;
    if (pickerType === 'birth') setBirthDate(selectedDate);
    else if (pickerType === 'joining') setJoiningDate(selectedDate);
    else if (pickerType === 'loginTime') setLoginTime(selectedDate);
    else if (pickerType === 'logoutTime') setLogoutTime(selectedDate);
  };

  const makeDoneHandler = (
    ref: React.MutableRefObject<NodeJS.Timeout | null>,
    setter: (v: boolean) => void
  ) => () => {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(() => {
      setter(false);
      setActivePickerType(null);
      ref.current = null;
    }, 300);
  };

  const closeBirthDatePicker = makeDoneHandler(birthDatePickerTimeoutRef, setShowBirthDatePicker);
  const closeJoiningDatePicker = makeDoneHandler(joiningDatePickerTimeoutRef, setShowJoiningDatePicker);
  const closeLoginTimePicker = makeDoneHandler(loginTimePickerTimeoutRef, setShowLoginTimePicker);
  const closeLogoutTimePicker = makeDoneHandler(logoutTimePickerTimeoutRef, setShowLogoutTimePicker);

  // ==================== REPORTING TAG HELPERS ====================

  const toggleReportingTag = (tagId: string) => {
    setSelectedReportingTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const getSelectedTagNames = (): string => {
    if (selectedReportingTagIds.length === 0) return 'None selected';
    return selectedReportingTagIds
      .map(id => allTags.find(t => t.tag_id === id)?.tag_name || id)
      .join(', ');
  };

  // ==================== VALIDATION ====================

  const validateInputs = (): boolean => {
    const earned = parseInt(earnedLeaves);
    const sick = parseInt(sickLeaves);
    const casual = parseInt(casualLeaves);

    if (isNaN(earned) || earned < 0) {
      alert('Invalid Input', 'Earned leaves must be a non-negative number');
      return false;
    }
    if (isNaN(sick) || sick < 0) {
      alert('Invalid Input', 'Sick leaves must be a non-negative number');
      return false;
    }
    if (isNaN(casual) || casual < 0) {
      alert('Invalid Input', 'Casual leaves must be a non-negative number');
      return false;
    }
    if (!firstName || !firstName.trim()) {
      alert('Invalid Input', 'First name is required');
      return false;
    }
    if (firstName.trim().length < 2) {
      alert('Invalid Input', 'First name must be at least 2 characters');
      return false;
    }
    if (lastName && lastName.trim().length > 0 && lastName.trim().length < 2) {
      alert('Invalid Input', 'Last name must be at least 2 characters if provided');
      return false;
    }
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        alert('Invalid Input', 'Please enter a valid email address');
        return false;
      }
    }
    if (newEmployeeId && newEmployeeId.trim() !== employee.employee_id) {
      if (newEmployeeId.trim().length < 3) {
        alert('Invalid Input', 'Employee ID must be at least 3 characters');
        return false;
      }
    }
    if (phoneNumber && phoneNumber.trim()) {
      const phoneRegex = /^\+?[\d\s-]{10,}$/;
      if (!phoneRegex.test(phoneNumber.trim())) {
        alert('Invalid Input', 'Please enter a valid phone number (at least 10 digits)');
        return false;
      }
    }
    if (showResetSection) {
      if (!resetPassword || resetPassword.length < 6) {
        alert('Invalid Input', 'Reset password must be at least 6 characters');
        return false;
      }
      if (resetPassword !== confirmPassword) {
        alert('Invalid Input', 'Passwords do not match');
        return false;
      }
    }
    return true;
  };

  // ==================== SAVE ====================

  const handleSave = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    setShowBirthDatePicker(false);
    setShowJoiningDatePicker(false);
    setShowLoginTimePicker(false);
    setShowLogoutTimePicker(false);
    setShowOfficePicker(false);
    setShowTagPicker(false);
    setActivePickerType(null);

    try {
      const payload: any = {
        token,
        employee_id: employee.employee_id,
        earned_leaves: parseInt(earnedLeaves),
        sick_leaves: parseInt(sickLeaves),
        casual_leaves: parseInt(casualLeaves),
        login_time: formatTimeToString(loginTime),
        logout_time: formatTimeToString(logoutTime),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        // Always send reporting_tag_ids so HR can clear them too
        reporting_tag_ids: selectedReportingTagIds,
      };

      if (newEmployeeId && newEmployeeId.trim() !== employee.employee_id) {
        payload.new_employee_id = newEmployeeId.trim();
      }
      if (email && email.trim()) payload.email = email.trim();
      if (phoneNumber && phoneNumber.trim()) payload.phone_number = phoneNumber.trim();
      if (selectedOfficeId) payload.office_id = selectedOfficeId;
      if (birthDate) payload.birth_date = formatDateToISO(birthDate);
      if (joiningDate) payload.joining_date = formatDateToISO(joiningDate);

      if (showResetSection && resetPassword) {
        payload.reset_account = true;
        payload.reset_password = resetPassword;
      }

      const response = await fetch(`${BACKEND_URL}/manager/updateEmployee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.employee) {
          employee.email = result.employee.email || email;
          employee.phone_number = result.employee.phone_number || phoneNumber;
          employee.earned_leaves = result.employee.earned_leaves;
          employee.sick_leaves = result.employee.sick_leaves;
          employee.casual_leaves = result.employee.casual_leaves;
          if (result.new_employee_id) {
            employee.employee_id = result.new_employee_id;
          }
        }
        alert('Success', 'Employee details updated successfully');
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        alert('Error', errorData.message || 'Failed to update employee');
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // ==================== RENDER HELPERS ====================

  const renderSection = (title: string, icon: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={20} color={WHATSAPP_COLORS.primary} />
        <Text
          style={[
            styles.sectionTitleAlt,
            { fontSize: 16, marginLeft: 8, fontWeight: '600' },
          ]}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );

  const renderDoneButton = (onPress: () => void) =>
    Platform.OS === 'ios' ? (
      <TouchableOpacity
        style={[
          styles.datePickerButton,
          { marginTop: 8, backgroundColor: WHATSAPP_COLORS.primary },
        ]}
        onPress={onPress}
      >
        <Text style={[styles.datePickerText, { color: '#fff' }]}>Done</Text>
      </TouchableOpacity>
    ) : null;

  // ==================== RENDER ====================

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.assetsModalOverlay}>
          <View style={styles.assetsModalContainer}>
            {/* ─── HEADER ──────────────────────────────── */}
            <View style={styles.assetsModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="create-outline" size={24} color={WHATSAPP_COLORS.primary} />
                <Text style={[styles.assetsModalTitle, { marginLeft: 8 }]}>
                  Edit Employee
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ marginLeft: 12 }}>
                <Ionicons name="close" size={28} color={WHATSAPP_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* ─── CONTENT ─────────────────────────────── */}
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ padding: 16 }}>
                {/* Employee Banner */}
                <View
                  style={[
                    styles.detailCard,
                    { marginBottom: 20, backgroundColor: '#E8F5E9' },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalTitle,
                      { marginBottom: 4, color: WHATSAPP_COLORS.primary },
                    ]}
                  >
                    {employee.full_name}
                  </Text>
                  <Text style={[styles.infoLabel, { color: WHATSAPP_COLORS.textSecondary }]}>
                    ID: {employee.employee_id}
                  </Text>
                </View>

                {/* ── Personal Information ── */}
                {renderSection('Personal Information', 'person-outline', (
                  <View>
                    <Text style={styles.editLabel}>First Name *</Text>
                    <TextInput
                      style={styles.editInput}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Enter first name"
                      placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                      autoCapitalize="words"
                    />
                    <Text style={styles.editLabel}>Last Name</Text>
                    <TextInput
                      style={styles.editInput}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Enter last name (optional)"
                      placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                      autoCapitalize="words"
                    />
                  </View>
                ))}

                {/* ── Employee Information ── */}
                {renderSection('Employee Information', 'id-card-outline', (
                  <View>
                    <Text style={styles.editLabel}>Employee ID</Text>
                    <TextInput
                      style={styles.editInput}
                      value={newEmployeeId}
                      onChangeText={setNewEmployeeId}
                      placeholder="Enter employee ID"
                      placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                      autoCapitalize="characters"
                    />
                    <Text
                      style={[
                        styles.infoLabel,
                        {
                          color: WHATSAPP_COLORS.textTertiary,
                          fontSize: 12,
                          marginTop: 4,
                        },
                      ]}
                    >
                      Current ID: {employee.employee_id}
                    </Text>
                  </View>
                ))}

                {/* ── Contact Information ── */}
                {renderSection('Contact Information', 'mail-outline', (
                  <View>
                    <Text style={styles.editLabel}>Email Address</Text>
                    <TextInput
                      style={styles.editInput}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      placeholder="Enter email address"
                      placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                      autoCapitalize="none"
                    />
                    <Text style={styles.editLabel}>Phone Number</Text>
                    <TextInput
                      style={styles.editInput}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      placeholder="Enter phone number"
                      placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                    />
                  </View>
                ))}

                {/* ── Office Assignment ── */}
                {renderSection('Office Assignment', 'business-outline', (
                  <View>
                    <Text style={styles.editLabel}>Assigned Office</Text>
                    {loadingOffices ? (
                      <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.editInput,
                            {
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            },
                          ]}
                          onPress={() => setShowOfficePicker(!showOfficePicker)}
                        >
                          <Text
                            style={{
                              color: selectedOfficeId
                                ? WHATSAPP_COLORS.textPrimary
                                : WHATSAPP_COLORS.textTertiary,
                              fontSize: 16,
                            }}
                          >
                            {selectedOfficeId
                              ? offices.find(o => o.id === selectedOfficeId)?.name ||
                                'Select Office'
                              : 'Select Office'}
                          </Text>
                          <Ionicons
                            name={showOfficePicker ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={WHATSAPP_COLORS.textSecondary}
                          />
                        </TouchableOpacity>

                        {showOfficePicker && (
                          <View style={styles.pickerContainer}>
                            <ScrollView style={{ maxHeight: 200 }}>
                              {offices.map(office => (
                                <TouchableOpacity
                                  key={office.id}
                                  style={[
                                    styles.officeOption,
                                    selectedOfficeId === office.id &&
                                      styles.officeOptionSelected,
                                  ]}
                                  onPress={() => {
                                    setSelectedOfficeId(office.id);
                                    setShowOfficePicker(false);
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.officeName,
                                      selectedOfficeId === office.id &&
                                        styles.officeNameSelected,
                                    ]}
                                  >
                                    {office.name}
                                  </Text>
                                  {office.address?.city && (
                                    <Text style={styles.officeAddress}>
                                      {office.address.city}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                ))}

                {/* ── Reporting Tags ── */}
                {renderSection('Reporting Tags', 'git-network-outline', (
                  <View>
                    <Text
                      style={[
                        styles.infoLabel,
                        {
                          color: WHATSAPP_COLORS.textSecondary,
                          marginBottom: 10,
                          fontSize: 13,
                        },
                      ]}
                    >
                      Select which tags this employee reports to. Multiple tags can be
                      selected.
                    </Text>

                    {loadingTags ? (
                      <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
                    ) : (
                      <>
                        {/* Summary trigger */}
                        <TouchableOpacity
                          style={[
                            styles.editInput,
                            {
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              minHeight: 48,
                            },
                          ]}
                          onPress={() => setShowTagPicker(!showTagPicker)}
                        >
                          <Text
                            style={{
                              flex: 1,
                              color:
                                selectedReportingTagIds.length > 0
                                  ? WHATSAPP_COLORS.textPrimary
                                  : WHATSAPP_COLORS.textTertiary,
                              fontSize: 15,
                            }}
                            numberOfLines={1}
                          >
                            {getSelectedTagNames()}
                          </Text>
                          <Ionicons
                            name={showTagPicker ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={WHATSAPP_COLORS.textSecondary}
                            style={{ marginLeft: 8 }}
                          />
                        </TouchableOpacity>

                        {/* Expanded tag picker */}
                        {showTagPicker && (
                          <View
                            style={{
                              marginTop: 8,
                              padding: 12,
                              backgroundColor: '#F9F9F9',
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: '#E8E8E8',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                color: WHATSAPP_COLORS.textTertiary,
                                marginBottom: 10,
                              }}
                            >
                              Tap to select / deselect
                            </Text>

                            {allTags.length === 0 ? (
                              <Text
                                style={{
                                  color: WHATSAPP_COLORS.textTertiary,
                                  textAlign: 'center',
                                  paddingVertical: 12,
                                }}
                              >
                                No tags available
                              </Text>
                            ) : (
                              <View
                                style={{ flexDirection: 'row', flexWrap: 'wrap' }}
                              >
                                {allTags.map(tag => (
                                  <TagBadge
                                    key={tag.tag_id}
                                    tag={tag}
                                    isSelected={selectedReportingTagIds.includes(
                                      tag.tag_id
                                    )}
                                    onPress={() => toggleReportingTag(tag.tag_id)}
                                  />
                                ))}
                              </View>
                            )}

                            {/* Selected summary inside picker */}
                            {selectedReportingTagIds.length > 0 && (
                              <View
                                style={{
                                  marginTop: 12,
                                  paddingTop: 10,
                                  borderTopWidth: 1,
                                  borderTopColor: '#E0E0E0',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                }}
                              >
                                <Ionicons
                                  name="checkmark-done-circle"
                                  size={16}
                                  color={WHATSAPP_COLORS.primary}
                                />
                                <Text
                                  style={{
                                    marginLeft: 6,
                                    fontSize: 13,
                                    color: WHATSAPP_COLORS.primary,
                                    fontWeight: '500',
                                  }}
                                >
                                  {selectedReportingTagIds.length} tag
                                  {selectedReportingTagIds.length !== 1 ? 's' : ''} selected
                                </Text>
                                <TouchableOpacity
                                  style={{ marginLeft: 'auto' }}
                                  onPress={() => setSelectedReportingTagIds([])}
                                >
                                  <Text
                                    style={{
                                      fontSize: 12,
                                      color: '#D32F2F',
                                      fontWeight: '500',
                                    }}
                                  >
                                    Clear all
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}

                            <TouchableOpacity
                              style={{
                                marginTop: 12,
                                paddingVertical: 10,
                                alignItems: 'center',
                                borderRadius: 8,
                                backgroundColor: WHATSAPP_COLORS.primary,
                              }}
                              onPress={() => setShowTagPicker(false)}
                            >
                              <Text
                                style={{
                                  color: '#fff',
                                  fontWeight: '600',
                                  fontSize: 14,
                                }}
                              >
                                Done
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                ))}

                {/* ── Leave Balances ── */}
                {renderSection('Leave Balances', 'leaf-outline', (
                  <View>
                    <Text style={styles.editLabel}>Earned Leaves</Text>
                    <TextInput
                      style={styles.editInput}
                      value={earnedLeaves}
                      onChangeText={setEarnedLeaves}
                      keyboardType="numeric"
                      placeholder="Enter earned leaves"
                      placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                    />
                    <Text style={styles.editLabel}>Sick Leaves</Text>
                    <TextInput
                      style={styles.editInput}
                      value={sickLeaves}
                      onChangeText={setSickLeaves}
                      keyboardType="numeric"
                      placeholder="Enter sick leaves"
                      placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                    />
                    <Text style={styles.editLabel}>Casual Leaves</Text>
                    <TextInput
                      style={styles.editInput}
                      value={casualLeaves}
                      onChangeText={setCasualLeaves}
                      keyboardType="numeric"
                      placeholder="Enter casual leaves"
                      placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                    />
                  </View>
                ))}

                {/* ── Work Timings ── */}
                {renderSection('Work Timings', 'time-outline', (
                  <View>
                    <Text style={styles.editLabel}>Login Time</Text>
                    {Platform.OS === 'web' ? (
                      <WebDateInput
                        value={loginTime}
                        onChange={setLoginTime}
                        mode="time"
                      />
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.datePickerButton}
                          onPress={() => {
                            setShowLoginTimePicker(true);
                            setActivePickerType('loginTime');
                          }}
                        >
                          <Text style={styles.datePickerText}>
                            {formatTimeForDisplay(loginTime)}
                          </Text>
                        </TouchableOpacity>
                        {showLoginTimePicker && activePickerType === 'loginTime' && (
                          <View>
                            <DateTimePicker
                              value={loginTime}
                              mode="time"
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              onChange={(e, t) => handleDateChange(e, t, 'loginTime')}
                            />
                            {renderDoneButton(closeLoginTimePicker)}
                          </View>
                        )}
                      </>
                    )}

                    <Text style={styles.editLabel}>Logout Time</Text>
                    {Platform.OS === 'web' ? (
                      <WebDateInput
                        value={logoutTime}
                        onChange={setLogoutTime}
                        mode="time"
                      />
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.datePickerButton}
                          onPress={() => {
                            setShowLogoutTimePicker(true);
                            setActivePickerType('logoutTime');
                          }}
                        >
                          <Text style={styles.datePickerText}>
                            {formatTimeForDisplay(logoutTime)}
                          </Text>
                        </TouchableOpacity>
                        {showLogoutTimePicker && activePickerType === 'logoutTime' && (
                          <View>
                            <DateTimePicker
                              value={logoutTime}
                              mode="time"
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              onChange={(e, t) => handleDateChange(e, t, 'logoutTime')}
                            />
                            {renderDoneButton(closeLogoutTimePicker)}
                          </View>
                        )}
                      </>
                    )}
                  </View>
                ))}

                {/* ── Important Dates ── */}
                {renderSection('Important Dates', 'calendar-outline', (
                  <View>
                    <Text style={styles.editLabel}>Birth Date</Text>
                    {Platform.OS === 'web' ? (
                      <WebDateInput
                        value={birthDate}
                        onChange={setBirthDate}
                        mode="date"
                      />
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.datePickerButton}
                          onPress={() => {
                            setShowBirthDatePicker(true);
                            setActivePickerType('birth');
                          }}
                        >
                          <Text style={styles.datePickerText}>
                            {formatDateForDisplay(birthDate)}
                          </Text>
                        </TouchableOpacity>
                        {showBirthDatePicker && activePickerType === 'birth' && (
                          <View>
                            <DateTimePicker
                              value={birthDate || new Date()}
                              mode="date"
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              onChange={(e, d) => handleDateChange(e, d, 'birth')}
                              maximumDate={new Date()}
                            />
                            {renderDoneButton(closeBirthDatePicker)}
                          </View>
                        )}
                      </>
                    )}

                    <Text style={styles.editLabel}>Joining Date</Text>
                    {Platform.OS === 'web' ? (
                      <WebDateInput
                        value={joiningDate}
                        onChange={setJoiningDate}
                        mode="date"
                      />
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.datePickerButton}
                          onPress={() => {
                            setShowJoiningDatePicker(true);
                            setActivePickerType('joining');
                          }}
                        >
                          <Text style={styles.datePickerText}>
                            {formatDateForDisplay(joiningDate)}
                          </Text>
                        </TouchableOpacity>
                        {showJoiningDatePicker && activePickerType === 'joining' && (
                          <View>
                            <DateTimePicker
                              value={joiningDate || new Date()}
                              mode="date"
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              onChange={(e, d) => handleDateChange(e, d, 'joining')}
                              maximumDate={new Date()}
                            />
                            {renderDoneButton(closeJoiningDatePicker)}
                          </View>
                        )}
                      </>
                    )}
                  </View>
                ))}

                {/* ── Account Reset ── */}
                <View style={styles.section}>
                  <TouchableOpacity
                    style={[styles.sectionHeader, { paddingVertical: 12 }]}
                    onPress={() => setShowResetSection(!showResetSection)}
                  >
                    <Ionicons
                      name="key-outline"
                      size={20}
                      color="#D32F2F"
                      style={{ marginTop: 5 }}
                    />
                    <Text
                      style={[
                        styles.sectionTitleAlt,
                        {
                          color: '#D32F2F',
                          flex: 1,
                          fontSize: 16,
                          marginLeft: 8,
                          fontWeight: '600',
                        },
                      ]}
                    >
                      Account Reset
                    </Text>
                    <Ionicons
                      name={showResetSection ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={WHATSAPP_COLORS.textSecondary}
                    />
                  </TouchableOpacity>

                  {showResetSection && (
                    <View>
                      <View style={styles.warningCard}>
                        <Ionicons name="warning" size={20} color="#D32F2F" />
                        <Text style={[styles.warningText, { fontSize: 13 }]}>
                          This will reset the employee's account. They will need to use
                          this new password on next login.
                        </Text>
                      </View>
                      <Text style={styles.editLabel}>New Password</Text>
                      <TextInput
                        style={styles.editInput}
                        value={resetPassword}
                        onChangeText={setResetPassword}
                        placeholder="Enter new password (min 6 characters)"
                        placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                        secureTextEntry
                      />
                      <Text style={styles.editLabel}>Confirm Password</Text>
                      <TextInput
                        style={styles.editInput}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm new password"
                        placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                        secureTextEntry
                      />
                    </View>
                  )}
                </View>

                <View style={{ height: 100 }} />
              </View>
            </ScrollView>

            {/* ─── FOOTER ACTIONS ──────────────────────── */}
            <View
              style={[
                styles.actionContainer,
                {
                  backgroundColor: WHATSAPP_COLORS.background,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: WHATSAPP_COLORS.border,
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.actionButtonLarge, styles.cancelButton]}
                onPress={onClose}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButtonLarge,
                  styles.saveButton,
                  loading && styles.disabledButton,
                ]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={[styles.saveButtonText, { marginLeft: 6 }]}>
                      Save Changes
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default EditEmployeeModal;