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
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Image,
  Linking,
  StatusBar,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, Lead, Comment, CollaboratorData, DocumentType, Pagination } from './types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Modern green color scheme
const MODERN_COLORS = {
  primary: '#075E54', // WhatsApp green
  primaryLight: '#128C7E', // Light WhatsApp green
  primaryDark: '#054D44', // Dark WhatsApp green
  secondary: '#25D366', // WhatsApp bright green
  accent: '#10B981', // Emerald green
  danger: '#EF4444', // Red
  warning: '#F59E0B', // Amber
  background: '#F0F2F5', // Light background
  surface: '#FFFFFF', // White for surfaces
  textPrimary: '#1F2937', // Dark gray
  textSecondary: '#6B7280', // Medium gray
  textTertiary: '#9CA3AF', // Light gray
  border: '#E5E7EB', // Border gray
  success: '#25D366', // WhatsApp bright green
  chatBackground: '#ECE5DD', // WhatsApp chat background
  incomingMessage: '#FFFFFF', // White for incoming messages
  outgoingMessage: '#DCF8C6', // Light green for outgoing messages
};

// Update the Lead interface to include notes
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

const LeadDetails: React.FC<LeadDetailsProps> = ({
  lead,
  onBack,
  onEdit,
  onIncentivePress,
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
  
  // Modern modal state
  const [showLeadDetailsModal, setShowLeadDetailsModal] = useState(false);
  
  // Chat scroll ref
  const flatListRef = useRef<FlatList>(null);
  // New ref for modal FlatList to prevent nesting warning
  const modalFlatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (token) {
      fetchComments(lead.id, 1);
      fetchCollaborators(lead.id);
      fetchDefaultComments(lead.phase, lead.subphase);
    }
  }, [token, lead.id]);

  useEffect(() => {
    // Auto-scroll to bottom when new comments are added
    if (comments.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [comments.length]);

  const beautifyName = (name: string): string => {
    if (!name) return '';
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
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

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const supported = await Linking.canOpenURL(fileUrl);
      if (supported) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert('Notification', 'File is Being Uploaded, kindly wait for some time and try again.');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Notification', 'File is Being Uploaded, kindly wait for some time and try again.');
    }
  };

  const fetchComments = async (leadId: number, page: number = 1, append: boolean = false): Promise<void> => {
    try {
      if (!token) return;
      
      if (!append) {
        setLoadingComments(true);
      } else {
        setLoadingMoreComments(true);
      }

      const response = await fetch(`${BACKEND_URL}/employee/getComments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          lead_id: leadId,
          page: page
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const transformedComments: Comment[] = data.comments.map((apiComment: any) => ({
        id: apiComment.comment.id.toString(),
        commentBy: apiComment.comment.user.full_name,
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

      // Sort by date, newest first (for chat, newest at bottom)
      const sortedComments = transformedComments.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      if (append) {
        setComments(prevComments => [...prevComments, ...sortedComments]);
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
  };

  const fetchCollaborators = async (leadId: number): Promise<void> => {
    try {
      if (!token) return;
      
      setLoadingCollaborators(true);

      const response = await fetch(`${BACKEND_URL}/employee/getCollaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          lead_id: leadId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCollaborators(data.collaborators);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      Alert.alert('Error', 'Failed to fetch collaborators. Please try again.');
    } finally {
      setLoadingCollaborators(false);
    }
  };

  const fetchDefaultComments = async (phase: string, subphase: string): Promise<void> => {
    try {
      if (!token) return;
      
      setLoadingDefaultComments(true);

      const response = await fetch(`${BACKEND_URL}/employee/getDefaultComments?at_phase=${encodeURIComponent(phase)}&at_subphase=${encodeURIComponent(subphase)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDefaultComments(data.comments);
    } catch (error) {
      console.error('Error fetching default comments:', error);
      Alert.alert('Error', 'Failed to fetch default comments. Please try again.');
      setDefaultComments([]);
    } finally {
      setLoadingDefaultComments(false);
    }
  };

  const handleAttachDocuments = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*',
      });

      if (!result.canceled && result.assets) {
        setSelectedDocuments(result.assets);
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      Alert.alert('Error', 'Failed to pick documents. Please try again.');
    }
  };

  const addCommentToBackend = async (comment: string, documents: DocumentPicker.DocumentPickerAsset[]): Promise<boolean> => {
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
            name: doc.name,
          } as any);
        });
      }

      const response = await fetch(`${BACKEND_URL}/employee/addComment`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const newComment: Comment = {
        id: data.lead_comment.comment.id.toString(),
        commentBy: data.lead_comment.comment.user.full_name,
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

      setComments(prevComments => [...prevComments, newComment]);
      
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
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
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
    setRefreshing(false);
  };

  // Modern chat bubble renderer with file download
  const renderChatBubble = ({ item }: { item: Comment }) => {
    const isCurrentUser = item.commentBy === 'You' || item.commentBy.includes('Current');
    const time = formatTime(item.date);
    
    return (
      <View style={[
        styles.chatBubbleContainer,
        isCurrentUser ? styles.currentUserBubbleContainer : styles.otherUserBubbleContainer
      ]}>
        <View style={[
          styles.chatBubble,
          isCurrentUser 
            ? [styles.currentUserBubble, { backgroundColor: MODERN_COLORS.outgoingMessage }]
            : [styles.otherUserBubble, { backgroundColor: MODERN_COLORS.incomingMessage }]
        ]}>
          {!isCurrentUser && (
            <Text style={[styles.senderName, { color: MODERN_COLORS.primary }]}>
              {item.commentBy}
            </Text>
          )}
          
          {item.documents && item.documents.length > 0 && (
            <View style={styles.chatAttachments}>
              {item.documents.map((doc) => {
                const isImage = doc.document_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                
                if (isImage) {
                  return (
                    <TouchableOpacity 
                      key={doc.id}
                      style={styles.imageAttachment}
                      onPress={() => handleDownloadFile(doc.document_url, doc.document_name)}
                    >
                      <Image 
                        source={{ uri: doc.document_url }} 
                        style={styles.chatImage}
                        resizeMode="cover"
                      />
                      <View style={styles.imageOverlay}>
                        <Ionicons name="download-outline" size={20} color="#FFF" />
                      </View>
                    </TouchableOpacity>
                  );
                } else {
                  return (
                    <TouchableOpacity
                      key={doc.id}
                      style={[styles.documentAttachment, { backgroundColor: MODERN_COLORS.primary + '10' }]}
                      onPress={() => handleDownloadFile(doc.document_url, doc.document_name)}
                    >
                      <View style={styles.documentIconContainer}>
                        <MaterialIcons name="insert-drive-file" size={20} color={MODERN_COLORS.primary} />
                      </View>
                      <View style={styles.documentInfo}>
                        <Text style={[styles.documentName, { color: MODERN_COLORS.primary }]}>
                          {truncateFileName(doc.document_name)}
                        </Text>
                        <Text style={[styles.documentSize, { color: MODERN_COLORS.textTertiary }]}>
                          Tap to download
                        </Text>
                      </View>
                      <Ionicons name="download-outline" size={18} color={MODERN_COLORS.primary} />
                    </TouchableOpacity>
                  );
                }
              })}
            </View>
          )}
          
          {item.content && (
            <Text style={[
              styles.chatMessage,
              { color: MODERN_COLORS.textPrimary }
            ]}>
              {item.content}
            </Text>
          )}
          
          <View style={styles.chatTimestamp}>
            <Text style={[
              styles.chatTimeText,
              { color: MODERN_COLORS.textTertiary }
            ]}>
              {time}
            </Text>
            {isCurrentUser && (
              <MaterialIcons 
                name="done-all" 
                size={14} 
                color={MODERN_COLORS.primary} 
                style={styles.deliveryIcon} 
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  // Modern Header Component
  const ModernHeader = () => (
    <SafeAreaView style={styles.header}>
      <StatusBar barStyle="light-content" backgroundColor={MODERN_COLORS.primary} />
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.headerInfo}
          onPress={() => setShowLeadDetailsModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {lead.name?.charAt(0)?.toUpperCase() || 'L'}
              </Text>
            </View>
            <View style={styles.onlineIndicator} />
          </View>
          
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {lead.name || 'Lead'}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {beautifyName(lead.phase)} • {beautifyName(lead.subphase)}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={onIncentivePress} 
            style={[styles.headerActionButton, styles.incentiveButton]}
          >
            <MaterialIcons name="monetization-on" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={onEdit} 
            style={styles.headerActionButton}
          >
            <MaterialIcons name="edit" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  // Render modal content using FlatList instead of ScrollView
  const renderModalSection = ({ item }: { item: string }) => {
    switch (item) {
      case 'lead-info':
        return (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <View style={styles.infoAvatarContainer}>
                <View style={styles.infoAvatar}>
                  <Text style={styles.infoAvatarText}>
                    {lead.name?.charAt(0)?.toUpperCase() || 'L'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoHeaderText}>
                <Text style={styles.infoName}>{lead.name || 'Lead'}</Text>
                {lead.company && (
                  <Text style={styles.infoCompany}>{lead.company}</Text>
                )}
              </View>
            </View>

            <View style={styles.statusBadges}>
              <View style={[styles.statusBadge, { backgroundColor: MODERN_COLORS.primary + '15' }]}>
                <Text style={[styles.statusBadgeText, { color: MODERN_COLORS.primary }]}>
                  {beautifyName(lead.phase)}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: MODERN_COLORS.secondary + '15' }]}>
                <Text style={[styles.statusBadgeText, { color: MODERN_COLORS.secondary }]}>
                  {beautifyName(lead.subphase)}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: MODERN_COLORS.accent + '15' }]}>
                <Text style={[styles.statusBadgeText, { color: MODERN_COLORS.accent }]}>
                  {beautifyName(lead.status)}
                </Text>
              </View>
            </View>
          </View>
        );
      
      case 'contact-info':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            
            {lead.emails.map((email, index) => (
              <View key={index} style={styles.detailRow}>
                <MaterialIcons name="email" size={20} color={MODERN_COLORS.primary} />
                <Text style={styles.detailValue}>{email.email}</Text>
                <TouchableOpacity style={styles.copyButton}>
                  <Ionicons name="copy-outline" size={16} color={MODERN_COLORS.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}

            {lead.phone_numbers.map((phone, index) => (
              <View key={index} style={styles.detailRow}>
                <MaterialIcons name="phone" size={20} color={MODERN_COLORS.primary} />
                <Text style={styles.detailValue}>{phone.number}</Text>
                <TouchableOpacity style={styles.copyButton}>
                  <Ionicons name="copy-outline" size={16} color={MODERN_COLORS.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );
      
      case 'metadata':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metadata</Text>
            
            <View style={styles.metadataRow}>
              <MaterialIcons name="calendar-today" size={18} color={MODERN_COLORS.textTertiary} />
              <Text style={styles.metadataLabel}>Created:</Text>
              <Text style={styles.metadataValue}>
                {formatDateTime(lead.created_at || lead.createdAt)}
              </Text>
            </View>
          </View>
        );
      
      case 'collaborators':
        return collaborators.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Team ({collaborators.length})</Text>
            </View>
            
            <View style={styles.collaboratorsGrid}>
              {collaborators.map((collaborator) => (
                <View key={collaborator.id} style={styles.collaboratorItem}>
                  <View style={styles.collaboratorAvatar}>
                    <Text style={styles.collaboratorAvatarText}>
                      {collaborator.user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <Text style={styles.collaboratorName} numberOfLines={1}>
                    {collaborator.user.full_name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null;
      
      case 'notes':
        return lead.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesContainer}>
              <Text style={styles.notesText}>
                {lead.notes}
              </Text>
            </View>
          </View>
        ) : null;
      
      default:
        return null;
    }
  };

  // Define modal sections
  const modalSections = [
    'lead-info',
    'contact-info',
    'metadata',
    ...(collaborators.length > 0 ? ['collaborators'] : []),
    ...(lead.notes ? ['notes'] : []),
  ];

  // Modern Modal Component with FlatList instead of ScrollView
  const ContactInfoModal = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={showLeadDetailsModal}
      onRequestClose={() => setShowLeadDetailsModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            onPress={() => setShowLeadDetailsModal(false)}
            style={styles.modalBackButton}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Lead Details</Text>
        </View>

        <FlatList
          ref={modalFlatListRef}
          data={modalSections}
          renderItem={renderModalSection}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalScrollContent}
          ListFooterComponent={<View style={styles.modalBottomSpacing} />}
        />
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ModernHeader />
      <ContactInfoModal />
      
      {/* Chat Container */}
      <View style={styles.chatContainer}>
        {loadingComments ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={MODERN_COLORS.primary} />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={comments}
            renderItem={renderChatBubble}
            keyExtractor={(item) => item.id}
            inverted={false}
            onEndReached={handleLoadMoreComments}
            onEndReachedThreshold={0.1}
            contentContainerStyle={styles.chatListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[MODERN_COLORS.primary]}
                tintColor={MODERN_COLORS.primary}
              />
            }
            ListHeaderComponent={
              loadingMoreComments ? (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color={MODERN_COLORS.primary} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <MaterialIcons name="forum" size={64} color={MODERN_COLORS.border} />
                <Text style={styles.emptyChatTitle}>No conversations yet</Text>
                <Text style={styles.emptyChatText}>
                  Start by sending a message or quick reply
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Selected Files Preview */}
      {selectedDocuments.length > 0 && (
        <View style={styles.selectedFilesPreview}>
          <Text style={styles.selectedFilesTitle}>
            Attachments ({selectedDocuments.length})
          </Text>
          <FlatList
            horizontal
            data={selectedDocuments}
            renderItem={({ item: doc, index }) => (
              <View style={styles.selectedDocumentItem}>
                <MaterialIcons name="insert-drive-file" size={20} color={MODERN_COLORS.primary} />
                <View style={styles.selectedDocumentInfo}>
                  <Text style={styles.selectedDocumentName} numberOfLines={1}>
                    {truncateFileName(doc.name, 20)}
                  </Text>
                  <Text style={styles.selectedDocumentSize}>
                    {formatFileSize(doc.size)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveDocument(index)}>
                  <Ionicons name="close" size={18} color={MODERN_COLORS.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
            keyExtractor={(_, index) => `doc-${index}`}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {/* Message Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.inputWrapper}>
          {selectedDocuments.length > 0 && (
            <View style={styles.selectedFilesContainer}>
              <FlatList
                horizontal
                data={selectedDocuments}
                renderItem={({ item: doc, index }) => (
                  <View style={styles.selectedFile}>
                    <MaterialIcons name="insert-drive-file" size={16} color={MODERN_COLORS.primary} />
                    <Text style={styles.selectedFileName} numberOfLines={1}>
                      {truncateFileName(doc.name, 20)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveDocument(index)}
                      style={styles.removeFileButton}
                    >
                      <Ionicons name="close" size={16} color={MODERN_COLORS.textTertiary} />
                    </TouchableOpacity>
                  </View>
                )}
                keyExtractor={(_, index) => `selected-doc-${index}`}
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={handleAttachDocuments}
            >
              <Ionicons name="attach" size={22} color={MODERN_COLORS.primary} />
              {selectedDocuments.length > 0 && (
                <View style={styles.fileCounterBadge}>
                  <Text style={styles.fileCounterText}>{selectedDocuments.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.inputField}>
              <TextInput
                style={styles.messageInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Type your message..."
                multiline
                maxLength={1000}
                placeholderTextColor={MODERN_COLORS.textTertiary}
                editable={!addingComment}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                { 
                  backgroundColor: newComment.trim() 
                    ? MODERN_COLORS.primary 
                    : MODERN_COLORS.border 
                }
              ]}
              onPress={handleAddComment}
              disabled={addingComment || !newComment.trim()}
            >
              {addingComment ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons 
                  name="send" 
                  size={18} 
                  color={newComment.trim() ? "#FFFFFF" : MODERN_COLORS.textTertiary} 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Default Comments Modal - Hidden but functionality preserved */}
      {showDefaultComments && (
        <View style={styles.defaultCommentsOverlay}>
          <SafeAreaView style={styles.defaultCommentsModal}>
            <View style={styles.defaultCommentsHeader}>
              <Text style={styles.defaultCommentsTitle}>
                Quick Replies
              </Text>
              <TouchableOpacity
                onPress={() => setShowDefaultComments(false)}
                style={styles.closeDefaultCommentsButton}
              >
                <Ionicons name="close" size={22} color={MODERN_COLORS.textTertiary} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={defaultComments}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.defaultCommentItem}
                  onPress={() => handleDefaultCommentSelect(item)}
                >
                  <Text style={styles.defaultCommentText}>
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
              contentContainerStyle={styles.defaultCommentsList}
            />
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MODERN_COLORS.chatBackground,
  },
  
  // Header Styles
  header: {
    backgroundColor: MODERN_COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: MODERN_COLORS.primaryDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 64,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: MODERN_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: MODERN_COLORS.primaryDark,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: MODERN_COLORS.success,
    borderWidth: 2,
    borderColor: MODERN_COLORS.primary,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionButton: {
    padding: 8,
  },
  incentiveButton: {
    marginRight: 4,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: MODERN_COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: MODERN_COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
  modalBackButton: {
    padding: 8,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
    paddingBottom: 40,
  },
  
  // Info Card
  infoCard: {
    backgroundColor: MODERN_COLORS.surface,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
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
  infoAvatarContainer: {
    marginRight: 16,
  },
  infoAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: MODERN_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoAvatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoHeaderText: {
    flex: 1,
  },
  infoName: {
    fontSize: 22,
    fontWeight: '600',
    color: MODERN_COLORS.textPrimary,
    marginBottom: 4,
  },
  infoCompany: {
    fontSize: 16,
    color: MODERN_COLORS.textSecondary,
  },
  statusBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Sections
  section: {
    backgroundColor: MODERN_COLORS.surface,
    marginBottom: 12,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: MODERN_COLORS.primary,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  // Detail Rows
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: MODERN_COLORS.background,
    borderRadius: 8,
  },
  detailValue: {
    fontSize: 15,
    color: MODERN_COLORS.textPrimary,
    marginLeft: 12,
    flex: 1,
  },
  copyButton: {
    padding: 4,
  },
  
  // Metadata
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 14,
    color: MODERN_COLORS.textSecondary,
    marginLeft: 8,
    marginRight: 4,
  },
  metadataValue: {
    fontSize: 14,
    color: MODERN_COLORS.textPrimary,
    flex: 1,
  },
  
  // Collaborators
  collaboratorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  collaboratorItem: {
    alignItems: 'center',
    width: 80,
  },
  collaboratorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: MODERN_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  collaboratorAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  collaboratorName: {
    fontSize: 12,
    color: MODERN_COLORS.textSecondary,
    textAlign: 'center',
  },
  
  // Notes
  notesContainer: {
    backgroundColor: MODERN_COLORS.background,
    padding: 16,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 15,
    color: MODERN_COLORS.textPrimary,
    lineHeight: 22,
  },
  
  // Chat Styles
  chatContainer: {
    flex: 1,
    backgroundColor: MODERN_COLORS.chatBackground,
  },
  chatListContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 20,
  },
  chatBubbleContainer: {
    marginVertical: 6,
    maxWidth: '85%',
  },
  currentUserBubbleContainer: {
    alignSelf: 'flex-end',
  },
  otherUserBubbleContainer: {
    alignSelf: 'flex-start',
  },
  chatBubble: {
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  currentUserBubble: {
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  chatMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  
  // File Attachments in Chat
  chatAttachments: {
    marginBottom: 12,
    gap: 8,
  },
  imageAttachment: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  chatImage: {
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
  documentAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  documentIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MODERN_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  documentSize: {
    fontSize: 12,
  },
  chatTimestamp: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  chatTimeText: {
    fontSize: 11,
  },
  deliveryIcon: {
    marginLeft: 4,
  },
  
  // Selected Files Preview (above input)
  selectedFilesPreview: {
    backgroundColor: MODERN_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: MODERN_COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedFilesTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: MODERN_COLORS.textSecondary,
    marginBottom: 8,
  },
  selectedDocumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MODERN_COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 180,
    gap: 8,
  },
  selectedDocumentInfo: {
    flex: 1,
  },
  selectedDocumentName: {
    fontSize: 13,
    fontWeight: '500',
    color: MODERN_COLORS.textPrimary,
    marginBottom: 2,
  },
  selectedDocumentSize: {
    fontSize: 11,
    color: MODERN_COLORS.textTertiary,
  },
  
  // Input Container
  inputContainer: {
    backgroundColor: MODERN_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: MODERN_COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 34 : 0, // Safe area for iOS
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedFilesContainer: {
    paddingVertical: 8,
  },
  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: MODERN_COLORS.outgoingMessage + '80',
    marginRight: 8,
  },
  selectedFileName: {
    fontSize: 12,
    marginLeft: 6,
    marginRight: 8,
    maxWidth: 120,
    color: MODERN_COLORS.primary,
  },
  removeFileButton: {
    padding: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachmentButton: {
    padding: 10,
    position: 'relative',
  },
  fileCounterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: MODERN_COLORS.danger,
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileCounterText: {
    fontSize: 10,
    color: MODERN_COLORS.surface,
    fontWeight: '600',
  },
  inputField: {
    flex: 1,
    backgroundColor: MODERN_COLORS.background,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: MODERN_COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    maxHeight: 100,
  },
  messageInput: {
    fontSize: 16,
    color: MODERN_COLORS.textPrimary,
    padding: 0,
    maxHeight: 84,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
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
    color: MODERN_COLORS.textSecondary,
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 16,
  },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: MODERN_COLORS.textPrimary,
  },
  emptyChatText: {
    fontSize: 14,
    color: MODERN_COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 200,
  },
  
  // Default Comments Modal (hidden but preserved)
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
    backgroundColor: MODERN_COLORS.surface,
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
    borderBottomColor: MODERN_COLORS.border,
  },
  defaultCommentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: MODERN_COLORS.primary,
  },
  closeDefaultCommentsButton: {
    padding: 4,
  },
  defaultCommentsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  defaultCommentItem: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: MODERN_COLORS.border,
  },
  defaultCommentText: {
    fontSize: 16,
    color: MODERN_COLORS.textPrimary,
    lineHeight: 22,
  },
  
  // Utility
  modalBottomSpacing: {
    height: 40,
  },
});

export default LeadDetails;