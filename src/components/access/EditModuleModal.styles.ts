/**
 * Styles for Edit Module Modal
 */

import { StyleSheet, Platform } from 'react-native';
import { WHATSAPP_COLORS } from './constants';

export const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    width: Platform.OS === 'web' ? 500 : '100%',
    maxWidth: 500,
    maxHeight: '80%',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: WHATSAPP_COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  formGroup: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: WHATSAPP_COLORS.text,
    backgroundColor: '#FFFFFF',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  iconOption: {
    width: '20%',
    alignItems: 'center',
    padding: 12,
    margin: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  iconOptionSelected: {
    borderColor: WHATSAPP_COLORS.primary,
    backgroundColor: `${WHATSAPP_COLORS.primary}10`,
  },
  iconLabel: {
    fontSize: 11,
    marginTop: 4,
    color: WHATSAPP_COLORS.textSecondary,
  },
  iconLabelSelected: {
    color: WHATSAPP_COLORS.primary,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  saveButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  cancelButtonText: {
    color: WHATSAPP_COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});