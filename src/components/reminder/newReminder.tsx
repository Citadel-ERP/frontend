import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  TextInput, ActivityIndicator, Modal, Alert, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IOS_COLORS, reminderTypes, eventColors } from './constants';
import { Employee, ReminderItem } from './types';
import { getColorName, getColorValue, convertTo24Hour, convertTo12Hour, formatDateToYYYYMMDD } from './utils';
import { BACKEND_URL } from '../../config/config';
import BackIcon from './BackIcon';

interface NewReminderProps {
  visible: boolean;
  isEditMode: boolean;
  token: string | null;
  selectedReminder: ReminderItem | null;
  selectedDate: Date;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  onEditSubmit: (data: any) => Promise<void>;
}

const IMPROVED_REMINDER_TYPES = [
  { value: 'meeting', label: 'Meeting', icon: '👥', color: '#007AFF' },
  { value: 'call', label: 'Call', icon: '📞', color: '#34C759' },
  { value: 'task', label: 'Task', icon: '✅', color: '#FF9500' },
  { value: 'event', label: 'Event', icon: '🎉', color: '#FF2D55' },
  { value: 'deadline', label: 'Deadline', icon: '⏰', color: '#FF3B30' },
  { value: 'followup', label: 'Follow-up', icon: '🔄', color: '#5856D6' },
  { value: 'other', label: 'Other', icon: '📝', color: '#FF9500' },
];

const DEFAULT_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF2D55', '#FF3B30', '#5856D6', '#8E8E93', '#32D74B', '#FFD60A', '#0A84FF'];

