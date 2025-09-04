// LeaveModal.tsx - Clean Leave Application Modal with UI DatePicker
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
import { colors, spacing, fontSize, borderRadius, shadows } from '../../styles/theme';
import { LeaveForm } from './types';

interface LeaveModalProps {
  visible: boolean;
  onClose: () => void;
  leaveForm: LeaveForm;
  onFormChange: (form: LeaveForm) => void;
  onSubmit: () => void;
  loading: boolean;
}

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

  // Keyboard event listeners
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

  // Initialize dates when form data changes
  useEffect(() => {
    if (leaveForm.startDate && leaveForm.endDate) {
      setDateRange({
        startDate: new Date(leaveForm.startDate),
        endDate: new Date(leaveForm.endDate),
      });
    } else if (leaveForm.startDate) {
      setDateRange({
        startDate: new Date(leaveForm.startDate),
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

  const handleDateChange = (params: { startDate: DateType; endDate: DateType }) => {
    setDateRange(params);
    
    const startDateString = params.startDate ? new Date(params.startDate).toISOString().split('T')[0] : '';
    const endDateString = params.endDate ? new Date(params.endDate).toISOString().split('T')[0] : '';
    
    onFormChange({
      ...leaveForm,
      startDate: startDateString,
      endDate: endDateString,
    });
  };

  const isFormValid = () => {
    return leaveForm.startDate && 
           leaveForm.endDate && 
           leaveForm.leaveType && 
           leaveForm.reason.trim().length > 0;
  };

  const getDaysCount = () => {
    if (leaveForm.startDate && leaveForm.endDate) {
      const start = new Date(leaveForm.startDate);
      const end = new Date(leaveForm.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  // DatePicker theme configuration
  const datePickerTheme = {
    selectedItemColor: colors.primary || '#007AFF',
    selectedRangeBackgroundColor: (colors.primary || '#007AFF') + '30',
    selectedTextColor: colors.white || '#FFFFFF',
    todayTextColor: colors.primary || '#007AFF',
    calendarBackground: 'transparent',
    dayTextColor: colors.text || '#000000',
    monthTextColor: colors.text || '#000000',
    yearTextColor: colors.text || '#000000',
    headerButtonColor: colors.primary || '#007AFF',
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
        <Text style={styles.sectionTitle}>Select Leave Dates</Text>
        
        {/* Selected Dates Display */}
        <View style={styles.selectedDatesContainer}>
          <View style={styles.dateDisplayRow}>
            <View style={styles.dateDisplayItem}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <Text style={[
                styles.dateValue,
                !dateRange.startDate && styles.placeholderText
              ]}>
                {dateRange.startDate ? formatDate(new Date(dateRange.startDate)) : 'Not selected'}
              </Text>
            </View>
            
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>to</Text>
            </View>
            
            <View style={styles.dateDisplayItem}>
              <Text style={styles.dateLabel}>End Date</Text>
              <Text style={[
                styles.dateValue,
                !dateRange.endDate && styles.placeholderText
              ]}>
                {dateRange.endDate ? formatDate(new Date(dateRange.endDate)) : 'Not selected'}
              </Text>
            </View>
          </View>
          
          {/* Duration Display */}
          {leaveForm.startDate && leaveForm.endDate && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                Duration: {getDaysCount()} {getDaysCount() === 1 ? 'day' : 'days'}
              </Text>
            </View>
          )}
        </View>

        {/* Date Picker - Multiple approaches for better compatibility */}
        <View style={styles.datePickerContainer}>
          <DateTimePicker
            mode="range"
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={handleDateChange}
            minDate={new Date()}
            // Primary styling approach - using individual props
            selectedItemColor={colors.primary || '#007AFF'}
            selectedRangeBackgroundColor={(colors.primary || '#007AFF') + '30'}
            headerButtonColor={colors.primary || '#007AFF'}
            // Alternative: using theme object (comment out above if using this)
            // theme={datePickerTheme}
            // Text styling
            weekDaysTextStyle={[styles.weekDaysText, { color: colors.textSecondary || '#666' }]}
            calendarTextStyle={[styles.calendarText, { color: colors.text || '#000' }]}
            headerTextStyle={[styles.headerText, { color: colors.text || '#000' }]}
            selectedTextStyle={{ color: colors.white || '#FFFFFF', fontWeight: 'bold' }}
            todayContainerStyle={[styles.todayContainer, { 
              borderColor: colors.primary || '#007AFF',
              borderWidth: 1 
            }]}
            // Navigation buttons
            buttonPrevIcon={<Text style={styles.navButton}>‹</Text>}
            buttonNextIcon={<Text style={styles.navButton}>›</Text>}
            // Additional props for better styling
            firstDayOfWeek={0} // Start from Sunday
            displayFullDays={true}
            // Custom styling container
            containerStyle={styles.datePickerInner}
          />
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
  // Main Modal Styles
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
    maxHeight: '90%',
    ...shadows.lg,
  },
  
  // Header Styles
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

  // Date Section
  dateSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
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
  },
  placeholderText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  dateSeparator: {
    paddingHorizontal: spacing.md,
  },
  dateSeparatorText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  durationBadge: {
    backgroundColor: colors.primary + '20',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  durationText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },

  // Date Picker Container
  datePickerContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: spacing.sm,
  },
  datePickerInner: {
    backgroundColor: 'transparent',
  },

  // Enhanced Date Picker Styles
  selectedDateText: {
    color: colors.white || '#FFFFFF',
    fontWeight: '700',
  },
  todayText: {
    color: colors.primary || '#007AFF',
    fontWeight: '600',
  },
  todayContainer: {
    backgroundColor: 'transparent',
    borderColor: colors.primary || '#007AFF',
    borderWidth: 2,
    borderRadius: borderRadius.sm,
  },
  headerButton: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
  },
  headerText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text || '#000000',
  },
  weekDaysText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary || '#666666',
  },
  calendarText: {
    fontSize: fontSize.md,
    color: colors.text || '#000000',
  },
  navButton: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary || '#007AFF',
    paddingHorizontal: spacing.sm,
  },
  
  // Form Input Styles
  inputGroup: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  
  // Leave Type Styles
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
  
  // Reason Input
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
  
  // Button Row
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: 70
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
    fontWeight: '700'
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LeaveModal;