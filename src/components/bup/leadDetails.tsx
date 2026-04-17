import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  Dimensions,
  Modal,
  FlatList,
  Image,
  Linking,
  StatusBar,
  Platform,
  Keyboard,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, Lead, Comment, CollaboratorData, DocumentType, Pagination } from './types';
import { SafeAreaView } from 'react-native-safe-area-context';
import Incentive from './incentive';
import Invoice from './invoice';
import InvoiceList, { InvoiceData } from './invoiceList';
import IncentiveList from './incentiveList';
import InvoiceCreate from './invoiceCreate';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ─── Colour palette ────────────────────────────────────────────────────────
const C = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  primaryDark: '#054D44',
  secondary: '#25D366',
  accent: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#f0f0f0',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#25D366',
  chatBg: '#ECE5DD',
  incoming: '#FFFFFF',
  outgoing: '#DCF8C6',
  info: '#3B82F6',
  white: '#FFFFFF',
  leadInfoBg: '#F0F9FF',
  leadInfoBorder: '#0EA5E9',
  customFieldBg: '#f3fffa',
  customFieldBorder: '#25D366',
};

// ─── Lead config (button visibility) ──────────────────────────────────────
interface LeadConfig {
  show_invoice: boolean;
  show_incentive: boolean;
  can_create_invoice: boolean;
  can_create_incentive: boolean;
}

const DEFAULT_CONFIG: LeadConfig = {
  show_invoice: true,
  show_incentive: true,
  can_create_invoice: false,
  can_create_incentive: false,
};

// ─── Navigation mode ───────────────────────────────────────────────────────
type InnerView =
  | 'chat'
  | 'invoice-list'
  | 'invoice-detail'
  | 'invoice-create'
  | 'incentive-list'
  | 'incentive-detail'
  | 'incentive-create';

