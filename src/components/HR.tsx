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

const BackIcon = () => (
  <View style={styles.backIcon}>
    <View style={styles.backArrow} />
  </View>
);

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
              <Text style={styles.searchIcon}>🔍</Text>
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

  return (
    <SafeAreaView style={styles.container}>
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
              </View>
            </View>
          </ScrollView>

          <View style={styles.submitFooter}>
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
    </SafeAreaView>
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
      case 'resolved': return '#28A745';
      case 'rejected': return '#DC3545';
      case 'in_progress': return '#3B82F6';
      case 'pending': return '#FFC107';
      default: return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
                    Created {formatDate(item.created_at)}
                  </Text>
                </View>
                <View style={[
                  styles.detailStatusBadge,
                  { backgroundColor: getStatusColor(item.status) }
                ]}>
                  <Text style={styles.detailStatusText}>
                    {item.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <View style={styles.descriptionSection}>
                <Text style={styles.sectionLabel}>Description</Text>
                <Text style={styles.descriptionText}>
                  {item.description || item.issue}
                </Text>
              </View>
            </View>

            <View style={styles.commentsCard}>
              <Text style={styles.commentsHeader}>Discussion</Text>
              
              {item.comments && item.comments.length > 0 ? (
                item.comments.map((comment) => (
                  <View key={comment.id} style={[
                    styles.commentBubble,
                    comment.is_hr_comment && styles.hrCommentBubble
                  ]}>
                    <View style={styles.commentTop}>
                      <View style={styles.commentAuthorRow}>
                        <View style={[
                          styles.commentAvatar,
                          comment.is_hr_comment && styles.hrCommentAvatar
                        ]}>
                          <Text style={styles.commentAvatarText}>
                            {comment.created_by_name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={[
                            styles.commentAuthor,
                            comment.is_hr_comment && styles.hrCommentAuthor
                          ]}>
                            {comment.created_by_name}
                          </Text>
                          {comment.is_hr_comment && (
                            <Text style={styles.hrBadge}>HR Team</Text>
                          )}
                        </View>
                      </View>
                      <Text style={styles.commentTime}>
                        {formatDateTime(comment.created_at)}
                      </Text>
                    </View>
                    <Text style={styles.commentContent}>{comment.comment}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.noCommentsContainer}>
                  <Text style={styles.noCommentsIcon}>💬</Text>
                  <Text style={styles.noComments}>No comments yet</Text>
                  <Text style={styles.noCommentsSubtext}>Be the first to add a comment</Text>
                </View>
              )}

              <View style={styles.addCommentBox}>
                <Text style={styles.addCommentLabel}>Add Your Comment</Text>
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
                    <Text style={styles.commentButtonText}>Post Comment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ height: 24 }} />
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
      case 'resolved': return '#28A745';
      case 'rejected': return '#DC3545';
      case 'in_progress': return '#3B82F6';
      case 'pending': return '#FFC107';
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'resolved': return '✓';
      case 'rejected': return '✗';
      case 'in_progress': return '⏳';
      case 'pending': return '⏱';
      default: return '•';
    }
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HR Portal</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabBar}>
        {[
          { key: 'requests' as const, label: 'Requests', icon: '📝' },
          { key: 'grievances' as const, label: 'Grievances', icon: '⚖️' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[
              styles.tabButtonText,
              activeTab === tab.key && styles.tabButtonTextActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.listScrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.createButtonWrapper}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleNewItemPress}
              activeOpacity={0.8}
            >
              <Text style={styles.createButtonText}>
                + Create New {activeTab === 'requests' ? 'Request' : 'Grievance'}
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.emptyListContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.emptyListSubtitle}>Loading {activeTab}...</Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>
                  Your {activeTab === 'requests' ? 'Requests' : 'Grievances'}
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{currentItems.length}</Text>
                </View>
              </View>

              {currentItems.length > 0 ? (
                currentItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.itemCard}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemCardContent}>
                      <View style={styles.itemCardHeader}>
                        <Text style={styles.itemCardTitle} numberOfLines={1}>
                          {item.nature}
                        </Text>
                        <View style={[
                          styles.itemStatusBadge,
                          { backgroundColor: getStatusColor(item.status) }
                        ]}>
                          <Text style={styles.itemStatusText}>
                            {getStatusIcon(item.status)} {item.status.replace('_', ' ')}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.itemCardDescription} numberOfLines={2}>
                        {item.description || item.issue}
                      </Text>

                      <View style={styles.itemCardFooter}>
                        <View style={styles.itemMetaRow}>
                          <View style={styles.itemMetaItem}>
                            <Text style={styles.itemMetaIcon}>📅</Text>
                            <Text style={styles.itemMetaText}>{formatDate(item.created_at)}</Text>
                          </View>
                          <View style={styles.itemMetaItem}>
                            <Text style={styles.itemMetaIcon}>💬</Text>
                            <Text style={styles.itemMetaText}>
                              {item.comments?.length || 0}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.itemArrow}>→</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyListContainer}>
                  <Text style={styles.emptyListIcon}>
                    {activeTab === 'requests' ? '📋' : '🤝'}
                  </Text>
                  <Text style={styles.emptyListTitle}>
                    No {activeTab} yet
                  </Text>
                  <Text style={styles.emptyListSubtitle}>
                    {activeTab === 'requests' 
                      ? 'Your requests will appear here once submitted'
                      : 'Your grievances will appear here once submitted'}
                  </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    marginBottom: spacing.sm,
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
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.backgroundSecondary,
    ...shadows.sm,
  },
  tabIcon: {
    fontSize: fontSize.lg,
  },
  tabButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    paddingTop: spacing.lg,
  },
  listScrollView: {
    flex: 1,
  },
  createButtonWrapper: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  createButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
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
  itemCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    overflow: 'hidden',
    ...shadows.md,
  },
  itemCardContent: {
    padding: spacing.md,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  itemCardTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  itemStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  itemStatusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.white,
  },
  itemCardDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  itemCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemMetaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  itemMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemMetaIcon: {
    fontSize: fontSize.sm,
  },
  itemMetaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  itemArrow: {
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  formDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  selectButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.sm,
  },
  selectButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  selectPlaceholder: {
    color: colors.textSecondary,
  },
  selectArrow: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 150,
    textAlignVertical: 'top',
    ...shadows.sm,
  },
  submitFooter: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  detailScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  detailInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  detailNature: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  detailDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailStatusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    minWidth: 100,
    alignItems: 'center',
  },
  detailStatusText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'capitalize',
  },
  descriptionSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  commentsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  commentsHeader: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  commentBubble: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hrCommentBubble: {
    backgroundColor: colors.primaryLight + '20',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  commentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hrCommentAvatar: {
    backgroundColor: colors.primary,
  },
  commentAvatarText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  commentAuthor: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  hrCommentAuthor: {
    color: colors.primary,
  },
  hrBadge: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  commentTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  commentContent: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  noCommentsContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  noCommentsIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  noComments: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  noCommentsSubtext: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  addCommentBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addCommentLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  commentTextArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    fontSize: fontSize.sm,
    color: colors.text,
    minHeight: 90,
    marginBottom: spacing.sm,
    textAlignVertical: 'top',
    ...shadows.sm,
  },
  commentButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  commentButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  commentButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  dropdownContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    maxHeight: screenHeight * 0.6,
    ...shadows.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  dropdownList: {
    maxHeight: screenHeight * 0.4,
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  dropdownItemDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  emptyDropdown: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyDropdownText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default HR;