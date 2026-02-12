// hr_employee_management/editEmployee.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { BACKEND_URL } from '../../config/config';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';
import alert from '../../utils/Alert';

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

interface EmployeeDetails {
  login_time?: string;
  logout_time?: string;
  office?: {
    id: number;
    name: string;
  };
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

// Web-compatible date/time input component
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

const EditEmployeeModal: React.FC<EditEmployeeProps> = ({
  visible,
  onClose,
  employee,
  employeeDetails,
  token,
  onSuccess,
}) => {
  // Leave balances
  const [earnedLeaves, setEarnedLeaves] = useState(employee.earned_leaves.toString());
  const [sickLeaves, setSickLeaves] = useState(employee.sick_leaves.toString());
  const [casualLeaves, setCasualLeaves] = useState(employee.casual_leaves.toString());
const [showOfficePicker, setShowOfficePicker] = useState(false);
  // Contact Information
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Work timings with Date objects for picker
  const [loginTime, setLoginTime] = useState<Date>(new Date());
  const [logoutTime, setLogoutTime] = useState<Date>(new Date());
  const [showLoginTimePicker, setShowLoginTimePicker] = useState(false);
  const [showLogoutTimePicker, setShowLogoutTimePicker] = useState(false);

  // Office
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);
  const [loadingOffices, setLoadingOffices] = useState(false);

  // Dates - iOS specific handling
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [joiningDate, setJoiningDate] = useState<Date | null>(null);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [showJoiningDatePicker, setShowJoiningDatePicker] = useState(false);
  const [activePickerType, setActivePickerType] = useState<'birth' | 'joining' | 'loginTime' | 'logoutTime' | null>(null);

  // Account Reset
  const [resetPassword, setResetPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showResetSection, setShowResetSection] = useState(false);

  const [loading, setLoading] = useState(false);

