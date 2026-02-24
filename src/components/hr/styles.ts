import { StyleSheet, Dimensions, Platform } from 'react-native';
import { WHATSAPP_COLORS } from './constants';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: WHATSAPP_COLORS.white 
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
    fontSize: 20, 
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
    width: 60 
  },
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
  content: { 
    flex: 1, 
    backgroundColor: WHATSAPP_COLORS.background,
    ...(Platform.OS === 'web' ? {
      height: '100vh',
      width: '100%',
      overflow: 'hidden',
      position: 'relative',
    } : {
      flexDirection: 'column',
    }),
  },
  scrollView: { 
    flex: 1 
  },
  createNewCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: WHATSAPP_COLORS.white, 
    margin: 16, 
    marginTop: 20,
    padding: 16, 
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)'
  },
  createNewIcon: { 
    marginRight: 12,
    backgroundColor: 'rgba(18, 140, 126, 0.1)',
    padding: 10,
    borderRadius: 12
  },
  createNewContent: { 
    flex: 1 
  },
  createNewTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: WHATSAPP_COLORS.darkGray, 
    marginBottom: 4 
  },
  createNewSubtitle: { 
    fontSize: 13, 
    color: WHATSAPP_COLORS.gray,
    lineHeight: 18
  },
  listSection: { 
    paddingHorizontal: 16,
    marginBottom: 30
  },
  sectionHeader: {
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
  loadingContainer: { 
    alignItems: 'center', 
    paddingVertical: 40 
  },
  loadingText: { 
    marginTop: 12, 
    fontSize: 14, 
    color: WHATSAPP_COLORS.gray 
  },
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
  itemCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4
  },
  itemCancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: WHATSAPP_COLORS.red,
    marginLeft: 4
  },
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
  emptyButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: WHATSAPP_COLORS.primary, 
    paddingHorizontal: 24, 
    paddingVertical: 14, 
    borderRadius: 24,
    shadowColor: WHATSAPP_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  emptyButtonText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: WHATSAPP_COLORS.white, 
    marginLeft: 8 
  },
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
  selectField: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: WHATSAPP_COLORS.white, 
    paddingHorizontal: 16, 
    paddingVertical: 15, 
    borderRadius: 12, 
    borderWidth: 1.5, 
    borderColor: 'rgba(18, 140, 126, 0.3)',
    shadowColor: 'rgba(18, 140, 126, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  selectFieldEmpty: {
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: WHATSAPP_COLORS.lightGray,
    shadowOpacity: 0
  },
  selectFieldLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  fieldIconContainer: {
    marginRight: 12,
    padding: 10,
    borderRadius: 10
  },
  selectFieldTextContainer: {
    flex: 1
  },
  selectFieldText: { 
    fontSize: 16, 
    color: WHATSAPP_COLORS.darkGray,
    fontWeight: '500'
  },
  placeholderText: { 
    color: WHATSAPP_COLORS.gray,
    fontWeight: 'normal'
  },
  selectFieldHint: {
    fontSize: 12,
    color: WHATSAPP_COLORS.gray,
    marginTop: 2
  },
  fieldHelpText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.gray,
    marginTop: 8,
    marginLeft: 2,
    fontStyle: 'italic'
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
  characterCounter: {
    flexDirection: 'row',
    alignItems: 'center'
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
  scrollContent: { 
    paddingBottom: 24 
  },
  chatContainer: { 
    flex: 1, 
    backgroundColor: WHATSAPP_COLORS.chatBackground,
    ...(Platform.OS === 'web' ? {
      position: 'fixed',
      top: 120,  // adjust based on your header height
      bottom: 68, // adjust based on your input height
      left: 0,
      right: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
    } : {}),
  },
  chatScrollView: {
    flex: 1,
  },
  chatScrollContent: {
    paddingVertical: 8,
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
  selectedImagesPreview: {
    backgroundColor: WHATSAPP_COLORS.white,
    margin: 12,
    marginTop: 0,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  selectedImagesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.darkGray,
    marginBottom: 8,
  },
  selectedImageWrapper: {
    marginRight: 10,
    alignItems: 'center',
  },
  selectedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  selectedImageText: {
    fontSize: 10,
    color: WHATSAPP_COLORS.gray,
    marginTop: 4,
    maxWidth: 60,
  },
  chatMessagesContainer: {
    flex: 1,
    minHeight: 300
  },
  messagesList: {
    flex: 1,
  },
  messagesListContent: {
    paddingHorizontal: 8,
    paddingBottom: 60
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
  imageContainer: {
    marginBottom: 8,
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
    backgroundColor: WHATSAPP_COLORS.inputBackground, 
    paddingHorizontal: 8, 
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 8,
    borderTopWidth: 0.5, 
    borderTopColor: WHATSAPP_COLORS.inputBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    ...(Platform.OS === 'web' ? {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    } : {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    }),
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
  imageCounterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: WHATSAPP_COLORS.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCounterText: {
    fontSize: 10,
    color: WHATSAPP_COLORS.white,
    fontWeight: 'bold',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContainer: { 
    backgroundColor: WHATSAPP_COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10
  },
  modalHeader: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WHATSAPP_COLORS.primaryDark, 
    paddingHorizontal: 20, 
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  modalIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 10,
    marginRight: 12
  },
  modalTitleContainer: {
    flex: 1
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: WHATSAPP_COLORS.white,
    marginBottom: 2
  },
  modalSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)'
  },
  modalCloseButton: {
    padding: 4
  },
  modalSearchSection: {
    backgroundColor: WHATSAPP_COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  searchContainerModal: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: WHATSAPP_COLORS.lightGray, 
    paddingHorizontal: 16, 
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(18, 140, 126, 0.2)'
  },
  searchIconModal: { 
    marginRight: 10 
  },
  searchInputModal: { 
    flex: 1, 
    fontSize: 16, 
    color: WHATSAPP_COLORS.darkGray, 
    paddingVertical: 14
  },
  dropdownList: { 
    flex: 1 
  },
  dropdownListContent: {
    paddingBottom: 16
  },
  dropdownItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(0,0,0,0.05)',
    backgroundColor: WHATSAPP_COLORS.white
  },
  dropdownItemFirst: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)'
  },
  dropdownItemLast: {
    borderBottomWidth: 0
  },
  dropdownItemIcon: { 
    marginRight: 16,
    padding: 10,
    borderRadius: 12
  },
  dropdownItemContent: { 
    flex: 1 
  },
  dropdownItemText: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: WHATSAPP_COLORS.darkGray, 
    marginBottom: 4 
  },
  dropdownItemDescription: { 
    fontSize: 14, 
    color: WHATSAPP_COLORS.gray, 
    lineHeight: 20 
  },
  dropdownItemArrow: {
    marginLeft: 8
  },
  emptyDropdown: { 
    alignItems: 'center', 
    paddingVertical: 60, 
    paddingHorizontal: 32 
  },
  emptyDropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.darkGray,
    marginTop: 12,
    marginBottom: 8
  },
  emptyDropdownText: { 
    fontSize: 14, 
    color: WHATSAPP_COLORS.gray, 
    textAlign: 'center', 
    marginBottom: 20,
    lineHeight: 20
  },
  emptyDropdownButton: {
    backgroundColor: WHATSAPP_COLORS.lightGray,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20
  },
  emptyDropdownButtonText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.darkGray,
    fontWeight: '500'
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(18, 140, 126, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  resultsText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.gray,
    fontWeight: '500'
  },
  modalFooter: {
    padding: 16,
    backgroundColor: WHATSAPP_COLORS.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)'
  },
  customOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 140, 126, 0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(18, 140, 126, 0.2)'
  },
  customOptionButtonText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '500',
    marginLeft: 8
  },
  attachmentModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  attachmentOption: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  attachmentOptionText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },

  // Attached files preview (before sending)
  attachedFilesPreview: {
    backgroundColor: '#F0F2F5',
    padding: 12,
    marginTop: 8,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? {
      position: 'fixed',
      bottom: 68,
      left: 0,
      right: 0,
      zIndex: 9,
      maxHeight: 100,
    } : {
      maxHeight: 100,
    }),
  },
  attachedFilesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  previewImageWrapper: {
    position: 'relative',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  removeFileButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  previewDocumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  previewDocumentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  previewDocumentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  previewDocumentSize: {
    fontSize: 12,
    color: '#666',
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
});