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

const OTHER_OPTION: RequestNature = {
  id: 'other',
  name: 'Other',
  description: 'Any other option not listed above'
};

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
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

      <View style={styles.mainContent}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formCard}>
              <Text style={styles.formDescription}>
                Please provide the details for your {activeTab === 'requests' ? 'request' : 'grievance'}. 
                All fields marked with * are required.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Nature of {activeTab === 'requests' ? 'Request' : 'Grievance'} *
                </Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={onOpenDropdown}
                >
                  <Text style={[
                    styles.selectButtonText,
                    !newItemForm.natureName && styles.selectPlaceholder
                  ]}>
                    {newItemForm.natureName || `Select ${activeTab === 'requests' ? 'request' : 'grievance'} type`}
                  </Text>
                  <Text style={styles.selectArrow}>▼</Text>
                </TouchableOpacity>
                <Text style={styles.inputHint}>
                  Choose the category that best describes your {activeTab.slice(0, -1)}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={styles.textArea}
                  value={newItemForm.description}
                  onChangeText={(text) => onFormChange({ ...newItemForm, description: text })}
                  placeholder={`Please provide detailed description of your ${activeTab.slice(0, -1)}`}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <Text style={styles.inputHint}>
                  Provide as much detail as possible to help us understand and address your {activeTab.slice(0, -1)}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.submitFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!newItemForm.nature || !newItemForm.description.trim()) && styles.submitButtonDisabled
              ]}
              onPress={onSubmit}
              disabled={loading || !newItemForm.nature || !newItemForm.description.trim()}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Submit {activeTab === 'requests' ? 'Request' : 'Grievance'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'resolved': return '#A7F3D0';
      case 'rejected': return '#FBCFE8';
      case 'in_progress': return '#DDD6FE';
      case 'pending': return '#FED7AA';
      default: return colors.textSecondary;
    }
  };

  const getStatusTextColor = (status: string): string => {
    switch (status) {
      case 'resolved': return '#047857';
      case 'rejected': return '#BE185D';
      case 'in_progress': return '#5B21B6';
      case 'pending': return '#C2410C';
      default: return colors.white;
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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

      <View style={styles.mainContent}>
        {loadingDetails ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading details...</Text>
          </View>
        ) : item ? (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <View style={styles.detailInfo}>
                  <Text style={styles.detailNature}>{item.nature}</Text>
                  <Text style={styles.detailDate}>
                    Created: {formatDate(item.created_at)}
                  </Text>
                </View>
                <View style={[
                  styles.detailStatusBadge,
                  { backgroundColor: getStatusColor(item.status) }
                ]}>
                  <Text style={[
                    styles.detailStatusText,
                    { color: getStatusTextColor(item.status) }
                  ]}>
                    {item.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <View style={styles.descriptionSection}>
                <Text style={styles.sectionLabel}>Description:</Text>
                <Text style={styles.descriptionText}>
                  {item.description || item.issue}
                </Text>
              </View>
            </View>

            <View style={styles.commentsCard}>
              <Text style={styles.commentsHeader}>Comments</Text>
              
              {item.comments && item.comments.length > 0 ? (
                item.comments.map((comment) => (
                  <View key={comment.id} style={[
                    styles.commentBubble,
                    comment.is_hr_comment && styles.hrCommentBubble
                  ]}>
                    <View style={styles.commentTop}>
                      <Text style={[
                        styles.commentAuthor,
                        comment.is_hr_comment && styles.hrCommentAuthor
                      ]}>
                        {comment.created_by_name} {comment.is_hr_comment && '(HR)'}
                      </Text>
                      <Text style={styles.commentTime}>
                        {formatDateTime(comment.created_at)}
                      </Text>
                    </View>
                    <Text style={styles.commentContent}>{comment.comment}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noComments}>No comments yet</Text>
              )}

              <View style={styles.addCommentBox}>
                <Text style={styles.addCommentLabel}>Add Comment:</Text>
                <TextInput
                  style={styles.commentTextArea}
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
                    styles.commentButton,
                    (!newComment.trim()) && styles.commentButtonDisabled
                  ]}
                  onPress={onAddComment}
                  disabled={loading || !newComment.trim()}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.commentButtonText}>Add Comment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        ) : null}
      </View>
    </View>
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
          
          const transformedRequests: RequestNature[] = commonRequests.map((request: any) => ({
            id: request.id.toString(),
            name: request.common_request,
            description: request.common_request
          }));
          
          setRequestNatures([...transformedRequests, OTHER_OPTION]);
        } else {
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
          
          const transformedGrievances: RequestNature[] = commonGrievances.map((grievance: any) => ({
            id: grievance.id.toString(),
            name: grievance.common_grievance,
            description: grievance.common_grievance
          }));
          
          setGrievanceNatures([...transformedGrievances, OTHER_OPTION]);
        } else {
          setGrievanceNatures([OTHER_OPTION]);
        }
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab} nature data:`, error);
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
      if (activeTab === 'grievances') {
        const response = await fetch(`${BACKEND_URL}/core/getGrievances`, {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          const data = await response.json();
          const grievancesData = data.grievances || [];
          
          const transformedGrievances = grievancesData.map((grievance: any) => ({
            id: grievance.id.toString(),
            nature: grievance.nature,
            description: grievance.issue,
            issue: grievance.issue,
            status: grievance.status,
            created_at: grievance.created_at,
            updated_at: grievance.updated_at,
            comments: []
          }));
          
          setGrievances(transformedGrievances);
        } else {
          setGrievances([]);
        }
      } else {
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
        
        const transformedComments = itemData.comments?.map((commentWrapper: any) => {
          const comment = commentWrapper.comment;
          return {
            id: comment.id.toString(),
            comment: comment.content,
            created_by: comment.user.employee_id,
            created_by_name: comment.user.full_name,
            created_at: comment.created_at,
            is_hr_comment: comment.user.role === 'hr'
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

  const handleItemPress = async (item: Item) => {
    setSelectedItem(item);
    setViewMode('itemDetail');
    
    const detailedItem = await fetchItemDetails(item.id);
    if (detailedItem) {
      setSelectedItem(detailedItem);
    }
  };

  const handleBackFromDetail = () => {
    setViewMode('main');
    setSelectedItem(null);
    setNewComment('');
    if (token) {
      fetchItems();
    }
  };

  const handleNewItemPress = () => {
    setViewMode('newItem');
    if (currentNatures.length === 0) {
      fetchNatureData();
    }
  };

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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'resolved': return '#A7F3D0';
      case 'rejected': return '#FBCFE8';
      case 'in_progress': return '#DDD6FE';
      case 'pending': return '#FED7AA';
      default: return colors.textSecondary;
    }
  };

  const getStatusTextColor = (status: string): string => {
    switch (status) {
      case 'resolved': return '#047857';
      case 'rejected': return '#BE185D';
      case 'in_progress': return '#5B21B6';
      case 'pending': return '#C2410C';
      default: return colors.white;
    }
  };

  const BackIcon = () => (
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
    </View>
  );

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
    <ScrollView 
      style={styles.scrollView} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.mainScrollContent}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Raise New {activeTab === 'requests' ? 'Request' : 'Grievance'}
        </Text>
        <TouchableOpacity
          style={styles.newButton}
          onPress={handleNewItemPress}
          activeOpacity={0.7}
        >
          <View style={styles.newButtonIcon}>
            <Text style={styles.newButtonIconText}>+</Text>
          </View>
          <Text style={styles.newButtonText}>
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
              activeOpacity={0.7}
            >
              <View style={styles.itemCardHeader}>
                <View style={styles.itemCardInfo}>
                  <Text style={styles.itemCardNature}>{item.nature}</Text>
                  <Text style={styles.itemCardDate}>{formatDate(item.created_at)}</Text>
                </View>
                <View style={[
                  styles.itemCardBadge,
                  { backgroundColor: getStatusColor(item.status) }
                ]}>
                  <Text style={[
                    styles.itemCardBadgeText,
                    { color: getStatusTextColor(item.status) }
                  ]}>
                    {item.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.itemCardDescription} numberOfLines={2}>
                {item.description || item.issue}
              </Text>
              <View style={styles.itemCardFooter}>
                <Text style={styles.itemCardComments}>
                  {item.comments?.length || 0} comment(s)
                </Text>
                <Text style={styles.itemCardTap}>Tap to view →</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>
              No {activeTab} found
            </Text>
            <Text style={styles.emptyCardSubtext}>
              Submit your first {activeTab.slice(0, -1)} using the button above
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HR Module</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabBar}>
        {[
          { key: 'requests' as const, label: 'Requests' },
          { key: 'grievances' as const, label: 'Grievances' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab === tab.key && styles.tabButtonTextActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.mainContent}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.primary 
  },
  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingVertical: 16, 
    backgroundColor: colors.primary,
  },
  backButton: { 
    padding: 8, 
    borderRadius: 4 
  },
  backIcon: { 
    width: 24, 
    height: 24, 
    alignItems: 'center', 
    justifyContent: 'center' 
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
    fontSize: 20, 
    fontWeight: '600', 
    color: colors.white,
    flex: 1, 
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerSpacer: { 
    width: 40 
  },
  tabBar: {
    flexDirection: 'row', 
    backgroundColor: colors.white, 
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1, 
    paddingVertical: 12, 
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.backgroundSecondary,
  },
  tabButtonText: { 
    fontSize: 14, 
    color: colors.textSecondary, 
    fontWeight: '500' 
  },
  tabButtonTextActive: { 
    color: colors.primary, 
    fontWeight: '600' 
  },
  mainContent: { 
    flex: 1, 
    backgroundColor: colors.backgroundSecondary,
    marginTop: -10,
  },
  scrollView: { 
    flex: 1 
  },
  mainScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  section: { 
    marginBottom: 32 
  },
  sectionTitle: {
    fontSize: 20, 
    fontWeight: '700', 
    color: colors.text, 
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  newButton: {
    backgroundColor: colors.white, 
    borderRadius: 20, 
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
  },
  newButtonIcon: {
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: colors.primary,
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12,
  },
  newButtonIconText: { 
    color: colors.white, 
    fontSize: 24, 
    fontWeight: '600' 
  },
  newButtonText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: colors.text 
  },
  itemCard: {
    backgroundColor: colors.white, 
    padding: 16, 
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemCardHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'flex-start', 
    marginBottom: 8,
  },
  itemCardInfo: { 
    flex: 1, 
    marginRight: 8 
  },
  itemCardNature: {
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.text, 
    marginBottom: 4,
  },
  itemCardDate: { 
    fontSize: 12, 
    color: colors.textSecondary 
  },
  itemCardBadge: {
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12,
    minWidth: 90, 
    alignItems: 'center',
  },
  itemCardBadgeText: {
    fontSize: 11, 
    fontWeight: '700', 
    textTransform: 'capitalize',
  },
  itemCardDescription: {
    fontSize: 14, 
    color: colors.textSecondary, 
    lineHeight: 20, 
    marginBottom: 8,
  },
  itemCardFooter: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: 8, 
    borderTopWidth: 1, 
    borderTopColor: colors.border,
  },
  itemCardComments: { 
    fontSize: 12, 
    color: colors.info, 
    fontWeight: '500' 
  },
  itemCardTap: { 
    fontSize: 12, 
    color: colors.textSecondary, 
    fontWeight: '500' 
  },
  emptyCard: {
    backgroundColor: colors.white, 
    borderRadius: 20, 
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyCardText: {
    fontSize: 16, 
    color: colors.textSecondary, 
    textAlign: 'center', 
    marginBottom: 8,
    fontWeight: '600',
  },
  emptyCardSubtext: {
    fontSize: 14, 
    color: colors.textSecondary, 
    textAlign: 'center', 
    fontStyle: 'italic',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  formDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: { 
    marginBottom: 20 
  },
  inputLabel: { 
    fontSize: 14, 
    color: colors.text, 
    marginBottom: 8, 
    fontWeight: '600' 
  },
  selectButton: {
    borderWidth: 1, 
    borderColor: colors.border, 
    borderRadius: 12,
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    backgroundColor: colors.white,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectButtonText: { 
    fontSize: 15, 
    color: colors.text, 
    flex: 1 
  },
  selectPlaceholder: { 
    color: colors.textSecondary, 
    fontStyle: 'italic' 
  },
  selectArrow: { 
    fontSize: 12, 
    color: colors.textSecondary, 
    marginLeft: 8 
  },
  inputHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  textArea: {
    borderWidth: 1, 
    borderColor: colors.border, 
    borderRadius: 12, 
    padding: 16,
    backgroundColor: colors.white, 
    fontSize: 15, 
    color: colors.text, 
    minHeight: 150,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  submitFooter: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: { 
    backgroundColor: colors.textSecondary, 
    shadowOpacity: 0.1 
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  detailScrollContent: { 
    paddingHorizontal: 20, 
    paddingTop: 24, 
    paddingBottom: 24 
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  detailHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'flex-start', 
    marginBottom: 16,
  },
  detailInfo: { 
    flex: 1, 
    marginRight: 8 
  },
  detailNature: {
    fontSize: 18, 
    fontWeight: '700', 
    color: colors.text, 
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  detailDate: { 
    fontSize: 13, 
    color: colors.textSecondary 
  },
  detailStatusBadge: {
    paddingHorizontal: 14, 
    paddingVertical: 8,
    borderRadius: 12, 
    alignItems: 'center', 
    minWidth: 100,
  },
  detailStatusText: {
    fontSize: 12, 
    fontWeight: '700', 
    textTransform: 'capitalize',
  },
  descriptionSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: colors.text, 
    marginBottom: 8 
  },
  descriptionText: {
    fontSize: 15, 
    color: colors.textSecondary, 
    lineHeight: 22,
  },
  commentsCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  commentsHeader: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: colors.text, 
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  commentBubble: {
    backgroundColor: colors.backgroundSecondary,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hrCommentBubble: {
    backgroundColor: colors.primary + '10', 
    borderLeftWidth: 3, 
    borderLeftColor: colors.primary,
  },
  commentTop: {
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center', 
    marginBottom: 6,
  },
  commentAuthor: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: colors.text, 
    flex: 1 
  },
  hrCommentAuthor: { 
    color: colors.primary 
  },
  commentTime: { 
    fontSize: 11, 
    color: colors.textSecondary 
  },
  commentContent: { 
    fontSize: 14, 
    color: colors.text, 
    lineHeight: 20 
  },
  noComments: {
    fontSize: 14, 
    color: colors.textSecondary, 
    textAlign: 'center',
    fontStyle: 'italic', 
    paddingVertical: 20,
  },
  addCommentBox: {
    marginTop: 16, 
    paddingTop: 16,
    borderTopWidth: 1, 
    borderTopColor: colors.border,
  },
  addCommentLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: colors.text, 
    marginBottom: 8 
  },
  commentTextArea: {
    borderWidth: 1, 
    borderColor: colors.border, 
    borderRadius: 12, 
    padding: 14,
    backgroundColor: colors.white, 
    fontSize: 14, 
    color: colors.text, 
    minHeight: 90,
    marginBottom: 12, 
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  commentButton: {
    backgroundColor: colors.primary, 
    paddingVertical: 14, 
    paddingHorizontal: 20,
    borderRadius: 14, 
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 4,
    elevation: 3,
  },
  commentButtonDisabled: { 
    backgroundColor: colors.textSecondary, 
    shadowOpacity: 0.1 
  },
  commentButtonText: { 
    color: colors.white, 
    fontSize: 15, 
    fontWeight: '600' 
  },
  dropdownOverlay: {
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dropdownContainer: {
    backgroundColor: colors.white, 
    borderRadius: 20,
    maxHeight: screenHeight * 0.6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  searchContainer: {
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border,
  },
  searchInput: {
    borderWidth: 1, 
    borderColor: colors.border, 
    borderRadius: 12,
    paddingHorizontal: 16, 
    paddingVertical: 12,
    fontSize: 15, 
    color: colors.text, 
    backgroundColor: colors.backgroundSecondary,
  },
  dropdownList: { 
    maxHeight: screenHeight * 0.4 
  },
  dropdownItem: {
    paddingHorizontal: 16, 
    paddingVertical: 14,
    borderBottomWidth: 1, 
    borderBottomColor: colors.border,
  },
  dropdownItemText: {
    fontSize: 15, 
    fontWeight: '600', 
    color: colors.text, 
    marginBottom: 4,
  },
  dropdownItemDescription: { 
    fontSize: 13, 
    color: colors.textSecondary, 
    lineHeight: 18 
  },
  emptyDropdown: { 
    padding: 32, 
    alignItems: 'center' 
  },
  emptyDropdownText: { 
    fontSize: 15, 
    color: colors.textSecondary, 
    textAlign: 'center' 
  },
});

export default HR;