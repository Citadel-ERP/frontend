
import { StyleSheet, Dimensions, Platform } from 'react-native';
import { WHATSAPP_COLORS } from './constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: WHATSAPP_COLORS.white
    },
    headerAddButton: {
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        },
attachedFilesPreview: {
    position: 'absolute',  // Add this
    bottom: 68,            // Add this (height of chatInputContainer + padding)
    left: 0,               // Add this
    right: 0,              // Add this
    backgroundColor: WHATSAPP_COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    maxHeight: 200,
},

previewImageWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
},

previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
},

removeFileButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 2,
},

previewDocumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
},

previewDocumentInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
},

previewDocumentName: {
    fontSize: 14,
    fontWeight: '500',
    color: WHATSAPP_COLORS.darkGray,
    marginBottom: 2,
},

previewDocumentSize: {
    fontSize: 12,
    color: WHATSAPP_COLORS.gray,
},

imageCounterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: WHATSAPP_COLORS.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.white,
},

imageCounterText: {
    fontSize: 10,
    fontWeight: '700',
    color: WHATSAPP_COLORS.white,
    paddingHorizontal: 4,
},

// Attachment Modal (update if exists or add)
attachmentModalContent: {
    backgroundColor: WHATSAPP_COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
},

attachmentIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
},

attachmentOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: WHATSAPP_COLORS.darkGray,
    textAlign: 'center',
},
        headerAddButtonDisabled: {
        backgroundColor: 'rgba(0, 210, 133, 0.5)',
        opacity: 0.6,
        },
        headerAddButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
        },
    header: {
        backgroundColor: WHATSAPP_COLORS.primaryDark,
        paddingHorizontal: 16,
        paddingBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 4,
        zIndex: 1
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 44
    },
    backIconContainer: {
        paddingVertical: 8,
        paddingHorizontal: 4,
        zIndex: 2
    },
    backIcon: {
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        display: 'flex',
        flexDirection: 'row',
        alignContent: 'center'
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
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 1
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: WHATSAPP_COLORS.white,
        letterSpacing: 0.5,
        textAlign: 'center'
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.85)',
        marginTop: 2,
        textAlign: 'center'
    },
    headerRight: {
        width: 60,
        alignItems: 'flex-end',
        zIndex: 10
    },
    headerRightButton: {
        padding: 8,
        zIndex: 10,
    },

    // Tab Bar Styles
    tabBar: {
        flexDirection: 'row',
        backgroundColor: WHATSAPP_COLORS.primary,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
        zIndex: 1
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
        position: 'relative'
    },
    activeTab: {
        borderBottomColor: WHATSAPP_COLORS.white
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.7)',
        marginLeft: 8
    },
    activeTabText: {
        color: WHATSAPP_COLORS.white
    },
    tabBadge: {
        backgroundColor: WHATSAPP_COLORS.white,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
        position: 'absolute',
        top: 8,
        right: 20
    },
    tabBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: WHATSAPP_COLORS.primary
    },

    // Content Area
   content: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
    position: 'relative', // ADD THIS
},
    scrollView: {
        flex: 1
    },

    // Action Cards
    actionCardsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12
    },
    actionCard: {
        flex: 1,
        backgroundColor: WHATSAPP_COLORS.white,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)'
    },
    actionCardIcon: {
        marginBottom: 8,
        backgroundColor: 'rgba(18, 140, 126, 0.1)',
        padding: 12,
        borderRadius: 12
    },
    actionCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: WHATSAPP_COLORS.darkGray,
        marginBottom: 4,
        textAlign: 'center'
    },
    actionCardSubtitle: {
        fontSize: 12,
        color: WHATSAPP_COLORS.gray,
        textAlign: 'center',
        lineHeight: 16
    },

    // List Styles
    listSection: {
        paddingHorizontal: 16,
        marginBottom: 30
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: WHATSAPP_COLORS.primaryDark,
        letterSpacing: 0.3,
        lineHeight: 28
    },
    sectionFilter: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    filterText: {
        fontSize: 14,
        color: WHATSAPP_COLORS.primary,
        marginRight: 4
    },

    // Item Card
    itemCard: {
        flexDirection: 'row',
        backgroundColor: WHATSAPP_COLORS.white,
        marginBottom: 12,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)'
    },
    itemIcon: {
        marginRight: 12,
        backgroundColor: 'rgba(18, 140, 126, 0.08)',
        padding: 10,
        borderRadius: 12,
        alignSelf: 'flex-start'
    },
    itemContent: {
        flex: 1,
        position: 'relative'
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: WHATSAPP_COLORS.darkGray,
        flex: 1,
        marginRight: 8
    },
    itemStatus: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 70,
        alignItems: 'center'
    },
    itemStatusText: {
        fontSize: 10,
        fontWeight: '700',
        color: WHATSAPP_COLORS.white,
        textTransform: 'uppercase'
    },
    itemEmployee: {
        fontSize: 13,
        color: WHATSAPP_COLORS.primary,
        fontWeight: '500',
        marginBottom: 6
    },
    itemDescription: {
        fontSize: 14,
        color: WHATSAPP_COLORS.gray,
        marginBottom: 12,
        lineHeight: 20
    },
    itemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    itemMeta: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    itemMetaText: {
        fontSize: 12,
        color: WHATSAPP_COLORS.gray,
        marginLeft: 4,
        marginRight: 12
    },
    metaIcon: {
        marginLeft: 12
    },

    // Loading States
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: WHATSAPP_COLORS.gray
    },

    // Empty States
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 32
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: WHATSAPP_COLORS.darkGray,
        marginTop: 16,
        marginBottom: 8
    },
    emptySubtitle: {
        fontSize: 14,
        color: WHATSAPP_COLORS.gray,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20
    },

    // Status Selector (for manager)
    statusSelector: {
        backgroundColor: WHATSAPP_COLORS.white,
        margin: 16,
        marginTop: 20,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)'
    },
    statusSelectorTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: WHATSAPP_COLORS.darkGray,
        marginBottom: 16
    },
    statusOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10
    },
    statusOption: {
        flex: 1,
        minWidth: '30%',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)'
    },
    statusOptionActive: {
        borderWidth: 2
    },
    statusOptionText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center'
    },

    // Chat/Info Styles (reuse from HR module with adjustments)
    chatContainer: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.chatBackground,
},

    chatScrollView: {
    flex: 1,
},
    chatScrollContent: {
    paddingVertical: 8,
    paddingBottom: 100, // Increase this from 80 to 100
},
    infoCardCompact: {
        backgroundColor: WHATSAPP_COLORS.white,
        margin: 12,
        marginTop: 8,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)'
    },
    infoHeaderCompact: {
        marginBottom: 12
    },
    infoTitleRowCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    infoIconContainerCompact: {
        backgroundColor: WHATSAPP_COLORS.primary,
        padding: 8,
        borderRadius: 8,
        marginRight: 10
    },
    infoTitleContentCompact: {
        flex: 1
    },
    infoTitleCompact: {
        fontSize: 16,
        fontWeight: '600',
        color: WHATSAPP_COLORS.darkGray,
        marginBottom: 2
    },
    infoStatusCompact: {
        fontSize: 12,
        color: WHATSAPP_COLORS.gray
    },
    infoEmployeeCompact: {
        fontSize: 13,
        color: WHATSAPP_COLORS.primary,
        fontWeight: '500',
        marginBottom: 6
    },
    infoDateCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start'
    },
    infoDateTextCompact: {
        fontSize: 11,
        color: WHATSAPP_COLORS.gray,
        marginLeft: 4
    },
    descriptionContainerCompact: {
        marginBottom: 12,
        backgroundColor: '#F9F9F9',
        padding: 12,
        borderRadius: 8
    },
    descriptionLabelCompact: {
        fontSize: 12,
        fontWeight: '600',
        color: WHATSAPP_COLORS.primary,
        marginBottom: 6,
        textTransform: 'uppercase'
    },
    descriptionTextCompact: {
        fontSize: 14,
        color: WHATSAPP_COLORS.darkGray,
        lineHeight: 20
    },
    infoFooterCompact: {
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
        paddingTop: 12
    },
    updateInfoCompact: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    infoFooterTextCompact: {
        fontSize: 11,
        color: WHATSAPP_COLORS.gray,
        marginLeft: 6
    },

    // Message/Chat Styles
    chatMessagesContainer: {
        flex: 1,
        minHeight: 300
    },
    messagesList: {
        flex: 1,
    },
    messagesListContent: {
        paddingHorizontal: 8,
        paddingBottom: 20
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingHorizontal: 8,
        alignItems: 'flex-end'
    },
    messageRowRight: {
        justifyContent: 'flex-end'
    },
    messageRowLeft: {
        justifyContent: 'flex-start'
    },
    otherAvatar: {
        marginRight: 8,
        marginBottom: 2
    },
    messageBubble: {
        maxWidth: '70%',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1
    },
    userBubble: {
        backgroundColor: WHATSAPP_COLORS.userBubble,
        borderBottomRightRadius: 4,
        marginLeft: 'auto'
    },
    otherBubble: {
        backgroundColor: WHATSAPP_COLORS.otherBubble,
        borderBottomLeftRadius: 4,
        marginRight: 'auto'
    },
    senderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    senderName: {
        fontSize: 12,
        fontWeight: '600',
        color: WHATSAPP_COLORS.primary,
        marginRight: 6
    },
    hrBadge: {
        backgroundColor: 'rgba(18, 140, 126, 0.1)',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 3
    },
    hrBadgeText: {
        fontSize: 9,
        color: WHATSAPP_COLORS.primary,
        fontWeight: 'bold'
    },
    imageWrapper: {
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 4,
    },
    commentImage: {
        width: 150,
        height: 150,
        borderRadius: 8,
        backgroundColor: '#F0F0F0',
    },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageText: {
        fontSize: 15,
        color: '#111111',
        lineHeight: 20,
        letterSpacing: 0.2
    },
    messageFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 2
    },
    messageTime: {
        fontSize: 11,
        color: 'rgba(0, 0, 0, 0.45)',
        marginRight: 4
    },
    chatInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: WHATSAPP_COLORS.inputBackground,
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8, // Add extra padding for iOS
    borderTopWidth: 0.5,
    borderTopColor: WHATSAPP_COLORS.inputBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
},
    chatInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: WHATSAPP_COLORS.inputBackground,
        borderRadius: 24,
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: WHATSAPP_COLORS.inputBorder
    },
    attachmentButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4,
        position: 'relative',
    },
    inputFieldContainer: {
        flex: 1,
        maxHeight: 100,
        minHeight: 36,
        justifyContent: 'center'
    },
    chatInput: {
        fontSize: 16,
        color: '#111111',
        paddingHorizontal: 12,
        paddingVertical: 8,
        maxHeight: 100,
        minHeight: 36,
        textAlignVertical: 'center'
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4
    },
    sendButtonActive: {
        backgroundColor: WHATSAPP_COLORS.sendButton,
        shadowColor: WHATSAPP_COLORS.sendButton,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2
    },
    sendButtonDisabled: {
        backgroundColor: WHATSAPP_COLORS.sendButtonDisabled
    },
    dateSeparatorContainer: {
        alignItems: 'center',
        marginVertical: 16
    },
    dateSeparatorBubble: {
        backgroundColor: 'rgba(225, 245, 254, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    dateSeparatorText: {
        fontSize: 12,
        color: '#666666',
        fontWeight: '500'
    },
    noMessages: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20
    },
    noMessagesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: WHATSAPP_COLORS.darkGray,
        marginTop: 16,
        marginBottom: 8
    },
    noMessagesText: {
        fontSize: 14,
        color: WHATSAPP_COLORS.gray,
        textAlign: 'center',
        lineHeight: 20
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },

    // Common Form Styles
    formCard: {
        backgroundColor: WHATSAPP_COLORS.white,
        margin: 16,
        marginTop: 20,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)'
    },
    formSection: {
        marginBottom: 24
    },
    formLabelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    formLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: WHATSAPP_COLORS.darkGray,
        marginLeft: 2
    },
    requiredLabel: {
        fontSize: 12,
        color: WHATSAPP_COLORS.red,
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10
    },
    textInput: {
        backgroundColor: WHATSAPP_COLORS.white,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: 'rgba(18, 140, 126, 0.3)',
        paddingHorizontal: 16,
        paddingVertical: 15,
        fontSize: 16,
        color: WHATSAPP_COLORS.darkGray,
        shadowColor: 'rgba(18, 140, 126, 0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
    },
    textAreaContainer: {
        backgroundColor: WHATSAPP_COLORS.white,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: 'rgba(18, 140, 126, 0.3)',
        shadowColor: 'rgba(18, 140, 126, 0.2)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
    },
    textArea: {
        minHeight: 140,
        fontSize: 16,
        color: WHATSAPP_COLORS.darkGray,
        padding: 16,
        textAlignVertical: 'top',
        lineHeight: 22
    },
    textAreaFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 10
    },
    characterHint: {
        fontSize: 12,
        color: WHATSAPP_COLORS.gray,
        marginLeft: 6
    },
    characterCount: {
        fontSize: 12,
        color: WHATSAPP_COLORS.gray,
        fontWeight: '500'
    },
    characterCountWarning: {
        color: WHATSAPP_COLORS.red,
        fontWeight: 'bold'
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginBottom: 30,
        gap: 10
    },
    cancelButton: {
        backgroundColor: WHATSAPP_COLORS.white,
        paddingVertical: 13,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(0, 0, 0, 0.12)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: WHATSAPP_COLORS.darkGray,
        marginLeft: 6,
        letterSpacing: 0.2
    },
    submitButton: {
        flex: 1,
        backgroundColor: WHATSAPP_COLORS.primary,
        paddingVertical: 13,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: WHATSAPP_COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3
    },
    submitButtonContent: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    submitButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: WHATSAPP_COLORS.white,
        marginLeft: 6,
        letterSpacing: 0.2
    },
    submitButtonDisabled: {
        backgroundColor: 'rgba(18, 140, 126, 0.4)',
        shadowOpacity: 0,
        opacity: 0.6
    },

    // Documents container in comments
    documentsContainer: {
        marginBottom: 8,
    },
    documentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 10,
        borderRadius: 8,
        marginBottom: 6,
    },
    documentIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    documentInfo: {
        flex: 1,
        marginLeft: 10,
    },
    documentName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 2,
    },
    documentSize: {
        fontSize: 12,
        color: '#666',
    },

    // Filter Modal
    filterModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end'
    },
    filterModalContainer: {
        backgroundColor: WHATSAPP_COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: screenHeight * 0.6
    },
    filterModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    filterModalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: WHATSAPP_COLORS.darkGray
    },
    filterSection: {
        marginBottom: 20
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: WHATSAPP_COLORS.darkGray,
        marginBottom: 12
    },
    filterOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    filterOption: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: WHATSAPP_COLORS.lightGray,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)'
    },
    filterOptionActive: {
        backgroundColor: WHATSAPP_COLORS.primary,
        borderColor: WHATSAPP_COLORS.primary
    },
    filterOptionText: {
        fontSize: 14,
        color: WHATSAPP_COLORS.darkGray
    },
    filterOptionTextActive: {
        color: WHATSAPP_COLORS.white,
        fontWeight: '600'
    },
    filterActionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        gap: 12
    },
    filterResetButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: WHATSAPP_COLORS.lightGray
    },
    filterApplyButton: {
        flex: 2,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: WHATSAPP_COLORS.primary
    },
    filterButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: WHATSAPP_COLORS.white
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: WHATSAPP_COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        width: '100%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: WHATSAPP_COLORS.primaryDark,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    modalHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    modalIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    modalTitleContainer: {
        flex: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: WHATSAPP_COLORS.white,
    },
    modalSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    modalCloseButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSearchSection: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: WHATSAPP_COLORS.primaryLight,
    },
    searchContainerModal: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: WHATSAPP_COLORS.lightGray,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchIconModal: {
        marginRight: 10,
    },
    searchInputModal: {
        flex: 1,
        fontSize: 16,
        color: WHATSAPP_COLORS.darkGray,
    },
    dropdownList: {
        flex: 1,
    },
    dropdownListContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        backgroundColor: WHATSAPP_COLORS.white,
        borderWidth: 1,
        borderColor: WHATSAPP_COLORS.primaryLight,
        marginTop: -1,
    },
    dropdownItemFirst: {
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        marginTop: 0,
    },
    dropdownItemLast: {
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    dropdownItemIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    dropdownItemContent: {
        flex: 1,
    },
    dropdownItemText: {
        fontSize: 16,
        fontWeight: '500',
        color: WHATSAPP_COLORS.darkGray,
        marginBottom: 2,
    },
    dropdownItemDescription: {
        fontSize: 13,
        color: WHATSAPP_COLORS.gray,
        lineHeight: 16,
    },
    dropdownItemArrow: {
        marginLeft: 8,
    },
    emptyDropdown: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyDropdownTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: WHATSAPP_COLORS.darkGray,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDropdownText: {
        fontSize: 14,
        color: WHATSAPP_COLORS.gray,
        textAlign: 'center',
        marginBottom: 20,
    },
    emptyDropdownButton: {
        backgroundColor: WHATSAPP_COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    emptyDropdownButtonText: {
        color: WHATSAPP_COLORS.white,
        fontSize: 14,
        fontWeight: '500',
    },
    resultsHeader: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: WHATSAPP_COLORS.primaryLight,
        marginBottom: 8,
    },
    resultsText: {
        fontSize: 13,
        color: WHATSAPP_COLORS.gray,
        fontWeight: '500',
    },
    modalFooter: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: WHATSAPP_COLORS.primaryLight,
    },
    customOptionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(18, 140, 126, 0.1)',
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: WHATSAPP_COLORS.primary,
        borderStyle: 'dashed',
    },
    customOptionButtonText: {
        color: WHATSAPP_COLORS.primary,
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 8,
    },
    attachmentOption: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: WHATSAPP_COLORS.lightGray,
        width: 120,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: WHATSAPP_COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 16,
        gap: 8,
    },
    emptyButtonText: {
        color: WHATSAPP_COLORS.white,
        fontSize: 14,
        fontWeight: '600',
    },
    statusOptionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    attachedFilesContainer: {
        backgroundColor: '#f9f9f9',
        padding: 12,
        marginHorizontal: 12,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    attachedFilesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: WHATSAPP_COLORS.darkGray,
        marginBottom: 8,
    },
    attachedFileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: WHATSAPP_COLORS.white,
        padding: 10,
        borderRadius: 6,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    attachedFileName: {
        flex: 1,
        fontSize: 14,
        color: WHATSAPP_COLORS.darkGray,
        marginHorizontal: 10,
    },
    scrollContentPadded: {
        flexGrow: 1,
        paddingTop: 16,
        paddingBottom: 100, // Space for fixed bottom buttons
    },

    infoCardBanner: {
        flexDirection: 'row',
        backgroundColor: 'rgba(18, 140, 126, 0.08)',
        marginHorizontal: 16,
        marginBottom: 20,
        padding: 16,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: WHATSAPP_COLORS.primary,
    },

    infoIconWrapper: {
        marginRight: 12,
        marginTop: 2,
    },

    infoTextWrapper: {
        flex: 1,
    },

    infoTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: WHATSAPP_COLORS.primaryDark,
        marginBottom: 4,
    },

    infoDescription: {
        fontSize: 13,
        color: WHATSAPP_COLORS.darkGray,
        lineHeight: 18,
    },

    modernFormCard: {
        backgroundColor: WHATSAPP_COLORS.white,
        marginHorizontal: 16,
        marginBottom: 20,
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },

    modernFormSection: {
        marginBottom: 0,
    },

    modernLabelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },

    modernLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: WHATSAPP_COLORS.darkGray,
        letterSpacing: 0.2,
    },

    requiredBadge: {
        backgroundColor: 'rgba(244, 67, 54, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },

    requiredBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: WHATSAPP_COLORS.red,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    modernInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#E8E8E8',
        paddingHorizontal: 14,
        paddingVertical: 4,
        minHeight: 56
    },

    modernInputContainerFocused: {
        borderColor: WHATSAPP_COLORS.primary,
        backgroundColor: WHATSAPP_COLORS.white,
        shadowColor: WHATSAPP_COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },

    inputIconContainer: {
        marginRight: 12,
        width: 24,
        alignItems: 'center',
    },

    modernTextInput: {
        flex: 1,
        fontSize: 16,
        color: WHATSAPP_COLORS.darkGray,
        paddingVertical: 16,
        fontWeight: '500',
    },

    modernTextAreaContainer: {
        flexDirection: 'row',
        backgroundColor: '#F8F9FA',
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#E8E8E8',
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 4,
        minHeight: 160,
    },

    textAreaIconContainer: {
        marginRight: 12,
        width: 24,
        paddingTop: 2,
    },

    modernTextArea: {
        flex: 1,
        fontSize: 16,
        color: WHATSAPP_COLORS.darkGray,
        paddingVertical: 0,
        paddingBottom: 12,
        textAlignVertical: 'top',
        lineHeight: 24,
        fontWeight: '500',
        minHeight: 120,
    },

    inputFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        paddingHorizontal: 4,
    },

    inputHintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },

    inputHint: {
        fontSize: 12,
        color: WHATSAPP_COLORS.gray,
        marginLeft: 6,
        lineHeight: 16,
    },

    characterCounter: {
        fontSize: 12,
        fontWeight: '600',
        color: WHATSAPP_COLORS.gray,
        marginLeft: 12,
    },

    characterCounterWarning: {
        color: WHATSAPP_COLORS.red,
        fontWeight: '700',
    },

    formDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 24,
    },

    // Preview Card
    previewCard: {
        backgroundColor: WHATSAPP_COLORS.white,
        marginHorizontal: 16,
        marginBottom: 20,
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },

    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },

    previewTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: WHATSAPP_COLORS.primary,
        marginLeft: 8,
    },

    previewContent: {
        gap: 12,
    },

    previewItem: {
        marginBottom: 8,
    },

    previewLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: WHATSAPP_COLORS.gray,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    previewValue: {
        fontSize: 14,
        color: WHATSAPP_COLORS.darkGray,
        lineHeight: 20,
        fontWeight: '500',
    },

    // Modern Action Buttons
    fixedBottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 16,
        backgroundColor: WHATSAPP_COLORS.white,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8,
        gap: 12,
    },

    modernCancelButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: WHATSAPP_COLORS.white,
        paddingVertical: 16,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        gap: 8,
    },

    modernCancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: WHATSAPP_COLORS.darkGray,
        letterSpacing: 0.3,
    },

    modernSubmitButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: WHATSAPP_COLORS.primary,
        paddingVertical: 16,
        borderRadius: 14,
        shadowColor: WHATSAPP_COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        gap: 8,
    },

    modernSubmitButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: WHATSAPP_COLORS.white,
        letterSpacing: 0.3,
    },

    modernSubmitButtonDisabled: {
        backgroundColor: '#B0BEC5',
        shadowOpacity: 0,
        elevation: 0,
    },
    androidContainer: { 
    flex: 1 
},
iosContainer: { 
    flex: 1 
},
});