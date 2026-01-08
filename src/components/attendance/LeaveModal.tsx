import React, { useState, useEffect, useRef } from 'react';
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

// Theme colors matching your app
const colors = {
  primary: '#f59e0b',
  primaryDark: '#d97706',
  secondary: '#1e1b4b',
  white: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6b7280',
  background: '#f3f4f6',
  backgroundSecondary: '#F5F5F5',
  border: '#e5e7eb',
  success: '#10b981',
  error: '#ef4444',
  blue: '#3b82f6',
  purple: '#a855f7',
};

const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
const fontSize = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20 };
const borderRadius = { sm: 8, md: 12, lg: 16, xl: 20 };

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

  // Add refs for ScrollView and TextInput
  const scrollViewRef = useRef<ScrollView>(null);
  const reasonInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardVisible(true);
      
      // Scroll to the reason input when keyboard opens
      if (reasonInputRef.current) {
        // Small delay to ensure keyboard is fully up
        setTimeout(() => {
          reasonInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
            const scrollPosition = pageY - 100; // Adjust offset as needed
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, scrollPosition),
              animated: true
            });
          });
        }, 100);
      }
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });
    
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Add a function to handle TextInput focus
  const handleReasonInputFocus = () => {
    // Scroll to the input field
    reasonInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
      // Calculate position to scroll to (input position minus some offset)
      const scrollToY = Math.max(0, pageY - 420); // Adjust 120 based on your header height
      scrollViewRef.current?.scrollTo({
        y: scrollToY,
        animated: true
      });
    });
  };

  // Alternatively, you can use this simpler approach without measure
  const scrollToReason = () => {
    // Scroll to a specific position where the reason section is
    // You might need to adjust the 450 value based on your content
    scrollViewRef.current?.scrollTo({
      y: 450,
      animated: true
    });
  };

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
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = new Date(date);
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
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

    if (editMode === 'start' && newStartDate) {
      const startStr = formatDateToString(newStartDate);
      
      if (dateRange.endDate) {
        const existingEnd = new Date(dateRange.endDate);
        if (newStartDate > existingEnd) {
          setDateRange({ startDate: newStartDate, endDate: newStartDate });
          onFormChange({
            ...leaveForm,
            startDate: startStr,
            endDate: startStr,
          });
        } else {
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
      const endStr = formatDateToString(newEndDate);
      
      if (dateRange.startDate) {
        const existingStart = new Date(dateRange.startDate);
        if (newEndDate < existingStart) {
          setDateRange({ startDate: newEndDate, endDate: newEndDate });
          onFormChange({
            ...leaveForm,
            startDate: endStr,
            endDate: endStr,
          });
        } else {
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
      return '📍 Tap a date below to update start date';
    }
    if (editMode === 'end') {
      return '📍 Tap a date below to update end date';
    }
    if (!dateRange.startDate) {
      return '💡 Tip: Select start date, then end date from calendar';
    }
    if (dateRange.startDate && !dateRange.endDate) {
      return '✓ Start set. Now select end date';
    }
    return '✓ Dates selected. Tap date boxes to edit';
  };

  const renderContent = () => (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.modalContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Header */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Apply Leave</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Date Selection Section */}
      <View style={styles.section}>
        {/* Selected Dates Display */}
        <View style={styles.dateDisplayContainer}>
          <TouchableOpacity 
            style={[
              styles.dateBox,
              editMode === 'start' && styles.dateBoxActive
            ]}
            onPress={handleEditStartDate}
            disabled={!dateRange.startDate}
            activeOpacity={0.7}
          >
            <Text style={styles.dateLabel}>Start</Text>
            <Text style={[
              styles.dateValue,
              !dateRange.startDate && styles.dateValuePlaceholder
            ]}>
              {dateRange.startDate ? formatDate(new Date(dateRange.startDate)) : 'Select'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.dateArrow}>
            <Text style={styles.dateArrowText}>→</Text>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.dateBox,
              editMode === 'end' && styles.dateBoxActive
            ]}
            onPress={handleEditEndDate}
            disabled={!dateRange.endDate}
            activeOpacity={0.7}
          >
            <Text style={styles.dateLabel}>End</Text>
            <Text style={[
              styles.dateValue,
              !dateRange.endDate && styles.dateValuePlaceholder
            ]}>
              {dateRange.endDate ? formatDate(new Date(dateRange.endDate)) : 'Select'}
            </Text>
          </TouchableOpacity>

          {(dateRange.startDate || dateRange.endDate) && (
            <TouchableOpacity
              style={styles.clearIconButton}
              onPress={handleClearDates}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Duration Badge */}
        {leaveForm.startDate && leaveForm.endDate && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {getDaysCount()} {getDaysCount() === 1 ? 'day' : 'days'}
            </Text>
          </View>
        )}

        {/* Calendar */}
        <View style={[
          styles.calendarContainer,
          editMode !== 'none' && styles.calendarContainerActive
        ]}>
          <DateTimePicker
            mode="range"
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={handleDateChange}
            timePicker={false}
            selectedItemColor={colors.primary}
            selectedRangeBackgroundColor={colors.primary + '20'}
            headerButtonColor={colors.primary}
            weekDaysTextStyle={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}
            calendarTextStyle={{ color: colors.text, fontSize: 13 }}
            headerTextStyle={{ color: colors.text, fontSize: 15, fontWeight: '600' }}
            selectedTextStyle={{ color: colors.white, fontWeight: '600' }}
            todayContainerStyle={{
              borderColor: colors.success,
              borderWidth: 2,
            }}
            buttonPrevIcon={<Text style={styles.navIcon}>‹</Text>}
            buttonNextIcon={<Text style={styles.navIcon}>›</Text>}
            firstDayOfWeek={0}
            displayFullDays={true}
          />
        </View>
      </View>

      {/* Leave Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leave Type</Text>
        <View style={styles.leaveTypeGrid}>
          {[
            { key: 'casual', label: 'Casual', icon: '☀️', color: colors.error },
            { key: 'sick', label: 'Sick', icon: '🤒', color: colors.success },
            { key: 'earned', label: 'Earned', icon: '⭐', color: colors.blue }
          ].map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.leaveTypeCard,
                leaveForm.leaveType === type.key && styles.leaveTypeCardActive,
                leaveForm.leaveType === type.key && { borderColor: type.color }
              ]}
              onPress={() => onFormChange({ ...leaveForm, leaveType: type.key })}
              activeOpacity={0.7}
            >
              <Text style={styles.leaveTypeIcon}>{type.icon}</Text>
              <Text style={[
                styles.leaveTypeText,
                leaveForm.leaveType === type.key && styles.leaveTypeTextActive
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Reason */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reason</Text>
        <TextInput
          ref={reasonInputRef}
          style={styles.reasonInput}
          value={leaveForm.reason}
          onChangeText={(text) => onFormChange({ ...leaveForm, reason: text })}
          placeholder="Brief reason for leave..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={200}
          onFocus={handleReasonInputFocus}
        />
        <Text style={styles.characterCount}>
          {leaveForm.reason.length}/200
        </Text>
      </View>

      {/* Bottom Spacing */}
      <View style={{ height: 70 }} />
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <View style={styles.modalWrapper}>
            {renderContent()}
            
            {/* Fixed Bottom Buttons */}
            <View style={styles.bottomButtons}>
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
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    width: '100%',
  },
  modalWrapper: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    maxHeight: '95%',
    marginLeft: 15,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    maxHeight: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    position: 'absolute',
    right: spacing.lg,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
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
  dateDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dateBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: 60,
    justifyContent: 'center',
  },
  dateBoxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
    borderStyle: 'dashed',
  },
  dateLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  dateValuePlaceholder: {
    color: colors.textSecondary,
    fontWeight: '400',
    fontSize: 12,
  },
  dateArrow: {
    paddingHorizontal: 4,
  },
  dateArrowText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  clearIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearIcon: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  durationBadge: {
    backgroundColor: colors.success + '15',
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  durationText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  helperContainer: {
    marginBottom: spacing.sm,
  },
  helperText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  helperTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: 4,
  },
  calendarContainerActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '05',
  },
  navIcon: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
  },
  leaveTypeGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  leaveTypeCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: 75,
    justifyContent: 'center',
  },
  leaveTypeCardActive: {
    backgroundColor: colors.white,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leaveTypeIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  leaveTypeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  leaveTypeTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  reasonInput: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  bottomButtons: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    borderRadius: borderRadius.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    minHeight: 44,
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
  },
});

export default LeaveModal;