const NewReminder: React.FC<NewReminderProps> = ({
  visible,
  isEditMode,
  token,
  selectedReminder,
  selectedDate,
  onClose,
  onSubmit,
  onEditSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [employeeSearchResults, setEmployeeSearchResults] = useState<Employee[]>([]);
  const [showEmployeeSearch, setShowEmployeeSearch] = useState(false);
  const [searchingEmployees, setSearchingEmployees] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    if (visible) {
      if (isEditMode && selectedReminder) {
        setTitle(selectedReminder.title);
        setDescription(selectedReminder.description);
        
        const reminderDate = new Date(selectedReminder.reminder_date);
        setDate(reminderDate);
        
        const [hours, minutes] = selectedReminder.reminder_time.split(':');
        const timeDate = new Date();
        timeDate.setHours(parseInt(hours), parseInt(minutes));
        setTime(timeDate);
        
        setSelectedColor(getColorValue(selectedReminder.color));
        setSelectedType(selectedReminder.type || '');
      } else {
        // New reminder mode
        setTitle('');
        setDescription('');
        
        // Use selectedDate if provided, otherwise use current date
        const dateToUse = selectedDate || new Date();
        setDate(dateToUse);
        
        const defaultTime = new Date();
        defaultTime.setHours(9, 0, 0);
        setTime(defaultTime);
        
        setSelectedColor(DEFAULT_COLORS[0]);
        setSelectedType('');
        setSelectedEmployees([]);
      }
      setShowTypeDropdown(false);
      setShowDatePicker(false);
      setShowTimePicker(false);
    }
  }, [visible, isEditMode, selectedReminder, selectedDate]);

  const searchEmployees = async (query: string) => {
    if (!query.trim() || !token) {
      setEmployeeSearchResults([]);
      return;
    }

    setSearchingEmployees(true);
    try {
      const response = await fetch(`${BACKEND_URL}/core/getUsers?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok && result.data) {
        const filtered = result.data.filter(
          (emp: Employee) => !selectedEmployees.some(sel => sel.employee_id === emp.employee_id)
        );
        setEmployeeSearchResults(filtered);
      }
    } catch (error) {
      console.error('Error searching employees:', error);
    } finally {
      setSearchingEmployees(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (showEmployeeSearch) {
        searchEmployees(employeeSearchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [employeeSearchQuery, showEmployeeSearch]);

  const addEmployee = (employee: Employee) => {
    setSelectedEmployees([...selectedEmployees, employee]);
    setEmployeeSearchQuery('');
    setEmployeeSearchResults([]);
    setShowEmployeeSearch(false);
  };

  const removeEmployee = (employeeId: string) => {
    setSelectedEmployees(selectedEmployees.filter(emp => emp.employee_id !== employeeId));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'ios') {
      // For iOS, we handle Done button separately via handleDateDone
    } else {
      setShowDatePicker(false);
      if (selectedDate) {
        setDate(selectedDate);
      }
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'ios') {
      // For iOS, we handle Done button separately via handleTimeDone
    } else {
      setShowTimePicker(false);
      if (selectedTime) {
        setTime(selectedTime);
      }
    }
  };

  // iOS-specific handlers for Done button
  const handleDateDone = () => {
    setShowDatePicker(false);
  };

  const handleTimeDone = () => {
    setShowTimePicker(false);
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDisplayTime = (time: Date) => {
    return time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleSubmit = async () => {
    const finalTitle = title.trim();
    
    if (!finalTitle) {
      Alert.alert('Required Field', 'Please enter a title for your reminder');
      return;
    }

    const dateString = formatDateToYYYYMMDD(date);
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}:00`;

    const data = {
      title: finalTitle,
      description: description.trim(),
      date: dateString,
      time: timeString,
      employees: selectedEmployees,
      color: getColorName(selectedColor),
      type: selectedType,
    };

    setSubmitting(true);
    try {
      if (isEditMode && selectedReminder) {
        await onEditSubmit({ ...data, reminder_id: selectedReminder.id });
      } else {
        await onSubmit(data);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  // Handle tap outside pickers for iOS
  const handleBackdropPress = () => {
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const handleTypeSelect = (typeValue: string) => {
    setSelectedType(typeValue);
    setShowTypeDropdown(false);
  };

  // Close all dropdowns when modal is closing
  const handleClose = () => {
    setShowTypeDropdown(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowEmployeeSearch(false);
    onClose();
  };

  const getSelectedTypeLabel = () => {
    const selected = IMPROVED_REMINDER_TYPES.find(t => t.value === selectedType);
    return selected ? selected.label : 'Select Type';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{isEditMode ? 'Edit Reminder' : 'New Reminder'}</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={submitting} activeOpacity={0.7}>
            <Text style={[styles.addButton, submitting && styles.addButtonDisabled]}>
              {submitting ? 'Saving...' : isEditMode ? 'Save' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.modalContent} 
          keyboardShouldPersistTaps="handled" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Title */}
          <View style={styles.inputSection}>
            <TextInput
              style={styles.titleInput}
              placeholder="Reminder Title"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#999"
            />
          </View>

          {/* Type Dropdown */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>TYPE</Text>
            <View style={styles.typeDropdownContainer}>
              <TouchableOpacity
                style={styles.typeDropdownButton}
                onPress={() => {
                  setShowTypeDropdown(!showTypeDropdown);
                  // Close other pickers if open
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.typeDropdownButtonLeft}>
                  <Ionicons name="pricetag-outline" size={22} color="#075E54" />
                  <Text style={styles.typeDropdownLabel}>Type</Text>
                </View>
                <Text style={styles.typeDropdownValue}>
                  {getSelectedTypeLabel()}
                </Text>
                <Ionicons 
                  name={showTypeDropdown ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#075E54" 
                />
              </TouchableOpacity>
              
              {showTypeDropdown && (
                <View style={styles.typeDropdownList}>
                  {IMPROVED_REMINDER_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeDropdownItem,
                        selectedType === type.value && { 
                          backgroundColor: type.color + '20', // 20 opacity
                        }
                      ]}
                      onPress={() => handleTypeSelect(type.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.typeDropdownItemIcon}>{type.icon}</Text>
                      <Text style={[
                        styles.typeDropdownItemText,
                        selectedType === type.value && { 
                          color: type.color,
                          fontWeight: '600'
                        }
                      ]}>
                        {type.label}
                      </Text>
                      {selectedType === type.value && (
                        <Ionicons name="checkmark" size={20} color={type.color} style={styles.typeDropdownCheckmark} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Color Selection */}
          {/* <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>COLOR</Text>
            <View style={styles.colorPicker}>
              {DEFAULT_COLORS.map((color: string, index: number) => (
                <TouchableOpacity
                  key={`color-${index}`}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                  activeOpacity={0.7}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={24} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View> */}

          {/* Share With */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>SHARE WITH</Text>
            
            {selectedEmployees.length > 0 && (
              <View style={styles.selectedEmployeesContainer}>
                {selectedEmployees.map((emp) => (
                  <View key={emp.employee_id} style={styles.employeeChip}>
                    <View style={styles.employeeChipAvatar}>
                      <Text style={styles.employeeChipAvatarText}>
                        {emp.full_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.employeeChipText}>{emp.full_name}</Text>
                    <TouchableOpacity
                      onPress={() => removeEmployee(emp.employee_id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={20} color="#8E8E93" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.addEmployeeButton}
              onPress={() => {
                setShowEmployeeSearch(!showEmployeeSearch);
                setShowTypeDropdown(false);
                setShowDatePicker(false);
                setShowTimePicker(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add-outline" size={20} color="#075E54" />
              <Text style={styles.addEmployeeButtonText}>Add People</Text>
            </TouchableOpacity>

            {showEmployeeSearch && (
              <View style={styles.employeeSearchContainer}>
                <TextInput
                  style={styles.employeeSearchInput}
                  placeholder="Search by name..."
                  value={employeeSearchQuery}
                  onChangeText={setEmployeeSearchQuery}
                  placeholderTextColor="#999"
                  autoFocus
                />
                
                {searchingEmployees ? (
                  <View style={styles.employeeSearchLoading}>
                    <ActivityIndicator size="small" color="#075E54" />
                  </View>
                ) : employeeSearchResults.length > 0 ? (
                  <ScrollView style={styles.employeeSearchResults} nestedScrollEnabled={true}>
                    {employeeSearchResults.map((emp) => (
                      <TouchableOpacity
                        key={emp.employee_id}
                        style={styles.employeeSearchItem}
                        onPress={() => addEmployee(emp)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.employeeAvatar}>
                          <Text style={styles.avatarText}>
                            {emp.full_name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.employeeSearchItemInfo}>
                          <Text style={styles.employeeSearchItemName}>{emp.full_name}</Text>
                          <Text style={styles.employeeSearchItemRole}>{emp.role}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : employeeSearchQuery.trim() ? (
                  <View style={styles.employeeSearchEmpty}>
                    <Text style={styles.employeeSearchEmptyText}>No employees found</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* Date & Time */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>DATE & TIME</Text>
            
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={() => {
                setShowDatePicker(true);
                setShowTimePicker(false);
                setShowTypeDropdown(false);
                setShowEmployeeSearch(false);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.dateTimeButtonLeft}>
                <Ionicons name="calendar-outline" size={22} color="#075E54" />
                <Text style={styles.dateTimeLabel}>Date</Text>
              </View>
              <Text style={styles.dateTimeValue}>{formatDisplayDate(date)}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.dateTimeButton, styles.dateTimeButtonLast]}
              onPress={() => {
                setShowTimePicker(true);
                setShowDatePicker(false);
                setShowTypeDropdown(false);
                setShowEmployeeSearch(false);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.dateTimeButtonLeft}>
                <Ionicons name="time-outline" size={22} color="#075E54" />
                <Text style={styles.dateTimeLabel}>Time</Text>
              </View>
              <Text style={styles.dateTimeValue}>{formatDisplayTime(time)}</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>DESCRIPTION</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Add notes or details..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Date Picker Modal for iOS */}
        {showDatePicker && Platform.OS === 'ios' && (
          <View style={styles.iosPickerContainer}>
            <TouchableOpacity 
              style={styles.iosPickerBackdrop}
              onPress={handleBackdropPress}
              activeOpacity={1}
            />
            <View style={styles.iosPickerContent}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity 
                  onPress={handleDateDone}
                  style={styles.iosPickerCancelButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.iosPickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.iosPickerTitle}>Select Date</Text>
                <TouchableOpacity 
                  onPress={handleDateDone}
                  style={styles.iosPickerDoneButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.iosPickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setDate(selectedDate);
                  }
                }}
                minimumDate={new Date()}
                style={styles.iosDateTimePicker}
              />
            </View>
          </View>
        )}

        {/* Time Picker Modal for iOS */}
        {showTimePicker && Platform.OS === 'ios' && (
          <View style={styles.iosPickerContainer}>
            <TouchableOpacity 
              style={styles.iosPickerBackdrop}
              onPress={handleBackdropPress}
              activeOpacity={1}
            />
            <View style={styles.iosPickerContent}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity 
                  onPress={handleTimeDone}
                  style={styles.iosPickerCancelButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.iosPickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.iosPickerTitle}>Select Time</Text>
                <TouchableOpacity 
                  onPress={handleTimeDone}
                  style={styles.iosPickerDoneButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.iosPickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={time}
                mode="time"
                display="spinner"
                onChange={(event, selectedTime) => {
                  if (selectedTime) {
                    setTime(selectedTime);
                  }
                }}
                style={styles.iosDateTimePicker}
              />
            </View>
          </View>
        )}

        {/* Android Date Picker */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        {/* Android Time Picker */}
        {showTimePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={time}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#075E54',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  backButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  addButton: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: '5%',
    alignItems: 'center',
  },
  inputSection: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  titleInput: {
    padding: 16,
    fontSize: 15,
    color: '#000',
    fontWeight: '400',
  },
  formSection: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 12,
    marginBottom: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  typeDropdownContainer: {
    paddingHorizontal: 16,
  },
  typeDropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
  },
  typeDropdownButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeDropdownLabel: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  typeDropdownValue: {
    fontSize: 16,
    color: '#075E54',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginRight: 8,
  },
  typeDropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  typeDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  typeDropdownItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  typeDropdownItemText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    flex: 1,
  },
  typeDropdownCheckmark: {
    marginLeft: 8,
  },
  colorPicker: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 14,
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  dateTimeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  dateTimeButtonLast: {
    borderBottomWidth: 0,
  },
  dateTimeButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateTimeLabel: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  dateTimeValue: {
    fontSize: 16,
    color: '#075E54',
    fontWeight: '600',
  },
  descriptionInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    minHeight: 100,
  },
  iosPickerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  iosPickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  iosPickerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#F9F9F9',
  },
  iosPickerCancelButton: {
    padding: 8,
  },
  iosPickerCancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '400',
  },
  iosPickerTitle: {
    fontSize: 17,
    color: '#000',
    fontWeight: '600',
  },
  iosPickerDoneButton: {
    padding: 8,
  },
  iosPickerDoneText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  iosDateTimePicker: {
    backgroundColor: '#fff',
    height: 200,
  },
  selectedEmployeesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  employeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 24,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    gap: 10,
  },
  employeeChipAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#075E54',
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeChipAvatarText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  employeeChipText: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
    flex: 1,
  },
  addEmployeeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  addEmployeeButtonText: {
    fontSize: 16,
    color: '#075E54',
    fontWeight: '600',
  },
  employeeSearchContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  employeeSearchInput: {
    fontSize: 16,
    color: '#000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  employeeSearchLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  employeeSearchResults: {
    maxHeight: 200,
  },
  employeeSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  employeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#075E54',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  employeeSearchItemInfo: {
    flex: 1,
  },
  employeeSearchItemName: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    marginBottom: 2,
  },
  employeeSearchItemRole: {
    fontSize: 14,
    color: '#8E8E93',
  },
  employeeSearchEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  employeeSearchEmptyText: {
    fontSize: 15,
    color: '#8E8E93',
  },
});

export default NewReminder;