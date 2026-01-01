import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert, Modal, ActivityIndicator, TextInput, Platform,
  Dimensions, KeyboardAvoidingView, FlatList, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, fontSize, borderRadius, shadows } from '../styles/theme';
import { BACKEND_URL } from '../config/config';
import { Ionicons } from '@expo/vector-icons';

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
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder={`Search ${activeTab === 'requests' ? 'requests' : 'grievances'}...`}
                placeholderTextColor={colors.textSecondary}
                autoFocus={true}
              />
              <Text style={styles.searchIcon}>🔍</Text>
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
                  <View style={styles.dropdownItemContent}>
                    <Text style={styles.dropdownItemText}>{item.name}</Text>
                    {item.description && (
                      <Text style={styles.dropdownItemDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.dropdownItemArrow}>
                    <Text style={styles.arrowIcon}>→</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyDropdown}>
                  <Text style={styles.emptyDropdownIcon}>🔍</Text>
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />

      {/* Add Dashboard-style Header */}
      <LinearGradient
        colors={['#4A5568', '#2D3748']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBanner}
      >
        <Image
          source={require('../assets/background.jpg')}
          style={styles.headerImage}
          resizeMode="cover"
        />
        <View style={[styles.headerOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.3)' }]} />
        <View style={styles.headerContent}>
          <View style={[styles.topNav, { marginTop: Platform.OS === 'ios' ? 10 : 20 }]}>
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <View style={styles.backButtonContent}>
                <Ionicons name="arrow-back" size={24} color="white" />
                <Text style={styles.backButtonText}>Back</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              New {activeTab === 'requests' ? 'Request' : 'Grievance'}
            </Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.contentContainerBorder}>
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
            <View style={styles.formHeader}>
              <Text style={styles.formHeaderTitle}>
                Submit {activeTab === 'requests' ? 'Request' : 'Grievance'}
              </Text>
              <Text style={styles.formHeaderDescription}>
                Please provide the details for your {activeTab === 'requests' ? 'request' : 'grievance'}. 
                All fields marked with * are required.
              </Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabel}>
                    Nature of {activeTab === 'requests' ? 'Request' : 'Grievance'} *
                  </Text>
                  <Text style={styles.requiredIndicator}>Required</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    !newItemForm.natureName && styles.selectButtonPlaceholder
                  ]}
                  onPress={onOpenDropdown}
                  activeOpacity={0.7}
                >
                  <View style={styles.selectButtonContent}>
                    <Text style={[
                      styles.selectButtonText,
                      !newItemForm.natureName && styles.selectPlaceholder
                    ]}>
                      {newItemForm.natureName || `Select ${activeTab === 'requests' ? 'request' : 'grievance'} type`}
                    </Text>
                    <Text style={styles.selectArrow}>▼</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabel}>Description *</Text>
                  <Text style={styles.requiredIndicator}>Required</Text>
                </View>
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
                <Text style={styles.characterCount}>
                  {newItemForm.description.length}/500 characters
                </Text>
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
              activeOpacity={0.8}
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

  const getStatusConfig = (status: string): { color: string, icon: string, label: string } => {
    switch (status) {
      case 'resolved': return { color: '#28A745', icon: '✓', label: 'Resolved' };
      case 'rejected': return { color: '#DC3545', icon: '✗', label: 'Rejected' };
      case 'in_progress': return { color: '#3B82F6', icon: '⏳', label: 'In Progress' };
      case 'pending': return { color: '#FFC107', icon: '⏱', label: 'Pending' };
      default: return { color: colors.textSecondary, icon: '•', label: status };
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />

      {/* Add Dashboard-style Header */}
      <LinearGradient
        colors={['#4A5568', '#2D3748']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBanner}
      >
        <Image
          source={require('../assets/background.jpg')}
          style={styles.headerImage}
          resizeMode="cover"
        />
        <View style={[styles.headerOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.3)' }]} />
        <View style={styles.headerContent}>
          <View style={[styles.topNav, { marginTop: Platform.OS === 'ios' ? 10 : 20 }]}>
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <View style={styles.backButtonContent}>
                <Ionicons name="arrow-back" size={24} color="white" />
                <Text style={styles.backButtonText}>Back</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {activeTab === 'requests' ? 'Request' : 'Grievance'} Details
            </Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.contentContainerBorder}>
        {loadingDetails ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading details...</Text>
          </View>
        ) : item ? (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.detailHeaderCard}>
              <View style={styles.detailHeaderContent}>
                <Text style={styles.detailNature}>{item.nature}</Text>
                <View style={styles.detailMetaRow}>
                  <View style={styles.detailMetaItem}>
                    <Text style={styles.detailMetaIcon}>📅</Text>
                    <Text style={styles.detailMetaText}>Created {formatDate(item.created_at)}</Text>
                  </View>
                  <View style={styles.detailMetaItem}>
                    <Text style={styles.detailMetaIcon}>🔄</Text>
                    <Text style={styles.detailMetaText}>Updated {formatDate(item.updated_at)}</Text>
                  </View>
                </View>
              </View>
              <View style={[
                styles.detailStatusBadge,
                { backgroundColor: getStatusConfig(item.status).color }
              ]}>
                <Text style={styles.detailStatusIcon}>{getStatusConfig(item.status).icon}</Text>
                <Text style={styles.detailStatusText}>
                  {getStatusConfig(item.status).label}
                </Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Description</Text>
                <View style={styles.sectionDivider} />
              </View>
              <Text style={styles.descriptionText}>
                {item.description || item.issue}
              </Text>
            </View>

            <View style={styles.commentsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Discussion</Text>
                <View style={styles.commentCountBadge}>
                  <Text style={styles.commentCountText}>{item.comments?.length || 0}</Text>
                </View>
              </View>

              {item.comments && item.comments.length > 0 ? (
                <View style={styles.commentsList}>
                  {item.comments.map((comment) => (
                    <View key={comment.id} style={[
                      styles.commentCard,
                      comment.is_hr_comment && styles.hrCommentCard
                    ]}>
                      <View style={styles.commentHeader}>
                        <View style={styles.commentAuthorInfo}>
                          <View style={[
                            styles.commentAvatar,
                            comment.is_hr_comment && styles.hrCommentAvatar
                          ]}>
                            <Text style={styles.commentAvatarText}>
                              {comment.created_by_name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View>
                            <View style={styles.commentAuthorRow}>
                              <Text style={[
                                styles.commentAuthor,
                                comment.is_hr_comment && styles.hrCommentAuthor
                              ]}>
                                {comment.created_by_name}
                              </Text>
                              {comment.is_hr_comment && (
                                <View style={styles.hrBadge}>
                                  <Text style={styles.hrBadgeText}>HR Team</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.commentTime}>
                              {formatDateTime(comment.created_at)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Text style={styles.commentContent}>{comment.comment}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noCommentsContainer}>
                  <Text style={styles.noCommentsIcon}>💬</Text>
                  <Text style={styles.noCommentsTitle}>No comments yet</Text>
                  <Text style={styles.noCommentsSubtext}>Be the first to add a comment</Text>
                </View>
              )}

              <View style={styles.addCommentCard}>
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
                <View style={styles.commentActionRow}>
                  <Text style={styles.commentCharacterCount}>
                    {newComment.length}/300 characters
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.commentButton,
                      (!newComment.trim()) && styles.commentButtonDisabled
                    ]}
                    onPress={onAddComment}
                    disabled={loading || !newComment.trim()}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text style={styles.commentButtonText}>Post Comment</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={{ height: 24 }} />
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

  const getStatusConfig = (status: string): { color: string, icon: string, label: string } => {
    switch (status) {
      case 'resolved': return { color: '#28A745', icon: '✓', label: 'Resolved' };
      case 'rejected': return { color: '#DC3545', icon: '✗', label: 'Rejected' };
      case 'in_progress': return { color: '#3B82F6', icon: '⏳', label: 'In Progress' };
      case 'pending': return { color: '#FFC107', icon: '⏱', label: 'Pending' };
      default: return { color: colors.textSecondary, icon: '•', label: status };
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      
      {/* Dashboard-style Header */}
      <LinearGradient
        colors={['#4A5568', '#2D3748']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBanner}
      >
        <Image
          source={require('../assets/background.jpg')}
          style={styles.headerImage}
          resizeMode="cover"
        />
        <View style={[styles.headerOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.3)' }]} />
        <View style={styles.headerContent}>
          <View style={[styles.topNav, { marginTop: Platform.OS === 'ios' ? 10 : 20 }]}>
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <View style={styles.backButtonContent}>
                <Ionicons name="arrow-back" size={24} color="white" />
                <Text style={styles.backButtonText}>Back</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>HR Portal</Text>
            <View style={styles.headerSpacer} />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.tabBar}>
        {[
          { key: 'requests' as const, label: 'Requests', icon: '📝', count: requests.length },
          { key: 'grievances' as const, label: 'Grievances', icon: '⚖️', count: grievances.length }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <View style={styles.tabButtonContent}>
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[
                styles.tabButtonText,
                activeTab === tab.key && styles.tabButtonTextActive
              ]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{tab.count}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.listScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContentContainer}
        >
          <View style={styles.createButtonCard}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleNewItemPress}
              activeOpacity={0.8}
            >
              <View style={styles.createButtonIcon}>
                <Text style={styles.createButtonPlus}>+</Text>
              </View>
              <View style={styles.createButtonContent}>
                <Text style={styles.createButtonTitle}>
                  Create New {activeTab === 'requests' ? 'Request' : 'Grievance'}
                </Text>
                <Text style={styles.createButtonDescription}>
                  Submit a new {activeTab === 'requests' ? 'request' : 'grievance'} to HR team
                </Text>
              </View>
              <Text style={styles.createButtonArrow}>→</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.emptyListContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.emptyListSubtitle}>Loading {activeTab}...</Text>
            </View>
          ) : (
            <View style={styles.listSection}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>
                  Your {activeTab === 'requests' ? 'Requests' : 'Grievances'}
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{currentItems.length}</Text>
                </View>
              </View>

              {currentItems.length > 0 ? (
                <View style={styles.itemsList}>
                  {currentItems.map((item) => {
                    const statusConfig = getStatusConfig(item.status);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.itemCard}
                        onPress={() => handleItemPress(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.itemCardContent}>
                          <View style={styles.itemCardHeader}>
                            <View style={styles.itemCardTitleRow}>
                              <Text style={styles.itemCardTitle} numberOfLines={1}>
                                {item.nature}
                              </Text>
                              <View style={[
                                styles.itemStatusBadge,
                                { backgroundColor: statusConfig.color }
                              ]}>
                                <Text style={styles.itemStatusIcon}>{statusConfig.icon}</Text>
                                <Text style={styles.itemStatusText}>{statusConfig.label}</Text>
                              </View>
                            </View>
                            <Text style={styles.itemCardDescription} numberOfLines={2}>
                              {item.description || item.issue}
                            </Text>
                          </View>

                          <View style={styles.itemCardFooter}>
                            <View style={styles.itemMetaRow}>
                              <View style={styles.itemMetaItem}>
                                <Text style={styles.itemMetaIcon}>📅</Text>
                                <Text style={styles.itemMetaText}>{formatDate(item.created_at)}</Text>
                              </View>
                              <View style={styles.itemMetaItem}>
                                <Text style={styles.itemMetaIcon}>💬</Text>
                                <Text style={styles.itemMetaText}>
                                  {item.comments?.length || 0} comments
                                </Text>
                              </View>
                            </View>
                            <View style={styles.itemActionArrow}>
                              <Text style={styles.itemArrow}>→</Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
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
                  <TouchableOpacity
                    style={styles.emptyListButton}
                    onPress={handleNewItemPress}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emptyListButtonText}>
                      Create Your First {activeTab === 'requests' ? 'Request' : 'Grievance'}
                    </Text>
                  </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,

  },
  // Dashboard-style header
  headerBanner: {
    height: 200,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  headerImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 1,
  },
  headerOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  headerContent: {
    padding: 20,
    position: 'relative',
    zIndex: 1,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backgroundSketch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.12,
  },
  sketchCircle1: {
    position: 'absolute',
    top: '15%',
    left: '75%',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    opacity: 0.4,
  },
  sketchCircle2: {
    position: 'absolute',
    top: '65%',
    left: '10%',
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    opacity: 0.3,
  },
  sketchCircle3: {
    position: 'absolute',
    top: '25%',
    left: '15%',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    opacity: 0.25,
  },
  sketchLine1: {
    position: 'absolute',
    top: '35%',
    left: '20%',
    right: '20%',
    height: 1.5,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '25deg' }],
    opacity: 0.3,
  },
  sketchLine2: {
    position: 'absolute',
    top: '55%',
    left: '5%',
    right: '5%',
    height: 1,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-15deg' }],
    opacity: 0.2,
  },
  sketchLine3: {
    position: 'absolute',
    top: '75%',
    left: '25%',
    right: '25%',
    height: 1,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '10deg' }],
    opacity: 0.25,
  },
  sketchDotGrid: {
    position: 'absolute',
    top: '45%',
    left: '60%',
    width: 40,
    height: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
    opacity: 0.2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
   
  },
  backButton: {
    padding: spacing.xs,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    ...shadows.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  tabButtonActive: {
    backgroundColor: colors.backgroundSecondary,
  },
  tabButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  tabIcon: {
    fontSize: fontSize.md,
  },
  tabButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#007AFF',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.white,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainerBorder: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  listScrollView: {
    flex: 1,
  },
  listContentContainer: {
    paddingVertical: spacing.lg,
  },
  createButtonCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  createButton: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.md,
  },
  createButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  createButtonPlus: {
    fontSize: fontSize.xl,
    color: colors.white,
    fontWeight: '700',
  },
  createButtonContent: {
    flex: 1,
  },
  createButtonTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  createButtonDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  createButtonArrow: {
    fontSize: fontSize.lg,
    color: '#007AFF',
    fontWeight: '700',
  },
  listSection: {
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
    backgroundColor: '#007AFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  countText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.white,
  },
  itemsList: {
    gap: spacing.md,
  },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  itemCardContent: {
    padding: spacing.lg,
  },
  itemCardHeader: {
    marginBottom: spacing.md,
  },
  itemCardTitleRow: {
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  itemStatusIcon: {
    fontSize: fontSize.xs,
    color: colors.white,
  },
  itemStatusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'capitalize',
  },
  itemCardDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
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
    gap: spacing.lg,
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
  itemActionArrow: {
    paddingLeft: spacing.sm,
  },
  itemArrow: {
    fontSize: fontSize.lg,
    color: '#007AFF',
    fontWeight: '700',
  },
  emptyListContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
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
    textAlign: 'center',
  },
  emptyListSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyListButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  emptyListButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
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
  },
  formHeader: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  formHeaderTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  formHeaderDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    ...shadows.md,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  requiredIndicator: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  selectButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  selectButtonPlaceholder: {
    borderColor: colors.textLight,
  },
  selectButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
  characterCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  submitFooter: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: spacing.lg,
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
    paddingVertical: spacing.lg,
  },
  detailHeaderCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    ...shadows.md,
  },
  detailHeaderContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  detailNature: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detailMetaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  detailMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailMetaIcon: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailMetaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    minWidth: 100,
  },
  detailStatusIcon: {
    fontSize: fontSize.sm,
    color: colors.white,
    fontWeight: '700',
  },
  detailStatusText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'capitalize',
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  sectionDivider: {
    height: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
  descriptionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  commentsSection: {
    marginHorizontal: spacing.lg,
  },
  commentCountBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
    minWidth: 30,
    alignItems: 'center',
  },
  commentCountText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.white,
  },
  commentsList: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  commentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  hrCommentCard: {
    backgroundColor: '#007AFF10',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  commentHeader: {
    marginBottom: spacing.md,
  },
  commentAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hrCommentAvatar: {
    backgroundColor: '#007AFF',
  },
  commentAvatarText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.white,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  commentAuthor: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  hrCommentAuthor: {
    color: '#007AFF',
  },
  hrBadge: {
    backgroundColor: '#007AFF20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  hrBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: '#007AFF',
    textTransform: 'uppercase',
  },
  commentTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  commentContent: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  noCommentsContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  noCommentsIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  noCommentsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  noCommentsSubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  addCommentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  addCommentLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  commentTextArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  commentActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentCharacterCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  commentButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minWidth: 120,
    alignItems: 'center',
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
    borderRadius: borderRadius.lg,
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
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  searchIcon: {
    fontSize: fontSize.lg,
    marginLeft: spacing.sm,
    color: colors.textSecondary,
  },
  dropdownList: {
    maxHeight: screenHeight * 0.4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  dropdownItemText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  dropdownItemDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  dropdownItemArrow: {
    paddingLeft: spacing.sm,
  },
  arrowIcon: {
    fontSize: fontSize.md,
    color: '#007AFF',
  },
  emptyDropdown: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyDropdownIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
    color: colors.textSecondary,
  },
  emptyDropdownText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default HR;