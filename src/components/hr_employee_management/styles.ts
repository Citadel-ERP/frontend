// hr_employee_management/styles.ts
import { StyleSheet, Dimensions, Platform } from 'react-native';
import { WHATSAPP_COLORS } from './constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const styles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },

  // Header styles
  headerBanner: {
    height: 250,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  detailsHeaderBanner: {
    height: 250,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  headerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  infoCardContent: {
    marginBottom: 8,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    position: 'relative',
    zIndex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    width: 80,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  logoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 32,
    justifyContent: 'center',
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
    zIndex: 1,
  },
  detailsTitleSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
    zIndex: 1,
  },
  detailsSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',  // Slightly transparent white
    marginTop: 4,
  },
  detailsSectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  headerActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 15,
    gap: 10,
  },
  headerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  headerActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },

  // Search and Download
  searchAndDownloadContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 2,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  searchInputContainerFocused: {
    borderColor: WHATSAPP_COLORS.accent,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Employee List
  scrollView: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  employeesList: {
    paddingHorizontal: 16,
  },
  listHeader: {
    marginBottom: 16,
    marginTop: 10,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  employeeCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  employeeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
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
    marginBottom: 2,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  employeeTime: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    marginLeft: 8,
  },
  employeeDesignation: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 2,
  },
  employeeLastMessage: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    marginBottom: 6,
  },
  leaveBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  leaveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  leaveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  chevronIcon: {
    marginLeft: 8,
  },
  listFooter: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  listFooterText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    paddingHorizontal: 24,
  },
  emptyStateIcon: {
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  clearSearchButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  clearSearchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Details Content
  detailsContent: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },

  // Tab Navigation
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: WHATSAPP_COLORS.surface,
    marginTop: -20,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: WHATSAPP_COLORS.chatBubbleSent,
  },
  tabLabel: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    marginTop: 4,
  },
  activeTabLabel: {
    color: WHATSAPP_COLORS.primary,
    fontWeight: '600',
  },

  // Profile Header
  profileHeader: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileAvatarDefault: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarInitials: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileStatusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.surface,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  profileDesignation: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 4,
  },
  profileId: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
  },
  actionMenuButton: {
    padding: 8,
  },
  actionMenu: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 200,
    zIndex: 10000,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  actionMenuText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
  },

  // Info Cards
  infoCardsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    zIndex: 1,
  },
  infoCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  viewUpdateButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewUpdateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
  },
  infoSubtext: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: WHATSAPP_COLORS.border,
    marginVertical: 8,
  },

  // Leave Balance
  leaveBalanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  leaveBalanceItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  leaveBalanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  leaveBalanceLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // No Data
  noDataContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textTertiary,
    fontStyle: 'italic',
  },

  // Payslip
  payslipContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  payslipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  payslipButtonText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '500',
  },

  // Action Buttons
  giftBasketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9500',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
  },
  giftBasketButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  offboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D32F2F',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
  },
  offboardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Attendance
  attendanceSummary: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 80,
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  navButtonText: {
    fontSize: 24,
    color: '#111827',
    fontWeight: '300',
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayCircle: {
    width: Platform.OS === 'web' ? '35%' : '85%',
    aspectRatio: 1,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  todayCircle: {
    borderWidth: 2,
    borderColor: '#1e1b4b',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dayTextActive: {
    fontWeight: '600',
  },
  dayTextInactive: {
    color: '#9ca3af',
  },
  legendContainer: {
    marginTop: 8,
  },
  legendVisible: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 10,
    color: '#6b7280',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    marginRight: 4,
  },
  viewMoreIcon: {
    fontSize: 10,
    color: '#3b82f6',
    marginLeft: 2,
  },
  legendExpanded: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  viewLessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 6,
  },
  viewLessIcon: {
    fontSize: 10,
    color: '#3b82f6',
    marginLeft: 4,
  },
  attendanceActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  attendanceActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.primary,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  attendanceActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  downloadContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  statusTooltip: {
    position: 'absolute',
    top: 200,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  statusTooltipText: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    color: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: '600',
    overflow: 'hidden',
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.9)',
    marginTop: -1,
  },

  // Leaves
  leavesHeader: {
    padding: 16,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  leavesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  leavesSubtitle: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  leaveCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  leaveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leaveHeaderInfo: {
    flex: 1,
  },
  leaveType: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  leaveDates: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  leaveStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  leaveStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  leaveReason: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 12,
    lineHeight: 20,
  },
  leaveReasonLabel: {
    fontWeight: '600',
  },
  leaveActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  leaveActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  leaveActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  managerComment: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  managerCommentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  managerCommentText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    fontStyle: 'italic',
  },
  emptyLeaves: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    paddingHorizontal: 24,
  },
  emptyLeavesTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyLeavesText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: WHATSAPP_COLORS.textPrimary,
  },
  modalDescription: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  datePickerText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: WHATSAPP_COLORS.border,
  },
  cancelButtonText: {
    color: WHATSAPP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    minHeight: 120,
    marginBottom: 24,
    backgroundColor: WHATSAPP_COLORS.background,
    textAlignVertical: 'top',
  },

  // Edit Form
  editForm: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  editInput: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    backgroundColor: WHATSAPP_COLORS.background,
  },

  // Assets
  assetsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  assetsModalContainer: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  assetsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  assetsModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  section: {
    backgroundColor: WHATSAPP_COLORS.surface,
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  sectionTitleAlt: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: WHATSAPP_COLORS.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  assetType: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 2,
  },
  assetCount: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
  },
  assignButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  assignedAssetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: WHATSAPP_COLORS.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  assignedAssetInfo: {
    flex: 1,
  },
  assignedAssetName: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  assignedAssetDetails: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  removeButton: {
    padding: 8,
  },
  noAssetsText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },

  // Holiday Management
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  // headerActions: {
  //   flexDirection: 'row',
  //   gap: 8,
  // },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  content: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  holidayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 8,
    marginBottom: 8,
  },
  holidayInfo: {
    flex: 1,
  },
  holidayName: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  holidayDate: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 2,
  },
  holidayCities: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    marginBottom: 4,
  },
  holidayDescription: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 8,
  },

  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Disabled Button
  disabledButton: {
    opacity: 0.6,
  },
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 2,
  },
  uploadPayslipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  uploadPayslipButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  yearSection: {
    marginBottom: 24,
  },
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: WHATSAPP_COLORS.background,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  yearHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  yearBadge: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  yearBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  payslipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  payslipIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payslipInfo: {
    flex: 1,
  },
  payslipMonth: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  payslipDate: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
  },
  downloadButtonAlt: {
    backgroundColor: WHATSAPP_COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerContainer: {
  marginTop: 8,
  backgroundColor: WHATSAPP_COLORS.surface,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: WHATSAPP_COLORS.border,
  maxHeight: 200,
},
  monthPicker: {
    flexDirection: 'row',
  },
  monthButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: WHATSAPP_COLORS.background,
    marginRight: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  monthButtonActive: {
    backgroundColor: WHATSAPP_COLORS.primary,
    borderColor: WHATSAPP_COLORS.primary,
  },
  monthButtonText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '500',
  },
  monthButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  yearPickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  yearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: WHATSAPP_COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  yearButtonActive: {
    backgroundColor: WHATSAPP_COLORS.primary,
    borderColor: WHATSAPP_COLORS.primary,
  },
  yearButtonText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '500',
  },
  yearButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    backgroundColor: WHATSAPP_COLORS.background,
    gap: 12,
  },
  filePickerText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    flex: 1,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  selectedFileName: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  documentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
  },
  documentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WHATSAPP_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  }, statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusIcon: {
    marginRight: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  statusSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },

  // Family Member Card Styles
  familyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  familyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitials: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#075E54',
  },
  memberRelationship: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  familyDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // HR Signature Card Styles
  hrCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  hrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  hrTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#25D366',
  },
  signatureImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  hrDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },

  // Action Button Styles
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 24,
    marginTop: 16,
  },
  actionButtonLarge: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  saveButton: {
    backgroundColor: '#25D366',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Utility Styles
  bottomSpacer: {
    height: 40,
  },
  sectionAlt: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  detailCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 44, // For better touch targets
  },

  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    fontWeight: '500',
  },

  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#075E54',
    textAlign: 'right',
    maxWidth: '60%', // Prevent overflow
  },

  detailDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },

  // Detail Badge Styles (for family member tags)
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  badgeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  // Warning Card Style
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F2',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },

  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: '500',
    lineHeight: 20,
  },

  stepProgress: {
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },

  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    width: '100%'
  },

  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },

  stepConnector: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
  },

  stepLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  stepLabel: {
    fontSize: 11,
    color: WHATSAPP_COLORS.textTertiary,
    textAlign: 'center',
    flex: 1,
    fontWeight: '500',
  },

  stepLabelActive: {
    color: WHATSAPP_COLORS.primary,
    fontWeight: '700',
  },

  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  stepIndicatorActive: {
    backgroundColor: WHATSAPP_COLORS.primary,
    borderColor: WHATSAPP_COLORS.primary,
  },

  stepIndicatorInactive: {
    backgroundColor: 'transparent',
    borderColor: WHATSAPP_COLORS.textTertiary,
  },

  stepIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
  },

  stepIndicatorTextActive: {
    color: '#fff',
  },

  stepIndicatorTextInactive: {
    color: WHATSAPP_COLORS.textTertiary,
  },


  stepConnectorActive: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },

  stepConnectorInactive: {
    backgroundColor: WHATSAPP_COLORS.border,
  },

  formGroup: {
  marginBottom: 16,
  position: 'relative', 
  zIndex: 1,  
},

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    backgroundColor: WHATSAPP_COLORS.background,
  },

  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  helperText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    marginTop: 4,
  },

  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: WHATSAPP_COLORS.chatBubbleReceived,
    gap: 4,
  },

  copyButtonText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '500',
  },

  officeList: {
    marginTop: 8,
  },

  officeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: WHATSAPP_COLORS.background,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },

  officeItemSelected: {
    borderColor: WHATSAPP_COLORS.primary,
    backgroundColor: WHATSAPP_COLORS.chatBubbleReceived,
  },

  officeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WHATSAPP_COLORS.chatBubbleReceived,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  officeInfo: {
    flex: 1,
  },

  officeName: {
  fontSize: 14,
  fontWeight: '600',
  color: WHATSAPP_COLORS.textPrimary,
  marginBottom: 2,
},

  officeNameSelected: {
    color: WHATSAPP_COLORS.primary,
  },

  officeAddress: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
  },

  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: WHATSAPP_COLORS.background,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    position: 'relative',
  },

  tagItemSelected: {
    backgroundColor: WHATSAPP_COLORS.primary,
    borderColor: WHATSAPP_COLORS.primary,
  },

  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: WHATSAPP_COLORS.textPrimary,
  },

  tagTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },

  tagType: {
    fontSize: 10,
    color: WHATSAPP_COLORS.textTertiary,
    marginLeft: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: WHATSAPP_COLORS.border,
    borderRadius: 4,
  },

  tagCheck: {
    marginLeft: 4,
  },

  uploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: WHATSAPP_COLORS.background,
    marginBottom: 16,
  },

  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.primary,
    marginTop: 12,
    marginBottom: 4,
  },

  uploadButtonSubtext: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
  },

  uploadedDocuments: {
    marginTop: 16,
  },

  uploadedDocumentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 12,
  },

  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: WHATSAPP_COLORS.background,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },

  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: WHATSAPP_COLORS.chatBubbleReceived,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  documentSize: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
  },

  removeDocumentButton: {
    padding: 4,
  },

  reviewSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  reviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    width: 100,
  },

  reviewValue: {
    flex: 1,
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },

  reviewTags: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },

  reviewTag: {
    backgroundColor: WHATSAPP_COLORS.chatBubbleReceived,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },

  reviewTagText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '500',
  },

  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
    gap: 12,
  },

  footerButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },

  secondaryButton: {
    backgroundColor: WHATSAPP_COLORS.background,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },

  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  secondaryButtonText: {
    color: WHATSAPP_COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },

  officePickerContainer: {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  backgroundColor: '#fff',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#ddd',
  maxHeight: 300,
  zIndex: 9999,  
  marginTop: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 5,
},
  officeOption: {
  padding: 16,
  borderBottomWidth: 1,
  borderBottomColor: WHATSAPP_COLORS.border,
},

  officeOptionSelected: {
    backgroundColor: WHATSAPP_COLORS.chatBubbleReceived,
  },

  officeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: WHATSAPP_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  officeIconSelected: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },

  officeLocation: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
    marginTop: 2,
  },

  officePickerCloseButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },

  officePickerCloseText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Tag Content Styles
  tagContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  tagTypeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    color: '#fff',
  },

  // Info Box Styles
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.chatBubbleReceived,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginVertical: 16,
  },

  infoText: {
    flex: 1,
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    lineHeight: 20,
    fontWeight: '500',
  },

  // Selected Tags Preview Styles
  selectedTagsPreview: {
    backgroundColor: WHATSAPP_COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },

  selectedTagsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 10,
  },

  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  selectedTagBadge: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: WHATSAPP_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  selectedTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Reporting Tag Styles
  reportingTag: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  officeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  officeCardSelected: {
    borderColor: WHATSAPP_COLORS.primary,
    backgroundColor: '#E8F5E9',
    shadowColor: WHATSAPP_COLORS.primary,
    shadowOpacity: 0.15,
    elevation: 6,
  },

  officeCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: WHATSAPP_COLORS.chatBubbleReceived,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  officeCardIconSelected: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },

  officeCardContent: {
    flex: 1,
  },

  officeCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },

  officeCardNameSelected: {
    color: WHATSAPP_COLORS.primary,
  },

  officeCardAddress: {
    fontSize: 13,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 3,
    lineHeight: 18,
  },

  officeCardLocation: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    fontWeight: '500',
  },

  officeCardCheck: {
    marginLeft: 12,
  },

  // Reporting Banner Styles
  selectedReportingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.primary,
  },

  selectedReportingLabel: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },

  selectedReportingValue: {
    fontSize: 16,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '700',
  },

  clearReportingButton: {
    padding: 4,
  },
  citySection: {
    marginBottom: 16,
  },
  cityHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 14,
  paddingHorizontal: 16,
  backgroundColor: '#075E54', 
  borderRadius: 12,
  marginHorizontal: 12,
  marginBottom: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
  cityHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cityIcon: {
    marginRight: 10,
  },
  cityName: {
  fontSize: 16,
  fontWeight: '600',
  color: '#FFFFFF', // White text
  letterSpacing: 0.3,
},
  cityEmployeeCount: {
  fontSize: 13,
  color: 'rgba(255, 255, 255, 0.85)', // White with slight transparency
  marginTop: 2,
},
  cityEmployeesContainer: {
    paddingLeft: 8,
  },
  summaryHeader: {
    backgroundColor: '#ffffff00',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: WHATSAPP_COLORS.accent,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: WHATSAPP_COLORS.accent,
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 13,
    color: WHATSAPP_COLORS.textSecondary,
  },
  loadMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    fontStyle: 'italic',
  },
  addButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',  
  paddingHorizontal: 16,
  paddingVertical: 8,
  gap: 6,
  borderRadius: 8,
  whiteSpace: 'nowrap',
},
  addButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '400',
},
});