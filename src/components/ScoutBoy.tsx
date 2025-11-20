import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Modal, TextInput, Dimensions, ActivityIndicator,
  Image, RefreshControl, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/config';
import CreateSite from './CreateSite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Design tokens
const colors = {
  primary: '#161b34',
  primaryLight: '#2a3150',
  secondary: '#4A5568',
  accent: '#3B82F6',
  success: '#28A745',
  warning: '#FFC107',
  error: '#DC3545',
  white: '#FFFFFF',
  black: '#000000',
  text: '#1a202c',
  textSecondary: '#718096',
  textLight: '#A0AEC0',
  background: '#FFFFFF',
  backgroundSecondary: '#F7FAFC',
  border: '#E2E8F0',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
};

const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

const BackIcon = () => (
  <View style={styles.backIcon}>
    <View style={styles.backArrow} />
  </View>
);

const NavigationArrow = ({ direction }: { direction: 'left' | 'right' }) => (
  <View style={styles.navArrowIcon}>
    <View style={[
      styles.navArrow,
      direction === 'right' && styles.navArrowRight
    ]} />
  </View>
);

interface ScoutBoyProps {
  onBack: () => void;
}

const ScoutBoy: React.FC<ScoutBoyProps> = ({ onBack }) => {
  const [viewMode, setViewMode] = useState('visits-list');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [visits, setVisits] = useState<any[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [currentVisitIndex, setCurrentVisitIndex] = useState(0);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Photo modal state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Mark complete state
  const [markingComplete, setMarkingComplete] = useState(false);

  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentDocuments, setCommentDocuments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [commentsCurrentPage, setCommentsCurrentPage] = useState(1);
  const [commentsHasNextPage, setCommentsHasNextPage] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);

  const TOKEN_KEY = 'token_2';

  // Utility functions
  const beautifyName = (name: string): string => {
    if (!name) return '-';
    return name
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return '#FFC107';
      case 'scout_completed': return '#ffcc92ff';
      case 'admin_completed': return '#28A745';
      case 'cancelled': return '#DC3545';
      default: return '#6C7293';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'pending': return '⏳';
      case 'scout_completed': return '✓';
      case 'admin_completed': return '✓✓';
      case 'cancelled': return '✗';
      default: return '•';
    }
  };

  // Gallery navigation
  const navigateToPreviousVisit = () => {
    if (currentVisitIndex > 0) {
      const newIndex = currentVisitIndex - 1;
      setCurrentVisitIndex(newIndex);
      setSelectedVisit(visits[newIndex]);
      setComments([]);
      setCommentsCurrentPage(1);
    }
  };

  const navigateToNextVisit = () => {
    if (currentVisitIndex < visits.length - 1) {
      const newIndex = currentVisitIndex + 1;
      setCurrentVisitIndex(newIndex);
      setSelectedVisit(visits[newIndex]);
      setComments([]);
      setCommentsCurrentPage(1);
    }
  };

  // Fetch visits
  const fetchVisits = async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setLoadingVisits(true);
      } else {
        setLoadingMore(true);
      }
      setVisitsError(null);

      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setVisitsError('Token not found. Please login again.');
        setLoadingVisits(false);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/employee/getAssignedVisits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: storedToken,
          page: page,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch visits: ${response.status}`);
      }

      const data = await response.json();

      const formattedVisits = data.visits.map((visit: any) => ({
        id: visit.id,
        site: { ...visit.site },
        status: visit.status,
        collaborators: visit.collaborators || [],
        assigned_by: visit.assigned_by,
        created_at: visit.created_at,
        updated_at: visit.updated_at,
        scout_completed_at: visit.scout_completed_at,
        building_photos: visit.building_photos || [],
        photos: visit.building_photos || [],
      }));

      if (append) {
        setVisits(prev => [...prev, ...formattedVisits]);
      } else {
        setVisits(formattedVisits);
      }

      setCurrentPage(data.pagination.current_page);
      setHasNextPage(data.pagination.has_next);
      setLoadingVisits(false);
      setLoadingMore(false);
    } catch (error) {
      console.error('Error fetching visits:', error);
      setVisitsError(error instanceof Error ? error.message : 'Failed to load visits');
      setLoadingVisits(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchVisits(1, false);
  }, []);
  // Refresh visits
  const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    await fetchVisits(1, false);
    setRefreshing(false);
  };

  // Load more visits
  const loadMoreVisits = () => {
    if (hasNextPage && !loadingMore) {
      fetchVisits(currentPage + 1, true);
    }
  };

  // Search visits
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      fetchVisits(1, false);
      return;
    }

    try {
      setLoadingVisits(true);
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (!storedToken) return;

      const response = await fetch(`${BACKEND_URL}/employee/searchVisits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: storedToken, query }),
      });

      const data = await response.json();
      const formattedVisits = data.visits.map((visit: any) => ({
        id: visit.id,
        site: { ...visit.site },
        status: visit.status,
        collaborators: visit.collaborators || [],
        assigned_by: visit.assigned_by,
        created_at: visit.created_at,
        updated_at: visit.updated_at,
        scout_completed_at: visit.scout_completed_at,
        building_photos: visit.building_photos || [],
        photos: visit.building_photos || [],
      }));

      setVisits(formattedVisits);
    } catch (error) {
      console.error('Error searching visits:', error);
    } finally {
      setLoadingVisits(false);
    }
  };

  // Fetch comments for a visit
  const fetchComments = async (visitId: number, page: number = 1, append: boolean = false) => {
    if (!visitId) return;

    try {
      if (!append) {
        setLoadingComments(true);
      } else {
        setLoadingMoreComments(true);
      }

      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        console.error('Token not found');
        setLoadingComments(false);
        setLoadingMoreComments(false);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/employee/getVisitComments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: storedToken,
          visit_id: visitId,
          page: page,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch comments: ${response.status}`);
      }

      const data = await response.json();

      if (!data.comments || !Array.isArray(data.comments)) {
        setLoadingComments(false);
        setLoadingMoreComments(false);
        return;
      }

      const formattedComments = data.comments.map((item: any) => ({
        commentId: item.id,
        user: item.user,
        content: item.content,
        documents: item.documents || [],
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

      if (append) {
        setComments(prev => [...prev, ...formattedComments]);
      } else {
        setComments(formattedComments);
      }

      setCommentsCurrentPage(data.pagination?.current_page || 1);
      setCommentsHasNextPage(data.pagination?.has_next || false);

    } catch (error) {
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoadingComments(false);
      setLoadingMoreComments(false);
    }
  };

  // Add Comment
  const handleAddComment = async () => {
    if (!commentText.trim() && commentDocuments.length === 0) {
      Alert.alert('Error', 'Please enter a comment or attach a file');
      return;
    }
    if (!selectedVisit) return;

    try {
      setAddingComment(true);
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        Alert.alert('Error', 'Authentication token not found');
        setAddingComment(false);
        return;
      }

      const formData = new FormData();
      formData.append('token', storedToken);
      formData.append('visit_id', selectedVisit.id.toString());

      if (commentText.trim()) {
        formData.append('comment', commentText.trim());
      }

      commentDocuments.forEach((doc, index) => {
        formData.append('documents', {
          uri: doc.uri,
          type: doc.mimeType || 'application/octet-stream',
          name: doc.name || `document_${index}`,
        } as any);
      });

      const response = await fetch(`${BACKEND_URL}/employee/addVisitComment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) throw new Error();

      const data = await response.json();
      if (!data.comment) throw new Error();

      const newComment = {
        commentId: data.comment.id,
        user: data.comment.user,
        content: data.comment.content,
        documents: data.comment.documents || [],
        created_at: data.comment.created_at,
        updated_at: data.comment.updated_at,
      };

      setComments(prev => [newComment, ...prev]);
      setCommentText('');
      setCommentDocuments([]);

      Alert.alert('Success', 'Comment added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setAddingComment(false);
    }
  };

  // Load more comments
  const loadMoreComments = () => {
    if (commentsHasNextPage && !loadingMoreComments && selectedVisit) {
      fetchComments(selectedVisit.id, commentsCurrentPage + 1, true);
    }
  };

  // Attachments
  const handleAttachFile = async () => {
    Alert.alert(
      'Attach File',
      'Choose attachment type',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handlePickImage },
        { text: 'Choose Document', onPress: handlePickDocument },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setCommentDocuments(prev => [...prev, {
          uri: asset.uri,
          name: `photo_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          type: 'image'
        }]);
      }
    } catch (error) {}
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setCommentDocuments(prev => [...prev, {
          uri: asset.uri,
          name: `image_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          type: 'image'
        }]);
      }
    } catch (error) {}
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setCommentDocuments(prev => [...prev, {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
          type: 'document',
          size: asset.size
        }]);
      }
    } catch (error) {}
  };

  const handleRemoveDocument = (index: number) => {
    setCommentDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const formatCommentDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diff < 24) {
        return date.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } else {
        return date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
    } catch {
      return '-';
    }
  };

  const handleVisitPress = (visit: any, index: number) => {
    setSelectedVisit(visit);
    setCurrentVisitIndex(index);
    setViewMode('visit-detail');
    setComments([]);
    setCommentsCurrentPage(1);
  };

  const handleBackToList = () => {
    setViewMode('visits-list');
    setSelectedVisit(null);
    setCurrentVisitIndex(0);
    setComments([]);
    setCommentsCurrentPage(1);
  };

  const handleCreateSiteClick = () => {
    setViewMode('create-site');
  };

  const handleBackFromCreateSite = () => {
    setViewMode('visits-list');
    handleRefresh();
  };

  const handleMarkComplete = async () => {
    if (!selectedVisit) return;

    try {
      setMarkingComplete(true);
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (!storedToken) return;

      const response = await fetch(`${BACKEND_URL}/employee/markVisitCompleted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: storedToken,
          visit_id: selectedVisit.id,
        }),
      });

      if (response.ok) {
        const updatedVisit = { ...selectedVisit, status: 'scout_completed' };
        const updatedVisits = [...visits];
        updatedVisits[currentVisitIndex] = updatedVisit;
        setSelectedVisit(updatedVisit);
        setVisits(updatedVisits);
        Alert.alert('Success', 'Visit marked as completed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to mark visit as complete');
    } finally {
      setMarkingComplete(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'visit-detail' && selectedVisit) {
      fetchComments(selectedVisit.id, 1, false);
    }
  }, [viewMode, selectedVisit]);


  // ---------------------------
  //   VISIT DETAIL SCREEN
  // ---------------------------
  if (viewMode === 'visit-detail' && selectedVisit) {
    const site = selectedVisit.site;
    const insets = useSafeAreaInsets();
    const hasPrevious = currentVisitIndex > 0;
    const hasNext = currentVisitIndex < visits.length - 1;

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
            <BackIcon />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Visit Details</Text>
            <Text style={styles.headerSubtitle}>
              {currentVisitIndex + 1} of {visits.length}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Navigation arrows */}
        <View style={styles.galleryNavigationContainer}>
          <TouchableOpacity
            style={[
              styles.galleryNavButton,
              styles.galleryNavButtonLeft,
              !hasPrevious && styles.galleryNavButtonDisabled
            ]}
            onPress={navigateToPreviousVisit}
            disabled={!hasPrevious}
          >
            <NavigationArrow direction="left" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.galleryNavButton,
              styles.galleryNavButtonRight,
              !hasNext && styles.galleryNavButtonDisabled
            ]}
            onPress={navigateToNextVisit}
            disabled={!hasNext}
          >
            <NavigationArrow direction="right" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.detailContainer}>
            <View style={styles.card}>
              {/* FIRST Comments block was here — REMOVED completely */}
              {/* Photos */}
              {selectedVisit.building_photos && selectedVisit.building_photos.length > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Photos ({selectedVisit.building_photos.length})</Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.photoScroll}
                  >
                    {selectedVisit.building_photos.map((photo: any, index: number) => (
                      <TouchableOpacity
                        key={photo.id}
                        style={styles.photoThumbnail}
                        onPress={() => {
                          setSelectedPhotoIndex(index);
                          setSelectedPhotoUrl(photo.file_url);
                          setShowPhotoModal(true);
                        }}
                      >
                        <Image
                          source={{ uri: photo.file_url }}
                          style={styles.photoImage}
                        />
                        <View style={styles.photoNumberBadge}>
                          <Text style={styles.photoNumber}>{index + 1}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Photos</Text>
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateIcon}>📷</Text>
                    <Text style={styles.emptyStateText}>No photos available</Text>
                  </View>
                </View>
              )}

              {/* Property Details */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Property Details</Text>

                <DetailSection title="📋 Basic Information" site={site} />
                <DetailSection title="💰 Commercial Details" site={site} />
                <DetailSection title="🚗 Vehicle Information" site={site} />
                <DetailSection title="👤 Contact Information" site={site} />

                {site.remarks && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>📝 Remarks</Text>
                    <Text style={styles.remarksText}>{site.remarks}</Text>
                  </View>
                )}
              </View>

              {/* --------------------------------------------- */}
              {/* ONLY COMMENTS SECTION (Section B) — This stays */}
              {/* --------------------------------------------- */}

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>

                <View style={styles.commentsContainer}>
                  {loadingComments ? (
                    <View style={styles.commentsLoading}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.commentsLoadingText}>Loading comments...</Text>
                    </View>
                  ) : comments.length > 0 ? (
                    <ScrollView
                      style={styles.commentsList}
                      showsVerticalScrollIndicator={false}
                      onScroll={({ nativeEvent }) => {
                        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                        const isCloseToBottom =
                          layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
                        if (isCloseToBottom && !loadingMoreComments) {
                          loadMoreComments();
                        }
                      }}
                      scrollEventThrottle={400}
                    >
                      {comments.map((comment, index) => (
                        <View key={`${comment.commentId}`} style={styles.commentItem}>
                          <View style={styles.commentHeader}>
                            <Text style={styles.commentAuthor}>
                              {comment.user?.full_name || 'Unknown User'}
                            </Text>
                            <Text style={styles.commentTime}>
                              {formatCommentDate(comment.created_at)}
                            </Text>
                          </View>

                          {comment.content ? (
                            <Text style={styles.commentContent}>{comment.content}</Text>
                          ) : null}

                          {comment.documents && comment.documents.length > 0 && (
                            <View style={styles.commentDocuments}>
                              {comment.documents.map((doc: any, docIndex: number) => (
                                <TouchableOpacity key={docIndex} style={styles.commentDocument}>
                                  <Text style={styles.commentDocumentText}>
                                    📎 {doc.name || 'Document'}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}

                          {index < comments.length - 1 && (
                            <View style={styles.commentSeparator} />
                          )}
                        </View>
                      ))}

                      {loadingMoreComments && (
                        <View style={styles.loadingMoreComments}>
                          <ActivityIndicator size="small" color={colors.primary} />
                          <Text style={styles.loadingMoreCommentsText}>Loading older comments...</Text>
                        </View>
                      )}
                    </ScrollView>
                  ) : (
                    <View style={styles.emptyComments}>
                      <Text style={styles.emptyCommentsIcon}>💬</Text>
                      <Text style={styles.emptyCommentsText}>No comments yet</Text>
                      <Text style={styles.emptyCommentsSubtext}>Be the first to add a comment</Text>
                    </View>
                  )}
                </View>

                {/* Add Comment */}
                <View style={styles.addCommentContainer}>
                  {commentDocuments.length > 0 && (
                    <View style={styles.attachedFilesContainer}>
                      <Text style={styles.attachedFilesTitle}>Attached files:</Text>
                      {commentDocuments.map((doc, index) => (
                        <View key={index} style={styles.attachedFile}>
                          <Text style={styles.attachedFileName} numberOfLines={1}>
                            {doc.type === 'image' ? '📷' : '📄'} {doc.name}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveDocument(index)}
                            style={styles.removeFileButton}
                          >
                            <Text style={styles.removeFileText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.commentInputContainer}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Add a comment..."
                      value={commentText}
                      onChangeText={setCommentText}
                      multiline
                      maxLength={500}
                      placeholderTextColor={colors.textSecondary}
                    />
                    <TouchableOpacity
                      style={styles.attachButton}
                      onPress={handleAttachFile}
                    >
                      <Text style={styles.attachButtonText}>📎</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.addCommentButton,
                      (!commentText.trim() && commentDocuments.length === 0) && styles.addCommentButtonDisabled,
                      addingComment && styles.addCommentButtonDisabled
                    ]}
                    onPress={handleAddComment}
                    disabled={(!commentText.trim() && commentDocuments.length === 0) || addingComment}
                  >
                    {addingComment ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.addCommentButtonText}>Add Comment</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mark Complete CTA */}
              {selectedVisit.status === 'pending' && (
                <TouchableOpacity
                  style={[
                    styles.markCompleteButton,
                    markingComplete && styles.markCompleteButtonDisabled
                  ]}
                  onPress={handleMarkComplete}
                  disabled={markingComplete}
                >
                  {markingComplete ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.markCompleteButtonText}>
                      ✓ Mark Visit as Completed
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              <View style={{ height: 24 }} />
            </View>
          </View>
        </ScrollView>

        {/* Photo Modal */}
        <Modal
          visible={showPhotoModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPhotoModal(false)}
        >
          <View style={styles.photoModalOverlay}>
            <TouchableOpacity
              style={styles.photoModalClose}
              onPress={() => setShowPhotoModal(false)}
            >
              <Text style={styles.photoModalCloseText}>✕</Text>
            </TouchableOpacity>

            <Image
              source={{ uri: selectedPhotoUrl }}
              style={styles.photoModalImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      </View>
    );
  }
  // -----------------------
  //   CREATE SITE SCREEN
  // -----------------------
  if (viewMode === 'create-site') {
    return (
      <CreateSite
        onBack={handleBackFromCreateSite}
        colors={colors}
        spacing={spacing}
        fontSize={fontSize}
        borderRadius={borderRadius}
        shadows={shadows}
      />
    );
  }

  const insets = useSafeAreaInsets();

  // -----------------------
  //   VISITS LIST SCREEN
  // -----------------------
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Visits</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.contentContainer}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search visits..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.length > 2 || text.length === 0) {
                handleSearch(text);
              }
            }}
            returnKeyType="search"
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchButton}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* create site */}
        <View style={styles.createButtonWrapper}>
          <TouchableOpacity
            style={styles.createSiteButton}
            onPress={handleCreateSiteClick}
          >
            <Text style={styles.createSiteButtonText}>+ Create New Site</Text>
          </TouchableOpacity>
        </View>

        {/* Visits List */}
        <ScrollView
          style={styles.listScrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isCloseToBottom =
              layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
            if (isCloseToBottom && !loadingMore) {
              loadMoreVisits();
            }
          }}
          scrollEventThrottle={400}
        >
          {loadingVisits ? (
            <View style={styles.emptyListContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.emptyListSubtitle}>Loading visits...</Text>
            </View>
          ) : visitsError ? (
            <View style={styles.emptyListContainer}>
              <Text style={styles.emptyStateIcon}>⚠️</Text>
              <Text style={styles.emptyListTitle}>{visitsError}</Text>
              <TouchableOpacity
                style={styles.createSiteButton}
                onPress={handleRefresh}
              >
                <Text style={styles.createSiteButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Assigned Visits</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{visits.length}</Text>
                </View>
              </View>

              {visits.length > 0 ? (
                <>
                  {visits.map((visit, index) => (
                    <TouchableOpacity
                      key={visit.id}
                      style={styles.visitCard}
                      onPress={() => handleVisitPress(visit, index)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.visitCardImage}>
                        {visit.building_photos?.length > 0 ? (
                          <Image
                            source={{ uri: visit.building_photos[0].file_url }}
                            style={styles.visitImage}
                          />
                        ) : (
                          <View style={styles.visitImagePlaceholder}>
                            <Text style={styles.visitImagePlaceholderIcon}>🏢</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.visitCardContent}>
                        <View style={styles.visitCardHeader}>
                          <Text style={styles.visitCardTitle} numberOfLines={1}>
                            {visit.site.building_name}
                          </Text>
                          <View style={[
                            styles.visitStatusBadge,
                            { backgroundColor: getStatusColor(visit.status) }
                          ]}>
                            <Text style={styles.visitStatusText}>
                              {getStatusIcon(visit.status)} {beautifyName(visit.status)}
                            </Text>
                          </View>
                        </View>

                        {visit.site.location && (
                          <View style={styles.visitLocationRow}>
                            <Text style={styles.visitLocationIcon}>📍</Text>
                            <Text style={styles.visitLocationText} numberOfLines={1}>
                              {visit.site.location}
                            </Text>
                          </View>
                        )}

                        <View style={styles.visitMetaRow}>
                          {visit.site.rent && visit.site.total_area && (
                            <View style={styles.visitMetaItem}>
                              <Text style={styles.visitMetaText}>
                                ₹{(visit.site.rent / visit.site.total_area).toFixed(2)}/sq-ft
                              </Text>
                            </View>
                          )}

                          {visit.photos?.length > 0 && (
                            <View style={styles.visitMetaItem}>
                              <Text style={styles.visitMetaText}>
                                📷 {visit.photos.length}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.visitCardFooter}>
                          <Text style={styles.visitDate}>{formatDate(visit.created_at)}</Text>
                          <Text style={styles.visitArrow}>→</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}

                  {loadingMore && (
                    <View style={styles.loadingMoreContainer}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.loadingMoreText}>Loading more visits...</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyListContainer}>
                  <Text style={styles.emptyListIcon}>📋</Text>
                  <Text style={styles.emptyListTitle}>No visits assigned yet</Text>
                  <Text style={styles.emptyListSubtitle}>Your assigned visits will appear here</Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </View>
  );
};

// ---------------------------------------
//   Detail Section Component
// ---------------------------------------
const DetailSection = ({ title, site }: { title: string; site: any }) => {
  const getDetailItems = () => {
    switch (title) {
      case '📋 Basic Information':
        return [
          { label: 'Landmark', value: site.landmark },
          { label: 'Building Status', value: site.building_status },
          { label: 'Floor Condition', value: site.floor_condition },
          { label: 'Total Floors', value: site.total_floors },
          { label: 'Basements', value: site.number_of_basements },
          { label: 'Available Floors', value: site.availble_floors },
          { label: 'Total Area', value: site.total_area ? `${site.total_area} sq ft` : '-' },
          { label: 'Area per Floor', value: site.area_per_floor ? `${site.area_per_floor} sq ft` : '-' },
          { label: 'Efficiency', value: site.efficiency },
          { label: 'Area Offered', value: site.area_offered },
          { label: 'Developer Fitouts', value: site.will_developer_do_fitouts },
        ];
      case '💰 Commercial Details':
        return [
          { label: 'Rent Per SQ/FT', value: site.rent && site.total_area ? `₹${(site.rent / site.total_area).toFixed(2)}` : '-' },
          { label: 'Maintenance Charges', value: site.maintenance_rate ? `₹${site.maintenance_rate}` : '-' },
          { label: 'CAM Deposit', value: site.cam_deposit ? `₹${site.cam_deposit}` : '-' },
          { label: 'Security Deposit', value: site.security_deposit ? `₹${site.security_deposit}` : '-' },
          { label: 'Lease Term', value: site.lease_term },
          { label: 'Lock-in Period', value: site.lock_in_period },
          { label: 'Notice Period', value: site.notice_period },
          { label: 'Rental Escalation', value: site.rental_escalation },
        ];
      case '🚗 Vehicle Information':
        return [
          { label: 'Car Parking Charges', value: site.car_parking_charges ? `₹${site.car_parking_charges}` : '-' },
          { label: 'Car Parking Slots', value: site.car_parking_slots },
          { label: 'Car Parking Ratio', value: site.car_parking_ratio },
          { label: 'Two Wheeler Parking', value: site.two_wheeler_charges },
        ];
      case '👤 Contact Information':
        return [
          { label: 'Building Owner', value: site.building_owner_name },
          { label: 'Owner Contact', value: site.building_owner_contact },
          { label: 'Contact Person', value: site.contact_person_name },
          { label: 'Phone', value: site.contact_person_number },
          { label: 'Email', value: site.contact_person_email },
          { label: 'Designation', value: site.contact_person_designation },
        ];
      default:
        return [];
    }
  };

  const items = getDetailItems();

  return (
    <View style={styles.detailSection}>
      <Text style={styles.detailSectionTitle}>{title}</Text>
      <View style={styles.detailGrid}>
        {items.map((item, idx) => (
          <View key={`${title}-${idx}`} style={styles.detailItem}>
            <Text style={styles.detailLabel}>{item.label}</Text>
            <Text style={styles.detailValue}>{item.value || '-'}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};


export default ScoutBoy;



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: spacing.xs,
  },
  backIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: colors.white,
    transform: [{ rotate: '-45deg' }],
  },
  headerSpacer: {
    width: 32,
  },
  galleryNavigationContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  galleryNavButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  galleryNavButtonLeft: {
    marginLeft: 0,
  },
  galleryNavButtonRight: {
    marginRight: 0,
  },
  galleryNavButtonDisabled: {
    backgroundColor: colors.backgroundSecondary,
    opacity: 0.5,
  },
  navArrowIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {
    width: 10,
    height: 10,
    borderLeftWidth: 2.5,
    borderTopWidth: 2.5,
    borderColor: colors.primary,
    transform: [{ rotate: '-45deg' }],
  },
  navArrowRight: {
    transform: [{ rotate: '135deg' }],
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 0,
    paddingTop: spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  searchIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  clearSearchButton: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    padding: spacing.xs,
  },
  createButtonWrapper: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  createSiteButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  createSiteButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  listScrollView: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  listTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.white,
  },
  visitCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    overflow: 'hidden',
    ...shadows.md,
  },
  visitCardImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.backgroundSecondary,
  },
  visitImage: {
    width: '100%',
    height: '100%',
  },
  visitImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  visitImagePlaceholderIcon: {
    fontSize: 48,
  },
  visitCardContent: {
    padding: spacing.md,
  },
  visitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  visitCardTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  visitStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  visitStatusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.white,
  },
  visitLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  visitLocationIcon: {
    fontSize: fontSize.sm,
    marginRight: spacing.xs,
  },
  visitLocationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  visitMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  visitMetaItem: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  visitMetaText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: '600',
  },
  visitCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  visitDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  visitArrow: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '700',
  },
  emptyListContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyListIcon: {
    fontSize: 60,
    marginBottom: spacing.md,
  },
  emptyListTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyListSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.backgroundSecondary,
  },
  siteHeader: {
    marginBottom: spacing.md,
  },
  siteHeaderContent: {
    flex: 1,
  },
  siteName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  statusBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.white,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  locationIcon: {
    fontSize: fontSize.md,
    marginRight: spacing.xs,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.backgroundSecondary,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  metaLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  photoScroll: {
    marginTop: spacing.sm,
  },
  photoThumbnail: {
    marginRight: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.sm,
  },
  photoImage: {
    width: 120,
    height: 120,
    backgroundColor: colors.backgroundSecondary,
  },
  photoNumberBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  photoNumber: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoModalCloseText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  photoModalImage: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.7,
  },
  detailContainer: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailSection: {
    marginBottom: spacing.lg,
  },
  detailSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.md,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  remarksText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 22,
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  markCompleteButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  markCompleteButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  markCompleteButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingMoreText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
   commentsContainer: {
    minHeight: 150,
    maxHeight: 300,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  commentsLoading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  commentsLoadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  commentItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  commentAuthor: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
  },
  commentTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  commentContent: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  commentDocuments: {
    marginTop: spacing.sm,
  },
  commentDocument: {
    backgroundColor: colors.white,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentDocumentText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '600',
  },
  commentSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  loadingMoreComments: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loadingMoreCommentsText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  emptyComments: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyCommentsIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  emptyCommentsText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptyCommentsSubtext: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  addCommentContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
  },
  attachedFilesContainer: {
    marginBottom: spacing.md,
  },
  attachedFilesTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  attachedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  attachedFileName: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  removeFileButton: {
    padding: spacing.xs,
  },
  removeFileText: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
    minHeight: 40,
    maxHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: colors.white,
  },
  attachButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
  },
  attachButtonText: {
    fontSize: fontSize.lg,
  },
  addCommentButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  addCommentButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  addCommentButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});

