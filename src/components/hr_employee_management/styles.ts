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
    height: 200,
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
  // sectionTitle: {
  //   fontSize: 24,
  //   fontWeight: '700',
  //   color: '#fff',
  //   marginBottom: 4,
  // },
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
    zIndex: 1000,
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
    width: '85%',
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
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 26,  
    fontWeight: '700',
    color: '#FFFFFF',  
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
});