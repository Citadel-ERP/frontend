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
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Image,
  Linking,
  StatusBar,
  Keyboard,
  KeyboardEvent,
  Animated
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, Lead, Comment, CollaboratorData, DocumentType, Pagination } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface LeadWithNotes extends Omit<Lead, 'notes'> {
  notes?: string;
}

interface LeadDetailsProps {
  lead: LeadWithNotes;
  onBack: () => void;
  onEdit: () => void;
  onIncentivePress: () => void;
  token: string | null;
  theme: ThemeColors;
}

// WhatsApp Color Scheme (same as CreateLead/EditLead)
const C = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  primaryDark: '#054D44',
  secondary: '#25D366',
  accent: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#e7e6e5',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#25D366',
  info: '#3B82F6',
  white: '#FFFFFF',
  chatBg: '#ECE5DD',
  incoming: '#FFFFFF',
  outgoing: '#DCF8C6',
  leadInfoBg: '#F0F9FF',
  leadInfoBorder: '#0EA5E9',
  customFieldBg: '#f3fffa',
  customFieldBorder: '#25D366',
};
const avatarColors = ['#00d285', '#ff5e7a', '#ffb157', '#1da1f2', '#007AFF'];

const getAvatarColor = (name: string | null): string => {
  if (!name) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index];
};

