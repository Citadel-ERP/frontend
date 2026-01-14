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
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// WhatsApp Color Scheme
const WHATSAPP_COLORS = {
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
  info: '#3B82F6',
  white: '#FFFFFF',
  chatBg: '#ECE5DD',
  incoming: '#FFFFFF',
  outgoing: '#DCF8C6',
};

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
    
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'transaction_complete':
        return { icon: 'checkmark-circle', color: WHATSAPP_COLORS.success };
      case 'hold':
      case 'mandate':
        return { icon: 'time', color: WHATSAPP_COLORS.warning };
      case 'no_requirement':
      case 'closed':
      case 'non_responsive':
        return { icon: 'close-circle', color: WHATSAPP_COLORS.danger };
      default:
        return { icon: 'help-circle', color: WHATSAPP_COLORS.textTertiary };
    }
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

  const fetchComments = async (leadId: number, page: number = 1, append: boolean = false): Promise<void> => {
    try {
      if (!token) return;
      
      if (!append) {
        setLoadingComments(true);
      } else {
        setLoadingMoreComments(true);
      }

      // Try both possible endpoints
      let response;
      try {
        // Try endpoint 1
        response = await fetch(`${BACKEND_URL}/manager/getComments`, {
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
      } catch (error1) {
        // Try endpoint 2
        response = await fetch(`${BACKEND_URL}/employee/getComments`, {
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
      }

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

      // Try both possible endpoints
      let response;
      try {
        // Try endpoint 1
        response = await fetch(`${BACKEND_URL}/manager/getCollaborators`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: token,
            lead_id: leadId
          })
        });
      } catch (error1) {
        // Try endpoint 2
        response = await fetch(`${BACKEND_URL}/employee/getCollaborators`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: token,
            lead_id: leadId
          })
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCollaborators(data.collaborators || []);
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
      setDefaultComments(data.comments || []);
    } catch (error) {
      console.error('Error fetching default comments:', error);
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

      // Try both possible endpoints
      let response;
      try {
        // Try endpoint 1
        response = await fetch(`${BACKEND_URL}/manager/getPotentialCollaborators?query=${encodeURIComponent(query)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      } catch (error1) {
        // Try endpoint 2
        response = await fetch(`${BACKEND_URL}/employee/getPotentialCollaborators?query=${encodeURIComponent(query)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPotentialCollaborators(data.potential_collaborators || []);
      setShowPotentialCollaborators(data.potential_collaborators && data.potential_collaborators.length > 0);
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

      // Try both possible endpoints
      let response;
      try {
        // Try endpoint 1
        response = await fetch(`${BACKEND_URL}/manager/addCollaborators`, {
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
      } catch (error1) {
        // Try endpoint 2
        response = await fetch(`${BACKEND_URL}/employee/addCollaborators`, {
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
      }

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

      // Try both possible endpoints
      let response;
      try {
        // Try endpoint 1
        response = await fetch(`${BACKEND_URL}/manager/removeCollaborator`, {
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
      } catch (error1) {
        // Try endpoint 2
        response = await fetch(`${BACKEND_URL}/employee/removeCollaborator`, {
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
      }

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
          `${result.assets.length} file(s) selected`
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

      // Try both possible endpoints
      let response;
      try {
        // Try endpoint 1
        response = await fetch(`${BACKEND_URL}/manager/addComment`, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } catch (error1) {
        // Try endpoint 2
        response = await fetch(`${BACKEND_URL}/employee/addComment`, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

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
    <View style={styles.container}>
      <ScrollView 
        style={styles.detailScrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleCommentsScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[WHATSAPP_COLORS.primary]}
            tintColor={WHATSAPP_COLORS.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Lead Header Card - WhatsApp Style */}
        <View style={styles.leadHeaderCard}>
          <View style={styles.leadAvatarContainer}>
            <View style={[styles.leadAvatar, { backgroundColor: '#00d285' }]}>
              <Text style={styles.leadAvatarText}>{getInitials(lead.name)}</Text>
            </View>
          </View>
          
          <View style={styles.leadInfo}>
            <View style={styles.leadHeader}>
              <Text style={styles.leadName} numberOfLines={1}>
                {lead.name}
              </Text>
              {lead.incentive_present && (
                <View style={styles.incentiveBadge}>
                  <FontAwesome name="money" size={14} color={WHATSAPP_COLORS.warning} />
                  <Text style={styles.incentiveBadgeText}>Incentive</Text>
                </View>
              )}
            </View>
            
            <View style={styles.leadStatusRow}>
              <Ionicons 
                name={getStatusIcon(lead.status).icon as any} 
                size={16} 
                color={getStatusIcon(lead.status).color} 
              />
              <Text style={styles.leadStatusText}>
                {beautifyName(lead.status)}
              </Text>
              <View style={styles.separator} />
              <Ionicons name="business" size={14} color={WHATSAPP_COLORS.textTertiary} />
              <Text style={styles.leadCompany} numberOfLines={1}>
                {lead.company || 'No company'}
              </Text>
            </View>
            
            <View style={styles.leadMeta}>
              <View style={styles.leadMetaItem}>
                <Ionicons name="calendar" size={14} color={WHATSAPP_COLORS.textTertiary} />
                <Text style={styles.leadMetaText}>
                  Created: {formatDateTime(lead.created_at || lead.createdAt)}
                </Text>
              </View>
              {lead.assigned_to && (
                <View style={styles.leadMetaItem}>
                  <Ionicons name="person" size={14} color={WHATSAPP_COLORS.textTertiary} />
                  <Text style={styles.leadMetaText}>
                    Assigned: {lead.assigned_to.full_name}
                  </Text>
                </View>
              )}
              <View style={styles.leadMetaItem}>
                <Ionicons name="location" size={14} color={WHATSAPP_COLORS.textTertiary} />
                <Text style={styles.leadMetaText}>
                  {lead.city}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Lead Phase Card */}
        <View style={styles.detailCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="trending-up" size={20} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.sectionTitle}>Lead Progress</Text>
          </View>
          
          <View style={styles.phaseContainer}>
            <View style={styles.phaseItem}>
              <MaterialIcons name="layers" size={16} color={WHATSAPP_COLORS.primaryLight} />
              <View style={styles.phaseContent}>
                <Text style={styles.phaseLabel}>Phase</Text>
                <Text style={styles.phaseValue}>{beautifyName(lead.phase)}</Text>
              </View>
            </View>
            
            <View style={styles.phaseSeparator}>
              <MaterialIcons name="arrow-forward" size={16} color={WHATSAPP_COLORS.textTertiary} />
            </View>
            
            <View style={styles.phaseItem}>
              <MaterialIcons name="tune" size={16} color={WHATSAPP_COLORS.primaryLight} />
              <View style={styles.phaseContent}>
                <Text style={styles.phaseLabel}>Subphase</Text>
                <Text style={styles.phaseValue}>{beautifyName(lead.subphase)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact Information Card */}
        <View style={styles.detailCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="contact-mail" size={20} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>
          
          {/* Emails */}
          <View style={styles.contactSection}>
            <Text style={styles.contactSectionTitle}>
              <MaterialIcons name="email" size={16} color={WHATSAPP_COLORS.primaryLight} />
              <Text style={styles.contactSectionTitleText}> Email Addresses ({lead.emails.length})</Text>
            </Text>
            {lead.emails.length > 0 ? lead.emails.map((email, index) => (
              <View key={index} style={styles.contactItem}>
                <Text style={styles.contactItemText}>{email.email}</Text>
              </View>
            )) : (
              <Text style={styles.emptyContactText}>No emails added</Text>
            )}
          </View>
          
          {/* Phones */}
          <View style={styles.contactSection}>
            <Text style={styles.contactSectionTitle}>
              <MaterialIcons name="phone" size={16} color={WHATSAPP_COLORS.primaryLight} />
              <Text style={styles.contactSectionTitleText}> Phone Numbers ({lead.phone_numbers.length})</Text>
            </Text>
            {lead.phone_numbers.length > 0 ? lead.phone_numbers.map((phone, index) => (
              <View key={index} style={styles.contactItem}>
                <Text style={styles.contactItemText}>{phone.number}</Text>
              </View>
            )) : (
              <Text style={styles.emptyContactText}>No phone numbers added</Text>
            )}
          </View>
        </View>

        {/* Collaborators Card */}
        <View style={styles.detailCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="people" size={20} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.sectionTitle}>
              Collaborators ({collaborators.length})
              {loadingCollaborators && (
                <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} style={{ marginLeft: 8 }} />
              )}
            </Text>
          </View>
          
          {collaborators.length > 0 ? (
            collaborators.map((collaborator) => (
              <View key={collaborator.id} style={styles.collaboratorItem}>
                <View style={styles.collaboratorAvatar}>
                  <Text style={styles.collaboratorAvatarText}>
                    {getInitials(collaborator.user.full_name)}
                  </Text>
                </View>
                <View style={styles.collaboratorInfo}>
                  <Text style={styles.collaboratorName}>{collaborator.user.full_name}</Text>
                  <Text style={styles.collaboratorEmail}>{collaborator.user.email}</Text>
                  {collaborator.user.designation && (
                    <Text style={styles.collaboratorRole}>{collaborator.user.designation}</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.removeCollaboratorButton}
                  onPress={() => handleRemoveCollaborator(collaborator)}
                >
                  <Ionicons name="close-circle" size={22} color={WHATSAPP_COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="person-add" size={32} color={WHATSAPP_COLORS.textTertiary} />
              <Text style={styles.emptyStateText}>No collaborators yet</Text>
            </View>
          )}

          {/* Add Collaborator */}
          <View style={styles.addCollaboratorSection}>
            <Text style={styles.inputLabel}>Add Collaborator</Text>
            <View style={styles.collaboratorInputContainer}>
              <TextInput
                style={styles.collaboratorInput}
                value={newCollaborator}
                onChangeText={handleCollaboratorInputChange}
                placeholder="Search by name or email..."
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                autoCapitalize="none"
              />
              {loadingPotentialCollaborators && (
                <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} style={styles.searchLoading} />
              )}
            </View>
            
            {/* Search Results */}
            {showPotentialCollaborators && potentialCollaborators.length > 0 && (
              <View style={styles.searchResultsContainer}>
                {potentialCollaborators.map((collaborator, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.searchResultItem}
                    onPress={() => handlePotentialCollaboratorSelect(collaborator)}
                  >
                    <View style={styles.searchResultAvatar}>
                      <Text style={styles.searchResultAvatarText}>
                        {getInitials(collaborator.full_name)}
                      </Text>
                    </View>
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>{collaborator.full_name}</Text>
                      <Text style={styles.searchResultEmail}>{collaborator.email}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handlePotentialCollaboratorSelect(collaborator)}
                    >
                      <Ionicons name="add-circle" size={24} color={WHATSAPP_COLORS.success} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.addButton, !newCollaborator.trim() && styles.buttonDisabled]} 
              onPress={handleAddCollaborator}
              disabled={!newCollaborator.trim()}
            >
              <MaterialIcons name="person-add" size={18} color={WHATSAPP_COLORS.white} />
              <Text style={styles.addButtonText}>Add Collaborator</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Card */}
        <View style={styles.detailCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="comment" size={20} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.sectionTitle}>
              Comments ({comments.length})
              {commentsPagination && ` of ${commentsPagination.total_items}`}
            </Text>
          </View>
          
          {loadingComments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
              <Text style={styles.loadingText}>Loading comments...</Text>
            </View>
          ) : comments.length > 0 ? (
            <>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {getInitials(comment.commentBy)}
                      </Text>
                    </View>
                    <View style={styles.commentInfo}>
                      <Text style={styles.commentAuthor}>{comment.commentBy}</Text>
                      <Text style={styles.commentTime}>{formatDateTime(comment.date)}</Text>
                      <View style={styles.commentPhase}>
                        <MaterialIcons name="layers" size={12} color={WHATSAPP_COLORS.textTertiary} />
                        <Text style={styles.commentPhaseText}>
                          {beautifyName(comment.phase)} • {beautifyName(comment.subphase)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.commentContentContainer}>
                    <Text style={styles.commentContent}>{comment.content}</Text>
                  </View>
                  
                  {comment.documents && comment.documents.length > 0 && (
                    <View style={styles.commentDocuments}>
                      <Text style={styles.documentsLabel}>Attachments:</Text>
                      {comment.documents.map((doc, index) => (
                        <TouchableOpacity key={doc.id} style={styles.documentItem}>
                          <MaterialIcons name="insert-drive-file" size={16} color={WHATSAPP_COLORS.info} />
                          <Text style={styles.documentName} numberOfLines={1}>
                            {doc.document_name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}

              {loadingMoreComments && (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
                  <Text style={styles.loadMoreText}>Loading more comments...</Text>
                </View>
              )}

              {commentsPagination && !commentsPagination.has_next && comments.length > 0 && (
                <View style={styles.endOfListContainer}>
                  <Text style={styles.endOfListText}>
                    You've reached the end of the comments
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="comment" size={32} color={WHATSAPP_COLORS.textTertiary} />
              <Text style={styles.emptyStateText}>No comments yet</Text>
            </View>
          )}

          {/* Add Comment Section */}
          <View style={styles.addCommentSection}>
            <View style={styles.commentActions}>
              <TouchableOpacity
                style={styles.defaultCommentButton}
                onPress={() => setShowDefaultComments(true)}
                disabled={loadingDefaultComments}
              >
                <MaterialIcons name="list" size={18} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.defaultCommentButtonText}>Default Comments</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.attachButton}
                onPress={handleAttachDocuments}
              >
                <MaterialIcons name="attach-file" size={18} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.attachButtonText}>
                  Attach ({selectedDocuments.length})
                </Text>
              </TouchableOpacity>
            </View>

            {selectedDocuments.length > 0 && (
              <View style={styles.selectedDocuments}>
                {selectedDocuments.map((doc, index) => (
                  <View key={index} style={styles.selectedDocument}>
                    <MaterialIcons name="insert-drive-file" size={16} color={WHATSAPP_COLORS.info} />
                    <Text style={styles.selectedDocumentName} numberOfLines={1}>
                      {doc.name}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => handleRemoveDocument(index)}
                    >
                      <Ionicons name="close-circle" size={18} color={WHATSAPP_COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TextInput
              style={styles.commentInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Type your comment..."
              placeholderTextColor={WHATSAPP_COLORS.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity 
              style={[styles.sendButton, (!newComment.trim() || addingComment) && styles.buttonDisabled]} 
              onPress={handleAddComment}
              disabled={!newComment.trim() || addingComment}
            >
              {addingComment ? (
                <ActivityIndicator color={WHATSAPP_COLORS.white} size="small" />
              ) : (
                <>
                  <MaterialIcons name="send" size={18} color={WHATSAPP_COLORS.white} />
                  <Text style={styles.sendButtonText}>Send</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Default Comments Modal */}
      {showDefaultComments && (
        <View style={styles.modalOverlay}>
          <View style={styles.defaultCommentsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Default Comments - {beautifyName(lead.phase)} → {beautifyName(lead.subphase)}
              </Text>
              <TouchableOpacity 
                style={styles.closeModalButton}
                onPress={() => setShowDefaultComments(false)}
              >
                <Ionicons name="close" size={24} color={WHATSAPP_COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.defaultCommentsList}>
              {loadingDefaultComments ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
                  <Text style={styles.loadingText}>Loading default comments...</Text>
                </View>
              ) : defaultComments.length > 0 ? (
                defaultComments.map((comment, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.defaultCommentItem}
                    onPress={() => handleDefaultCommentSelect(comment)}
                  >
                    <Text style={styles.defaultCommentText}>
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
                  <MaterialIcons name="list" size={32} color={WHATSAPP_COLORS.textTertiary} />
                  <Text style={styles.emptyStateText}>
                    No default comments available for this phase/subphase
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  detailScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  
  // Lead Header Card
  leadHeaderCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: WHATSAPP_COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  leadAvatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  leadAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadAvatarText: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  leadInfo: {
    alignItems: 'center',
  },
  leadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  leadName: {
    fontSize: 22,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    textAlign: 'center',
  },
  incentiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  incentiveBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: WHATSAPP_COLORS.warning,
  },
  leadStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  leadStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  separator: {
    width: 1,
    height: 12,
    backgroundColor: WHATSAPP_COLORS.border,
    marginHorizontal: 4,
  },
  leadCompany: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    flex: 1,
  },
  leadMeta: {
    width: '100%',
  },
  leadMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  leadMetaText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  
  // Detail Cards
  detailCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: WHATSAPP_COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  
  // Phase Container
  phaseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phaseItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  phaseContent: {
    flex: 1,
  },
  phaseLabel: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 2,
  },
  phaseValue: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  phaseSeparator: {
    paddingHorizontal: 16,
  },
  
  // Contact Section
  contactSection: {
    marginBottom: 20,
  },
  contactSectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  contactSectionTitleText: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  contactItem: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: WHATSAPP_COLORS.background,
    borderLeftWidth: 3,
    borderLeftColor: WHATSAPP_COLORS.primary,
  },
  contactItemText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '500',
  },
  emptyContactText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  
  // Collaborators
  collaboratorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  collaboratorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WHATSAPP_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  collaboratorAvatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  collaboratorInfo: {
    flex: 1,
  },
  collaboratorName: {
    fontSize: 15,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 2,
  },
  collaboratorEmail: {
    fontSize: 13,
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 2,
  },
  collaboratorRole: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
  },
  removeCollaboratorButton: {
    padding: 4,
  },
  
  // Add Collaborator Section
  addCollaboratorSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 8,
  },
  collaboratorInputContainer: {
    position: 'relative',
  },
  collaboratorInput: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: WHATSAPP_COLORS.textPrimary,
    backgroundColor: WHATSAPP_COLORS.background,
    paddingRight: 40,
  },
  searchLoading: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  searchResultsContainer: {
    marginTop: 8,
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: WHATSAPP_COLORS.background,
    borderLeftWidth: 3,
    borderLeftColor: WHATSAPP_COLORS.accent,
  },
  searchResultAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WHATSAPP_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchResultAvatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '500',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 2,
  },
  searchResultEmail: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: WHATSAPP_COLORS.primary,
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: WHATSAPP_COLORS.white,
  },
  
  // Comments
  commentItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  commentHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WHATSAPP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commentAvatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  commentInfo: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 2,
  },
  commentTime: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    marginBottom: 4,
  },
  commentPhase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentPhaseText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
  },
  commentContentContainer: {
    marginBottom: 12,
  },
  commentContent: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textPrimary,
    lineHeight: 22,
  },
  commentDocuments: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  documentsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 8,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: WHATSAPP_COLORS.surface,
    marginBottom: 6,
    gap: 8,
  },
  documentName: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  
  // Add Comment Section
  addCommentSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  defaultCommentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: WHATSAPP_COLORS.background,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  defaultCommentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: WHATSAPP_COLORS.primary,
  },
  attachButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: WHATSAPP_COLORS.background,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  attachButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: WHATSAPP_COLORS.primary,
  },
  selectedDocuments: {
    marginBottom: 16,
  },
  selectedDocument: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: WHATSAPP_COLORS.background,
    marginBottom: 8,
    gap: 8,
  },
  selectedDocumentName: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: WHATSAPP_COLORS.textPrimary,
    backgroundColor: WHATSAPP_COLORS.background,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.white,
  },
  
  // Loading States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  endOfListContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  endOfListText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    fontStyle: 'italic',
  },
  
  // Empty States
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  
  // Default Comments Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultCommentsModal: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    backgroundColor: WHATSAPP_COLORS.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
  },
  closeModalButton: {
    padding: 4,
  },
  defaultCommentsList: {
    maxHeight: 400,
    padding: 16,
  },
  defaultCommentItem: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  defaultCommentText: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textPrimary,
    lineHeight: 22,
  },
  
  // Bottom Spacing
  bottomSpacing: {
    height: 20,
  },
});

export default LeadDetails;