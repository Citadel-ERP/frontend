import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import DateTimePicker, { DateType } from 'react-native-ui-datepicker';

// Mock theme for demo
const colors = {
  primary: '#007AFF',
  white: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  backgroundSecondary: '#F5F5F5',
  border: '#E0E0E0',
  success: '#34C759',
  error: '#FF3B30',
};

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
const fontSize = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20 };
const borderRadius = { sm: 6, lg: 12, xl: 16, full: 9999 };
const shadows = {
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  none: {},
};

interface LeaveForm {
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string;
}

interface LeaveModalProps {
  visible: boolean;
  onClose: () => void;
  leaveForm: LeaveForm;
  onFormChange: (form: LeaveForm) => void;
  onSubmit: () => void;
  loading: boolean;
}

type DateEditMode = 'none' | 'start' | 'end';

const LeaveModal: React.FC<LeaveModalProps> = ({
  visible,
  onClose,
  leaveForm,
  onFormChange,
  onSubmit,
  loading,
}) => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [dateRange, setDateRange] = useState<{
    startDate: DateType;
    endDate: DateType;
  }>({
    startDate: undefined,
    endDate: undefined,
  });
  const [editMode, setEditMode] = useState<DateEditMode>('none');

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  useEffect(() => {
    if (leaveForm.startDate && leaveForm.endDate) {
      const startParts = leaveForm.startDate.split('-');
      const endParts = leaveForm.endDate.split('-');
      
      setDateRange({
        startDate: new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]), 12, 0, 0),
        endDate: new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]), 12, 0, 0),
      });
    } else if (leaveForm.startDate) {
      const startParts = leaveForm.startDate.split('-');
      setDateRange({
        startDate: new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]), 12, 0, 0),
        endDate: undefined,
      });
    } else {
      setDateRange({
        startDate: undefined,
        endDate: undefined,
      });
    }
  }, [leaveForm.startDate, leaveForm.endDate]);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (params: { startDate: DateType; endDate: DateType }) => {
    const newStartDate = params.startDate ? new Date(params.startDate) : undefined;
    const newEndDate = params.endDate ? new Date(params.endDate) : undefined;

    // Smart date selection logic
    if (editMode === 'start' && newStartDate) {
      // Editing start date
      const startStr = formatDateToString(newStartDate);
      
      // If we have an end date, check if new start is after it
      if (dateRange.endDate) {
        const existingEnd = new Date(dateRange.endDate);
        if (newStartDate > existingEnd) {
          // New start is after end, so make both the same
          setDateRange({ startDate: newStartDate, endDate: newStartDate });
          onFormChange({
            ...leaveForm,
            startDate: startStr,
            endDate: startStr,
          });
        } else {
          // Valid range
          setDateRange({ startDate: newStartDate, endDate: dateRange.endDate });
          onFormChange({
            ...leaveForm,
            startDate: startStr,
          });
        }
      } else {
        setDateRange({ startDate: newStartDate, endDate: undefined });
        onFormChange({
          ...leaveForm,
          startDate: startStr,
        });
      }
      setEditMode('none');
    } else if (editMode === 'end' && newEndDate) {
      // Editing end date
      const endStr = formatDateToString(newEndDate);
      
      if (dateRange.startDate) {
        const existingStart = new Date(dateRange.startDate);
        if (newEndDate < existingStart) {
          // New end is before start, so make both the same
          setDateRange({ startDate: newEndDate, endDate: newEndDate });
          onFormChange({
            ...leaveForm,
            startDate: endStr,
            endDate: endStr,
          });
        } else {
          // Valid range
          setDateRange({ startDate: dateRange.startDate, endDate: newEndDate });
          onFormChange({
            ...leaveForm,
            endDate: endStr,
          });
        }
      } else {
        setDateRange({ startDate: newEndDate, endDate: newEndDate });
        onFormChange({
          ...leaveForm,
          startDate: endStr,
          endDate: endStr,
        });
      }
      setEditMode('none');
    } else {
      // Normal range selection (default behavior)
      setDateRange(params);
      
      const startDateString = newStartDate ? formatDateToString(newStartDate) : '';
      const endDateString = newEndDate ? formatDateToString(newEndDate) : '';
      
      onFormChange({
        ...leaveForm,
        startDate: startDateString,
        endDate: endDateString,
      });
    }
  };

  const handleClearDates = () => {
    setDateRange({
      startDate: undefined,
      endDate: undefined,
    });
    onFormChange({
      ...leaveForm,
      startDate: '',
      endDate: '',
    });
    setEditMode('none');
  };

  const handleEditStartDate = () => {
    setEditMode('start');
  };

  const handleEditEndDate = () => {
    setEditMode('end');
  };

  const isFormValid = () => {
    return leaveForm.startDate && 
           leaveForm.endDate && 
           leaveForm.leaveType && 
           leaveForm.reason.trim().length > 0;
  };

  const getDaysCount = () => {
    if (leaveForm.startDate && leaveForm.endDate) {
      const start = new Date(leaveForm.startDate + 'T12:00:00');
      const end = new Date(leaveForm.endDate + 'T12:00:00');
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  const getHelperText = () => {
    if (editMode === 'start') {
      return '📍 Select a new start date';
    }
    if (editMode === 'end') {
      return '📍 Select a new end date';
    }
    if (!dateRange.startDate) {
      return '💡 Tip: Tap a date to set start, then tap another date for end';
    }
    if (dateRange.startDate && !dateRange.endDate) {
      return '✓ Start date set. Now select your end date';
    }
    return '✓ Date range selected. Tap dates above to edit individually';
  };

  const renderContent = () => (
    <ScrollView 
      style={styles.modalContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Apply for Leave</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Date Selection Section */}
      <View style={styles.dateSection}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Select Leave Dates</Text>
          {(dateRange.startDate || dateRange.endDate) && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearDates}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.clearButtonText}>Clear Selection</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Selected Dates Display - Now Clickable */}
        <View style={styles.selectedDatesContainer}>
          <View style={styles.dateDisplayRow}>
            <TouchableOpacity 
              style={[
                styles.dateDisplayItem,
                editMode === 'start' && styles.dateDisplayItemActive
              ]}
              onPress={handleEditStartDate}
              disabled={!dateRange.startDate}
              activeOpacity={0.7}
            >
              <Text style={styles.dateLabel}>Start Date {dateRange.startDate && '✏️'}</Text>
              <Text style={[
                styles.dateValue,
                !dateRange.startDate && styles.placeholderText,
                editMode === 'start' && styles.dateValueActive
              ]}>
                {dateRange.startDate ? formatDate(new Date(dateRange.startDate)) : 'Tap calendar below'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>→</Text>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.dateDisplayItem,
                editMode === 'end' && styles.dateDisplayItemActive
              ]}
              onPress={handleEditEndDate}
              disabled={!dateRange.endDate}
              activeOpacity={0.7}
            >
              <Text style={styles.dateLabel}>End Date {dateRange.endDate && '✏️'}</Text>
              <Text style={[
                styles.dateValue,
                !dateRange.endDate && styles.placeholderText,
                editMode === 'end' && styles.dateValueActive
              ]}>
                {dateRange.endDate ? formatDate(new Date(dateRange.endDate)) : 'Select end date'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Duration Display */}
          {leaveForm.startDate && leaveForm.endDate && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                📅 {getDaysCount()} {getDaysCount() === 1 ? 'day' : 'days'} selected
              </Text>
            </View>
          )}

          {/* Dynamic Helper Text */}
          <View style={styles.helperTextContainer}>
            <Text style={[
              styles.helperText,
              editMode !== 'none' && styles.helperTextActive
            ]}>
              {getHelperText()}
            </Text>
          </View>
        </View>

        {/* Date Picker with Enhanced Visual Feedback */}
        <View style={[
          styles.datePickerContainer,
          editMode !== 'none' && styles.datePickerContainerActive
        ]}>
          <DateTimePicker
            mode="range"
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={handleDateChange}
            timePicker={false}
            
            // Enhanced styling for better visibility
            selectedItemColor={colors.primary}
            selectedRangeBackgroundColor={colors.primary + '35'}
            headerButtonColor={colors.primary}
            
            // Text styling with better contrast
            weekDaysTextStyle={[styles.weekDaysText, { color: colors.textSecondary }]}
            calendarTextStyle={[styles.calendarText, { color: colors.text }]}
            headerTextStyle={[styles.headerText, { color: colors.text }]}
            selectedTextStyle={{ 
              color: colors.white, 
              fontWeight: 'bold',
              fontSize: fontSize.md 
            }}
            todayContainerStyle={[styles.todayContainer, { 
              borderColor: colors.success,
              borderWidth: 2,
              backgroundColor: colors.success + '15'
            }]}
            
            // Navigation buttons
            buttonPrevIcon={<Text style={styles.navButton}>‹</Text>}
            buttonNextIcon={<Text style={styles.navButton}>›</Text>}
            
            // Additional props
            firstDayOfWeek={0}
            displayFullDays={true}
            containerStyle={styles.datePickerInner}
          />
          
          {/* Retroactive Leave Notice */}
          <View style={styles.retroNotice}>
            <Text style={styles.retroNoticeText}>
              ℹ️ You can select past dates for retroactive leave applications
            </Text>
          </View>
        </View>
      </View>

      {/* Leave Type */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Leave Type</Text>
        <View style={styles.leaveTypeRow}>
          {[
            { key: 'casual', label: 'Casual', icon: '🌴' },
            { key: 'sick', label: 'Sick', icon: '🏥' },
            { key: 'earned', label: 'Earned', icon: '💼' }
          ].map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.leaveTypeButton,
                leaveForm.leaveType === type.key && styles.leaveTypeButtonActive
              ]}
              onPress={() => onFormChange({ ...leaveForm, leaveType: type.key })}
              activeOpacity={0.7}
            >
              <Text style={styles.leaveTypeIcon}>{type.icon}</Text>
              <Text style={[
                styles.leaveTypeButtonText,
                leaveForm.leaveType === type.key && styles.leaveTypeButtonTextActive
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Reason */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Reason for Leave</Text>
        <TextInput
          style={styles.reasonInput}
          value={leaveForm.reason}
          onChangeText={(text) => onFormChange({ ...leaveForm, reason: text })}
          placeholder="Please provide a brief reason for your leave request..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={200}
        />
        <Text style={styles.characterCount}>
          {leaveForm.reason.length}/200 characters
        </Text>
      </View>

      {/* Footer Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isFormValid() || loading) && styles.submitButtonDisabled
          ]}
          onPress={onSubmit}
          disabled={!isFormValid() || loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.white} size="small" />
              <Text style={[styles.submitButtonText, { marginLeft: spacing.sm }]}>
                Submitting...
              </Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>
              Submit Application
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
        >
          {renderContent()}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardContainer: {
    width: '100%',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '95%',
    maxWidth: 500,
    maxHeight: '95%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  closeButtonText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dateSection: {
    marginBottom: spacing.xl,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  clearButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.sm,
  },
  clearButtonText: {
    fontSize: fontSize.xs,
    color: colors.error,
    fontWeight: '600',
  },
  selectedDatesContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateDisplayItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: 'transparent',
  },
  dateDisplayItemActive: {
    backgroundColor: colors.primary + '15',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  dateLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  dateValueActive: {
    color: colors.primary,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    fontWeight: '400',
    fontSize: fontSize.sm,
  },
  dateSeparator: {
    paddingHorizontal: spacing.md,
  },
  dateSeparatorText: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: '600',
  },
  durationBadge: {
    backgroundColor: colors.success + '20',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  durationText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: '600',
  },
  helperTextContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  helperTextActive: {
    color: colors.primary,
    fontWeight: '600',
    fontStyle: 'normal',
  },
  datePickerContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    overflow: 'hidden',
    padding: spacing.sm,
  },
  datePickerContainerActive: {
    borderColor: colors.primary,
    borderWidth: 3,
    backgroundColor: colors.primary + '05',
  },
  datePickerInner: {
    backgroundColor: 'transparent',
  },
  retroNotice: {
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  retroNoticeText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  todayContainer: {
    backgroundColor: 'transparent',
    borderColor: colors.success,
    borderWidth: 2,
    borderRadius: borderRadius.sm,
  },
  headerText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  weekDaysText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  calendarText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  navButton: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    paddingHorizontal: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  leaveTypeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  leaveTypeButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  leaveTypeButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  leaveTypeIcon: {
    fontSize: fontSize.xl,
    marginBottom: spacing.xs,
  },
  leaveTypeButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  leaveTypeButtonTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  reasonInput: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: 70,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    paddingVertical: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    ...shadows.none,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    color: colors.white,
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LeaveModal;