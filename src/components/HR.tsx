import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  StatusBar, Alert, Modal, ActivityIndicator, TextInput, Platform,
  Dimensions, KeyboardAvoidingView, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';
import { BACKEND_URL } from '../config/config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const TOKEN_KEY = 'token_2';

interface HRProps { onBack: () => void; }
interface RequestNature { id: string; name: string; description?: string; }
interface Comment {
  id: string; comment: string; created_by: string; created_by_name: string;
  created_at: string; is_hr_comment: boolean;
}
interface Item {
  id: string; nature: string; description: string; issue?: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  created_at: string; updated_at: string; comments: Comment[];
}
type TabType = 'requests' | 'grievances';
type ViewMode = 'main' | 'itemDetail' | 'newItem';

// Static "Other" option as fallback
const OTHER_OPTION: RequestNature = {
  id: 'other',
  name: 'Other',
  description: 'Any other option not listed above'
};

// Dropdown Modal Component - kept as modal
interface DropdownModalProps {
  visible: boolean;
  onClose: () => void;
  natures: RequestNature[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectNature: (nature: RequestNature) => void;
  activeTab: TabType;
}

const DropdownModal: React.FC<DropdownModalProps> = ({
  visible,
  onClose,
  natures,
  searchQuery,
  onSearchChange,
  onSelectNature,
  activeTab
}) => {
  const filteredNatures = natures.filter(nature => 
    nature.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.dropdownContainer}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder={`Search ${activeTab === 'requests' ? 'requests' : 'grievances'}...`}
                placeholderTextColor={colors.textSecondary}
                autoFocus={false}
              />
            </View>
            <FlatList
              data={filteredNatures}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={styles.dropdownList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => onSelectNature(item)}
                >
                  <Text style={styles.dropdownItemText}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.dropdownItemDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyDropdown}>
                  <Text style={styles.emptyDropdownText}>
                    No {activeTab} found matching "{searchQuery}"
                  </Text>
                </View>
              )}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// New Item Page Component - converted from modal to full page
interface NewItemPageProps {
  activeTab: TabType;
  newItemForm: { nature: string; natureName: string; description: string };
  onFormChange: (form: { nature: string; natureName: string; description: string }) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
  onOpenDropdown: () => void;
}

