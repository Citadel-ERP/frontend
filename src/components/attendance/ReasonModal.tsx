import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../styles/theme';
import { ReasonOption } from './types';

interface ReasonModalProps {
  visible: boolean;
  type: 'checkin' | 'checkout';
  title: string;
  subtitle: string;
  selectedReason: string;
  onReasonSelect: (reason: string) => void;
  customReason: string;
  onCustomReasonChange: (reason: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  loading: boolean;
  reasons: ReasonOption[];
}

const ReasonModal: React.FC<ReasonModalProps> = ({
  visible,
  type,
  title,
  subtitle,
  selectedReason,
  onReasonSelect,
  customReason,
  onCustomReasonChange,
  onSubmit,
  onClose,
  loading,
  reasons,
}) => {
  const showCustomInput = selectedReason === 'other';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalSubtitle}>{subtitle}</Text>

          <ScrollView style={styles.reasonsList}>
            {reasons.map((reason) => (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonOption,
                  selectedReason === reason.value && styles.selectedReasonOption
                ]}
                onPress={() => onReasonSelect(reason.value)}
              >
                <View style={styles.radioContainer}>
                  <View
                    style={[
                      styles.radio,
                      selectedReason === reason.value && styles.radioSelected
                    ]}
                  >
                    {selectedReason === reason.value && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    styles.reasonText,
                    selectedReason === reason.value && styles.selectedReasonText
                  ]}
                >
                  {reason.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {showCustomInput && (
            <View style={styles.customReasonContainer}>
              <Text style={styles.customReasonLabel}>
                Please specify your reason:
              </Text>
              <TextInput
                style={styles.customReasonInput}
                placeholder={`Enter ${type === 'checkin' ? 'attendance' : 'checkout'} reason...`}
                value={customReason}
                onChangeText={onCustomReasonChange}
                multiline
                numberOfLines={3}
                maxLength={200}
                editable={!loading}
              />
            </View>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.submitButton,
                (!selectedReason || (showCustomInput && !customReason.trim())) && 
                styles.submitButtonDisabled
              ]}
              onPress={onSubmit}
              disabled={
                loading || 
                !selectedReason || 
                (showCustomInput && !customReason.trim())
              }
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {type === 'checkin' ? 'Mark Attendance' : 'Mark Checkout'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
  },
  reasonsList: {
    maxHeight: 200,
    marginBottom: spacing.lg,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  selectedReasonOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  radioContainer: {
    marginRight: spacing.md,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  reasonText: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  selectedReasonText: {
    color: colors.primary,
    fontWeight: '500',
  },
  customReasonContainer: {
    marginBottom: spacing.lg,
  },
  customReasonLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    textAlignVertical: 'top',
    minHeight: 80,
    backgroundColor: colors.white,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textSecondary + '80',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  submitButtonText: {
    fontSize: fontSize.md,
    color: colors.white,
    fontWeight: '600',
  },
});

export default ReasonModal;