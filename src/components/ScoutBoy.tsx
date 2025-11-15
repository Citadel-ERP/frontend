import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Modal, TextInput, Dimensions, ActivityIndicator,
  Image, RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/config';
import CreateSite from './CreateSite';

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
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  
  // Photo modal state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState('');
  
  // Comment state
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [allComments, setAllComments] = useState<any[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Mark complete state
  const [markingComplete, setMarkingComplete] = useState(false);

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

  // Fetch visits from API with pagination
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
        comments: visit.comments || [],
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

  // Handle refresh
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
        comments: visit.comments || [],
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

  const handleVisitPress = (visit: any) => {
    setSelectedVisit(visit);
    setAllComments(visit.comments || []);
    setCommentsPage(1);
    fetchVisitComments(visit.id, 1, false);
    setViewMode('visit-detail');
  };

  const handleBackToList = () => {
    setViewMode('visits-list');
    setSelectedVisit(null);
    setNewComment('');
    setAllComments([]);
  };

  const handleCreateSiteClick = () => {
    setViewMode('create-site');
  };

  const handleBackFromCreateSite = () => {
    setViewMode('visits-list');
    handleRefresh();
  };

  // Fetch visit comments with pagination
  const fetchVisitComments = async (visitId: number, page: number, append: boolean) => {
    try {
      setLoadingComments(true);
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (!storedToken) return;

      const response = await fetch(`${BACKEND_URL}/employee/getVisitComments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: storedToken, 
          visit_id: visitId,
          page: page 
        }),
      });

      const data = await response.json();
      console.log(data)
      console.log(visitId)
      const formattedComments = data.comments.map((sc: any) => ({
        id: sc.id,
        user: sc.user,
        content: sc.content,
        documents: sc.documents,
        created_at: sc.created_at,
        updated_at: sc.updated_at,
      }));

      if (append) {
        setAllComments(prev => [...prev, ...formattedComments]);
      } else {
        setAllComments(formattedComments);
      }

      setHasMoreComments(data.pagination.has_next);
      setCommentsPage(page);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  // Add comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedVisit) return;

    try {
      setAddingComment(true);
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (!storedToken) return;

      const response = await fetch(`${BACKEND_URL}/employee/addVisitComment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: storedToken,
          visit_id: selectedVisit.id,
          comment: newComment,
        }),
      });

      const data = await response.json();
      const newCommentObj = {
        id: data.comment.id,
        user: data.comment.user,
        content: data.comment.content,
        documents: data.comment.documents,
        created_at: data.comment.created_at,
        updated_at: data.comment.updated_at,
      };

      setAllComments(prev => [newCommentObj, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setAddingComment(false);
    }
  };

  // Load more comments
  const handleLoadMoreComments = () => {
    if (selectedVisit && hasMoreComments && !loadingComments) {
      fetchVisitComments(selectedVisit.id, commentsPage + 1, true);
    }
  };

  // Mark visit as completed
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
        setSelectedVisit({ ...selectedVisit, status: 'scout_completed' });
        handleRefresh();
      }
    } catch (error) {
      console.error('Error marking visit complete:', error);
    } finally {
      setMarkingComplete(false);
    }
  };

  // Visit Detail View
  if (viewMode === 'visit-detail' && selectedVisit) {
    const site = selectedVisit.site;
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Visit Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.detailContainer}>
            <View style={styles.card}>
              <View style={styles.siteHeader}>
                <View style={styles.siteHeaderContent}>
                  <Text style={styles.siteName}>{site.building_name}</Text>
                  <View style={styles.statusBadgeContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedVisit.status) }]}>
                      <Text style={styles.statusBadgeText}>
                        {getStatusIcon(selectedVisit.status)} {beautifyName(selectedVisit.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {site.location && (
                <View style={styles.locationContainer}>
                  <Text style={styles.locationIcon}>📍</Text>
                  <Text style={styles.locationText}>{site.location}</Text>
                </View>
              )}

              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Assigned by</Text>
                  <Text style={styles.metaValue}>{selectedVisit.assigned_by.full_name}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Site Updated</Text>
                  <Text style={styles.metaValue}>{formatDate(site.updated_at)}</Text>
                </View>
              </View>
            </View>

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

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Property Details</Text>
              <DetailSection title="📋 Basic Information" site={site} />
              <DetailSection title="💰 Financial Details" site={site} />
              <DetailSection title="👤 Contact Information" site={site} />

              {site.remarks && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>📝 Remarks</Text>
                  <Text style={styles.remarksText}>{site.remarks}</Text>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Comments ({allComments.length})</Text>
              
              {/* Add Comment Section */}
              <View style={styles.addCommentContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  style={[styles.addCommentButton, (!newComment.trim() || addingComment) && styles.addCommentButtonDisabled]}
                  onPress={handleAddComment}
                  disabled={!newComment.trim() || addingComment}
                >
                  {addingComment ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.addCommentButtonText}>Post</Text>
                  )}
                </TouchableOpacity>
              </View>

              {allComments.length > 0 ? (
                <>
                  <View style={styles.commentsContainer}>
                    {allComments.map((comment: any) => (
                      <View key={comment.id} style={styles.commentCard}>
                        <View style={styles.commentHeader}>
                          <View style={styles.commentAvatar}>
                            <Text style={styles.commentAvatarText}>
                              {comment.user.full_name.split(' ').map((n: string) => n[0]).join('')}
                            </Text>
                          </View>
                          <View style={styles.commentHeaderContent}>
                            <Text style={styles.commentAuthor}>{comment.user.full_name}</Text>
                            <Text style={styles.commentDate}>{formatDate(comment.created_at)}</Text>
                          </View>
                        </View>
                        <Text style={styles.commentContent}>{comment.content}</Text>
                      </View>
                    ))}
                  </View>
                  
                  {hasMoreComments && (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={handleLoadMoreComments}
                      disabled={loadingComments}
                    >
                      {loadingComments ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Text style={styles.loadMoreText}>Load More Comments</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>💬</Text>
                  <Text style={styles.emptyStateText}>No comments yet. Be the first to comment!</Text>
                </View>
              )}
            </View>

            {/* Mark Complete Button */}
            {selectedVisit.status === 'pending' && (
              <TouchableOpacity
                style={[styles.markCompleteButton, markingComplete && styles.markCompleteButtonDisabled]}
                onPress={handleMarkComplete}
                disabled={markingComplete}
              >
                {markingComplete ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Text style={styles.markCompleteButtonText}>✓ Mark Visit as Completed</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={{ height: 24 }} />
          </View>
        </ScrollView>

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
      </SafeAreaView>
    );
  }

  // Create Site View
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

  // Default view: Visits List
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Visits</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.contentContainer}>
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

        <View style={styles.createButtonWrapper}>
          <TouchableOpacity
            style={styles.createSiteButton}
            onPress={handleCreateSiteClick}
          >
            <Text style={styles.createSiteButtonText}>+ Create New Site</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.listScrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
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
                  {visits.map((visit) => (
                    <TouchableOpacity
                      key={visit.id}
                      style={styles.visitCard}
                      onPress={() => handleVisitPress(visit)}
                      activeOpacity={0.7}
                    >
                      {/* Photo Section */}
                      <View style={styles.visitCardImage}>
                        {visit.building_photos && visit.building_photos.length > 0 ? (
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
                          <View style={[styles.visitStatusBadge, { backgroundColor: getStatusColor(visit.status) }]}>
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
                          {visit.site.rent && (
                            <View style={styles.visitMetaItem}>
                              <Text style={styles.visitMetaText}>₹{visit.site.rent}/mo</Text>
                            </View>
                          )}
                          {visit.photos && visit.photos.length > 0 && (
                            <View style={styles.visitMetaItem}>
                              <Text style={styles.visitMetaText}>📷 {visit.photos.length}</Text>
                            </View>
                          )}
                          {visit.comments.length > 0 && (
                            <View style={styles.visitMetaItem}>
                              <Text style={styles.visitMetaText}>💬 {visit.comments.length}</Text>
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
    </SafeAreaView>
  );
};

// Helper component for detail sections
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
          { label: 'OC Available', value: site.oc },
          { label: 'Developer Fitouts', value: site.will_developer_do_fitouts },
        ];
      case '💰 Financial Details':
        return [
          { label: 'Monthly Rent', value: site.rent ? `₹${site.rent}` : '-' },
          { label: 'CAM', value: site.cam ? `₹${site.cam}` : '-' },
          { label: 'CAM Deposit', value: site.cam_deposit ? `₹${site.cam_deposit}` : '-' },
          { label: 'Security Deposit', value: site.security_deposit ? `₹${site.security_deposit}` : '-' },
          { label: 'Lease Term', value: site.lease_term },
          { label: 'Lock-in Period', value: site.lock_in_period },
          { label: 'Notice Period', value: site.notice_period },
          { label: 'Rental Escalation', value: site.rental_escalation },
        ];
      case '🚗 Parking Details':
        return [
          { label: 'Car Parking Ratio', value: site.car_parking_ratio },
          { label: 'Car Parking Slots', value: site.car_parking_slots },
          { label: 'Car Parking Charges', value: site.car_parking_charges ? `₹${site.car_parking_charges}` : '-' },
          { label: '2-Wheeler Slots', value: site.two_wheeler_slots },
          { label: '2-Wheeler Charges', value: site.two_wheeler_charges ? `₹${site.two_wheeler_charges}` : '-' },
        ];
      case '⚡ Utilities':
        return [
          { label: 'Power', value: site.power },
          { label: 'Power Backup', value: site.power_backup },
        ];
      case '🏢 Workspace Configuration':
        return [
          { label: 'Number of Cabins', value: site.number_of_cabins },
          { label: 'Workstations', value: site.number_of_workstations },
          { label: 'Workstation Size', value: site.size_of_workstation },
        ];
      case '🎯 Amenities & Facilities':
        return [
          { label: 'Meeting Room', value: site.meeting_room },
          { label: 'Discussion Room', value: site.discussion_room },
          { label: 'Server Room', value: site.server_room },
          { label: 'Training Room', value: site.training_room },
          { label: 'Pantry', value: site.pantry },
          { label: 'Cafeteria', value: site.cafeteria },
          { label: 'UPS Room', value: site.electrical_ups_room },
          { label: 'Gym', value: site.gym },
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
          item.value && (
            <View key={idx} style={styles.detailItem}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={styles.detailValue}>{item.value || '-'}</Text>
            </View>
          )
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
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
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
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
    marginTop: spacing.md,
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
  commentsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  commentCard: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  commentAvatarText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  commentHeaderContent: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  commentDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  commentContent: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
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
  addCommentContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 44,
    maxHeight: 100,
  },
  addCommentButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  addCommentButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  addCommentButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  loadMoreButton: {
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  loadMoreText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
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
});

export default ScoutBoy;