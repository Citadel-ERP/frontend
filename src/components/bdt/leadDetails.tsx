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
  Animated
} from 'react-native';
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

const C = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  primaryDark: '#054D44',
  secondary: '#25D366',
  accent: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#F0F2F5',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#25D366',
  chatBg: '#ECE5DD',
  incoming: '#FFFFFF',
  outgoing: '#DCF8C6'
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
  
  // Refs
  const flatListRef = useRef<FlatList>(null);
  const hasLoadedInitially = useRef(false);
  const modalFlatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;

  // Get keyboard behavior based on platform
  const keyboardBehavior = useMemo(() => Platform.OS === 'ios' ? 'padding' : 'height', []);

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

  const handleAttachDocuments = useCallback(async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*'
      });
      if (!result.canceled && result.assets) {
        setSelectedDocuments(result.assets);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      Alert.alert('Error', 'Failed to pick documents. Please try again.');
    }
  }, []);

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
    <SafeAreaView style={s.headerSafeArea}>
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
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarText}>
                  {getInitials(lead.name || 'L')}
                </Text>
              </View>
              <View style={s.onlineIndicator} />
            </View>
            <View style={s.headerTextContainer}>
              <Text style={s.headerTitle} numberOfLines={1}>
                {lead.name || 'Lead'}
              </Text>
              <Text style={s.headerSubtitle} numberOfLines={1}>
                {beautifyName(lead.phase)} • {beautifyName(lead.subphase)}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={s.headerActions}>
            <TouchableOpacity onPress={onIncentivePress} style={[s.headerActionButton, s.incentiveButton]}>
              <MaterialIcons name="monetization-on" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onEdit} style={s.headerActionButton}>
              <MaterialIcons name="edit" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  ), [onBack, onIncentivePress, onEdit, lead, beautifyName, getInitials]);

  const renderModalSection = useCallback(({ item }: { item: string }) => {
    switch (item) {
      case 'lead-info':
        return (
          <View style={s.infoCard}>
            <View style={s.infoCardHeader}>
              <View style={s.infoAvatarContainer}>
                <View style={s.infoAvatar}>
                  <Text style={s.infoAvatarText}>
                    {getInitials(lead.name || 'L')}
                  </Text>
                </View>
              </View>
              <View style={s.infoHeaderText}>
                <Text style={s.infoName}>{lead.name || 'Lead'}</Text>
                {lead.company && <Text style={s.infoCompany}>{lead.company}</Text>}
              </View>
            </View>
            <View style={s.statusBadges}>
              <View style={[s.statusBadge, { backgroundColor: C.primary + '15' }]}>
                <Text style={[s.statusBadgeText, { color: C.primary }]}>
                  {beautifyName(lead.phase)}
                </Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: C.secondary + '15' }]}>
                <Text style={[s.statusBadgeText, { color: C.secondary }]}>
                  {beautifyName(lead.subphase)}
                </Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: C.accent + '15' }]}>
                <Text style={[s.statusBadgeText, { color: C.accent }]}>
                  {beautifyName(lead.status)}
                </Text>
              </View>
            </View>
          </View>
        );

      case 'contact-info':
        return (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Contact Information</Text>
            {lead.emails.map((email, idx) => (
              <View key={idx} style={s.detailRow}>
                <MaterialIcons name="email" size={20} color={C.primary} />
                <Text style={s.detailValue}>{email.email}</Text>
                <TouchableOpacity style={s.copyButton}>
                  <Ionicons name="copy-outline" size={16} color={C.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
            {lead.phone_numbers.map((phone, idx) => (
              <View key={idx} style={s.detailRow}>
                <MaterialIcons name="phone" size={20} color={C.primary} />
                <Text style={s.detailValue}>{phone.number}</Text>
                <TouchableOpacity style={s.copyButton}>
                  <Ionicons name="copy-outline" size={16} color={C.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );

      case 'metadata':
        return (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Metadata</Text>
            <View style={s.metadataRow}>
              <MaterialIcons name="calendar-today" size={18} color={C.textTertiary} />
              <Text style={s.metadataLabel}>Created:</Text>
              <Text style={s.metadataValue}>
                {formatDateTime(lead.created_at || lead.createdAt)}
              </Text>
            </View>
          </View>
        );

      case 'collaborators':
        return collaborators.length > 0 ? (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Team ({collaborators.length})</Text>
            </View>
            <View style={s.collaboratorsGrid}>
              {collaborators.map((collab) => (
                <View key={collab.id} style={s.collaboratorItem}>
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
        ) : null;

      case 'notes':
        return lead.notes ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Notes</Text>
            <View style={s.notesContainer}>
              <Text style={s.notesText}>{lead.notes}</Text>
            </View>
          </View>
        ) : null;

      default:
        return null;
    }
  }, [lead, collaborators, beautifyName, formatDateTime, getInitials]);

  const modalSections = useMemo(() => {
    const sections = ['lead-info', 'contact-info', 'metadata'];
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
      <SafeAreaView style={s.modalContainer}>
        <View style={s.modalHeader}>
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
      </SafeAreaView>
    </Modal>
  ), [showLeadDetailsModal, modalSections, renderModalSection]);

  return (
    <View style={s.mainContainer}>
      {ModernHeader}
      {ContactInfoModal}

      <KeyboardAvoidingView
        style={s.keyboardAvoidView}
        behavior={keyboardBehavior}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled
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

        <View style={s.inputContainerWrapper}>
          <SafeAreaView style={s.inputSafeArea} edges={['bottom']}>
            <View style={s.inputContainer}>
              <View style={s.inputWrapper}>
                <View style={s.inputRow}>
                  <TouchableOpacity style={s.attachmentButton} onPress={handleAttachDocuments}>
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
        </View>
      </KeyboardAvoidingView>

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
    </View>
  );
});

LeadDetails.displayName = 'LeadDetails';

const s = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: C.chatBg },
  container: { flex: 1, backgroundColor: C.chatBg },
  keyboardAvoidView: { flex: 1 },
  headerSafeArea: { backgroundColor: C.primary },
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.primaryDark
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
  infoCard: {
    backgroundColor: C.surface,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  infoAvatarContainer: { marginRight: 16 },
  infoAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  infoAvatarText: { fontSize: 24, fontWeight: '600', color: '#FFF' },
  infoHeaderText: { flex: 1 },
  infoName: {
    fontSize: 22,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 4
  },
  infoCompany: { fontSize: 16, color: C.textSecondary },
  statusBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText: { fontSize: 12, fontWeight: '500' },
  section: {
    backgroundColor: C.surface,
    marginBottom: 12,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
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
  metadataLabel: {
    fontSize: 14,
    color: C.textSecondary,
    marginLeft: 8,
    marginRight: 4
  },
  metadataValue: { fontSize: 14, color: C.textPrimary, flex: 1 },
  collaboratorsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  collaboratorItem: { alignItems: 'center', width: 80 },
  collaboratorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  collaboratorAvatarText: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  collaboratorName: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: 'center'
  },
  notesContainer: { backgroundColor: C.background, padding: 16, borderRadius: 8 },
  notesText: { fontSize: 15, color: C.textPrimary, lineHeight: 22 },
  chatContainer: { flex: 1, backgroundColor: C.chatBg },
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
    elevation: 2
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
    marginBottom: 4
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
    paddingVertical: 12
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
    backgroundColor: C.surface
  },
  inputSafeArea: { backgroundColor: C.surface },
  inputContainer: { backgroundColor: C.surface },
  inputWrapper: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 20 : 8 },
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
  
  // New styles for date separators
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
});

export default LeadDetails;