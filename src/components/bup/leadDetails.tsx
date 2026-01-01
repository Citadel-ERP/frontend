import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  Dimensions,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, Lead, Comment, CollaboratorData, DocumentType, Pagination } from './types';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  const [newCollaborator, setNewCollaborator] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [addingComment, setAddingComment] = useState(false);
  
  const [showDefaultComments, setShowDefaultComments] = useState(false);
  const [defaultComments, setDefaultComments] = useState<any[]>([]);
  const [loadingDefaultComments, setLoadingDefaultComments] = useState(false);
  
  const [potentialCollaborators, setPotentialCollaborators] = useState<any[]>([]);
  const [showPotentialCollaborators, setShowPotentialCollaborators] = useState(false);
  const [loadingPotentialCollaborators, setLoadingPotentialCollaborators] = useState(false);
  const [collaboratorSearchTimeout, setCollaboratorSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (token) {
      fetchComments(lead.id, 1);
      fetchCollaborators(lead.id);
      fetchDefaultComments(lead.phase, lead.subphase);
    }
  }, [token, lead.id]);

  const beautifyName = (name: string): string => {
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

  const getStatusBadgeColor = (status: string): string => {
    const statusColor = theme.leadStatusColors;
    
    switch (status) {
      case 'active':
      case 'transaction_complete':
        return statusColor.active;
      case 'hold':
      case 'mandate':
        return statusColor.pending;
      case 'no_requirement':
      case 'closed':
      case 'non_responsive':
        return statusColor.cold;
      default:
        return theme.textSecondary;
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

      const response = await fetch(`${BACKEND_URL}/manager/getComments`, {
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

      if (append) {
        setComments(prevComments => [...prevComments, ...transformedComments]);
      } else {
        setComments(transformedComments);
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

      const response = await fetch(`${BACKEND_URL}/manager/getCollaborators`, {
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

  const fetchPotentialCollaborators = async (query: string): Promise<void> => {
    if (!query.trim() || !token) {
      setPotentialCollaborators([]);
      setShowPotentialCollaborators(false);
      return;
    }

    try {
      setLoadingPotentialCollaborators(true);

      const response = await fetch(`${BACKEND_URL}/manager/getPotentialCollaborators?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPotentialCollaborators(data.potential_collaborators);
      setShowPotentialCollaborators(data.potential_collaborators.length > 0);
    } catch (error) {
      console.error('Error fetching potential collaborators:', error);
      setPotentialCollaborators([]);
      setShowPotentialCollaborators(false);
    } finally {
      setLoadingPotentialCollaborators(false);
    }
  };

  const handleCollaboratorInputChange = (text: string) => {
    setNewCollaborator(text);
    
    if (collaboratorSearchTimeout) {
      clearTimeout(collaboratorSearchTimeout);
    }
    
    if (!text.trim()) {
      setPotentialCollaborators([]);
      setShowPotentialCollaborators(false);
      return;
    }
    
    const timeout = setTimeout(() => {
      fetchPotentialCollaborators(text);
    }, 500);
    
    setCollaboratorSearchTimeout(timeout);
  };

  const handlePotentialCollaboratorSelect = (collaborator: any) => {
    setNewCollaborator(collaborator.email);
    setShowPotentialCollaborators(false);
    setPotentialCollaborators([]);
  };

  const addCollaborator = async (email: string): Promise<boolean> => {
    try {
      if (!token) return false;

      const response = await fetch(`${BACKEND_URL}/manager/addCollaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          lead_id: lead.id,
          email: email
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchCollaborators(lead.id);
      Alert.alert('Success', 'Collaborator added successfully!');
      setNewCollaborator('');
      return true;
    } catch (error) {
      console.error('Error adding collaborator:', error);
      Alert.alert('Error', 'Failed to add collaborator. Please try again.');
      return false;
    }
  };

  const removeCollaborator = async (collaboratorId: number): Promise<boolean> => {
    try {
      if (!token) return false;

      const response = await fetch(`${BACKEND_URL}/manager/removeCollaborator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          lead_id: lead.id,
          collaborator_id: collaboratorId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchCollaborators(lead.id);
      Alert.alert('Success', 'Collaborator removed successfully!');
      return true;
    } catch (error) {
      console.error('Error removing collaborator:', error);
      Alert.alert('Error', 'Failed to remove collaborator. Please try again.');
      return false;
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
        Alert.alert(
          'Files Selected',
          `${result.assets.length} file(s) selected: ${result.assets.map(doc => doc.name).join(', ')}`
        );
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

      const response = await fetch(`${BACKEND_URL}/manager/addComment`, {
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

      setComments(prevComments => [newComment, ...prevComments]);
      
      Alert.alert('Success', 'Comment added successfully!');
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

  const handleAddCollaborator = async () => {
    if (!newCollaborator.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }
    
    const success = await addCollaborator(newCollaborator.trim());
    if (success) {
      setNewCollaborator('');
      setPotentialCollaborators([]);
      setShowPotentialCollaborators(false);
    }
  };

  const handleRemoveCollaborator = (collaborator: CollaboratorData) => {
    Alert.alert(
      'Remove Collaborator',
      `Are you sure you want to remove ${collaborator.user.full_name} from this lead?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeCollaborator(collaborator.id)
        }
      ]
    );
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

  const handleCommentsScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      handleLoadMoreComments();
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchComments(lead.id, 1);
    fetchCollaborators(lead.id);
    setRefreshing(false);
  };

  return (
    <ScrollView 
      style={[styles.detailScrollView, { backgroundColor: theme.background }]} 
      showsVerticalScrollIndicator={false}
      onScroll={handleCommentsScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
        />
      }
    >

      {/* Lead Header Card */}
      <LinearGradient
        colors={[theme.primary + '20', theme.cardBg]}
        style={[styles.detailCard]}
      >
        <View style={styles.leadHeader}>
          <View style={styles.leadInfo}>
            <View style={styles.leadNameRow}>
              <Text style={[styles.leadName, { color: theme.text }]}>{lead.name}</Text>
              {lead.incentive_present && (
                <TouchableOpacity style={[styles.incentiveBadge, { backgroundColor: theme.success }]}>
                  <Text style={[styles.incentiveBadgeText, { color: theme.white }]}>💰 Incentive</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.statusIndicatorRow}>
              <View style={[styles.statusDot, { backgroundColor: getStatusBadgeColor(lead.status) }]} />
              <Text style={[styles.statusText, { color: theme.text }]}>{beautifyName(lead.status)}</Text>
            </View>
            <Text style={[styles.leadCompany, { color: theme.textSecondary }]}>{lead.company || 'No company'}</Text>
            <Text style={[styles.leadDate, { color: theme.textLight }]}>Created: {formatDateTime(lead.created_at || lead.createdAt)}</Text>
            <Text style={[styles.leadDate, { color: theme.textLight }]}>Updated: {formatDateTime(lead.updated_at)}</Text>
            {lead.assigned_to && (
              <Text style={[styles.leadAssigned, { color: theme.info }]}>
                Assigned to: {lead.assigned_to.full_name}
              </Text>
            )}
            <View style={[styles.cityBadge, { backgroundColor: theme.primary + '20' }]}>
              <Text style={[styles.cityBadgeText, { color: theme.primary }]}>📍 {lead.city}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Contact Information Card */}
      <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact Information</Text>
        
        <Text style={[styles.inputLabel, { color: theme.text }]}>Email Addresses ({lead.emails.length})</Text>
        {lead.emails.map((email, index) => (
          <View key={index} style={[styles.contactItemContainer, { 
            backgroundColor: theme.backgroundSecondary,
            borderLeftColor: theme.info
          }]}>
            <Text style={[styles.contactItemText, { color: theme.text }]}>📧 {email.email}</Text>
          </View>
        ))}

        <Text style={[styles.inputLabel, { color: theme.text, marginTop: 15 }]}>Phone Numbers ({lead.phone_numbers.length})</Text>
        {lead.phone_numbers.map((phone, index) => (
          <View key={index} style={[styles.contactItemContainer, { 
            backgroundColor: theme.backgroundSecondary,
            borderLeftColor: theme.info
          }]}>
            <Text style={[styles.contactItemText, { color: theme.text }]}>📱 {phone.number}</Text>
          </View>
        ))}
      </View>

      {/* Lead Management Card */}
      <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Lead Management</Text>
        
        <View style={styles.managementRow}>
          <View style={styles.managementItem}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Status</Text>
            <View style={[styles.readOnlyField, { backgroundColor: theme.backgroundSecondary }]}>
              <Text style={[styles.readOnlyText, { color: theme.text }]}>
                {beautifyName(lead.status)}
              </Text>
            </View>
          </View>

          <View style={styles.managementItem}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Phase</Text>
            <View style={[styles.readOnlyField, { backgroundColor: theme.backgroundSecondary }]}>
              <Text style={[styles.readOnlyText, { color: theme.text }]}>
                {beautifyName(lead.phase)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>Subphase</Text>
          <View style={[styles.readOnlyField, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.readOnlyText, { color: theme.text }]}>
              {beautifyName(lead.subphase)}
            </Text>
          </View>
        </View>
      </View>

      {/* Collaborators Section */}
      <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Collaborators ({collaborators.length})
        </Text>
        
        {loadingCollaborators ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading collaborators...</Text>
          </View>
        ) : collaborators.length > 0 ? (
          collaborators.map((collaborator) => (
            <View key={collaborator.id} style={[styles.collaboratorItem, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.collaboratorInfo}>
                <Text style={[styles.collaboratorName, { color: theme.text }]}>{collaborator.user.full_name}</Text>
                <Text style={[styles.collaboratorEmail, { color: theme.textSecondary }]}>{collaborator.user.email}</Text>
                <Text style={[styles.collaboratorRole, { color: theme.textSecondary }]}>
                  {collaborator.user.designation || collaborator.user.role}
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.removeButton, { backgroundColor: theme.error }]}
                onPress={() => handleRemoveCollaborator(collaborator)}
              >
                <Text style={[styles.removeButtonText, { color: theme.white }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyCollaborators}>
            <Text style={[styles.emptyCollaboratorsText, { color: theme.textSecondary }]}>No collaborators yet</Text>
          </View>
        )}

        {/* Add Collaborator Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>Add Collaborator</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[styles.collaboratorInput, { 
                backgroundColor: theme.white,
                borderColor: theme.border,
                color: theme.text
              }]}
              value={newCollaborator}
              onChangeText={handleCollaboratorInputChange}
              placeholder="Enter email address..."
              placeholderTextColor={theme.textSecondary}
            />
            
            {showPotentialCollaborators && (
              <View style={[styles.potentialCollaboratorsList, { 
                backgroundColor: theme.cardBg,
                borderColor: theme.border
              }]}>
                {loadingPotentialCollaborators ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : potentialCollaborators.map((collaborator, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.potentialCollaboratorItem, { borderBottomColor: theme.border }]}
                    onPress={() => handlePotentialCollaboratorSelect(collaborator)}
                  >
                    <Text style={[styles.potentialCollaboratorName, { color: theme.text }]}>
                      {collaborator.full_name}
                    </Text>
                    <Text style={[styles.potentialCollaboratorEmail, { color: theme.textSecondary }]}>
                      {collaborator.email}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              { backgroundColor: theme.primary }
            ]} 
            onPress={handleAddCollaborator}
          >
            <Text style={[styles.submitButtonText, { color: theme.white }]}>Add Collaborator</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Comments Section */}
      <View style={[styles.detailCard, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Comments ({comments.length}
          {commentsPagination && ` of ${commentsPagination.total_items}`})
        </Text>
        
        {loadingComments ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading comments...</Text>
          </View>
        ) : comments.length > 0 ? (
          <>
            {comments.map((comment) => (
              <View key={comment.id} style={[styles.commentItem, { 
                backgroundColor: theme.backgroundSecondary,
                borderLeftColor: theme.info
              }]}>
                <View style={styles.commentHeaderRow}>
                  <View style={styles.commentMetaItem}>
                    <Text style={[styles.commentLabel, { color: theme.textSecondary }]}>Comment By:</Text>
                    <Text style={[styles.commentValue, { color: theme.text }]}>{comment.commentBy}</Text>
                  </View>
                  <View style={styles.commentMetaItem}>
                    <Text style={[styles.commentLabel, { color: theme.textSecondary }]}>Date:</Text>
                    <Text style={[styles.commentValue, { color: theme.text }]}>{formatDateTime(comment.date)}</Text>
                  </View>
                </View>
                <View style={styles.commentHeaderRow}>
                  <View style={styles.commentMetaItem}>
                    <Text style={[styles.commentLabel, { color: theme.textSecondary }]}>Phase:</Text>
                    <Text style={[styles.commentValue, { color: theme.text }]}>{beautifyName(comment.phase)}</Text>
                  </View>
                  <View style={styles.commentMetaItem}>
                    <Text style={[styles.commentLabel, { color: theme.textSecondary }]}>Subphase:</Text>
                    <Text style={[styles.commentValue, { color: theme.text }]}>{beautifyName(comment.subphase)}</Text>
                  </View>
                </View>
                <View style={styles.commentContentRow}>
                  <Text style={[styles.commentLabel, { color: theme.textSecondary }]}>Content:</Text>
                  <Text style={[styles.commentContentText, { 
                    color: theme.text,
                    backgroundColor: theme.cardBg
                  }]}>{comment.content}</Text>
                </View>
                {comment.documents && comment.documents.length > 0 && (
                  <View style={styles.documentsContainer}>
                    <Text style={[styles.documentsLabel, { color: theme.textSecondary }]}>Attachments:</Text>
                    {comment.documents.map((doc, index) => (
                      <TouchableOpacity key={doc.id} style={[styles.fileButton, { backgroundColor: theme.info + '20' }]}>
                        <Text style={[styles.fileButtonText, { color: theme.info }]}>📎 {doc.document_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {loadingMoreComments && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.loadMoreText, { color: theme.textSecondary }]}>Loading more comments...</Text>
              </View>
            )}

            {commentsPagination && !commentsPagination.has_next && comments.length > 0 && (
              <View style={styles.endOfListContainer}>
                <Text style={[styles.endOfListText, { color: theme.textSecondary }]}>
                  You've reached the end of the comments
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyComments}>
            <Text style={[styles.emptyCommentsText, { color: theme.textSecondary }]}>No comments yet</Text>
          </View>
        )}

        {/* Add Comment Section */}
        <View style={[styles.addCommentSection, { borderTopColor: theme.border }]}>
          <View style={styles.commentActions}>
            <TouchableOpacity
              style={[styles.actionButton, { 
                borderColor: theme.primary,
                backgroundColor: theme.primary + '10'
              }]}
              onPress={() => {
                fetchDefaultComments(lead.phase, lead.subphase);
                setShowDefaultComments(true);
              }}
              disabled={loadingDefaultComments}
            >
              {loadingDefaultComments ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={[styles.actionButtonText, { color: theme.primary }]}>Default Comments</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { 
                borderColor: theme.primary,
                backgroundColor: theme.primary + '10'
              }]} 
              onPress={handleAttachDocuments}
            >
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>📎 Attach ({selectedDocuments.length})</Text>
            </TouchableOpacity>
          </View>

          {selectedDocuments.length > 0 && (
            <View style={[styles.selectedDocumentsContainer, { 
              backgroundColor: theme.background,
              borderColor: theme.border
            }]}>
              <Text style={[styles.selectedDocumentsTitle, { color: theme.primary }]}>Selected Files:</Text>
              {selectedDocuments.map((doc, index) => (
                <View key={index} style={[styles.selectedDocumentItem, { backgroundColor: theme.white }]}>
                  <Text style={[styles.selectedDocumentName, { color: theme.primary }]} numberOfLines={1}>
                    📎 {doc.name}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.removeDocumentButton, { backgroundColor: theme.error }]}
                    onPress={() => handleRemoveDocument(index)}
                  >
                    <Text style={[styles.removeDocumentButtonText, { color: theme.white }]}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TextInput
            style={[styles.commentInput, { 
              backgroundColor: theme.white,
              borderColor: theme.border,
              color: theme.text
            }]}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add your comment here..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor={theme.textSecondary}
          />

          <TouchableOpacity 
            style={[
              styles.submitButton, 
              addingComment && styles.submitButtonDisabled,
              { backgroundColor: theme.primary }
            ]} 
            onPress={handleAddComment}
            disabled={addingComment}
          >
            {addingComment ? (
              <ActivityIndicator color={theme.white} size="small" />
            ) : (
              <Text style={[styles.submitButtonText, { color: theme.white }]}>Add Comment</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Default Comments Modal */}
      {showDefaultComments && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.defaultCommentsModal, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Default Comments - {beautifyName(lead.phase)} → {beautifyName(lead.subphase)}
            </Text>
            <ScrollView style={styles.defaultCommentsList}>
              {loadingDefaultComments ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading default comments...</Text>
                </View>
              ) : defaultComments.length > 0 ? (
                defaultComments.map((comment) => (
                  <TouchableOpacity
                    key={comment.id}
                    style={[styles.defaultCommentItem, { borderBottomColor: theme.border }]}
                    onPress={() => handleDefaultCommentSelect(comment)}
                  >
                    <Text style={[styles.defaultCommentText, { color: theme.text }]}>
                      {(() => {
                        try {
                          return JSON.parse(comment.data);
                        } catch {
                          return comment.data;
                        }
                      })()}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                    No default comments available for this phase/subphase
                  </Text>
                </View>
              )}
            </ScrollView>
            <TouchableOpacity 
              style={[styles.closeModalButton, { backgroundColor: theme.error }]}
              onPress={() => setShowDefaultComments(false)}
            >
              <Text style={[styles.closeModalButtonText, { color: theme.white }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  detailScrollView: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  detailCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  leadInfo: {
    flex: 1,
  },
  leadNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  leadName: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
  },
  incentiveBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  incentiveBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  leadCompany: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  leadDate: {
    fontSize: 14,
  },
  leadAssigned: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  cityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  cityBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  contactItemContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  contactItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  managementRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  managementItem: {
    flex: 1,
  },
  readOnlyField: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  readOnlyText: {
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  collaboratorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  collaboratorInfo: {
    flex: 1,
  },
  collaboratorName: {
    fontSize: 16,
    fontWeight: '500',
  },
  collaboratorEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  collaboratorRole: {
    fontSize: 14,
    marginTop: 2,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCollaborators: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyCollaboratorsText: {
    fontSize: 16,
    textAlign: 'center',
  },
  collaboratorInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  potentialCollaboratorsList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 1000,
    elevation: 5,
  },
  potentialCollaboratorItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  potentialCollaboratorName: {
    fontSize: 14,
    fontWeight: '500',
  },
  potentialCollaboratorEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  commentItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentMetaItem: {
    flex: 1,
    marginRight: 8,
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  commentValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  commentContentRow: {
    marginTop: 12,
  },
  commentContentText: {
    fontSize: 16,
    lineHeight: 22,
    marginTop: 4,
    padding: 12,
    borderRadius: 8,
  },
  documentsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  documentsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  fileButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  fileButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyCommentsText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadMoreText: {
    marginLeft: 10,
    fontSize: 14,
  },
  endOfListContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  endOfListText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  addCommentSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedDocumentsContainer: {
    marginBottom: 15,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedDocumentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedDocumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  selectedDocumentName: {
    flex: 1,
    fontSize: 14,
  },
  removeDocumentButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  removeDocumentButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  defaultCommentsModal: {
    borderRadius: 16,
    maxHeight: screenHeight * 0.6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  defaultCommentsList: {
    maxHeight: screenHeight * 0.4,
    padding: 10,
  },
  defaultCommentItem: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  defaultCommentText: {
    fontSize: 16,
  },
  closeModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    margin: 20,
  },
  closeModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default LeadDetails;