/**
 * Main Styles for Module Access Management
 */

import { StyleSheet, Platform, Dimensions } from 'react-native';
import { WHATSAPP_COLORS } from './constants';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  container: {
    flex: 1,
  },
  containerWeb: {
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  header: {
    backgroundColor: WHATSAPP_COLORS.headerBg,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  refreshButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.surface,
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: WHATSAPP_COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },

  // City Section
  citySection: {
    marginBottom: 16,
  },
  cityHeader: {
    backgroundColor: WHATSAPP_COLORS.secondary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cityHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityIcon: {
    marginRight: 12,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cityEmployeeCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  cityEmployeesContainer: {
    backgroundColor: WHATSAPP_COLORS.surface,
  },

  // Employee Card
  employeeCard: {
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  employeeCardContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarDefault: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.surface,
  },
  employeeInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '500',
    color: WHATSAPP_COLORS.text,
    flex: 1,
  },
  employeeDesignation: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 4,
  },
  employeeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeId: {
    fontSize: 13,
    color: WHATSAPP_COLORS.textTertiary,
  },
  chevronIcon: {
    marginLeft: 8,
  },

  // Module Item
  modulesContainer: {
    padding: 16,
    gap: 12,
  },
  moduleItem: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      },
    }),
  },
  moduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  moduleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${WHATSAPP_COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moduleName: {
    fontSize: 16,
    color: WHATSAPP_COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  moduleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  grantButton: {
    backgroundColor: WHATSAPP_COLORS.success,
  },
  revokeButton: {
    backgroundColor: WHATSAPP_COLORS.error,
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  revokeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: `${WHATSAPP_COLORS.textTertiary}20`,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: WHATSAPP_COLORS.text,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyModules: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyModulesText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textTertiary,
    marginTop: 12,
  },
  clearSearchButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  clearSearchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },

  // List Footer
  listFooter: {
    padding: 16,
    alignItems: 'center',
  },
  listFooterText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
  },
});