const LeadDetails: React.FC<LeadDetailsProps> = React.memo(({
  lead,
  onBack,
  onEdit,
  onIncentivePress,
  token,
  theme
}) => {
  // State declarations
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
  const [loadingDefaultComments, setLoadingDefaultComments] = useState(false);
  const [showLeadDetailsModal, setShowLeadDetailsModal] = useState(false);
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [isPickerActive, setIsPickerActive] = useState(false);

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const hasLoadedInitially = useRef(false);
  const modalFlatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;

  // Keyboard event handlers
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      handleKeyboardShow
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      handleKeyboardHide
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleKeyboardShow = (event: KeyboardEvent) => {
    setIsKeyboardVisible(true);
    if (Platform.OS === 'android') {
      Animated.timing(keyboardHeightAnim, {
        toValue: event.endCoordinates.height,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleKeyboardHide = () => {
    setIsKeyboardVisible(false);
    if (Platform.OS === 'android') {
      Animated.timing(keyboardHeightAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  };

  // Effects
  useEffect(() => {
    if (token && !hasLoadedInitially.current) {
      hasLoadedInitially.current = true;
      fetchComments(lead.id, 1);
      fetchCollaborators(lead.id);
      fetchDefaultComments(lead.phase, lead.subphase);
    }
  }, [token, lead.id]);

  useEffect(() => {
    if (comments.length > 0 && flatListRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [comments.length]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user_data');
        if (userData) {
          const parsedData = JSON.parse(userData);
          setCurrentUserEmployeeId(parsedData.employee_id);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  // Helper functions
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
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const formatTime = useCallback((dateString?: string): string => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }, []);

  // WhatsApp-style date formatting
  const formatWhatsAppDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Normalize dates to compare only dates (ignore time)
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const compareToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const compareYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (compareDate.getTime() === compareToday.getTime()) {
      return 'Today';
    } else if (compareDate.getTime() === compareYesterday.getTime()) {
      return 'Yesterday';
    } else if (today.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      // Within the last week, show day name
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      // Older than a week, show full date
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }, []);

  const formatFileSize = useCallback((bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }, []);

  const truncateFileName = useCallback((fileName: string, maxLength: number = 25): string => {
    if (fileName.length <= maxLength) return fileName;
    return fileName.substring(0, maxLength - 3) + '...';
  }, []);

  const getInitials = useCallback((name: string): string => {
    if (!name || name.trim().length === 0) return '?';
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
    }
  }, []);

  const handleDownloadFile = useCallback(async (fileUrl: string, fileName: string) => {
    try {
      const supported = await Linking.canOpenURL(fileUrl);
      if (supported) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert(
          'Notification',
          'File is Being Uploaded, kindly wait for some time and try again.'
        );
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert(
        'Notification',
        'File is Being Uploaded, kindly wait for some time and try again.'
      );
    }
  }, []);

  // Process comments to include date separators
  const getProcessedComments = useCallback(() => {
    if (!comments || comments.length === 0) return [];

    const processed: any[] = [];
    let lastDate = '';

    // Sort comments by date (oldest to newest)
    const sortedComments = [...comments].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedComments.forEach((comment, index) => {
      const commentDate = formatWhatsAppDate(comment.date);

      // Add date separator if this is the first comment or date has changed
      if (commentDate !== lastDate) {
        processed.push({
          type: 'dateSeparator',
          id: `date-${commentDate}-${index}`,
          date: commentDate,
          originalDate: comment.date
        });
        lastDate = commentDate;
      }

      // Add the comment
      processed.push({
        type: 'comment',
        id: comment.id,
        data: comment
      });
    });

    return processed;
  }, [comments, formatWhatsAppDate]);

  // API functions
  const fetchComments = useCallback(async (
    leadId: number,
    page: number = 1,
    append: boolean = false
  ): Promise<void> => {
    try {
      if (!token) return;
      if (!append) {
        setLoadingComments(true);
      } else {
        setLoadingMoreComments(true);
      }

      const response = await fetch(`${BACKEND_URL}/employee/getComments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token, lead_id: leadId, page: page })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      const transformedComments: Comment[] = data.comments.map((apiComment: any) => ({
        id: apiComment.comment.id.toString(),
        commentBy: apiComment.comment.user.full_name,
        employeeId: apiComment.comment.user.employee_id,
        date: apiComment.comment.created_at,
        phase: apiComment.created_at_phase,
        subphase: apiComment.created_at_subphase,
        content: apiComment.comment.content,
        hasFile: apiComment.comment.documents.length > 0,
        fileName: apiComment.comment.documents.length > 0
          ? apiComment.comment.documents.map((doc: DocumentType) => doc.document_name).join(', ')
          : undefined,
        documents: apiComment.comment.documents
      }));

      const sortedComments = transformedComments.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      if (append) {
        setComments(prev => [...prev, ...sortedComments]);
      } else {
        setComments(sortedComments);
      }
      setCommentsPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Error', 'Failed to fetch comments. Please try again.');
    } finally {
      setLoadingComments(false);
      setLoadingMoreComments(false);
    }
  }, [token]);

  const fetchCollaborators = useCallback(async (leadId: number): Promise<void> => {
    try {
      if (!token) return;
      setLoadingCollaborators(true);
      const response = await fetch(`${BACKEND_URL}/employee/getCollaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token, lead_id: leadId })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setCollaborators(data.collaborators);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      Alert.alert('Error', 'Failed to fetch collaborators. Please try again.');
    } finally {
      setLoadingCollaborators(false);
    }
  }, [token]);

  const fetchDefaultComments = useCallback(async (phase: string, subphase: string): Promise<void> => {
    try {
      if (!token) return;
      setLoadingDefaultComments(true);
      const response = await fetch(
        `${BACKEND_URL}/employee/getDefaultComments?at_phase=${encodeURIComponent(
          phase
        )}&at_subphase=${encodeURIComponent(subphase)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setDefaultComments(data.comments);
    } catch (error) {
      console.error('Error fetching default comments:', error);
      Alert.alert('Error', 'Failed to fetch default comments. Please try again.');
      setDefaultComments([]);
    } finally {
      setLoadingDefaultComments(false);
    }
  }, [token]);

  const handleTakePhoto = useCallback(async (): Promise<void> => {
    if (isPickerActive) return;
    setIsPickerActive(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permissions are needed to take photos.');
        setIsPickerActive(false);
        setShowAttachmentModal(false);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = `photo_${Date.now()}.jpg`;
        const newFile: DocumentPicker.DocumentPickerAsset = {
          uri: asset.uri,
          name: fileName,
          mimeType: 'image/jpeg',
          size: asset.fileSize,
          lastModified: Date.now(),
        };
        setSelectedDocuments(prev => [...prev, newFile]);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Camera Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsPickerActive(false);
      setShowAttachmentModal(false);
    }
  }, [isPickerActive]);

  const handleSelectFromGallery = useCallback(async (): Promise<void> => {
    if (isPickerActive) return;
    setIsPickerActive(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library permissions are needed to select images.');
        setIsPickerActive(false);
        setShowAttachmentModal(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles: DocumentPicker.DocumentPickerAsset[] = result.assets.map((asset, index) => {
          const extension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
          return {
            uri: asset.uri,
            name: `image_${Date.now()}_${index}.${extension}`,
            mimeType: `image/${extension === 'png' ? 'png' : 'jpeg'}`,
            size: asset.fileSize,
            lastModified: Date.now(),
          };
        });
        setSelectedDocuments(prev => [...prev, ...newFiles]);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error('Error selecting images:', error);
      Alert.alert('Selection Error', 'Failed to select images. Please try again.');
    } finally {
      setIsPickerActive(false);
      setShowAttachmentModal(false);
    }
  }, [isPickerActive]);

  const handleSelectDocument = useCallback(async (): Promise<void> => {
    if (isPickerActive) return;
    setIsPickerActive(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets) {
        setSelectedDocuments(prev => [...prev, ...result.assets]);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      Alert.alert('Error', 'Failed to pick documents. Please try again.');
    } finally {
      setIsPickerActive(false);
      setShowAttachmentModal(false);
    }
  }, [isPickerActive]);

  const addCommentToBackend = useCallback(async (
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

      if (documents && documents.length > 0) {
        documents.forEach((doc, index) => {
          formData.append('documents', {
            uri: doc.uri,
            type: doc.mimeType || 'application/octet-stream',
            name: doc.name
          } as any);
        });
      }

      const response = await fetch(`${BACKEND_URL}/employee/addComment`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      const newCommentItem: Comment = {
        id: data.lead_comment.comment.id.toString(),
        commentBy: data.lead_comment.comment.user.full_name,
        employeeId: data.lead_comment.comment.user.employee_id,
        date: data.lead_comment.comment.created_at,
        phase: data.lead_comment.created_at_phase,
        subphase: data.lead_comment.created_at_subphase,
        content: data.lead_comment.comment.content,
        hasFile: data.lead_comment.comment.documents.length > 0,
        fileName: data.lead_comment.comment.documents.length > 0
          ? data.lead_comment.comment.documents.map((doc: DocumentType) => doc.document_name).join(', ')
          : undefined,
        documents: data.lead_comment.comment.documents
      };

      setComments(prev => [...prev, newCommentItem]);
      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
      return false;
    } finally {
      setAddingComment(false);
    }
  }, [token, lead.id]);

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() && selectedDocuments.length === 0) {
      Alert.alert('Error', 'Please enter a comment or attach a file');
      return;
    }

    const commentText = newComment.trim() || '';
    const success = await addCommentToBackend(commentText, selectedDocuments);
    if (success) {
      setNewComment('');
      setSelectedDocuments([]);
    }
  }, [newComment, selectedDocuments, addCommentToBackend]);

  const handleDefaultCommentSelect = useCallback((defaultComment: any) => {
    try {
      const commentText = JSON.parse(defaultComment.data);
      setNewComment(commentText);
      setShowDefaultComments(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (error) {
      setNewComment(defaultComment.data);
      setShowDefaultComments(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  const handleRemoveDocument = useCallback((index: number) => {
    setSelectedDocuments(prevDocs => prevDocs.filter((_, i) => i !== index));
  }, []);

  const handleLoadMoreComments = useCallback(() => {
    if (commentsPagination && commentsPagination.has_next && !loadingMoreComments) {
      fetchComments(lead.id, commentsPagination.current_page + 1, true);
    }
  }, [commentsPagination, loadingMoreComments, lead.id, fetchComments]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchComments(lead.id, 1);
    fetchCollaborators(lead.id);
    setRefreshing(false);
  }, [lead.id, fetchComments, fetchCollaborators]);

  const isSendEnabled = useCallback(() => {
    return newComment.trim().length > 0 || selectedDocuments.length > 0;
  }, [newComment, selectedDocuments]);

  // Get office type label from meta
  const getOfficeTypeLabel = useCallback(() => {
    const officeType = lead.meta?.office_type;
    if (!officeType) return 'Not specified';
    
    const OFFICE_TYPE_CHOICES = [
      { value: 'conventional_office', label: 'Conventional Office' },
      { value: 'managed_office', label: 'Managed Office' },
      { value: 'conventional_and_managed_office', label: 'Conventional and Managed Office' }
    ];
    
    const option = OFFICE_TYPE_CHOICES.find(choice => choice.value === officeType);
    return option ? option.label : beautifyName(officeType);
  }, [lead.meta?.office_type, beautifyName]);

  // Extract custom fields from meta (excluding known fields)
  const getCustomFields = useCallback(() => {
    const customFields: { key: string; value: string }[] = [];
    if (lead.meta) {
      Object.entries(lead.meta).forEach(([key, value]) => {
        if (!['area_requirements', 'office_type', 'location'].includes(key) && value) {
          customFields.push({
            key: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            value: String(value)
          });
        }
      });
    }
    return customFields;
  }, [lead.meta]);

  // Render functions for chat items
  const renderDateSeparator = useCallback(({ item }: { item: any }) => {
    return (
      <View style={s.dateSeparatorContainer}>
        <View style={s.dateSeparatorBubble}>
          <Text style={s.dateSeparatorText}>{item.date}</Text>
        </View>
      </View>
    );
  }, []);

  const renderCommentItem = useCallback(({ item }: { item: Comment }) => {
    const isCurrentUser = item.employeeId === currentUserEmployeeId;
    const time = formatTime(item.date);

    return (
      <View
        style={[
          s.chatBubbleContainer,
          isCurrentUser ? s.currentUserBubbleContainer : s.otherUserBubbleContainer
        ]}
      >
        <View
          style={[
            s.chatBubble,
            isCurrentUser
              ? [s.currentUserBubble, { backgroundColor: C.outgoing }]
              : [s.otherUserBubble, { backgroundColor: C.incoming }]
          ]}
        >
          {!isCurrentUser && (
            <Text style={[s.senderName, { color: C.primary }]}>{item.commentBy}</Text>
          )}
          {item.documents && item.documents.length > 0 && (
            <View style={s.chatAttachments}>
              {item.documents.map((doc) => {
                const isImage = doc.document_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                if (isImage) {
                  return (
                    <TouchableOpacity
                      key={doc.id}
                      style={s.imageAttachment}
                      onPress={() => handleDownloadFile(doc.document_url, doc.document_name)}
                    >
                      <Image
                        source={{ uri: doc.document_url }}
                        style={s.chatImage}
                        resizeMode="cover"
                      />
                      <View style={s.imageOverlay}>
                        <Ionicons name="download-outline" size={20} color="#FFF" />
                      </View>
                    </TouchableOpacity>
                  );
                } else {
                  return (
                    <TouchableOpacity
                      key={doc.id}
                      style={[
                        s.documentAttachment,
                        isCurrentUser
                          ? s.documentAttachmentOutgoing
                          : s.documentAttachmentIncoming
                      ]}
                      onPress={() => handleDownloadFile(doc.document_url, doc.document_name)}
                    >
                      <View
                        style={[
                          s.documentIconContainer,
                          isCurrentUser ? s.docIconOutgoing : s.docIconIncoming
                        ]}
                      >
                        <MaterialIcons
                          name="insert-drive-file"
                          size={20}
                          color={isCurrentUser ? C.primary : C.primaryDark}
                        />
                      </View>
                      <View style={s.documentInfo}>
                        <Text
                          style={[
                            s.documentName,
                            { color: isCurrentUser ? C.primaryDark : C.primary }
                          ]}
                        >
                          {truncateFileName(doc.document_name)}
                        </Text>
                        <Text style={[s.documentSize, { color: C.textTertiary }]}>
                          Tap to download
                        </Text>
                      </View>
                      <Ionicons
                        name="download-outline"
                        size={18}
                        color={isCurrentUser ? C.primaryDark : C.primary}
                      />
                    </TouchableOpacity>
                  );
                }
              })}
            </View>
          )}
          {item.content && (
            <Text style={[s.chatMessage, { color: C.textPrimary }]}>{item.content}</Text>
          )}
          <View style={s.chatTimestamp}>
            <Text style={[s.chatTimeText, { color: C.textTertiary }]}>{time}</Text>
            {isCurrentUser && (
              <MaterialIcons
                name="done-all"
                size={14}
                color={C.primary}
                style={s.deliveryIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  }, [currentUserEmployeeId, formatTime, handleDownloadFile, truncateFileName]);

  const renderChatItem = useCallback(({ item }: { item: any }) => {
    if (item.type === 'dateSeparator') {
      return renderDateSeparator({ item });
    } else {
      return renderCommentItem({ item: item.data });
    }
  }, [renderDateSeparator, renderCommentItem]);

  const ModernHeader = useMemo(() => (
  <View style={s.headerWrapper}>
    <SafeAreaView style={s.headerSafeArea} edges={['top']}>
      <View style={s.header}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <View style={s.headerContent}>
          <TouchableOpacity onPress={onBack} style={s.backButton}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.headerInfo}
            onPress={() => setShowLeadDetailsModal(true)}
            activeOpacity={0.7}
          >
            <View style={s.avatarContainer}>
              <View style={[s.avatarPlaceholder, { backgroundColor: getAvatarColor(lead.company) }]}>
                <Text style={s.avatarText}>
                  {getInitials(lead.company || 'L')}
                </Text>
              </View>
              <View style={s.onlineIndicator} />
            </View>
            <View style={s.headerTextContainer}>
              <Text style={s.headerTitle} numberOfLines={1}>
                {lead.company || 'Lead'}
              </Text>
              <Text style={s.headerSubtitle} numberOfLines={1}>
                {beautifyName(lead.phase)} • {beautifyName(lead.subphase)}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={s.headerActions}>
            {lead.subphase === 'payment_received' && (
              <TouchableOpacity onPress={onIncentivePress} style={[s.headerActionButton, s.incentiveButton]}>
                <MaterialIcons name="monetization-on" size={22} color="#FFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onEdit} style={s.headerActionButton}>
              <MaterialIcons name="edit" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  </View>
), [onBack, onIncentivePress, onEdit, lead, beautifyName, getInitials]);

  const renderModalSection = useCallback(({ item }: { item: string }) => {
    switch (item) {
      // ============ CONTAINER 1: Lead Basic Info ============
      case 'lead-info':
        return (
          <View style={s.containerBox}>
            <View style={s.leadInfoContainer}>
              <View style={s.leadAvatarSection}>
                <View style={[s.leadAvatar, { backgroundColor: getAvatarColor(lead.company) }]}>
                  <Text style={s.leadAvatarText}>
                    {getInitials(lead.company || 'L')}
                  </Text>
                </View>
              </View>
              
              <View style={s.leadHeaderSection}>
                <Text style={s.leadNameText}>{lead.company || 'Lead'}</Text>
                {lead.city && (
                  <Text style={s.leadCompanyText}>{lead.city}</Text>
                )}
              </View>
            </View>

            <View style={s.statusBadgesContainer}>
              <View style={[s.statusBadgeBox, { backgroundColor: C.primary + '15', borderColor: C.primary + '30' }]}>
                <Text style={[s.statusBadgeBoxText, { color: C.primary }]}>
                  {beautifyName(lead.phase)}
                </Text>
              </View>
              
              <View style={[s.statusBadgeBox, { backgroundColor: C.secondary + '15', borderColor: C.secondary + '30' }]}>
                <Text style={[s.statusBadgeBoxText, { color: C.secondary }]}>
                  {beautifyName(lead.subphase)}
                </Text>
              </View>
              
              <View style={[s.statusBadgeBox, { backgroundColor: C.accent + '15', borderColor: C.accent + '30' }]}>
                <Text style={[s.statusBadgeBoxText, { color: C.accent }]}>
                  {beautifyName(lead.status)}
                </Text>
              </View>
            </View>
          </View>
        );

      // ============ CONTAINER 2: Contact Information ============
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

      // ============ CONTAINER 3: Lead Specific Information ============
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
                  <View style={[s.infoItemBox]}>
                    <Ionicons name="business" size={16} color={C.primary} style={{ marginRight: 8 }} />
                    <Text style={[s.infoItemValue]}>
                      {getOfficeTypeLabel()}
                    </Text>
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

              {/* Custom Fields */}
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

      // ============ CONTAINER 4: Metadata ============
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
                <Text style={s.metadataValue}>
                  {formatDateTime(lead.created_at || lead.createdAt)}
                </Text>
              </View>

              {lead.updated_at && (
                <View style={s.metadataItem}>
                  <Text style={s.metadataLabel}>Updated</Text>
                  <Text style={s.metadataValue}>
                    {formatDateTime(lead.updated_at)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );

      // ============ CONTAINER 5: Team/Collaborators ============
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
                      <Text style={s.collaboratorAvatarText}>
                        {getInitials(collab.user.full_name || 'U')}
                      </Text>
                    </View>
                    <Text style={s.collaboratorName} numberOfLines={1}>
                      {collab.user.full_name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : null;

      // ============ CONTAINER 6: Notes ============
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
    const sections = ['lead-info', 'contact-info', 'lead-specific-info', 'metadata'];
    if (collaborators.length > 0) sections.push('collaborators');
    if (lead.notes) sections.push('notes');
    return sections;
  }, [collaborators.length, lead.notes]);

  const ContactInfoModal = useMemo(() => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={showLeadDetailsModal}
      onRequestClose={() => setShowLeadDetailsModal(false)}
    >
      <View style={[s.modalHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 15 }]}>
        <TouchableOpacity
          onPress={() => setShowLeadDetailsModal(false)}
          style={s.modalBackButton}
        >
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
  ), [showLeadDetailsModal, modalSections, renderModalSection]);

  return (
    <View style={s.mainContainer}>
      {ModernHeader}
      {ContactInfoModal}

      {Platform.OS === 'android' ? (
        <View style={s.androidContainer}>
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
                inverted={false}
                onEndReached={handleLoadMoreComments}
                onEndReachedThreshold={0.1}
                contentContainerStyle={s.chatListContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={[C.primary]}
                    tintColor={C.primary}
                  />
                }
                ListHeaderComponent={
                  loadingMoreComments ? (
                    <View style={s.loadMoreContainer}>
                      <ActivityIndicator size="small" color={C.primary} />
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <View style={s.emptyChat}>
                    <MaterialIcons name="forum" size={64} color={C.border} />
                    <Text style={s.emptyChatTitle}>No conversations yet</Text>
                    <Text style={s.emptyChatText}>
                      Start by sending a message or quick reply
                    </Text>
                  </View>
                }
              />
            )}
          </View>

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
                      <Text style={s.selectedDocumentName} numberOfLines={1}>
                        {truncateFileName(doc.name, 20)}
                      </Text>
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

          <Animated.View style={[s.androidInputContainer, { marginBottom: keyboardHeightAnim }]}>
            <SafeAreaView style={s.inputSafeArea} edges={['bottom']}>
              <View style={s.inputContainer}>
                <View style={s.inputWrapper}>
                  <View style={s.inputRow}>
                    <TouchableOpacity style={s.attachmentButton} onPress={() => setShowAttachmentModal(true)}
                      disabled={addingComment || isPickerActive}>
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
                        returnKeyType="default"
                        blurOnSubmit={false}
                        onSubmitEditing={() => {
                          if (isSendEnabled()) {
                            handleAddComment();
                          }
                        }}
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        s.sendButton,
                        { backgroundColor: isSendEnabled() ? C.primary : C.border }
                      ]}
                      onPress={handleAddComment}
                      disabled={addingComment || !isSendEnabled()}
                    >
                      {addingComment ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Ionicons
                          name="send"
                          size={18}
                          color={isSendEnabled() ? '#FFF' : C.textTertiary}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={s.iosContainer}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
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
                inverted={false}
                onEndReached={handleLoadMoreComments}
                onEndReachedThreshold={0.1}
                contentContainerStyle={s.chatListContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={[C.primary]}
                    tintColor={C.primary}
                  />
                }
                ListHeaderComponent={
                  loadingMoreComments ? (
                    <View style={s.loadMoreContainer}>
                      <ActivityIndicator size="small" color={C.primary} />
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <View style={s.emptyChat}>
                    <MaterialIcons name="forum" size={64} color={C.border} />
                    <Text style={s.emptyChatTitle}>No conversations yet</Text>
                    <Text style={s.emptyChatText}>
                      Start by sending a message or quick reply
                    </Text>
                  </View>
                }
              />
            )}
          </View>

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
                      <Text style={s.selectedDocumentName} numberOfLines={1}>
                        {truncateFileName(doc.name, 20)}
                      </Text>
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

          <View style={[
            s.inputContainerWrapper,
            { marginBottom: isKeyboardVisible ? 0 : -30 }
          ]}>
            <View style={s.inputContainer}>
              <View style={s.inputWrapper}>
                <View style={s.inputRow}>
                  <TouchableOpacity style={s.attachmentButton} onPress={() => setShowAttachmentModal(true)}
                    disabled={addingComment || isPickerActive}>
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
                      returnKeyType="default"
                      blurOnSubmit={false}
                      onSubmitEditing={() => {
                        if (isSendEnabled()) {
                          handleAddComment();
                        }
                      }}
                    />
                  </View>
                  <TouchableOpacity
                    style={[
                      s.sendButton,
                      { backgroundColor: isSendEnabled() ? C.primary : C.border }
                    ]}
                    onPress={handleAddComment}
                    disabled={addingComment || !isSendEnabled()}
                  >
                    {addingComment ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Ionicons
                        name="send"
                        size={18}
                        color={isSendEnabled() ? '#FFF' : C.textTertiary}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {showDefaultComments && (
        <View style={s.defaultCommentsOverlay}>
          <SafeAreaView style={s.defaultCommentsModal}>
            <View style={s.defaultCommentsHeader}>
              <Text style={s.defaultCommentsTitle}>Quick Replies</Text>
              <TouchableOpacity
                onPress={() => setShowDefaultComments(false)}
                style={s.closeDefaultCommentsButton}
              >
                <Ionicons name="close" size={22} color={C.textTertiary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={defaultComments}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.defaultCommentItem}
                  onPress={() => handleDefaultCommentSelect(item)}
                >
                  <Text style={s.defaultCommentText}>
                    {(() => {
                      try {
                        return JSON.parse(item.data);
                      } catch {
                        return item.data;
                      }
                    })()}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={s.defaultCommentsList}
            />
          </SafeAreaView>
        </View>
      )}

      <Modal
        visible={showAttachmentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!isPickerActive) {
            setShowAttachmentModal(false);
          }
        }}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            if (!isPickerActive) {
              setShowAttachmentModal(false);
            }
          }}
        >
          <View style={s.attachmentModalContent}>
            <TouchableOpacity
              style={s.attachmentOption}
              onPress={handleSelectDocument}
              disabled={isPickerActive}
            >
              <View style={[s.attachmentIconContainer, { backgroundColor: '#7F66FF' }]}>
                <MaterialIcons name="insert-drive-file" size={24} color="#FFF" />
              </View>
              <Text style={s.attachmentOptionText}>Document</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.attachmentOption}
              onPress={handleTakePhoto}
              disabled={isPickerActive}
            >
              <View style={[s.attachmentIconContainer, { backgroundColor: '#FF4D67' }]}>
                <Ionicons name="camera" size={24} color="#FFF" />
              </View>
              <Text style={s.attachmentOptionText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.attachmentOption}
              onPress={handleSelectFromGallery}
              disabled={isPickerActive}
            >
              <View style={[s.attachmentIconContainer, { backgroundColor: '#C861F9' }]}>
                <Ionicons name="images" size={24} color="#FFF" />
              </View>
              <Text style={s.attachmentOptionText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

LeadDetails.displayName = 'LeadDetails';

const s = StyleSheet.create({
  mainContainer: { 
  flex: 1, 
  backgroundColor: C.chatBg,
  ...(Platform.OS === 'web' ? {
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  } : {}),
},
headerWrapper: {
  ...(Platform.OS === 'web' ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  } : {}),
},
  androidContainer: { flex: 1 },
  iosContainer: { flex: 1 },
  headerSafeArea: { 
  backgroundColor: C.primary,
  ...(Platform.OS === 'web' ? {
    flexShrink: 0,
  } : {}),
},
  header: {
    backgroundColor: C.primary,
    borderBottomWidth: 1,
    borderBottomColor: C.primaryDark
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60
  },
  backButton: { padding: 8, marginRight: 8 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { marginRight: 12, position: 'relative' },
  avatarPlaceholder: {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},
  avatarText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.success,
    borderWidth: 2,
    borderColor: C.primary
  },
  headerTextContainer: { flex: 1 },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2
  },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerActionButton: { padding: 8 },
  incentiveButton: { marginRight: 4 },
  modalContainer: { flex: 1, backgroundColor: C.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: C.primary
  },
  modalBackButton: { padding: 8, marginRight: 12 },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    flex: 1
  },
  modalScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1
  },

  // ============ CONTAINER BOX STYLES ============
  containerBox: {
    backgroundColor: C.surface,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden'
  },

  // ============ LEAD INFO CONTAINER STYLES ============
  leadInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 16
  },

  leadAvatarSection: {
    alignItems: 'center'
  },

  leadAvatar: {
  width: 70,
  height: 70,
  borderRadius: 35,
  alignItems: 'center',
  justifyContent: 'center',
 
},

  leadAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF'
  },

  leadHeaderSection: {
    flex: 1,
    justifyContent: 'center'
  },

  leadNameText: {
    fontSize: 22,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 4
  },

  leadCompanyText: {
    fontSize: 15,
    fontWeight: '500',
    color: C.textSecondary
  },

  // ============ STATUS BADGES CONTAINER ============
  statusBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10
  },

  statusBadgeBox: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },

  statusBadgeBoxText: {
    fontSize: 13,
    fontWeight: '600'
  },

  containerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.primary + '08',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10
  },

  containerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.primary,
    flex: 1
  },

  containerContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12
  },

  // ============ DETAIL BOX STYLES ============
  detailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'space-between',
    marginBottom: 8
  },

  detailContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10
  },

  detailText: {
    fontSize: 14,
    color: C.textPrimary,
    flex: 1
  },

  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
    marginBottom: 8,
    marginTop: 4
  },

  // ============ INFO ITEM STYLES ============
  infoItem: {
    marginBottom: 12
  },

  infoItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
    marginBottom: 6
  },

  infoItemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border
  },

  infoItemValue: {
    fontSize: 14,
    color: C.textPrimary,
    flex: 1
  },

  // ============ CUSTOM FIELDS STYLES ============
  customFieldsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border
  },

  customFieldBox: {
    backgroundColor: C.customFieldBg,
    borderWidth: 1,
    borderColor: C.customFieldBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8
  },

  customFieldKeyText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.customFieldBorder,
    marginBottom: 4
  },

  customFieldValueText: {
    fontSize: 14,
    color: C.textPrimary,
    lineHeight: 18
  },

  // ============ METADATA STYLES ============
  metadataItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  metadataLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
    marginBottom: 4
  },

  metadataValue: {
    fontSize: 14,
    color: C.textPrimary
  },

  // ============ COLLABORATORS STYLES ============
  collaboratorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },

  collaboratorCard: {
    alignItems: 'center',
    width: '48%',
    backgroundColor: C.background,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8
  },

  collaboratorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },

  collaboratorAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF'
  },

  collaboratorName: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: 'center'
  },

  // ============ NOTES STYLES ============
  notesBox: {
    backgroundColor: C.background,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border
  },

  notesText: {
    fontSize: 14,
    color: C.textPrimary,
    lineHeight: 20
  },

  // Original styles
  section: {
    backgroundColor: C.surface,
    marginBottom: 10,
    borderRadius: 12,
    padding: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.primary,
    marginBottom: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: C.background,
    borderRadius: 8
  },
  detailValue: {
    fontSize: 15,
    color: C.textPrimary,
    marginLeft: 12,
    flex: 1
  },
  copyButton: { padding: 4 },
  metadataRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  collaboratorsGridOld: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  collaboratorItem: { alignItems: 'center', width: 80 },
  notesContainer: { backgroundColor: C.background, padding: 16, borderRadius: 8 },
  chatContainer: { 
  flex: 1, 
  backgroundColor: C.chatBg,
  ...(Platform.OS === 'web' ? {
    position: 'fixed',
    top: 116,
    bottom: 68,
    left: 0,
    right: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
  } : {}),
},
  chatListContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 20
  },
  chatBubbleContainer: { marginVertical: 4, maxWidth: '80%' },
  currentUserBubbleContainer: { alignSelf: 'flex-end' },
  otherUserBubbleContainer: { alignSelf: 'flex-start' },
  chatBubble: {
    padding: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 220,
  },
  currentUserBubble: { borderBottomRightRadius: 2 },
  otherUserBubble: { borderBottomLeftRadius: 2 },
  senderName: { fontSize: 12, fontWeight: '600', marginBottom: 3 },
  chatMessage: { fontSize: 15, lineHeight: 20 },
  chatAttachments: { marginBottom: 6, gap: 6 },
  imageAttachment: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4
  },
  chatImage: { width: 200, height: 150, borderRadius: 8 },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  documentAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 8,
    marginBottom: 4,
    minWidth: 200,
    maxWidth: 280,
  },
  documentAttachmentOutgoing: { backgroundColor: 'rgba(7, 94, 84, 0.15)' },
  documentAttachmentIncoming: { backgroundColor: 'rgba(7, 94, 84, 0.08)' },
  documentIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  docIconOutgoing: { backgroundColor: 'rgba(255, 255, 255, 0.7)' },
  docIconIncoming: { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
  documentInfo: { flex: 1 },
  documentName: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  documentSize: { fontSize: 11 },
  chatTimestamp: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2
  },
  chatTimeText: { fontSize: 10 },
  deliveryIcon: { marginLeft: 4 },
  selectedFilesPreview: {
  backgroundColor: C.surface,
  borderTopWidth: 1,
  borderTopColor: C.border,
  paddingHorizontal: 16,
  paddingVertical: 12,
  ...(Platform.OS === 'web' ? {
    position: 'fixed',
    bottom: 68,
    left: 0,
    right: 0,
    zIndex: 9,
  } : {}),
},
  selectedFilesTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textSecondary,
    marginBottom: 8
  },
  selectedFilesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectedDocumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 180,
    gap: 8
  },
  selectedDocumentInfo: { flex: 1 },
  selectedDocumentName: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textPrimary,
    marginBottom: 2
  },
  selectedDocumentSize: { fontSize: 11, color: C.textTertiary },
  inputContainerWrapper: {
  borderTopWidth: 1,
  borderTopColor: C.border,
  backgroundColor: C.surface,
  ...(Platform.OS === 'web' ? {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  } : {}),
},
  androidInputContainer: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface
  },
  inputSafeArea: { backgroundColor: C.surface },
  inputContainer: { backgroundColor: C.surface },
  inputWrapper: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 8 : 8 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  attachmentButton: { padding: 8, marginBottom: 2, position: 'relative' },
  fileCounterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: C.danger,
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1
  },
  fileCounterText: {
    fontSize: 10,
    color: C.surface,
    fontWeight: '600'
  },
  inputField: {
    flex: 1,
    backgroundColor: C.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 30,
    maxHeight: 100
  },
  messageInput: { fontSize: 15, color: C.textPrimary, padding: 0, maxHeight: 80 },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16
  },
  loadingText: { fontSize: 16, color: C.textSecondary },
  loadMoreContainer: { alignItems: 'center', paddingVertical: 16 },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 16
  },
  emptyChatTitle: { fontSize: 18, fontWeight: '600', color: C.textPrimary },
  emptyChatText: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    maxWidth: 200
  },
  defaultCommentsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  defaultCommentsModal: {
    backgroundColor: C.surface,
    borderRadius: 16,
    maxHeight: screenHeight * 0.6,
    overflow: 'hidden'
  },
  defaultCommentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border
  },
  defaultCommentsTitle: { fontSize: 18, fontWeight: '600', color: C.primary },
  closeDefaultCommentsButton: { padding: 4 },
  defaultCommentsList: { paddingHorizontal: 16, paddingVertical: 8 },
  defaultCommentItem: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border
  },
  defaultCommentText: { fontSize: 16, color: C.textPrimary, lineHeight: 22 },
  modalBottomSpacing: { height: 40 },
  dateSeparatorContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorBubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  attachmentModalContent: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  attachmentOption: {
    alignItems: 'center',
    gap: 8,
  },
  attachmentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentOptionText: {
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: '500',
  },

  // Lead Specific Information Styles (matching EditLead)
  leadInfoGroup: {
    marginBottom: 16,
  },
  leadInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textSecondary,
    marginBottom: 8,
  },
  leadInfoValueContainer: {
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.background,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadInfoIcon: {
    marginRight: 8,
  },
  leadInfoValue: {
    fontSize: 15,
    color: C.textPrimary,
    flex: 1,
  },
  customFieldsSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  customFieldRow: {
    marginBottom: 12,
  },
  customFieldContainer: {
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#9CA3AF',
  },
  customFieldKey: {
    fontSize: 13,
    fontWeight: '600',
    color: C.customFieldBorder,
    marginBottom: 4,
  },
  customFieldValue: {
    fontSize: 14,
    color: C.textPrimary,
    lineHeight: 18,
  },
});

export default LeadDetails;