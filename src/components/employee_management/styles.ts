import { StyleSheet, Dimensions, Platform } from 'react-native';
import { WHATSAPP_COLORS } from './constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: WHATSAPP_COLORS.background,
    },
    headerBanner: {
        height: 250,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
        position: 'relative',
    },
    disabledButton: {
        opacity: 0.6,
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
        paddingBottom: 10,
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
    sectionTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    detailsSectionTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    detailsSectionSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    backIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
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
        fontSize: 14,
        marginLeft: 2,
    },


    // Search
    searchContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 16,
        position: 'relative',
        zIndex: 1,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
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

    // Scroll & Content
    scrollView: {
        flex: 1,
        backgroundColor: WHATSAPP_COLORS.background,
    },
    scrollContent: {
        paddingBottom: 32,
    },

    // Employee List
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

    // Employee Card
    employeeCard: {
        backgroundColor: WHATSAPP_COLORS.surface,
        borderRadius: 8,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
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

    // List Footer
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

    // Profile Header in Details
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

    // Info Cards
    infoCardsContainer: {
        paddingHorizontal: 16,
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

    // Attendance
    // attendanceHeader: {
    //     padding: 16,
    //     backgroundColor: WHATSAPP_COLORS.surface,
    //     borderRadius: 12,
    //     marginHorizontal: 16,
    //     marginBottom: 16,
    // },
    attendanceTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: WHATSAPP_COLORS.textPrimary,
        marginBottom: 4,
    },
    attendanceSubtitle: {
        fontSize: 14,
        color: WHATSAPP_COLORS.textSecondary,
    },
    // attendanceSummary: {
    //     backgroundColor: WHATSAPP_COLORS.surface,
    //     borderRadius: 12,
    //     padding: 16,
    //     marginHorizontal: 16,
    //     marginBottom: 16,
    //     shadowColor: '#000',
    //     shadowOffset: { width: 0, height: 2 },
    //     shadowOpacity: 0.05,
    //     shadowRadius: 4,
    //     elevation: 2,
    // },
    // summaryRow: {
    //     flexDirection: 'row',
    //     justifyContent: 'space-between',
    //     gap: 8,
    // },
    // summaryCard: {
    //     flex: 1,
    //     alignItems: 'center',
    //     paddingVertical: 12,
    //     borderRadius: 8,
    // },
    // summaryValue: {
    //     fontSize: 20,
    //     fontWeight: 'bold',
    //     marginBottom: 4,
    // },
    // summaryLabel: {
    //     fontSize: 12,
    //     fontWeight: '600',
    // },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    monthNavButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: WHATSAPP_COLORS.background,
    },
    // monthYearText: {
    //     fontSize: 18,
    //     fontWeight: '600',
    //     color: WHATSAPP_COLORS.textPrimary,
    // },
    // calendarContainer: {
    //     backgroundColor: WHATSAPP_COLORS.surface,
    //     borderRadius: 12,
    //     padding: 16,
    //     marginHorizontal: 16,
    //     marginBottom: 16,
    //     shadowColor: '#000',
    //     shadowOffset: { width: 0, height: 2 },
    //     shadowOpacity: 0.05,
    //     shadowRadius: 4,
    //     elevation: 2,
    // },
    // weekDays: {
    //     flexDirection: 'row',
    //     justifyContent: 'space-around',
    //     marginBottom: 12,
    // },
    // weekDayText: {
    //     fontSize: 14,
    //     fontWeight: '500',
    //     color: '#6B7280',
    //     width: `${100 / 7}%`,
    //     textAlign: 'center',
    // },
    // calendarGrid: {
    //     flexDirection: 'row',
    //     flexWrap: 'wrap',
    // },
    // calendarDay: {
    //     width: `${100 / 7}%`,
    //     aspectRatio: 1,
    //     alignItems: 'center',
    //     justifyContent: 'center',
    //     paddingVertical: 4,
    // },
    // dayCircle: {
    //     width: 44,
    //     height: 44,
    //     borderRadius: 22,
    //     alignItems: 'center',
    //     justifyContent: 'center',
    //     backgroundColor: 'transparent',
    // },
    // todayCircle: {
    //     borderWidth: 2,
    //     borderColor: '#000000',
    // },

    // dayText: {
    //     fontSize: 16,
    //     fontWeight: '500',
    // },

    // navButtonText: {
    //     fontSize: 24,
    //     color: '#111827',
    //     fontWeight: '300',
    // },
    // legendContainer: {
    //     backgroundColor: WHATSAPP_COLORS.surface,
    //     borderRadius: 12,
    //     padding: 16,
    //     marginHorizontal: 16,
    //     marginBottom: 16,
    //     shadowColor: '#000',
    //     shadowOffset: { width: 0, height: 2 },
    //     shadowOpacity: 0.05,
    //     shadowRadius: 4,
    //     elevation: 2,
    // },

    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 8,
    },

    // legendItem: {
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     minWidth: 100,
    // },

    // legendDot: {
    //     width: 12,
    //     height: 12,
    //     borderRadius: 6,
    //     marginRight: 8,
    // },

    // legendText: {
    //     fontSize: 13,
    //     color: WHATSAPP_COLORS.textSecondary,
    // },
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
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
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
        backgroundColor: WHATSAPP_COLORS.error,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },

    // Loading Overlay
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
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

    downloadContainer: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },

    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#075E54',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
        minHeight: 48,
    },

    downloadButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
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

    // Update existing styles
    attendanceHeader: {
        display: 'none', // Hide the old header
    },

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
});