  // Refs for picker timeouts on iOS
  const birthDatePickerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const joiningDatePickerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loginTimePickerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimePickerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      initializeData();
      fetchOffices();
    }
  }, [visible, employee, employeeDetails]);

  // Cleanup timeout refs on unmount
  useEffect(() => {
    return () => {
      if (birthDatePickerTimeoutRef.current) clearTimeout(birthDatePickerTimeoutRef.current);
      if (joiningDatePickerTimeoutRef.current) clearTimeout(joiningDatePickerTimeoutRef.current);
      if (loginTimePickerTimeoutRef.current) clearTimeout(loginTimePickerTimeoutRef.current);
      if (logoutTimePickerTimeoutRef.current) clearTimeout(logoutTimePickerTimeoutRef.current);
    };
  }, []);

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
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const initializeData = () => {
    console.log('=== Initializing EditEmployee Data ===');
    console.log('Employee Details:', employeeDetails);
    
    // Initialize leaves
    setEarnedLeaves(employee.earned_leaves.toString());
    setSickLeaves(employee.sick_leaves.toString());
    setCasualLeaves(employee.casual_leaves.toString());

    // Initialize contact information
    setEmail(employee.email || '');
    setPhoneNumber(employee.phone_number || '');

    // Initialize work timings - READ FROM employeeDetails
    if (employeeDetails?.login_time) {
      console.log('Setting login time from employeeDetails:', employeeDetails.login_time);
      setLoginTime(parseTimeString(employeeDetails.login_time));
    } else {
      console.log('No login_time in employeeDetails, using default 09:00');
      const defaultLogin = new Date();
      defaultLogin.setHours(9, 0, 0);
      setLoginTime(defaultLogin);
    }

    if (employeeDetails?.logout_time) {
      console.log('Setting logout time from employeeDetails:', employeeDetails.logout_time);
      setLogoutTime(parseTimeString(employeeDetails.logout_time));
    } else {
      console.log('No logout_time in employeeDetails, using default 18:00');
      const defaultLogout = new Date();
      defaultLogout.setHours(18, 0, 0);
      setLogoutTime(defaultLogout);
    }

    // Initialize office
    if (employeeDetails?.office?.id) {
      console.log('Setting office ID from employeeDetails:', employeeDetails.office.id);
      setSelectedOfficeId(employeeDetails.office.id);
    } else {
      console.log('No office in employeeDetails');
      setSelectedOfficeId(null);
    }

    // Initialize dates
    if (employee.birth_date) {
      setBirthDate(new Date(employee.birth_date));
    }
    if (employee.joining_date) {
      setJoiningDate(new Date(employee.joining_date));
    }

    // Reset password fields
    setResetPassword('');
    setConfirmPassword('');
    setShowResetSection(false);

    // Reset active picker
    setActivePickerType(null);
  };

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
        console.log('Offices fetched:', data.offices);
        setOffices(data.offices || []);
      } else {
        console.error('Failed to fetch offices');
        alert('Error', 'Failed to load offices');
      }
    } catch (error) {
      console.error('Error fetching offices:', error);
      alert('Error', 'Network error while loading offices');
    } finally {
      setLoadingOffices(false);
    }
  };

  const validateInputs = (): boolean => {
    // Validate leaves
    const earned = parseInt(earnedLeaves);
    const sick = parseInt(sickLeaves);
    const casual = parseInt(casualLeaves);

    if (isNaN(earned) || earned < 0) {
      alert('Invalid Input', 'Earned leaves must be a positive number');
      return false;
    }
    if (isNaN(sick) || sick < 0) {
      alert('Invalid Input', 'Sick leaves must be a positive number');
      return false;
    }
    if (isNaN(casual) || casual < 0) {
      alert('Invalid Input', 'Casual leaves must be a positive number');
      return false;
    }

    // Validate email if provided
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        alert('Invalid Input', 'Please enter a valid email address');
        return false;
      }
    }

    // Validate phone number if provided
    if (phoneNumber && phoneNumber.trim()) {
      const phoneRegex = /^\+?[\d\s-]{10,}$/;
      if (!phoneRegex.test(phoneNumber.trim())) {
        alert('Invalid Input', 'Please enter a valid phone number (at least 10 digits)');
        return false;
      }
    }

    // Validate reset password if section is shown
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

  const formatDateToISO = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (
    event: any,
    selectedDate: Date | undefined,
    pickerType: 'birth' | 'joining' | 'loginTime' | 'logoutTime'
  ) => {
    if (Platform.OS === 'android') {
      // Android dismisses immediately
      if (pickerType === 'birth') {
        setShowBirthDatePicker(false);
      } else if (pickerType === 'joining') {
        setShowJoiningDatePicker(false);
      } else if (pickerType === 'loginTime') {
        setShowLoginTimePicker(false);
      } else if (pickerType === 'logoutTime') {
        setShowLogoutTimePicker(false);
      }
    }

    if (selectedDate) {
      if (pickerType === 'birth') {
        setBirthDate(selectedDate);
      } else if (pickerType === 'joining') {
        setJoiningDate(selectedDate);
      } else if (pickerType === 'loginTime') {
        setLoginTime(selectedDate);
      } else if (pickerType === 'logoutTime') {
        setLogoutTime(selectedDate);
      }
    }
  };

  const closeBirthDatePicker = () => {
    if (birthDatePickerTimeoutRef.current) {
      clearTimeout(birthDatePickerTimeoutRef.current);
    }
    
    birthDatePickerTimeoutRef.current = setTimeout(() => {
      setShowBirthDatePicker(false);
      setActivePickerType(null);
      birthDatePickerTimeoutRef.current = null;
    }, 300);
  };

  const closeJoiningDatePicker = () => {
    if (joiningDatePickerTimeoutRef.current) {
      clearTimeout(joiningDatePickerTimeoutRef.current);
    }
    
    joiningDatePickerTimeoutRef.current = setTimeout(() => {
      setShowJoiningDatePicker(false);
      setActivePickerType(null);
      joiningDatePickerTimeoutRef.current = null;
    }, 300);
  };

  const closeLoginTimePicker = () => {
    if (loginTimePickerTimeoutRef.current) {
      clearTimeout(loginTimePickerTimeoutRef.current);
    }
    
    loginTimePickerTimeoutRef.current = setTimeout(() => {
      setShowLoginTimePicker(false);
      setActivePickerType(null);
      loginTimePickerTimeoutRef.current = null;
    }, 300);
  };

  const closeLogoutTimePicker = () => {
    if (logoutTimePickerTimeoutRef.current) {
      clearTimeout(logoutTimePickerTimeoutRef.current);
    }
    
    logoutTimePickerTimeoutRef.current = setTimeout(() => {
      setShowLogoutTimePicker(false);
      setActivePickerType(null);
      logoutTimePickerTimeoutRef.current = null;
    }, 300);
  };

  const handleSave = async () => {
    if (!validateInputs()) {
      return;
    }

    setLoading(true);
    
    // Close all pickers before saving
    setShowBirthDatePicker(false);
    setShowJoiningDatePicker(false);
    setShowLoginTimePicker(false);
    setShowLogoutTimePicker(false);
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
      };

      // Add contact information if provided
      if (email && email.trim()) {
        payload.email = email.trim();
      }
      if (phoneNumber && phoneNumber.trim()) {
        payload.phone_number = phoneNumber.trim();
      }

      // Add office if selected
      if (selectedOfficeId) {
        payload.office_id = selectedOfficeId;
      }

      // Add dates if changed - using local date formatting to avoid timezone issues
      if (birthDate) {
        payload.birth_date = formatDateToISO(birthDate);
      }
      if (joiningDate) {
        payload.joining_date = formatDateToISO(joiningDate);
      }

      // Add reset account if passwords are provided
      if (showResetSection && resetPassword) {
        payload.reset_account = true;
        payload.reset_password = resetPassword;
      }

      console.log('Sending update payload:', payload);

      const response = await fetch(`${BACKEND_URL}/manager/updateEmployee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
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

  const renderSection = (
    title: string,
    icon: string,
    children: React.ReactNode
  ) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={20} color={WHATSAPP_COLORS.primary} />
        <Text style={[styles.sectionTitleAlt, { fontSize: 16, marginLeft: 8, fontWeight: '600' }]}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );

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
            {/* Header */}
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

            {/* Content */}
            <ScrollView 
              style={styles.content} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ padding: 16 }}>
                {/* Employee Info Banner */}
                <View style={[styles.detailCard, { marginBottom: 20, backgroundColor: '#E8F5E9' }]}>
                  <Text style={[styles.modalTitle, { marginBottom: 4, color: WHATSAPP_COLORS.primary }]}>
                    {employee.full_name}
                  </Text>
                  <Text style={[styles.infoLabel, { color: WHATSAPP_COLORS.textSecondary }]}>
                    ID: {employee.employee_id}
                  </Text>
                </View>

                {/* Contact Information Section */}
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

           
                {/* Office Assignment Section */}
                {renderSection('Office Assignment', 'business-outline', (
                  <View>
                    <Text style={styles.editLabel}>Assigned Office</Text>
                    {loadingOffices ? (
                      <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[styles.editInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                          onPress={() => setShowOfficePicker(!showOfficePicker)}
                        >
                          <Text style={{ 
                            color: selectedOfficeId ? WHATSAPP_COLORS.textPrimary : WHATSAPP_COLORS.textTertiary,
                            fontSize: 16 
                          }}>
                            {selectedOfficeId 
                              ? offices.find(o => o.id === selectedOfficeId)?.name || 'Select Office'
                              : 'Select Office'}
                          </Text>
                          <Ionicons 
                            name={showOfficePicker ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color={WHATSAPP_COLORS.textSecondary} 
                          />
                        </TouchableOpacity>
                        
                        {showOfficePicker && (
                          <View style={styles.pickerContainer}>
                            <ScrollView style={{ maxHeight: 200 }}>
                              {offices.map((office) => (
                                <TouchableOpacity
                                  key={office.id}
                                  style={[
                                    styles.officeOption,
                                    selectedOfficeId === office.id && styles.officeOptionSelected
                                  ]}
                                  onPress={() => {
                                    setSelectedOfficeId(office.id);
                                    setShowOfficePicker(false);
                                  }}
                                >
                                  <Text style={[
                                    styles.officeName,
                                    selectedOfficeId === office.id && styles.officeNameSelected
                                  ]}>
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

                {/* Leave Balances Section */}
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

                {/* Work Timings Section */}
                {renderSection('Work Timings', 'time-outline', (
                  <View>
                    <Text style={styles.editLabel}>Login Time</Text>
                    {Platform.OS === 'web' ? (
                      <WebDateInput
                        value={loginTime}
                        onChange={(time) => setLoginTime(time)}
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
                              onChange={(event, time) => {
                                handleDateChange(event, time, 'loginTime');
                              }}
                            />
                            {Platform.OS === 'ios' && (
                              <TouchableOpacity
                                style={[styles.datePickerButton, { marginTop: 8, backgroundColor: WHATSAPP_COLORS.primary }]}
                                onPress={closeLoginTimePicker}
                              >
                                <Text style={[styles.datePickerText, { color: '#fff' }]}>Done</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </>
                    )}

                    <Text style={styles.editLabel}>Logout Time</Text>
                    {Platform.OS === 'web' ? (
                      <WebDateInput
                        value={logoutTime}
                        onChange={(time) => setLogoutTime(time)}
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
                              onChange={(event, time) => {
                                handleDateChange(event, time, 'logoutTime');
                              }}
                            />
                            {Platform.OS === 'ios' && (
                              <TouchableOpacity
                                style={[styles.datePickerButton, { marginTop: 8, backgroundColor: WHATSAPP_COLORS.primary }]}
                                onPress={closeLogoutTimePicker}
                              >
                                <Text style={[styles.datePickerText, { color: '#fff' }]}>Done</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </>
                    )}
                  </View>
                ))}

                {/* Important Dates Section */}
                {renderSection('Important Dates', 'calendar-outline', (
                  <View>
                    <Text style={styles.editLabel}>Birth Date</Text>
                    {Platform.OS === 'web' ? (
                      <WebDateInput
                        value={birthDate}
                        onChange={(date) => setBirthDate(date)}
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
                              onChange={(event, date) => {
                                handleDateChange(event, date, 'birth');
                              }}
                              maximumDate={new Date()}
                            />
                            {Platform.OS === 'ios' && (
                              <TouchableOpacity
                                style={[styles.datePickerButton, { marginTop: 8, backgroundColor: WHATSAPP_COLORS.primary }]}
                                onPress={closeBirthDatePicker}
                              >
                                <Text style={[styles.datePickerText, { color: '#fff' }]}>Done</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </>
                    )}

                    <Text style={styles.editLabel}>Joining Date</Text>
                    {Platform.OS === 'web' ? (
                      <WebDateInput
                        value={joiningDate}
                        onChange={(date) => setJoiningDate(date)}
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
                              onChange={(event, date) => {
                                handleDateChange(event, date, 'joining');
                              }}
                              maximumDate={new Date()}
                            />
                            {Platform.OS === 'ios' && (
                              <TouchableOpacity
                                style={[styles.datePickerButton, { marginTop: 8, backgroundColor: WHATSAPP_COLORS.primary }]}
                                onPress={closeJoiningDatePicker}
                              >
                                <Text style={[styles.datePickerText, { color: '#fff' }]}>Done</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </>
                    )}
                  </View>
                ))}

                {/* Account Reset Section */}
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
                    <Text style={[styles.sectionTitleAlt, { color: '#D32F2F', flex: 1, fontSize: 20, marginLeft: 8, fontWeight: '600' }]}>
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
                          This will reset the employee's account. They will need to use this new password on next login.
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

            {/* Action Buttons - Fixed at bottom */}
            <View style={[styles.actionContainer, { backgroundColor: WHATSAPP_COLORS.background, paddingTop: 12, borderTopWidth: 1, borderTopColor: WHATSAPP_COLORS.border }]}>
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
                    <Text style={[styles.saveButtonText, { marginLeft: 6 }]}>Save Changes</Text>
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