// ─── Props ─────────────────────────────────────────────────────────────────
interface LeadDetailsProps {
  lead: Lead;
  onBack: () => void;
  onEdit: () => void;
  token: string | null;
  theme: ThemeColors;
  onOpenLeadDetails: (lead: Lead) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────
const LeadDetails: React.FC<LeadDetailsProps> = ({
  lead,
  onBack,
  onEdit,
  token,
  theme,
  onOpenLeadDetails,
}) => {
  const insets = useSafeAreaInsets();

  // ── Chat state (preserved) ──────────────────────────────────────────────
  const [comments, setComments] = useState<Comment[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorData[]>([]);
  const [commentsPagination, setCommentsPagination] = useState<Pagination | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [addingComment, setAddingComment] = useState(false);
  const [showDefaultComments, setShowDefaultComments] = useState(false);
  const [defaultComments, setDefaultComments] = useState<any[]>([]);
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string | null>(null);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [showLeadDetailsModal, setShowLeadDetailsModal] = useState(false);

  // ── Navigation state ────────────────────────────────────────────────────
  const [innerView, setInnerView] = useState<InnerView>('chat');
  /** Invoice selected in the list, passed to detail view */
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  /** Incentive id selected in the list, passed to the management view */
  const [selectedIncentiveId, setSelectedIncentiveId] = useState<number | null>(null);

  // ── Backend-controlled button visibility ────────────────────────────────
  const [leadConfig, setLeadConfig] = useState<LeadConfig>(DEFAULT_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // ── Refs ────────────────────────────────────────────────────────────────
  const flatListRef = useRef<FlatList>(null);
  const hasLoadedInitially = useRef(false);
  const inputRef = useRef<TextInput>(null);
  const modalFlatListRef = useRef<FlatList>(null);
  const androidInputOffset = useRef(new Animated.Value(0)).current;
  const hasKeyboardClosedOnce = useRef(false);

  // ── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user_data');
        if (userData) {
          const parsed = JSON.parse(userData);
          setCurrentUserEmployeeId(parsed.employee_id);
        }
      } catch (e) {
        console.error('Error fetching user data:', e);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (token && !hasLoadedInitially.current) {
      hasLoadedInitially.current = true;
      fetchComments(lead.id, 1);
      fetchCollaborators(lead.id);
      fetchLeadConfig();
    }
  }, [token, lead.id]);

  useEffect(() => {
    if (comments.length > 0 && flatListRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [comments.length]);

  // ── Android keyboard offset ─────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onShow = Keyboard.addListener('keyboardDidShow', () => androidInputOffset.setValue(0));
    const onHide = Keyboard.addListener('keyboardDidHide', () => {
      if (!hasKeyboardClosedOnce.current) hasKeyboardClosedOnce.current = true;
      androidInputOffset.setValue(-35);
    });
    return () => { onShow.remove(); onHide.remove(); };
  }, []);

  // ── Fetch lead config ────────────────────────────────────────────────────
  const fetchLeadConfig = async () => {
    if (!token) { setLoadingConfig(false); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/manager/getLeadConfig`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: lead.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setLeadConfig({
          show_invoice: data.show_invoice ?? true,
          show_incentive: data.show_incentive ?? true,
          can_create_invoice: data.can_create_invoice ?? false,
          can_create_incentive: data.can_create_incentive ?? false,
        });
      } else {
        setLeadConfig({ ...DEFAULT_CONFIG, show_incentive: true });
      }
    } catch {
      setLeadConfig(DEFAULT_CONFIG);
    } finally {
      setLoadingConfig(false);
    }
  };

  // ── Utility formatters (preserved) ─────────────────────────────────────
  const beautifyName = useCallback((name: string): string => {
    if (!name) return '';
    return name
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const formatDateTime = useCallback((dateString?: string): string => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }, []);

  const formatTime = useCallback((dateString?: string): string => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }, []);

  const formatWhatsAppDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const cmpDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const cmpToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const cmpYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    if (cmpDate.getTime() === cmpToday.getTime()) return 'Today';
    if (cmpDate.getTime() === cmpYesterday.getTime()) return 'Yesterday';
    if (today.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000)
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }, []);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const truncateFileName = (fileName: string, maxLength = 25): string => {
    if (fileName.length <= maxLength) return fileName;
    return fileName.substring(0, maxLength - 3) + '...';
  };

  const getInitials = (name: string): string => {
    if (!name || name.trim().length === 0) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  const avatarColors = ['#00d285', '#ff5e7a', '#ffb157', '#1da1f2', '#007AFF'];

  const getAvatarColor = (name: string | null): string => {
    if (!name) return avatarColors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  // ── Download handler (preserved) ─────────────────────────────────────────
  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const supported = await Linking.canOpenURL(fileUrl);
      if (supported) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert('Notification', 'File is Being Uploaded, kindly wait for some time and try again.');
      }
    } catch {
      Alert.alert('Notification', 'File is Being Uploaded, kindly wait for some time and try again.');
    }
  };

  // ── Comment fetching (preserved) ─────────────────────────────────────────
  const fetchComments = async (leadId: number, page = 1, append = false) => {
    try {
      if (!token) return;
      if (!append) setLoadingComments(true);
      else setLoadingMoreComments(true);

      const res = await fetch(`${BACKEND_URL}/manager/getComments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId, page }),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();

      const transformed: Comment[] = data.comments.map((apiComment: any) => ({
        id: apiComment.comment.id.toString(),
        commentBy: apiComment.comment.user.full_name,
        employeeId: apiComment.comment.user.employee_id,
        date: apiComment.comment.created_at,
        phase: apiComment.created_at_phase,
        subphase: apiComment.created_at_subphase,
        content: apiComment.comment.content,
        hasFile: apiComment.comment.documents.length > 0,
        fileName: apiComment.comment.documents.length > 0
          ? apiComment.comment.documents.map((d: DocumentType) => d.document_name).join(', ')
          : undefined,
        documents: apiComment.comment.documents,
      }));

      const sorted = transformed.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (append) setComments(prev => [...prev, ...sorted]);
      else setComments(sorted);
      setCommentsPagination(data.pagination || null);
    } catch {
      Alert.alert('Error', 'Failed to fetch comments. Please try again.');
    } finally {
      setLoadingComments(false);
      setLoadingMoreComments(false);
    }
  };

  const fetchCollaborators = async (leadId: number) => {
    try {
      if (!token) return;
      setLoadingCollaborators(true);
      const res = await fetch(`${BACKEND_URL}/manager/getCollaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, lead_id: leadId }),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setCollaborators(data.collaborators || []);
    } catch {
      Alert.alert('Error', 'Failed to fetch collaborators. Please try again.');
    } finally {
      setLoadingCollaborators(false);
    }
  };

  // ── Attachment pickers (preserved) ────────────────────────────────────────
  const handleTakePhoto = useCallback(async () => {
    if (isPickerActive) return;
    setIsPickerActive(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permissions are needed to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [4, 3], quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const newFile: DocumentPicker.DocumentPickerAsset = {
          uri: asset.uri, name: `photo_${Date.now()}.jpg`,
          mimeType: 'image/jpeg', size: asset.fileSize, lastModified: Date.now(),
        };
        setSelectedDocuments(prev => [...prev, newFile]);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch {
      Alert.alert('Camera Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsPickerActive(false);
      setShowAttachmentModal(false);
    }
  }, [isPickerActive]);

  const handleSelectFromGallery = useCallback(async () => {
    if (isPickerActive) return;
    setIsPickerActive(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library permissions are needed to select images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true, quality: 0.8, selectionLimit: 5,
      });
      if (!result.canceled && result.assets?.length) {
        const newFiles: DocumentPicker.DocumentPickerAsset[] = result.assets.map((asset, index) => {
          const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
          return {
            uri: asset.uri, name: `image_${Date.now()}_${index}.${ext}`,
            mimeType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
            size: asset.fileSize, lastModified: Date.now(),
          };
        });
        setSelectedDocuments(prev => [...prev, ...newFiles]);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch {
      Alert.alert('Selection Error', 'Failed to select images. Please try again.');
    } finally {
      setIsPickerActive(false);
      setShowAttachmentModal(false);
    }
  }, [isPickerActive]);

  const handleSelectDocument = useCallback(async () => {
    if (isPickerActive) return;
    setIsPickerActive(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true, type: '*/*', copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets) {
        setSelectedDocuments(prev => [...prev, ...result.assets]);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick documents. Please try again.');
    } finally {
      setIsPickerActive(false);
      setShowAttachmentModal(false);
    }
  }, [isPickerActive]);

  // ── Add comment (preserved) ───────────────────────────────────────────────
  const addCommentToBackend = async (
    comment: string,
    documents: DocumentPicker.DocumentPickerAsset[]
  ): Promise<boolean> => {
    try {
      if (!token) return false;
      setAddingComment(true);
      const formData = new FormData();
      formData.append('token', token);
      formData.append('lead_id', lead.id.toString());
      formData.append('comment', comment);
      if (documents.length > 0) {
        documents.forEach(doc => {
          formData.append('documents', {
            uri: doc.uri, type: doc.mimeType || 'application/octet-stream', name: doc.name,
          } as any);
        });
      }
      const res = await fetch(`${BACKEND_URL}/manager/addComment`, {
        method: 'POST', body: formData, headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      const newCommentObj: Comment = {
        id: data.lead_comment.comment.id.toString(),
        commentBy: data.lead_comment.comment.user.full_name,
        employeeId: data.lead_comment.comment.user.employee_id,
        date: data.lead_comment.comment.created_at,
        phase: data.lead_comment.created_at_phase,
        subphase: data.lead_comment.created_at_subphase,
        content: data.lead_comment.comment.content,
        hasFile: data.lead_comment.comment.documents.length > 0,
        fileName: data.lead_comment.comment.documents.length > 0
          ? data.lead_comment.comment.documents.map((d: DocumentType) => d.document_name).join(', ')
          : undefined,
        documents: data.lead_comment.comment.documents,
      };
      setComments(prev => [...prev, newCommentObj]);
      return true;
    } catch {
      Alert.alert('Error', 'Failed to add comment. Please try again.');
      return false;
    } finally {
      setAddingComment(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() && selectedDocuments.length === 0) {
      Alert.alert('Error', 'Please enter a message or attach a file');
      return;
    }
    const success = await addCommentToBackend(newComment.trim(), selectedDocuments);
    if (success) { setNewComment(''); setSelectedDocuments([]); }
  };

  const handleDefaultCommentSelect = (defaultComment: any) => {
    try {
      setNewComment(JSON.parse(defaultComment.data));
    } catch {
      setNewComment(defaultComment.data);
    }
    setShowDefaultComments(false);
  };

  const handleRemoveDocument = (index: number) =>
    setSelectedDocuments(prev => prev.filter((_, i) => i !== index));

  const handleLoadMoreComments = useCallback(() => {
    if (commentsPagination?.has_next && !loadingMoreComments)
      fetchComments(lead.id, commentsPagination.current_page + 1, true);
  }, [commentsPagination, loadingMoreComments, lead.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchComments(lead.id, 1);
    fetchCollaborators(lead.id);
    setRefreshing(false);
  };

  // ── Processed comments (preserved) ────────────────────────────────────────
  const getProcessedComments = useCallback(() => {
    if (!comments.length) return [];
    const processed: any[] = [];
    let lastDate = '';
    [...comments]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((comment, index) => {
        const commentDate = formatWhatsAppDate(comment.date);
        if (commentDate !== lastDate) {
          processed.push({ type: 'dateSeparator', id: `date-${commentDate}-${index}`, date: commentDate });
          lastDate = commentDate;
        }
        processed.push({ type: 'comment', id: comment.id, data: comment });
      });
    return processed;
  }, [comments, formatWhatsAppDate]);

  // ── Modal sections helpers (preserved) ────────────────────────────────────
  const getOfficeTypeLabel = useCallback(() => {
    const ot = lead.meta?.office_type;
    if (!ot) return 'Not specified';
    const choices = [
      { value: 'conventional_office', label: 'Conventional Office' },
      { value: 'managed_office', label: 'Managed Office' },
      { value: 'conventional_and_managed_office', label: 'Conventional and Managed Office' },
    ];
    const found = choices.find(c => c.value === ot);
    return found ? found.label : beautifyName(ot);
  }, [lead.meta?.office_type, beautifyName]);

  const getCustomFields = useCallback(() => {
    const fields: { key: string; value: string }[] = [];
    if (lead.meta) {
      Object.entries(lead.meta).forEach(([key, value]) => {
        if (!['area_requirements', 'office_type', 'location'].includes(key) && value) {
          fields.push({
            key: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            value: String(value),
          });
        }
      });
    }
    return fields;
  }, [lead.meta]);

  // ── Chat render item (preserved) ─────────────────────────────────────────
  const renderChatItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'dateSeparator') {
      return (
        <View style={s.dateSeparatorContainer}>
          <View style={s.dateSeparatorBubble}>
            <Text style={s.dateSeparatorText}>{item.date}</Text>
          </View>
        </View>
      );
    }

    const comment = item.data;
    const time = formatTime(comment.date);
    const isCurrentUser = comment.employeeId === currentUserEmployeeId;

    return (
      <View style={[s.messageRow, isCurrentUser ? s.messageRowRight : s.messageRowLeft]}>
        <View style={[s.messageBubble, isCurrentUser ? s.currentUserBubble : s.otherUserBubble]}>
          {!isCurrentUser && (
            <View style={s.senderHeader}>
              <Text style={s.senderName}>{comment.commentBy}</Text>
            </View>
          )}
          {comment.documents?.length > 0 && (
            <View style={s.documentsContainer}>
              {comment.documents.map((doc: DocumentType) => {
                const isImage = doc.document_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                if (isImage) {
                  return (
                    <TouchableOpacity key={doc.id} style={s.imageWrapper}
                      onPress={() => handleDownloadFile(doc.document_url, doc.document_name)}>
                      <Image source={{ uri: doc.document_url }} style={s.commentImage} resizeMode="cover" />
                      <View style={s.imageOverlay}>
                        <Ionicons name="download-outline" size={20} color="#FFF" />
                      </View>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity key={doc.id} style={s.documentItem}
                    onPress={() => handleDownloadFile(doc.document_url, doc.document_name)}>
                    <View style={s.documentIconContainer}>
                      <Ionicons name="document-text" size={24} color={C.primary} />
                    </View>
                    <View style={s.documentInfo}>
                      <Text style={s.documentName} numberOfLines={1}>{truncateFileName(doc.document_name)}</Text>
                      <Text style={s.documentSize}>Tap to download</Text>
                    </View>
                    <Ionicons name="download-outline" size={20} color={C.primary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {comment.content && <Text style={s.messageText}>{comment.content}</Text>}
          <View style={s.messageFooter}>
            <Text style={s.messageTime}>{time}</Text>
            {isCurrentUser && <Ionicons name="checkmark-done" size={14} color={C.primary} style={s.deliveryIcon} />}
          </View>
        </View>
      </View>
    );
  }, [currentUserEmployeeId, formatTime, handleDownloadFile, truncateFileName]);

  // ── Lead-details modal section (preserved) ─────────────────────────────
  const renderModalSection = useCallback(({ item }: { item: string }) => {
    switch (item) {
      case 'lead-info':
        return (
          <View style={s.containerBox}>
            <View style={s.leadInfoContainer}>
              <View style={s.leadAvatarSection}>
                <View style={[s.leadAvatar, { backgroundColor: getAvatarColor(lead.company) }]}>
                  <Text style={s.leadAvatarText}>{getInitials(lead.company || 'L')}</Text>
                </View>
              </View>
              <View style={s.leadHeaderSection}>
                <Text style={s.leadNameText}>{lead.company || 'Lead'}</Text>
              </View>
            </View>
            <View style={s.statusBadgesContainer}>
              <View style={[s.statusBadgeBox, { backgroundColor: C.primary + '15', borderColor: C.primary + '30' }]}>
                <Text style={[s.statusBadgeBoxText, { color: C.primary }]}>{beautifyName(lead.phase)}</Text>
              </View>
              <View style={[s.statusBadgeBox, { backgroundColor: C.secondary + '15', borderColor: C.secondary + '30' }]}>
                <Text style={[s.statusBadgeBoxText, { color: C.secondary }]}>{beautifyName(lead.subphase)}</Text>
              </View>
              <View style={[s.statusBadgeBox, { backgroundColor: C.accent + '15', borderColor: C.accent + '30' }]}>
                <Text style={[s.statusBadgeBoxText, { color: C.accent }]}>{beautifyName(lead.status)}</Text>
              </View>
            </View>
          </View>
        );

      case 'contact-info':
        return (
          <View style={s.containerBox}>
            <View style={s.containerHeader}>
              <MaterialIcons name="phone" size={20} color={C.primary} />
              <Text style={s.containerTitle}>Contact Information</Text>
            </View>
            {lead.emails.length > 0 && (
              <View style={s.containerContent}>
                <Text style={s.subLabel}>Emails</Text>
                {lead.emails.map((email, idx) => (
                  <View key={idx} style={s.detailBox}>
                    <View style={s.detailContent}>
                      <Ionicons name="mail" size={16} color={C.primary} />
                      <Text style={s.detailText}>{email.email}</Text>
                    </View>
                    <TouchableOpacity style={s.copyButton}>
                      <Ionicons name="copy-outline" size={16} color={C.textTertiary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {lead.phone_numbers.length > 0 && (
              <View style={s.containerContent}>
                <Text style={s.subLabel}>Phone Numbers</Text>
                {lead.phone_numbers.map((phone, idx) => (
                  <View key={idx} style={s.detailBox}>
                    <View style={s.detailContent}>
                      <Ionicons name="call" size={16} color={C.primary} />
                      <Text style={s.detailText}>{phone.number}</Text>
                    </View>
                    <TouchableOpacity style={s.copyButton}>
                      <Ionicons name="copy-outline" size={16} color={C.textTertiary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      case 'lead-specific-info':
        return (
          <View style={s.containerBox}>
            <View style={s.containerHeader}>
              <MaterialIcons name="business" size={20} color={C.primary} />
              <Text style={s.containerTitle}>Lead Specific Information</Text>
            </View>
            <View style={s.containerContent}>
              {lead.meta?.area_requirements && (
                <View style={s.infoItem}>
                  <Text style={s.infoItemLabel}>Area Requirements</Text>
                  <View style={s.infoItemBox}>
                    <Text style={s.infoItemValue}>{lead.meta.area_requirements}</Text>
                  </View>
                </View>
              )}
              {lead.meta?.office_type && (
                <View style={s.infoItem}>
                  <Text style={s.infoItemLabel}>Office Type</Text>
                  <View style={s.infoItemBox}>
                    <Ionicons name="business" size={16} color={C.primary} style={{ marginRight: 8 }} />
                    <Text style={s.infoItemValue}>{getOfficeTypeLabel()}</Text>
                  </View>
                </View>
              )}
              {lead.meta?.location && (
                <View style={s.infoItem}>
                  <Text style={s.infoItemLabel}>Location Preference</Text>
                  <View style={s.infoItemBox}>
                    <Ionicons name="location" size={16} color={C.primary} style={{ marginRight: 8 }} />
                    <Text style={s.infoItemValue}>{lead.meta.location}</Text>
                  </View>
                </View>
              )}
              {getCustomFields().length > 0 && (
                <View style={s.customFieldsContainer}>
                  <Text style={s.subLabel}>Additional Information</Text>
                  {getCustomFields().map((field, index) => (
                    <View key={index} style={s.customFieldBox}>
                      <Text style={s.customFieldKeyText}>{field.key}</Text>
                      <Text style={s.customFieldValueText}>{field.value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        );

      case 'metadata':
        return (
          <View style={s.containerBox}>
            <View style={s.containerHeader}>
              <MaterialIcons name="calendar-today" size={20} color={C.primary} />
              <Text style={s.containerTitle}>Metadata</Text>
            </View>
            <View style={s.containerContent}>
              <View style={s.metadataItem}>
                <Text style={s.metadataLabel}>Created</Text>
                <Text style={s.metadataValue}>{formatDateTime(lead.created_at || lead.createdAt)}</Text>
              </View>
              {lead.updated_at && (
                <View style={s.metadataItem}>
                  <Text style={s.metadataLabel}>Updated</Text>
                  <Text style={s.metadataValue}>{formatDateTime(lead.updated_at)}</Text>
                </View>
              )}
            </View>
          </View>
        );

      case 'collaborators':
        return collaborators.length > 0 ? (
          <View style={s.containerBox}>
            <View style={s.containerHeader}>
              <MaterialIcons name="group" size={20} color={C.primary} />
              <Text style={s.containerTitle}>Team ({collaborators.length})</Text>
            </View>
            <View style={s.containerContent}>
              <View style={s.collaboratorsGrid}>
                {collaborators.map((collab) => (
                  <View key={collab.id} style={s.collaboratorCard}>
                    <View style={s.collaboratorAvatar}>
                      <Text style={s.collaboratorAvatarText}>{getInitials(collab.user.full_name || 'U')}</Text>
                    </View>
                    <Text style={s.collaboratorName} numberOfLines={1}>{collab.user.full_name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : null;

      case 'notes':
        return lead.notes ? (
          <View style={s.containerBox}>
            <View style={s.containerHeader}>
              <MaterialIcons name="notes" size={20} color={C.primary} />
              <Text style={s.containerTitle}>Notes</Text>
            </View>
            <View style={s.containerContent}>
              <View style={s.notesBox}>
                <Text style={s.notesText}>{lead.notes}</Text>
              </View>
            </View>
          </View>
        ) : null;

      default:
        return null;
    }
  }, [lead, collaborators, beautifyName, formatDateTime, getInitials, getOfficeTypeLabel, getCustomFields]);

  const modalSections = useMemo(() => {
    const sects = ['lead-info', 'contact-info', 'lead-specific-info', 'metadata'];
    if (collaborators.length > 0) sects.push('collaborators');
    if (lead.notes) sects.push('notes');
    return sects;
  }, [collaborators.length, lead.notes]);

  // ── Inner-view navigation helpers ────────────────────────────────────────

  const handleOpenInvoiceList = () => setInnerView('invoice-list');
  const handleOpenIncentiveList = () => setInnerView('incentive-list');

  const handleSelectInvoice = (invoice: InvoiceData) => {
    setSelectedInvoice(invoice);
    setInnerView('invoice-detail');
  };

  const handleCreateInvoice = () => setInnerView('invoice-create');

  /**
   * IncentiveList row tapped → open management view for that specific
   * incentive by its database id.
   */
  const handleSelectIncentive = (incentiveId: number) => {
    setSelectedIncentiveId(incentiveId);
    setInnerView('incentive-detail');
  };

  /**
   * IncentiveList "+" tapped → open blank create form.
   * incentive-create passes canCreate=true with NO incentiveId so
   * Incentive.tsx goes straight to the blank form.
   */
  const handleCreateIncentive = () => setInnerView('incentive-create');

  const handleInnerBack = () => {
    switch (innerView) {
      case 'invoice-detail':
      case 'invoice-create':
        setInnerView('invoice-list');
        break;
      case 'incentive-detail':
      case 'incentive-create':
        setInnerView('incentive-list');
        break;
      default:
        setInnerView('chat');
    }
  };

  // ── Render inner views ────────────────────────────────────────────────────

  if (innerView === 'invoice-list') {
    return (
      <InvoiceList
        leadId={lead.id}
        leadName={lead.company || 'Lead'}
        token={token}
        theme={theme}
        onBack={() => setInnerView('chat')}
        onSelectInvoice={handleSelectInvoice}
        onCreateInvoice={handleCreateInvoice}
        canCreate={leadConfig.can_create_invoice}
      />
    );
  }

  if (innerView === 'invoice-detail' && selectedInvoice) {
    return (
      <Invoice
        leadId={lead.id}
        leadName={lead.company || 'Lead'}
        token={token}
        theme={theme}
        onBack={handleInnerBack}
        preloadedInvoice={selectedInvoice}
      />
    );
  }

  if (innerView === 'invoice-create') {
    return (
      <InvoiceCreate
        leadId={lead.id}
        leadName={lead.company || 'Lead'}
        token={token}
        theme={theme}
        onBack={handleInnerBack}
        onCreated={() => setInnerView('invoice-list')}
      />
    );
  }

  if (innerView === 'incentive-list') {
    return (
      <IncentiveList
        leadId={lead.id}
        leadName={lead.company || 'Lead'}
        token={token}
        theme={theme}
        onBack={() => setInnerView('chat')}
        onSelectIncentive={handleSelectIncentive}
        onCreateIncentive={handleCreateIncentive}
        canCreate={leadConfig.can_create_incentive}
      />
    );
  }

  /**
   * Management view — a specific existing incentive.
   * canCreate=false so Incentive.tsx goes to management mode directly.
   * incentiveId is the real database id from the list.
   */
  if (innerView === 'incentive-detail' && selectedIncentiveId !== null) {
    return (
      <Incentive
        onBack={handleInnerBack}
        leadId={lead.id}
        leadName={lead.company || ''}
        theme={theme}
        incentiveId={selectedIncentiveId}
        canCreate={false}
      />
    );
  }

  /**
   * Create view — always a brand-new incentive.
   * canCreate=true and NO incentiveId → Incentive.tsx skips fetching and
   * shows the blank form immediately, regardless of existing incentives.
   */
  if (innerView === 'incentive-create') {
    return (
      <Incentive
        onBack={handleInnerBack}
        leadId={lead.id}
        leadName={lead.company || ''}
        theme={theme}
        canCreate={true}
        onIncentiveCreated={() => setInnerView('incentive-list')}
      // intentionally NO incentiveId prop
      />
    );
  }

  // ── Main chat view ────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={s.rootContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ─── HEADER ─────────────────────────────────────────── */}
      <SafeAreaView style={s.headerSafeArea} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backButton}>
            <View style={s.backIcon}><View style={s.backArrow} /></View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.headerInfo}
            onPress={() => setShowLeadDetailsModal(true)}
            activeOpacity={0.7}
          >
            <View style={[s.avatarPlaceholder, { backgroundColor: getAvatarColor(lead.company) }]}>
              <Text style={s.avatarText}>{getInitials(lead.company)}</Text>
            </View>
            <View style={s.headerTextContainer}>
              <Text style={s.headerTitle} numberOfLines={1}>{lead.company || 'Lead'}</Text>
              <Text style={s.headerSubtitle} numberOfLines={1}>
                {beautifyName(lead.phase)} • {beautifyName(lead.subphase)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* ── Dynamic action buttons ── */}
          <View style={s.headerActions}>
            {loadingConfig ? (
              <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />
            ) : (
              <>
                {leadConfig.show_invoice && (
                  <TouchableOpacity
                    style={s.headerActionButton}
                    onPress={handleOpenInvoiceList}
                  >
                    <MaterialIcons name="receipt" size={22} color="#FFF" />
                  </TouchableOpacity>
                )}
                {leadConfig.show_incentive && (
                  <TouchableOpacity
                    style={[s.headerActionButton, s.incentiveButton]}
                    onPress={handleOpenIncentiveList}
                  >
                    <MaterialIcons name="monetization-on" size={22} color="#FFF" />
                  </TouchableOpacity>
                )}
              </>
            )}
            <TouchableOpacity onPress={onEdit} style={s.headerActionButton}>
              <MaterialIcons name="edit" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* ─── CHAT LIST ─────────────────────────────────────── */}
      <View style={s.chatContainer}>
        {loadingComments ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={s.loadingText}>Loading conversations...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={getProcessedComments()}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.id}
            onEndReached={handleLoadMoreComments}
            onEndReachedThreshold={0.1}
            contentContainerStyle={s.chatListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[C.primary]}
                tintColor={C.primary}
              />
            }
            ListHeaderComponent={
              loadingMoreComments
                ? <View style={s.loadMoreContainer}><ActivityIndicator size="small" color={C.primary} /></View>
                : null
            }
            ListEmptyComponent={
              <View style={s.emptyChat}>
                <MaterialIcons name="forum" size={64} color={C.primary} />
                <Text style={s.emptyChatTitle}>No conversations yet</Text>
                <Text style={s.emptyChatText}>Start by sending a message or quick reply</Text>
              </View>
            }
          />
        )}
      </View>

      {/* ─── ATTACHMENT PREVIEW STRIP ──────────────────────── */}
      {selectedDocuments.length > 0 && (
        <View style={s.selectedFilesPreview}>
          <Text style={s.selectedFilesTitle}>Attachments ({selectedDocuments.length})</Text>
          <FlatList
            horizontal
            data={selectedDocuments}
            renderItem={({ item: doc, index }) => (
              <View style={s.selectedDocumentItem}>
                <MaterialIcons name="insert-drive-file" size={20} color={C.primary} />
                <View style={s.selectedDocumentInfo}>
                  <Text style={s.selectedDocumentName} numberOfLines={1}>{truncateFileName(doc.name, 20)}</Text>
                  <Text style={s.selectedDocumentSize}>{formatFileSize(doc.size)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveDocument(index)}>
                  <Ionicons name="close" size={18} color={C.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
            keyExtractor={(_, idx) => `doc-${idx}`}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {/* ─── INPUT BAR ─────────────────────────────────────── */}
      <Animated.View
        style={[
          s.inputSafeArea,
          Platform.OS === 'ios'
            ? { paddingBottom: insets.bottom }
            : { marginBottom: androidInputOffset },
        ]}
      >
        <View style={s.inputContainer}>
          <TouchableOpacity
            style={s.attachmentButton}
            onPress={() => setShowAttachmentModal(true)}
            disabled={addingComment || isPickerActive}
          >
            <Ionicons name="attach" size={22} color={C.primary} />
            {selectedDocuments.length > 0 && (
              <View style={s.fileCounterBadge}>
                <Text style={s.fileCounterText}>{selectedDocuments.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={s.inputField}>
            <TextInput
              ref={inputRef}
              style={s.messageInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Type your message..."
              multiline
              maxLength={1000}
              placeholderTextColor={C.textTertiary}
              editable={!addingComment}
            />
          </View>
          <TouchableOpacity
            style={[
              s.sendButton,
              { backgroundColor: (newComment.trim() || selectedDocuments.length > 0) ? C.primary : C.border },
            ]}
            onPress={handleAddComment}
            disabled={addingComment || (!newComment.trim() && selectedDocuments.length === 0)}
          >
            {addingComment
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Ionicons
                name="send"
                size={18}
                color={(newComment.trim() || selectedDocuments.length > 0) ? '#FFF' : C.textTertiary}
              />
            }
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ─── LEAD DETAILS MODAL ────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showLeadDetailsModal}
        onRequestClose={() => setShowLeadDetailsModal(false)}
      >
        <View style={[s.modalHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 15 }]}>
          <TouchableOpacity onPress={() => setShowLeadDetailsModal(false)} style={s.modalBackButton}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={s.modalTitle}>Lead Details</Text>
        </View>
        <FlatList
          ref={modalFlatListRef}
          data={modalSections}
          renderItem={renderModalSection}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.modalScrollContent}
          ListFooterComponent={<View style={s.modalBottomSpacing} />}
        />
      </Modal>

      {/* ─── QUICK REPLIES OVERLAY ─────────────────────────── */}
      {showDefaultComments && (
        <View style={s.defaultCommentsOverlay}>
          <SafeAreaView style={s.defaultCommentsModal}>
            <View style={s.defaultCommentsHeader}>
              <Text style={s.defaultCommentsTitle}>Quick Replies</Text>
              <TouchableOpacity onPress={() => setShowDefaultComments(false)} style={s.closeDefaultCommentsButton}>
                <Ionicons name="close" size={22} color={C.textTertiary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={defaultComments}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.defaultCommentItem} onPress={() => handleDefaultCommentSelect(item)}>
                  <Text style={s.defaultCommentText}>
                    {(() => { try { return JSON.parse(item.data); } catch { return item.data; } })()}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={s.defaultCommentsList}
            />
          </SafeAreaView>
        </View>
      )}

      {/* ─── ATTACHMENT PICKER MODAL ───────────────────────── */}
      <Modal
        visible={showAttachmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!isPickerActive) setShowAttachmentModal(false); }}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => { if (!isPickerActive) setShowAttachmentModal(false); }}
        >
          <View style={s.attachmentModalContent}>
            <TouchableOpacity style={s.attachmentOption} onPress={handleSelectDocument} disabled={isPickerActive}>
              <View style={[s.attachmentIconContainer, { backgroundColor: '#7F66FF' }]}>
                <MaterialIcons name="insert-drive-file" size={24} color="#FFF" />
              </View>
              <Text style={s.attachmentOptionText}>Document</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.attachmentOption} onPress={handleTakePhoto} disabled={isPickerActive}>
              <View style={[s.attachmentIconContainer, { backgroundColor: '#FF4D67' }]}>
                <Ionicons name="camera" size={24} color="#FFF" />
              </View>
              <Text style={s.attachmentOptionText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.attachmentOption} onPress={handleSelectFromGallery} disabled={isPickerActive}>
              <View style={[s.attachmentIconContainer, { backgroundColor: '#C861F9' }]}>
                <Ionicons name="images" size={24} color="#FFF" />
              </View>
              <Text style={s.attachmentOptionText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// ─── Styles (100 % identical to original) ─────────────────────────────────
const s = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: C.chatBg },
  headerSafeArea: { backgroundColor: C.primary },
  header: {
    backgroundColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, minHeight: 56,
    borderBottomWidth: 1, borderBottomColor: C.primaryDark,
  },
  backButton: { padding: 6, marginRight: 4 },
  backIcon: { height: 24, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  backArrow: {
    width: 12, height: 12,
    borderLeftWidth: 2, borderTopWidth: 2, borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#FFF', marginBottom: 1 },
  headerSubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.85)' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerActionButton: { padding: 6, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  incentiveButton: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },

  chatContainer: { flex: 1, backgroundColor: C.chatBg },
  chatListContent: { paddingHorizontal: 6, paddingTop: 16, paddingBottom: 16, flexGrow: 1 },

  dateSeparatorContainer: { alignItems: 'center', marginVertical: 10 },
  dateSeparatorBubble: { backgroundColor: 'rgba(0, 0, 0, 0.1)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10 },
  dateSeparatorText: { fontSize: 11, color: '#666', fontWeight: '500' },

  messageRow: { flexDirection: 'row', marginBottom: 6, paddingHorizontal: 6, alignItems: 'flex-start' },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: '75%', minWidth: 220, borderRadius: 10, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1,
  },
  currentUserBubble: { backgroundColor: C.outgoing, borderBottomRightRadius: 3 },
  otherUserBubble: { backgroundColor: C.incoming, borderBottomLeftRadius: 3 },
  senderHeader: { marginBottom: 3 },
  senderName: { fontSize: 11, fontWeight: '600', color: C.primary, marginBottom: 1 },
  messageText: { fontSize: 15, color: C.textPrimary, lineHeight: 20 },
  documentsContainer: { marginBottom: 6, gap: 6 },
  imageWrapper: { position: 'relative', borderRadius: 8, overflow: 'hidden', width: '100%' },
  commentImage: { width: 200, height: 130, borderRadius: 8 },
  imageOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  documentItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(7, 94, 84, 0.1)',
    padding: 10, borderRadius: 8, gap: 10, minWidth: 200, maxWidth: 280,
  },
  documentIconContainer: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', alignItems: 'center', justifyContent: 'center',
  },
  documentInfo: { flex: 1 },
  documentName: { fontSize: 13, fontWeight: '500', color: C.textPrimary, marginBottom: 2 },
  documentSize: { fontSize: 11, color: C.textSecondary },
  messageFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 3 },
  messageTime: { fontSize: 10, color: C.textTertiary },
  deliveryIcon: { marginLeft: 3 },

  selectedFilesPreview: {
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border,
    paddingHorizontal: 12, paddingVertical: 8, maxHeight: 100,
  },
  selectedFilesTitle: { fontSize: 13, fontWeight: '500', color: C.textSecondary, marginBottom: 6 },
  selectedDocumentItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.background, paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 6, minWidth: 160, gap: 6, marginRight: 8,
  },
  selectedDocumentInfo: { flex: 1 },
  selectedDocumentName: { fontSize: 12, fontWeight: '500', color: C.textPrimary, marginBottom: 2 },
  selectedDocumentSize: { fontSize: 10, color: C.textTertiary },

  inputSafeArea: {
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border,
    marginBottom: Platform.OS === 'ios' ? -30 : 0,
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: C.surface,
  },
  attachmentButton: { padding: 6, position: 'relative' },
  fileCounterBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: C.danger, borderRadius: 8, width: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  fileCounterText: { fontSize: 9, color: C.surface, fontWeight: '600' },
  inputField: {
    flex: 1, backgroundColor: C.background, borderRadius: 18,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 8, minHeight: 36, maxHeight: 100, justifyContent: 'center',
  },
  messageInput: { fontSize: 14, color: C.textPrimary, padding: 0, maxHeight: 84, textAlignVertical: 'center' },
  sendButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: C.textSecondary },
  loadMoreContainer: { alignItems: 'center', paddingVertical: 12 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyChatTitle: { fontSize: 16, fontWeight: '600', color: C.textPrimary },
  emptyChatText: { fontSize: 13, color: C.textSecondary, textAlign: 'center', maxWidth: 180 },

  // Modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, backgroundColor: C.primary,
  },
  modalBackButton: { padding: 8, marginRight: 12 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#FFF', flex: 1 },
  modalScrollContent: { paddingHorizontal: 16, paddingVertical: 16, flexGrow: 1 },
  modalBottomSpacing: { height: 40 },

  containerBox: {
    backgroundColor: C.surface, marginBottom: 12,
    borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  leadInfoContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 16,
  },
  leadAvatarSection: { alignItems: 'center' },
  leadAvatar: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  leadAvatarText: { fontSize: 28, fontWeight: '700', color: '#FFF' },
  leadHeaderSection: { flex: 1, justifyContent: 'center' },
  leadNameText: { fontSize: 22, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  statusBadgesContainer: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  statusBadgeBox: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  statusBadgeBoxText: { fontSize: 13, fontWeight: '600' },
  containerHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.primary + '08', borderBottomWidth: 1, borderBottomColor: C.border, gap: 10,
  },
  containerTitle: { fontSize: 16, fontWeight: '600', color: C.primary, flex: 1 },
  containerContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  detailBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.background, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 8, justifyContent: 'space-between', marginBottom: 8,
  },
  detailContent: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  detailText: { fontSize: 14, color: C.textPrimary, flex: 1 },
  subLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 8, marginTop: 4 },
  copyButton: { padding: 4 },
  infoItem: { marginBottom: 12 },
  infoItemLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 6 },
  infoItemBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.background, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1, borderColor: C.border,
  },
  infoItemValue: { fontSize: 14, color: C.textPrimary, flex: 1 },
  customFieldsContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  customFieldBox: {
    backgroundColor: C.customFieldBg, borderWidth: 1, borderColor: C.customFieldBorder,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
  },
  customFieldKeyText: { fontSize: 12, fontWeight: '600', color: C.customFieldBorder, marginBottom: 4 },
  customFieldValueText: { fontSize: 14, color: C.textPrimary, lineHeight: 18 },
  metadataItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  metadataLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 4 },
  metadataValue: { fontSize: 14, color: C.textPrimary },
  collaboratorsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  collaboratorCard: {
    alignItems: 'center', width: '48%', backgroundColor: C.background,
    borderRadius: 8, paddingVertical: 12, paddingHorizontal: 8, marginBottom: 8,
  },
  collaboratorAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  collaboratorAvatarText: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  collaboratorName: { fontSize: 12, color: C.textSecondary, textAlign: 'center' },
  notesBox: {
    backgroundColor: C.background, paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: 8, borderWidth: 1, borderColor: C.border,
  },
  notesText: { fontSize: 14, color: C.textPrimary, lineHeight: 20 },

  defaultCommentsOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 16,
  },
  defaultCommentsModal: {
    backgroundColor: C.surface, borderRadius: 12,
    maxHeight: screenHeight * 0.6, overflow: 'hidden',
  },
  defaultCommentsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  defaultCommentsTitle: { fontSize: 16, fontWeight: '600', color: C.primary },
  closeDefaultCommentsButton: { padding: 4 },
  defaultCommentsList: { paddingHorizontal: 12, paddingVertical: 8 },
  defaultCommentItem: { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  defaultCommentText: { fontSize: 15, color: C.textPrimary, lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  attachmentModalContent: {
    backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingVertical: 30, paddingHorizontal: 20, flexDirection: 'row',
    justifyContent: 'space-around', alignItems: 'center',
  },
  attachmentOption: { alignItems: 'center', gap: 8 },
  attachmentIconContainer: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  attachmentOptionText: { fontSize: 14, color: C.textPrimary, fontWeight: '500' },
});

export default LeadDetails;