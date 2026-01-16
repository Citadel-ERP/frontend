import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  // SafeAreaView,
  FlatList,
  Image,
  Linking,
  StatusBar,
  Platform,
  Keyboard,
  KeyboardEvent,
  Animated,
  KeyboardAvoidingView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, Lead, Comment, CollaboratorData, DocumentType, Pagination } from './types';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

interface LeadWithNotes extends Omit<Lead, 'notes'> {
  notes?: string;
}

interface LeadDetailsProps {
  lead: Lead;
  onBack: () => void;
  onEdit: () => void;
  token: string | null;
  theme: ThemeColors;
}

const LeadDetails: React.FC<LeadDetailsProps> = ({
  lead,
  onBack,
  onEdit,
  token,
  theme,
}) => {
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
  const [incentiveData, setIncentiveData] = useState<any>(null);
  const [loadingIncentive, setLoadingIncentive] = useState(false);
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const modalFlatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;

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

  // Handle keyboard events to fix the Android padding issue
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
      // On Android, we'll manually animate the keyboard height
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
      // On Android, immediately set keyboard height to 0 to avoid the extra padding issue
      Animated.timing(keyboardHeightAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  };

  useEffect(() => {
    if (token) {
      fetchComments(lead.id, 1);
      fetchCollaborators(lead.id);
      // fetchDefaultComments(lead.phase, lead.subphase);
      if (lead.incentive_present) {
        fetchIncentiveData();
      }
    }
  }, [token, lead.id]);

  useEffect(() => {
    if (comments.length > 0 && flatListRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [comments.length]);

  const beautifyName = (name: string): string => {
    if (!name) return '';
    return name
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDateTime = (dateString?: string): string => {
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
  };

  const formatTime = (dateString?: string): string => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatWhatsAppDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const compareToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const compareYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (compareDate.getTime() === compareToday.getTime()) {
      return 'Today';
    } else if (compareDate.getTime() === compareYesterday.getTime()) {
      return 'Yesterday';
    } else if (today.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const truncateFileName = (fileName: string, maxLength: number = 25): string => {
    if (fileName.length <= maxLength) return fileName;
    return fileName.substring(0, maxLength - 3) + '...';
  };

  const getInitials = (name: string): string => {
    if (!name || name.trim().length === 0) return '?';
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
    }
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
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
  };

  const fetchIncentiveData = async (): Promise<void> => {
    try {
      if (!token || !lead.incentive_present) return;

      setLoadingIncentive(true);
      const response = await fetch(`${BACKEND_URL}/manager/getIncentive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          lead_id: lead.id
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setIncentiveData(data.incentive || null);
    } catch (error) {
      console.error('Error fetching incentive data:', error);
      setIncentiveData(null);
    } finally {
      setLoadingIncentive(false);
    }
  };

  const handleIncentivePress = () => {
    if (!lead.incentive_present) return;

    if (loadingIncentive) {
      Alert.alert('Loading', 'Fetching incentive details...');
      return;
    }

    if (incentiveData) {
      Alert.alert(
        'Incentive Details',
        `Amount: ₹${incentiveData.amount || '0'}\n` +
        `Status: ${incentiveData.status || 'Pending'}\n` +
        `Date: ${formatDateTime(incentiveData.created_at)}\n` +
        `Notes: ${incentiveData.notes || 'No additional notes'}`
      );
    } else {
      Alert.alert('Incentive', 'No incentive data available for this lead.');
    }
  };

  const fetchComments = async (
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

      let response;
      try {
        response = await fetch(`${BACKEND_URL}/manager/getComments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token, lead_id: leadId, page: page })
        });
      } catch (error1) {
        response = await fetch(`${BACKEND_URL}/manager/getComments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token, lead_id: leadId, page: page })
        });
      }

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
      setCommentsPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching comments:', error);
      Alert.alert('Error', 'Failed to fetch comments. Please try again.');
    } finally {
      setLoadingComments(false);
      setLoadingMoreComments(false);
    }
  };

  const fetchCollaborators = async (leadId: number): Promise<void> => {
    try {
      if (!token) return;
      setLoadingCollaborators(true);

      let response;
      try {
        response = await fetch(`${BACKEND_URL}/manager/getCollaborators`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token, lead_id: leadId })
        });
      } catch (error1) {
        response = await fetch(`${BACKEND_URL}/manager/getCollaborators`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token, lead_id: leadId })
        });
      }

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setCollaborators(data.collaborators || []);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      Alert.alert('Error', 'Failed to fetch collaborators. Please try again.');
    } finally {
      setLoadingCollaborators(false);
    }
  };

  // const fetchDefaultComments = async (phase: string, subphase: string): Promise<void> => {
  //   try {
  //     if (!token) return;
  //     setLoadingDefaultComments(true);

  //     const response = await fetch(
  //       `${BACKEND_URL}/manager/getDefaultComments?at_phase=${encodeURIComponent(
  //         phase
  //       )}&at_subphase=${encodeURIComponent(subphase)}`,
  //       {
  //         method: 'GET',
  //         headers: { 'Content-Type': 'application/json' }
  //       }
  //     );

  //     if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  //     const data = await response.json();
  //     setDefaultComments(data.comments || []);
  //   } catch (error) {
  //     console.error('Error fetching default comments:', error);
  //     setDefaultComments([]);
  //   } finally {
  //     setLoadingDefaultComments(false);
  //   }
  // };

  const handleAttachDocuments = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*'
      });
      if (!result.canceled && result.assets) {
        setSelectedDocuments(result.assets);
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      Alert.alert('Error', 'Failed to pick documents. Please try again.');
    }
  };

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

      if (documents && documents.length > 0) {
        documents.forEach((doc, index) => {
          formData.append('documents', {
            uri: doc.uri,
            type: doc.mimeType || 'application/octet-stream',
            name: doc.name
          } as any);
        });
      }

      let response;
      try {
        response = await fetch(`${BACKEND_URL}/manager/addComment`, {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (error1) {
        response = await fetch(`${BACKEND_URL}/manager/addComment`, {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      const newComment: Comment = {
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

      setComments(prev => [...prev, newComment]);
      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
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
    if (success) {
      setNewComment('');
      setSelectedDocuments([]);
    }
  };

  const handleDefaultCommentSelect = (defaultComment: any) => {
    try {
      const commentText = JSON.parse(defaultComment.data);
      setNewComment(commentText);
      setShowDefaultComments(false);
    } catch (error) {
      setNewComment(defaultComment.data);
      setShowDefaultComments(false);
    }
  };

  const handleRemoveDocument = (index: number) => {
    setSelectedDocuments(prevDocs => prevDocs.filter((_, i) => i !== index));
  };

  const handleLoadMoreComments = useCallback(() => {
    if (commentsPagination && commentsPagination.has_next && !loadingMoreComments) {
      fetchComments(lead.id, commentsPagination.current_page + 1, true);
    }
  }, [commentsPagination, loadingMoreComments, lead.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchComments(lead.id, 1);
    fetchCollaborators(lead.id);
    if (lead.incentive_present) {
      fetchIncentiveData();
    }
    setRefreshing(false);
  };

  const getProcessedComments = () => {
    if (!comments || comments.length === 0) return [];
    const processed: any[] = [];
    let lastDate = '';
    const sortedComments = [...comments].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    sortedComments.forEach((comment, index) => {
      const commentDate = formatWhatsAppDate(comment.date);
      if (commentDate !== lastDate) {
        processed.push({
          type: 'dateSeparator',
          id: `date-${commentDate}-${index}`,
          date: commentDate,
          originalDate: comment.date
        });
        lastDate = commentDate;
      }
      processed.push({
        type: 'comment',
        id: comment.id,
        data: comment
      });
    });
    return processed;
  };

  const renderChatItem = ({ item }: { item: any }) => {
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
      <View style={[
        s.messageRow,
        isCurrentUser ? s.messageRowRight : s.messageRowLeft
      ]}>

        <View style={[
          s.messageBubble,
          isCurrentUser ? s.currentUserBubble : s.otherUserBubble
        ]}>
          {!isCurrentUser && (
            <View style={s.senderHeader}>
              <Text style={s.senderName}>{comment.commentBy}</Text>
            </View>
          )}

          {comment.documents && comment.documents.length > 0 && (
            <View style={s.documentsContainer}>
              {comment.documents.map((doc: DocumentType) => {
                const isImage = doc.document_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                if (isImage) {
                  return (
                    <TouchableOpacity
                      key={doc.id}
                      style={s.imageWrapper}
                      onPress={() => handleDownloadFile(doc.document_url, doc.document_name)}
                    >
                      <Image
                        source={{ uri: doc.document_url }}
                        style={s.commentImage}
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
                      style={s.documentItem}
                      onPress={() => handleDownloadFile(doc.document_url, doc.document_name)}
                    >
                      <View style={s.documentIconContainer}>
                        <Ionicons name="document-text" size={24} color={C.primary} />
                      </View>
                      <View style={s.documentInfo}>
                        <Text style={s.documentName} numberOfLines={1}>
                          {truncateFileName(doc.document_name)}
                        </Text>
                        <Text style={s.documentSize}>Tap to download</Text>
                      </View>
                      <Ionicons name="download-outline" size={20} color={C.primary} />
                    </TouchableOpacity>
                  );
                }
              })}
            </View>
          )}

          {comment.content && (
            <Text style={s.messageText}>
              {comment.content}
            </Text>
          )}

          <View style={s.messageFooter}>
            <Text style={s.messageTime}>{time}</Text>
            {isCurrentUser && (
              <Ionicons name="checkmark-done" size={14} color={C.primary} style={s.deliveryIcon} />
            )}
          </View>
        </View>

      </View>
    );
  };

  const ModernHeader = () => (
    <SafeAreaView style={s.headerSafeArea}>
      <View style={s.header}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <View style={s.headerContent}>
          <TouchableOpacity onPress={onBack} style={s.backButton}>
            <View style={s.backIcon}>
              <View style={s.backArrow} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.headerInfo}
            onPress={() => setShowLeadDetailsModal(true)}
            activeOpacity={0.7}
          >
            <View style={s.avatarContainer}>
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarText}>
                  {getInitials(lead.name)}
                </Text>
              </View>
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
            <TouchableOpacity style={s.headerActionButton}>
              <MaterialIcons name="receipt" size={22} color="#FFF" />
            </TouchableOpacity>

            {lead.incentive_present && (
              <TouchableOpacity
                style={[s.headerActionButton, s.incentiveButton]}
                onPress={handleIncentivePress}
                disabled={loadingIncentive}
              >
                {loadingIncentive ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <MaterialIcons name="monetization-on" size={22} color="#FFF" />
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={onEdit} style={s.headerActionButton}>
              <MaterialIcons name="edit" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );

  const renderModalSection = ({ item }: { item: string }) => {
    switch (item) {
      case 'lead-info':
        return (
          <View style={s.infoCard}>
            <View style={s.infoCardHeader}>
              <View style={s.infoAvatarContainer}>
                <View style={s.infoAvatar}>
                  <Text style={s.infoAvatarText}>
                    {getInitials(lead.name)}
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
            {lead.emails && lead.emails.length > 0 ? lead.emails.map((email, idx) => (
              <View key={idx} style={s.detailRow}>
                <MaterialIcons name="email" size={20} color={C.primary} />
                <Text style={s.detailValue}>{email.email}</Text>
                <TouchableOpacity style={s.copyButton}>
                  <Ionicons name="copy-outline" size={16} color={C.textTertiary} />
                </TouchableOpacity>
              </View>
            )) : (
              <Text style={s.emptyText}>No emails</Text>
            )}
            {lead.phone_numbers && lead.phone_numbers.length > 0 ? lead.phone_numbers.map((phone, idx) => (
              <View key={idx} style={s.detailRow}>
                <MaterialIcons name="phone" size={20} color={C.primary} />
                <Text style={s.detailValue}>{phone.number}</Text>
                <TouchableOpacity style={s.copyButton}>
                  <Ionicons name="copy-outline" size={16} color={C.textTertiary} />
                </TouchableOpacity>
              </View>
            )) : (
              <Text style={s.emptyText}>No phone numbers</Text>
            )}
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
            {lead.assigned_to && (
              <View style={s.metadataRow}>
                <MaterialIcons name="person" size={18} color={C.textTertiary} />
                <Text style={s.metadataLabel}>Assigned to:</Text>
                <Text style={s.metadataValue}>{lead.assigned_to.full_name}</Text>
              </View>
            )}
            {lead.city && (
              <View style={s.metadataRow}>
                <MaterialIcons name="location-on" size={18} color={C.textTertiary} />
                <Text style={s.metadataLabel}>Location:</Text>
                <Text style={s.metadataValue}>{lead.city}</Text>
              </View>
            )}
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
                      {getInitials(collab.user.full_name)}
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

      default:
        return null;
    }
  };

  const modalSections = [
    'lead-info',
    'contact-info',
    'metadata',
    ...(collaborators.length > 0 ? ['collaborators'] : [])
  ];

  const ContactInfoModal = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={showLeadDetailsModal}
      onRequestClose={() => setShowLeadDetailsModal(false)}
    >
      <View style={s.modalHeader}>
        <TouchableOpacity
          onPress={() => setShowLeadDetailsModal(false)}
          style={s.modalBackButton}
        >
          <View style={s.backIcon}>
            <View style={s.backArrow} />
            <Text style={s.backText}>Back</Text>
          </View>
        </TouchableOpacity>
        <Text style={s.modalTitle}>Lead Details</Text>
        <View style={s.modalRightPlaceholder} />
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
  );

  return (
    <View style={s.mainContainer}>
      <ModernHeader />
      <ContactInfoModal />

      {/* Android-specific keyboard handling to avoid the extra padding issue */}
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
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        s.sendButton,
                        { backgroundColor: (newComment.trim() || selectedDocuments.length > 0) ? C.primary : C.border }
                      ]}
                      onPress={handleAddComment}
                      disabled={addingComment || (!newComment.trim() && selectedDocuments.length === 0)}
                    >
                      {addingComment ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Ionicons
                          name="send"
                          size={18}
                          color={(newComment.trim() || selectedDocuments.length > 0) ? '#FFF' : C.textTertiary}
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
        // iOS - Use standard KeyboardAvoidingView
        <KeyboardAvoidingView
          style={s.iosContainer}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
                    />
                  </View>
                  <TouchableOpacity
                    style={[
                      s.sendButton,
                      { backgroundColor: (newComment.trim() || selectedDocuments.length > 0) ? C.primary : C.border }
                    ]}
                    onPress={handleAddComment}
                    disabled={addingComment || (!newComment.trim() && selectedDocuments.length === 0)}
                  >
                    {addingComment ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Ionicons
                        name="send"
                        size={18}
                        color={(newComment.trim() || selectedDocuments.length > 0) ? '#FFF' : C.textTertiary}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </SafeAreaView>
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
    </View>
  );
};

const s = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: C.chatBg
  },

  // Android-specific container
  androidContainer: {
    flex: 1,
  },

  // iOS-specific container
  iosContainer: {
    flex: 1,
  },

  androidInputContainer: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surface,
  },

  // Header Styles - Fixed Safe Area
  headerSafeArea: {
    backgroundColor: C.primary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    backgroundColor: C.primary,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: C.primaryDark,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: '100%',
  },
  backButton: {
    padding: 8,
    minWidth: 40,
  },
  backIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backArrow: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#FFF',
    transform: [{ rotate: '-45deg' }],
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: C.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
    justifyContent: 'flex-end',
    gap: 8,
  },
  headerActionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  incentiveButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },

  // Modal Safe Area Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: C.background,
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: C.primary,
    height: 70,
  },
  modalBackButton: {
    padding: 8,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  modalRightPlaceholder: {
    width: 40,
  },
  modalScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
  },

  // Info Card Styles
  infoCard: {
    backgroundColor: C.surface,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoAvatarContainer: {
    marginRight: 16
  },
  infoAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoAvatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFF'
  },
  infoHeaderText: {
    flex: 1
  },
  infoName: {
    fontSize: 22,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 4,
  },
  infoCompany: {
    fontSize: 16,
    color: C.textSecondary
  },
  statusBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500'
  },

  // Section Styles
  section: {
    backgroundColor: C.surface,
    marginBottom: 12,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.primary,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: C.background,
    borderRadius: 8,
  },
  detailValue: {
    fontSize: 15,
    color: C.textPrimary,
    marginLeft: 12,
    flex: 1,
  },
  copyButton: {
    padding: 4
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  metadataLabel: {
    fontSize: 14,
    color: C.textSecondary,
    marginLeft: 8,
    marginRight: 4,
    minWidth: 100,
  },
  metadataValue: {
    fontSize: 14,
    color: C.textPrimary,
    flex: 1
  },
  emptyText: {
    fontSize: 14,
    color: C.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  collaboratorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  collaboratorItem: {
    alignItems: 'center',
    width: 80
  },
  collaboratorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  collaboratorAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF'
  },
  collaboratorName: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: 'center',
  },

  // Chat Container
  chatContainer: {
    flex: 1,
    backgroundColor: C.chatBg
  },
  chatListContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 20,
    flexGrow: 1,
  },

  // Date Separator (HR Style)
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

  // Message Alignment Styles
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 8,
    alignItems: 'flex-start',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },

  // Avatars
  otherAvatar: {
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  currentUserAvatar: {
    marginLeft: 8,
    alignSelf: 'flex-start',
  },

  // Message Bubbles
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentUserBubble: {
    backgroundColor: C.outgoing,
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: C.incoming,
    borderBottomLeftRadius: 4,
  },

  // Sender Header
  senderHeader: {
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primary,
    marginBottom: 2,
  },

  // Message Text Styles
  messageText: {
    fontSize: 16,
    color: C.textPrimary,
    lineHeight: 22,
  },

  // Documents Container
  documentsContainer: {
    marginBottom: 8,
    gap: 8,
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  commentImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 94, 84, 0.1)',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  documentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
    marginBottom: 2,
  },
  documentSize: {
    fontSize: 12,
    color: C.textSecondary,
  },

  // Message Footer
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: C.textTertiary,
  },
  deliveryIcon: {
    marginLeft: 4,
  },

  // Selected Files Preview
  selectedFilesPreview: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedFilesTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textSecondary,
    marginBottom: 8,
  },
  selectedDocumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 180,
    gap: 8,
  },
  selectedDocumentInfo: {
    flex: 1
  },
  selectedDocumentName: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textPrimary,
    marginBottom: 2,
  },
  selectedDocumentSize: {
    fontSize: 11,
    color: C.textTertiary
  },

  // Input Area
  inputSafeArea: {
    backgroundColor: C.surface,
  },
  inputContainer: {
    backgroundColor: C.surface,
    paddingBottom: Platform.OS === 'ios' ? 0 : 10,
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  attachmentButton: {
    padding: 8,
    position: 'relative',
  },
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
  },
  fileCounterText: {
    fontSize: 10,
    color: C.surface,
    fontWeight: '600',
  },
  inputField: {
    flex: 1,
    backgroundColor: C.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    maxHeight: 100,
  },
  messageInput: {
    fontSize: 15,
    color: C.textPrimary,
    padding: 0,
    maxHeight: 80,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: C.textSecondary
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: 16
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 16,
  },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.textPrimary
  },
  emptyChatText: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    maxWidth: 200,
  },

  // Default Comments
  defaultCommentsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  defaultCommentsModal: {
    backgroundColor: C.surface,
    borderRadius: 16,
    maxHeight: screenHeight * 0.6,
    overflow: 'hidden',
  },
  defaultCommentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  defaultCommentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.primary
  },
  closeDefaultCommentsButton: {
    padding: 4
  },
  defaultCommentsList: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  defaultCommentItem: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  defaultCommentText: {
    fontSize: 16,
    color: C.textPrimary,
    lineHeight: 22
  },

  modalBottomSpacing: {
    height: 40
  },
  backText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 2,
  },
});

export default LeadDetails;