const NewItemPage: React.FC<NewItemPageProps> = ({
  activeTab,
  newItemForm,
  onFormChange,
  onSubmit,
  onBack,
  loading,
  onOpenDropdown
}) => {
  const insets = useSafeAreaInsets();

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          New {activeTab === 'requests' ? 'Request' : 'Grievance'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.contentContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.newItemPageContainer}
        >
          <ScrollView
            style={styles.newItemPageContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.newItemPageScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.newItemFormContainer}>
              <Text style={styles.pageDescription}>
                Please provide the details for your {activeTab === 'requests' ? 'request' : 'grievance'}. 
                All fields marked with * are required.
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Nature of {activeTab === 'requests' ? 'Request' : 'Grievance'} *
                </Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={onOpenDropdown}
                >
                  <Text style={[
                    styles.dropdownButtonText,
                    !newItemForm.natureName && styles.dropdownPlaceholder
                  ]}>
                    {newItemForm.natureName || `Select ${activeTab === 'requests' ? 'request' : 'grievance'} type`}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                <Text style={styles.fieldHint}>
                  Choose the category that best describes your {activeTab.slice(0, -1)}
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={styles.descriptionInput}
                  value={newItemForm.description}
                  onChangeText={(text) => onFormChange({ ...newItemForm, description: text })}
                  placeholder={`Please provide detailed description of your ${activeTab.slice(0, -1)}`}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <Text style={styles.fieldHint}>
                  Provide as much detail as possible to help us understand and address your {activeTab.slice(0, -1)}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.newItemPageFooter}>
            <TouchableOpacity
              style={styles.pageSubmitButton}
              onPress={onSubmit}
              disabled={loading || !newItemForm.nature || !newItemForm.description.trim()}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.pageSubmitText}>
                  Submit {activeTab === 'requests' ? 'Request' : 'Grievance'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

// Item Detail Page Component - unchanged
interface ItemDetailPageProps {
  item: Item | null;
  activeTab: TabType;
  newComment: string;
  onCommentChange: (comment: string) => void;
  onAddComment: () => void;
  onBack: () => void;
  loading: boolean;
  loadingDetails: boolean;
}

const ItemDetailPage: React.FC<ItemDetailPageProps> = ({
  item,
  activeTab,
  newComment,
  onCommentChange,
  onAddComment,
  onBack,
  loading,
  loadingDetails
}) => {
  const insets = useSafeAreaInsets();

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'resolved': return colors.success;
      case 'rejected': return colors.error;
      case 'in_progress': return colors.info;
      case 'pending': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {activeTab === 'requests' ? 'Request' : 'Grievance'} Details
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.contentContainer}>
        {loadingDetails ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading details...</Text>
          </View>
        ) : item ? (
          <ScrollView
            style={styles.detailPageContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailPageScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.itemDetailContainer}>
              <View style={styles.itemDetailHeader}>
                <View style={styles.itemDetailInfo}>
                  <Text style={styles.itemNatureText}>{item.nature}</Text>
                  <Text style={styles.itemDateText}>
                    Created: {formatDate(item.created_at)}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusBadgeColor(item.status) }
                ]}>
                  <Text style={styles.statusBadgeText}>
                    {item.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <View style={styles.itemDescription}>
                <Text style={styles.descriptionLabel}>Description:</Text>
                <Text style={styles.itemDescriptionText}>
                  {item.description || item.issue}
                </Text>
              </View>

              <View style={styles.commentsSection}>
                <Text style={styles.commentsTitle}>Comments</Text>
                
                {item.comments && item.comments.length > 0 ? (
                  item.comments.map((comment) => (
                    <View key={comment.id} style={[
                      styles.commentItem,
                      comment.is_hr_comment && styles.hrCommentItem
                    ]}>
                      <View style={styles.commentHeader}>
                        <Text style={[
                          styles.commentAuthor,
                          comment.is_hr_comment && styles.hrCommentAuthor
                        ]}>
                          {comment.created_by_name} {comment.is_hr_comment && '(HR Team)'}
                        </Text>
                        <Text style={styles.commentDate}>
                          {formatDateTime(comment.created_at)}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{comment.comment}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noCommentsText}>No comments yet</Text>
                )}

                <View style={styles.addCommentSection}>
                  <Text style={styles.addCommentLabel}>Add Comment:</Text>
                  <TextInput
                    style={styles.commentInput}
                    value={newComment}
                    onChangeText={onCommentChange}
                    placeholder="Type your comment here..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[
                      styles.addCommentButton,
                      (!newComment.trim()) && styles.addCommentButtonDisabled
                    ]}
                    onPress={onAddComment}
                    disabled={loading || !newComment.trim()}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text style={styles.addCommentText}>Add Comment</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const HR: React.FC<HRProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('requests');
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [requestNatures, setRequestNatures] = useState<RequestNature[]>([]);
  const [grievanceNatures, setGrievanceNatures] = useState<RequestNature[]>([]);
  const [newItemForm, setNewItemForm] = useState({ nature: '', natureName: '', description: '' });
  const [newComment, setNewComment] = useState('');
  const [requests, setRequests] = useState<Item[]>([]);
  const [grievances, setGrievances] = useState<Item[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('main');

  const currentNatures = activeTab === 'requests' ? requestNatures : grievanceNatures;
  const currentItems = activeTab === 'requests' ? requests : grievances;

  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        setToken(storedToken);
      } catch (error) {
        console.error('Error getting token:', error);
      }
    };
    getToken();
  }, []);

  useEffect(() => {
    if (token && viewMode === 'main') {
      fetchInitialData();
      fetchNatureData();
    }
  }, [token, activeTab, viewMode]);

  const fetchNatureData = async () => {
    try {
      if (activeTab === 'requests') {
        const response = await fetch(`${BACKEND_URL}/core/getCommonRequests`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          const commonRequests = data.common_requests || [];
          
          // Transform backend data to RequestNature format
          const transformedRequests: RequestNature[] = commonRequests.map((request: any) => ({
            id: request.id.toString(),
            name: request.common_request,
            description: request.common_request
          }));
          
          // Add "Other" option at the end
          setRequestNatures([...transformedRequests, OTHER_OPTION]);
        } else {
          // Fallback to only "Other" option if API fails
          setRequestNatures([OTHER_OPTION]);
        }
      } else {
        const response = await fetch(`${BACKEND_URL}/core/getCommonGrievances`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          const commonGrievances = data.common_grievances || [];
          
          // Transform backend data to RequestNature format
          const transformedGrievances: RequestNature[] = commonGrievances.map((grievance: any) => ({
            id: grievance.id.toString(),
            name: grievance.common_grievance,
            description: grievance.common_grievance
          }));
          
          // Add "Other" option at the end
          setGrievanceNatures([...transformedGrievances, OTHER_OPTION]);
        } else {
          // Fallback to only "Other" option if API fails
          setGrievanceNatures([OTHER_OPTION]);
        }
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab} nature data:`, error);
      // Fallback to only "Other" option if network error
      if (activeTab === 'requests') {
        setRequestNatures([OTHER_OPTION]);
      } else {
        setGrievanceNatures([OTHER_OPTION]);
      }
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await fetchItems();
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      // Use the correct endpoint for grievances, for requests we'll keep the old logic for now
      if (activeTab === 'grievances') {
        const response = await fetch(`${BACKEND_URL}/core/getGrievances`, {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          const data = await response.json();
          const grievancesData = data.grievances || [];
          
          // Transform grievances data to match our interface
          const transformedGrievances = grievancesData.map((grievance: any) => ({
            id: grievance.id.toString(),
            nature: grievance.nature,
            description: grievance.issue, // grievances use 'issue' instead of 'description'
            issue: grievance.issue,
            status: grievance.status,
            created_at: grievance.created_at,
            updated_at: grievance.updated_at,
            comments: [] // Will be populated when we implement comments endpoint
          }));
          
          setGrievances(transformedGrievances);
        } else {
          setGrievances([]);
        }
      } else {
        // For requests, keep the existing logic for now
        const endpoint = 'getRequests';
        const response = await fetch(`${BACKEND_URL}/core/${endpoint}`, {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          const data = await response.json();
          const items = data.requests || [];
          setRequests(items);
        } else {
          setRequests([]);
        }
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error);
      if (activeTab === 'requests') setRequests([]);
      else setGrievances([]);
    }
  };

  // New function to fetch detailed item with comments
  const fetchItemDetails = async (itemId: string) => {
    if (!token) return null;
    
    setLoadingDetails(true);
    try {
      const endpoint = activeTab === 'requests' ? 'getRequest' : 'getGrievance';
      const idField = activeTab === 'requests' ? 'request_id' : 'grievance_id';
      
      const response = await fetch(`${BACKEND_URL}/core/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          [idField]: parseInt(itemId)
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const itemData = activeTab === 'requests' ? data.request : data.grievance;
        
        // Transform the detailed item data
        const transformedComments = itemData.comments?.map((commentWrapper: any) => {
          const comment = commentWrapper.comment;
          return {
            id: comment.id.toString(),
            comment: comment.content,
            created_by: comment.user.employee_id,
            created_by_name: comment.user.full_name,
            created_at: comment.created_at,
            is_hr_comment: comment.user.role === 'hr' // Assuming HR comments are identified by role
          };
        }) || [];

        const detailedItem: Item = {
          id: itemData.id.toString(),
          nature: itemData.nature,
          description: activeTab === 'requests' ? itemData.description : itemData.issue,
          issue: itemData.issue,
          status: itemData.status,
          created_at: itemData.created_at,
          updated_at: itemData.updated_at,
          comments: transformedComments
        };

        return detailedItem;
      } else {
        console.error('Failed to fetch item details');
        return null;
      }
    } catch (error) {
      console.error('Error fetching item details:', error);
      return null;
    } finally {
      setLoadingDetails(false);
    }
  };

  // Modified function to handle item selection - navigate to detail page
  const handleItemPress = async (item: Item) => {
    setSelectedItem(item); // Set basic item first
    setViewMode('itemDetail'); // Switch to detail page
    
    // Fetch detailed item with comments
    const detailedItem = await fetchItemDetails(item.id);
    if (detailedItem) {
      setSelectedItem(detailedItem);
    }
  };

  // Handle back from item detail page
  const handleBackFromDetail = () => {
    setViewMode('main');
    setSelectedItem(null);
    setNewComment('');
    // Refresh main list to show any updates
    if (token) {
      fetchItems();
    }
  };

  // Handle navigation to new item page
  const handleNewItemPress = () => {
    setViewMode('newItem');
    // Fetch nature data for the new item page if not already loaded
    if (currentNatures.length === 0) {
      fetchNatureData();
    }
  };

  // Handle back from new item page
  const handleBackFromNewItem = () => {
    setViewMode('main');
    setIsDropdownVisible(false);
    setSearchQuery('');
    setNewItemForm({ nature: '', natureName: '', description: '' });
  };

  const submitNewItem = async () => {
    if (!newItemForm.nature || !newItemForm.description.trim()) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      // Use the correct endpoints provided in your document
      const endpoint = activeTab === 'requests' ? 'createRequest' : 'createGrievance';
      const requestBody = activeTab === 'requests' 
        ? {
            token,
            nature: newItemForm.natureName,
            description: newItemForm.description
          }
        : {
            token,
            nature: newItemForm.natureName,
            issue: newItemForm.description
          };
      
      const response = await fetch(`${BACKEND_URL}/core/${endpoint}`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert('Success', `${activeTab.slice(0, -1)} submitted successfully!`);
        handleBackFromNewItem();
        await fetchItems(); 
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || `Failed to submit ${activeTab.slice(0, -1)}`);
      }
    } catch (error) {
      console.error(`Error submitting ${activeTab.slice(0, -1)}:`, error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedItem) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    setLoading(true);
    try {
      const endpoint = activeTab === 'requests' ? 'addCommentToRequest' : 'addCommentToGrievance';
      const idField = activeTab === 'requests' ? 'request_id' : 'grievance_id';
      
      const response = await fetch(`${BACKEND_URL}/core/${endpoint}`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          [idField]: selectedItem.id,
          content: newComment
        }),
      });

      if (response.ok) {
        setNewComment('');
        
        // Refresh the detailed item to get updated comments
        const updatedItem = await fetchItemDetails(selectedItem.id);
        if (updatedItem) {
          setSelectedItem(updatedItem);
        }
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const selectNature = (nature: RequestNature) => {
    setNewItemForm({ ...newItemForm, nature: nature.id, natureName: nature.name });
    setIsDropdownVisible(false);
    setSearchQuery('');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'resolved': return colors.success;
      case 'rejected': return colors.error;
      case 'in_progress': return colors.info;
      case 'pending': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

  // If we're viewing item details, show the detail page
  if (viewMode === 'itemDetail') {
    return (
      <ItemDetailPage
        item={selectedItem}
        activeTab={activeTab}
        newComment={newComment}
        onCommentChange={setNewComment}
        onAddComment={addComment}
        onBack={handleBackFromDetail}
        loading={loading}
        loadingDetails={loadingDetails}
      />
    );
  }

  // If we're creating a new item, show the new item page
  if (viewMode === 'newItem') {
    return (
      <>
        <NewItemPage
          activeTab={activeTab}
          newItemForm={newItemForm}
          onFormChange={setNewItemForm}
          onSubmit={submitNewItem}
          onBack={handleBackFromNewItem}
          loading={loading}
          onOpenDropdown={() => setIsDropdownVisible(true)}
        />
        <DropdownModal
          visible={isDropdownVisible}
          onClose={() => {
            setIsDropdownVisible(false);
            setSearchQuery('');
          }}
          natures={currentNatures}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectNature={selectNature}
          activeTab={activeTab}
        />
      </>
    );
  }

  const renderContent = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <View style={styles.sectionHeaderWithButton}>
          <Text style={styles.sectionTitle}>
            Raise New {activeTab === 'requests' ? 'Request' : 'Grievance'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newItemButton}
          onPress={handleNewItemPress}
        >
          <View style={styles.newItemIcon}>
            <Text style={styles.newItemIconText}>+</Text>
          </View>
          <Text style={styles.newItemText}>
            Submit New {activeTab === 'requests' ? 'Request' : 'Grievance'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Previous {activeTab === 'requests' ? 'Requests' : 'Grievances'}
        </Text>
        {currentItems.length > 0 ? (
          currentItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.itemCard}
              onPress={() => handleItemPress(item)}
            >
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemNature}>{item.nature}</Text>
                  <Text style={styles.itemDate}>{formatDate(item.created_at)}</Text>
                </View>
                <View style={[
                  styles.itemStatusBadge,
                  { backgroundColor: getStatusBadgeColor(item.status) }
                ]}>
                  <Text style={styles.itemStatusText}>
                    {item.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.itemDescriptionText} numberOfLines={2}>
                {item.description || item.issue}
              </Text>
              <View style={styles.itemFooter}>
                <Text style={styles.commentsCount}>
                  {item.comments?.length || 0} comment(s)
                </Text>
                <Text style={styles.tapToView}>Tap to view details</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No {activeTab} found
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Submit your first {activeTab.slice(0, -1)} using the button above
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HR Module</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabNavigation}>
        {[
          { key: 'requests' as const, label: 'Requests' },
          { key: 'grievances' as const, label: 'Grievances' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  container: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, backgroundColor: colors.primary,
  },
  backButton: { padding: spacing.sm, borderRadius: borderRadius.sm },
  backIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  backArrow: {
    width: 12, height: 12, borderLeftWidth: 2, borderTopWidth: 2,
    borderColor: colors.white, transform: [{ rotate: '-45deg' }],
  },
  headerTitle: {
    fontSize: fontSize.xl, fontWeight: '600', color: colors.white,
    flex: 1, textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  tabNavigation: {
    flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1,
    borderBottomColor: colors.border, paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1, paddingVertical: spacing.md, alignItems: 'center',
    borderRadius: borderRadius.sm, marginHorizontal: spacing.xs,
  },
  activeTab: {
    borderBottomWidth: 3, borderBottomColor: colors.primary,
    backgroundColor: colors.backgroundSecondary,
  },
  tabText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  activeTabText: { color: colors.primary, fontWeight: '600' },
  contentContainer: { flex: 1, backgroundColor: colors.backgroundSecondary },
  tabContent: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  
  // New Item Page Styles
  newItemPageContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  newItemPageContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  newItemPageScrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  newItemFormContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.md,
    elevation: 3,
  },
  pageDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  fieldHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  newItemPageFooter: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.md,
    elevation: 5,
  },
  pageSubmitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  pageSubmitText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  
  // Detail Page Styles
  detailPageContent: { 
    flex: 1, 
    backgroundColor: colors.backgroundSecondary 
  },
  detailPageScrollContent: { 
    paddingHorizontal: spacing.lg, 
    paddingTop: spacing.lg, 
    paddingBottom: spacing.xl 
  },

  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.md,
  },
  sectionHeaderWithButton: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.md,
  },
  newItemButton: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.xl,
    ...shadows.md, borderWidth: 1, borderColor: colors.border, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', elevation: 3,
  },
  newItemIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  newItemIconText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '600' },
  newItemText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  itemCard: {
    backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg,
    marginBottom: spacing.md, ...shadows.md, borderWidth: 1, borderColor: colors.border, elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: spacing.sm,
  },
  itemInfo: { flex: 1, marginRight: spacing.sm },
  itemNature: {
    fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.xs,
  },
  itemDate: { fontSize: fontSize.sm, color: colors.textSecondary },
  itemStatusBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full,
    minWidth: 80, alignItems: 'center',
  },
  itemStatusText: {
    color: colors.white, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize',
  },
  itemDescriptionText: {
    fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.sm,
  },
  itemFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
  },
  commentsCount: { fontSize: fontSize.xs, color: colors.info, fontWeight: '500' },
  tapToView: { fontSize: fontSize.xs, color: colors.textSecondary, fontStyle: 'italic' },
  emptyState: {
    backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.xl,
    alignItems: 'center', ...shadows.md, borderWidth: 1, borderColor: colors.border,
  },
  emptyStateText: {
    fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%',
  },
  modalContainer: {
    backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.lg,
    width: '92%', maxWidth: 600, maxHeight: screenHeight * 0.85, ...shadows.lg, elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.lg, position: 'relative',
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, textAlign: 'center' },
  modalCloseButton: {
    position: 'absolute', right: 0, top: -4, padding: spacing.sm, borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundSecondary, width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '600' },
  modalScrollContent: { paddingBottom: spacing.lg },
  formGroup: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, color: colors.text, marginBottom: spacing.sm, fontWeight: '600' },
  dropdownButton: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md + 2, backgroundColor: colors.white,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2,
  },
  dropdownButtonText: { fontSize: fontSize.md, color: colors.primary, flex: 1 },
  dropdownPlaceholder: { color: colors.textSecondary, fontStyle: 'italic' },
  dropdownArrow: { fontSize: fontSize.sm, color: colors.textSecondary, marginLeft: spacing.sm },
  dropdownOverlay: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  dropdownContainer: {
    backgroundColor: colors.white, borderRadius: borderRadius.xl,
    maxHeight: screenHeight * 0.6, ...shadows.md, elevation: 8,
  },
  searchContainer: {
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  searchInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md, color: colors.primary, backgroundColor: colors.background,
  },
  dropdownList: { maxHeight: screenHeight * 0.4 },
  dropdownItem: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.md + 2,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dropdownItemText: {
    fontSize: fontSize.md, fontWeight: '600', color: colors.primary, marginBottom: spacing.xs,
  },
  dropdownItemDescription: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
  emptyDropdown: { padding: spacing.xl, alignItems: 'center' },
  emptyDropdownText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },
  descriptionInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md,
    backgroundColor: colors.white, fontSize: fontSize.sm, color: colors.text, minHeight: 150,
    textAlignVertical: 'top', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2,
  },
  modalButtons: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl, gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1, paddingVertical: spacing.md + 2, paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary, alignItems: 'center', elevation: 1,
  },
  modalCancelText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '600' },
  modalSubmitButton: {
    flex: 1, paddingVertical: spacing.md + 2, paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg, backgroundColor: colors.primary, alignItems: 'center', elevation: 3,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  modalSubmitButtonDisabled: { backgroundColor: colors.textSecondary, elevation: 1, shadowOpacity: 0.1 },
  submitButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  modalSubmitText: { fontSize: fontSize.md, color: colors.white, fontWeight: '600' },
  itemDetailContainer: { flex: 1 },
  itemDetailHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: spacing.lg,
  },
  itemDetailInfo: { flex: 1, marginRight: spacing.sm },
  itemNatureText: {
    fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.xs,
  },
  itemDateText: { fontSize: fontSize.sm, color: colors.textSecondary },
  statusBadge: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, alignItems: 'center', minWidth: 90,
  },
  statusBadgeText: {
    color: colors.white, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize',
  },
  itemDescription: {
    marginBottom: spacing.lg, padding: spacing.md,
    backgroundColor: colors.white, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.border, ...shadows.sm, elevation: 1,
  },
  descriptionLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  commentsSection: { flex: 1 },
  commentsTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  commentItem: {
    backgroundColor: colors.white, padding: spacing.md,
    borderRadius: borderRadius.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, ...shadows.sm, elevation: 1,
  },
  hrCommentItem: {
    backgroundColor: colors.primary + '10', borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  commentHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.xs,
  },
  commentAuthor: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, flex: 1 },
  hrCommentAuthor: { color: colors.primary },
  commentDate: { fontSize: fontSize.xs, color: colors.textSecondary },
  commentText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  noCommentsText: {
    fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center',
    fontStyle: 'italic', paddingVertical: spacing.lg,
  },
  addCommentSection: {
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  addCommentLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  commentInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.md,
    backgroundColor: colors.white, fontSize: fontSize.sm, color: colors.text, minHeight: 80,
    marginBottom: spacing.md, textAlignVertical: 'top', elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  addCommentButton: {
    backgroundColor: colors.primary, paddingVertical: spacing.md + 2, paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg, alignItems: 'center', elevation: 3, shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  addCommentButtonDisabled: { backgroundColor: colors.textSecondary, elevation: 1, shadowOpacity: 0.1 },
  addCommentText: { color: colors.white, fontSize: fontSize.md, fontWeight: '600' },
});

export default HR;