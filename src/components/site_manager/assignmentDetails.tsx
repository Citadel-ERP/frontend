import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Image,
  Dimensions,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

const WHATSAPP_COLORS = {
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
};

interface AssignmentDetailsProps {
  visitId: number;
  onBack: () => void;
  onEdit: () => void;
  token: string | null;
}

interface Comment {
  id: number;
  user: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
  content: string;
  documents: Array<{
    id: number;
    document_url: string;
    document_name: string;
  }>;
  created_at: string;
}

interface VisitDetails {
  id: number;
  site: {
    id: number;
    building_name: string;
    location: string;
    building_status: string;
  };
  assigned_to: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
  assigned_by: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
  status: string;
  is_visible_to_scout: boolean;
  scout_completed_at: string | null;
  admin_completed_at: string | null;
  created_at: string;
  updated_at: string;
  photos: Array<{
    id: number;
    file_url: string;
    description: string;
  }>;
}

const AssignmentDetails: React.FC<AssignmentDetailsProps> = ({
  visitId,
  onBack,
  onEdit,
  token,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visitDetails, setVisitDetails] = useState<VisitDetails | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [apiToken, setApiToken] = useState<string | null>(token);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const getToken = async () => {
      if (!token) {
        const storedToken = await AsyncStorage.getItem('token_2');
        setApiToken(storedToken);
      }
    };
    getToken();
  }, [token]);

  useEffect(() => {
    if (apiToken && visitId) {
      fetchAssignmentDetails();
      fetchComments();
    }
  }, [apiToken, visitId]);

  const fetchAssignmentDetails = async () => {
    if (!apiToken) return;

    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/core/getSiteVisitDetails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: apiToken,
          visit_id: visitId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.message === 'Site visit details fetched successfully') {
        setVisitDetails(data.visit);
      } else {
        throw new Error(data.message || 'Failed to fetch assignment details');
      }
    } catch (error) {
      console.error('Error fetching assignment details:', error);
      Alert.alert('Error', 'Failed to fetch assignment details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (page: number = 1, append: boolean = false) => {
    if (!apiToken || !visitId) return;

    try {
      setLoadingComments(true);
      const response = await fetch(`${BACKEND_URL}/core/getComments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: apiToken,
          visit_id: visitId,
          page: page,
          page_size: 20,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.message === 'Comments fetched successfully') {
        if (append) {
          setComments(prev => [...prev, ...data.comments]);
        } else {
          setComments(data.comments);
        }
        
        const pagination = data.pagination;
        setHasMoreComments(pagination?.has_next || false);
        setCommentPage(pagination?.current_page || page);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAssignmentDetails();
    fetchComments(1, false);
  }, []);

  const loadMoreComments = useCallback(() => {
    if (hasMoreComments && !loadingComments) {
      fetchComments(commentPage + 1, true);
    }
  }, [hasMoreComments, loadingComments, commentPage]);

  const handleSendComment = async () => {
    if (!newComment.trim() || !apiToken || sendingComment) return;

    try {
      setSendingComment(true);
      const response = await fetch(`${BACKEND_URL}/core/addComment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: apiToken,
          visit_id: visitId,
          content: newComment.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.message === 'Comment added successfully') {
        setNewComment('');
        // Add new comment to the list
        setComments(prev => [data.comment, ...prev]);
        // Scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        throw new Error(data.message || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error sending comment:', error);
      Alert.alert('Error', 'Failed to send comment. Please try again.');
    } finally {
      setSendingComment(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return WHATSAPP_COLORS.warning;
      case 'scout_completed': return WHATSAPP_COLORS.accent;
      case 'admin_completed': return WHATSAPP_COLORS.success;
      case 'cancelled': return WHATSAPP_COLORS.danger;
      default: return WHATSAPP_COLORS.textSecondary;
    }
  };

  const beautifyName = (name: string): string => {
    if (!name) return '-';
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const renderComment = ({ item }: { item: Comment }) => {
    const isOwnMessage = false; // For future: check if comment is from current user

    return (
      <View style={[styles.commentContainer, isOwnMessage ? styles.ownComment : styles.otherComment]}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>
            {item.user.first_name} {item.user.last_name}
          </Text>
          <Text style={styles.commentTime}>{formatTime(item.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{item.content}</Text>
        
        {item.documents?.length > 0 && (
          <View style={styles.documentsContainer}>
            {item.documents.map(doc => (
              <TouchableOpacity key={doc.id} style={styles.documentItem}>
                <Ionicons name="document" size={16} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.documentName} numberOfLines={1}>
                  {doc.document_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <Text style={styles.commentDate}>{formatDate(item.created_at)}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading assignment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assignment Details</Text>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Ionicons name="pencil" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Visit Details Card */}
        {visitDetails && (
          <View style={styles.detailsCard}>
            <View style={styles.siteInfo}>
              <Text style={styles.siteName}>{visitDetails.site.building_name}</Text>
              <Text style={styles.siteLocation}>{visitDetails.site.location}</Text>
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(visitDetails.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(visitDetails.status) }]}>
                  {beautifyName(visitDetails.status)}
                </Text>
              </View>
              <View style={styles.visibilityBadge}>
                <Ionicons 
                  name={visitDetails.is_visible_to_scout ? 'eye' : 'eye-off'} 
                  size={14} 
                  color={WHATSAPP_COLORS.textSecondary} 
                />
                <Text style={styles.visibilityText}>
                  {visitDetails.is_visible_to_scout ? 'Visible to scout' : 'Hidden from scout'}
                </Text>
              </View>
            </View>

            <View style={styles.assignmentInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="person" size={16} color={WHATSAPP_COLORS.textSecondary} />
                <Text style={styles.infoLabel}>Assigned to:</Text>
                <Text style={styles.infoValue}>
                  {visitDetails.assigned_to.first_name} {visitDetails.assigned_to.last_name}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="person-add" size={16} color={WHATSAPP_COLORS.textSecondary} />
                <Text style={styles.infoLabel}>Assigned by:</Text>
                <Text style={styles.infoValue}>
                  {visitDetails.assigned_by.first_name} {visitDetails.assigned_by.last_name}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={16} color={WHATSAPP_COLORS.textSecondary} />
                <Text style={styles.infoLabel}>Created:</Text>
                <Text style={styles.infoValue}>{formatDate(visitDetails.created_at)}</Text>
              </View>
              {visitDetails.scout_completed_at && (
                <View style={styles.infoRow}>
                  <Ionicons name="checkmark-circle" size={16} color={WHATSAPP_COLORS.success} />
                  <Text style={styles.infoLabel}>Scout completed:</Text>
                  <Text style={styles.infoValue}>{formatDate(visitDetails.scout_completed_at)}</Text>
                </View>
              )}
              {visitDetails.admin_completed_at && (
                <View style={styles.infoRow}>
                  <Ionicons name="shield-checkmark" size={16} color={WHATSAPP_COLORS.info} />
                  <Text style={styles.infoLabel}>Admin completed:</Text>
                  <Text style={styles.infoValue}>{formatDate(visitDetails.admin_completed_at)}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Comments Section */}
        <View style={styles.commentsContainer}>
          <Text style={styles.commentsTitle}>
            Comments ({comments.length})
          </Text>
          
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.commentsList}
            showsVerticalScrollIndicator={false}
            inverted={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[WHATSAPP_COLORS.primary]}
              />
            }
            onEndReached={loadMoreComments}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.emptyComments}>
                <Ionicons name="chatbubbles-outline" size={64} color={WHATSAPP_COLORS.border} />
                <Text style={styles.emptyCommentsText}>No comments yet</Text>
                <Text style={styles.emptyCommentsSubtext}>
                  Start the conversation by sending a message
                </Text>
              </View>
            }
            ListFooterComponent={
              loadingComments ? (
                <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} style={styles.loadingMore} />
              ) : null
            }
          />
        </View>

        {/* Comment Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={commentInputRef}
              style={styles.textInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Type your comment..."
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newComment.trim() || sendingComment) && styles.sendButtonDisabled]}
              onPress={handleSendComment}
              disabled={!newComment.trim() || sendingComment}
            >
              {sendingComment ? (
                <ActivityIndicator size="small" color={WHATSAPP_COLORS.white} />
              ) : (
                <Ionicons name="send" size={20} color={WHATSAPP_COLORS.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  backButton: {
    padding: 4,
  },
  editButton: {
    padding: 8,
    backgroundColor: WHATSAPP_COLORS.primaryLight,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.chatBg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.chatBg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
  },
  detailsCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  siteInfo: {
    marginBottom: 16,
  },
  siteName: {
    fontSize: 18,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4,
  },
  siteLocation: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
    borderRadius: 20,
    gap: 6,
  },
  visibilityText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
  },
  assignmentInfo: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '500',
    minWidth: 100,
  },
  infoValue: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  commentsContainer: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.chatBg,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  commentContainer: {
    backgroundColor: WHATSAPP_COLORS.incoming,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    maxWidth: '85%',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  ownComment: {
    backgroundColor: WHATSAPP_COLORS.outgoing,
    alignSelf: 'flex-end',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: WHATSAPP_COLORS.primary,
  },
  commentTime: {
    fontSize: 10,
    color: WHATSAPP_COLORS.textTertiary,
  },
  commentText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 8,
  },
  commentDate: {
    fontSize: 10,
    color: WHATSAPP_COLORS.textTertiary,
    textAlign: 'right',
  },
  documentsContainer: {
    marginTop: 8,
    gap: 6,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  documentName: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  emptyComments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCommentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 200,
  },
  loadingMore: {
    marginVertical: 16,
  },
  inputContainer: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    color: WHATSAPP_COLORS.textPrimary,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: WHATSAPP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: WHATSAPP_COLORS.border,
  },
});

export default AssignmentDetails;