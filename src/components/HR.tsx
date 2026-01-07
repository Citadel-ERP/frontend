import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert, Modal, ActivityIndicator, TextInput, Platform,
  Dimensions, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
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

// WhatsApp colors
const WHATSAPP_COLORS = {
  primary: '#128C7E',
  primaryDark: '#075E54',
  primaryLight: '#25D366',
  background: '#E5DDD5',
  chatBackground: '#ECE5DD',
  white: '#FFFFFF',
  lightGray: '#F0F0F0',
  gray: '#757575',
  darkGray: '#4A4A4A',
  blue: '#34B7F1',
  orange: '#FF9800',
  red: '#F44336',
  green: '#25D366',
  yellow: '#FFC107'
};

const getStatusBarHeight = () => {
  return Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
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
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Ionicons name="arrow-back" size={24} color={WHATSAPP_COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            Select {activeTab === 'requests' ? 'Request' : 'Grievance'} Type
          </Text>
          <View style={styles.modalSpacer} />
        </View>
        
        <View style={styles.searchContainerModal}>
          <Ionicons name="search" size={20} color={WHATSAPP_COLORS.gray} style={styles.searchIconModal} />
          <TextInput
            style={styles.searchInputModal}
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder={`Search ${activeTab === 'requests' ? 'requests' : 'grievances'}...`}
            placeholderTextColor={WHATSAPP_COLORS.gray}
            autoFocus={true}
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
              activeOpacity={0.7}
            >
              <View style={styles.dropdownItemIcon}>
                <Ionicons 
                  name={activeTab === 'requests' ? 'document-text' : 'alert-circle'} 
                  size={24} 
                  color={WHATSAPP_COLORS.primary} 
                />
              </View>
              <View style={styles.dropdownItemContent}>
                <Text style={styles.dropdownItemText}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.dropdownItemDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.gray} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyDropdown}>
              <Ionicons name="search-outline" size={60} color={WHATSAPP_COLORS.gray} />
              <Text style={styles.emptyDropdownText}>
                No {activeTab} found matching "{searchQuery}"
              </Text>
            </View>
          )}
        />
      </View>
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
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={WHATSAPP_COLORS.primaryDark}
      />

      {/* WhatsApp-style Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={WHATSAPP_COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              New {activeTab === 'requests' ? 'Request' : 'Grievance'}
            </Text>
            <Text style={styles.headerSubtitle}>
              Submit to HR Department
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      <View style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.formCard}>
            {/* Nature Selection */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>
                Type of {activeTab === 'requests' ? 'Request' : 'Grievance'}
              </Text>
              <TouchableOpacity
                style={styles.selectField}
                onPress={onOpenDropdown}
                activeOpacity={0.7}
              >
                <View style={styles.selectFieldLeft}>
                  <Ionicons 
                    name={activeTab === 'requests' ? 'document-text' : 'alert-circle'} 
                    size={20} 
                    color={WHATSAPP_COLORS.primary} 
                    style={styles.fieldIcon}
                  />
                  <Text style={[
                    styles.selectFieldText,
                    !newItemForm.natureName && styles.placeholderText
                  ]}>
                    {newItemForm.natureName || 'Select type...'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={WHATSAPP_COLORS.gray} />
              </TouchableOpacity>
            </View>

            {/* Description */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Description</Text>
              <View style={styles.textAreaContainer}>
                <TextInput
                  style={styles.textArea}
                  value={newItemForm.description}
                  onChangeText={(text) => onFormChange({ ...newItemForm, description: text })}
                  placeholder={`Describe your ${activeTab.slice(0, -1)} in detail...`}
                  placeholderTextColor={WHATSAPP_COLORS.gray}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                />
                <View style={styles.characterCounter}>
                  <Text style={styles.characterCount}>
                    {newItemForm.description.length}/500
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Submit Button */}
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
              <ActivityIndicator color={WHATSAPP_COLORS.white} size="small" />
            ) : (
              <View style={styles.submitButtonContent}>
                <Ionicons name="paper-plane-outline" size={20} color={WHATSAPP_COLORS.white} />
                <Text style={styles.submitButtonText}>
                  Submit {activeTab === 'requests' ? 'Request' : 'Grievance'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
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
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusConfig = (status: string): { color: string, label: string } => {
    switch (status) {
      case 'resolved': return { color: WHATSAPP_COLORS.green, label: 'Resolved' };
      case 'rejected': return { color: WHATSAPP_COLORS.red, label: 'Rejected' };
      case 'in_progress': return { color: WHATSAPP_COLORS.blue, label: 'In Progress' };
      case 'pending': return { color: WHATSAPP_COLORS.yellow, label: 'Pending' };
      default: return { color: WHATSAPP_COLORS.gray, label: status };
    }
  };

  // FIXED: Proper comment count logic
  const totalComments = item?.comments?.length || 0;

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={WHATSAPP_COLORS.primaryDark}
      />

      {/* WhatsApp-style Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={WHATSAPP_COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {activeTab === 'requests' ? 'Request' : 'Grievance'} Details
            </Text>
            <Text style={styles.headerSubtitle}>
              {item?.nature || 'Loading...'}
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      <View style={styles.content}>
        {loadingDetails ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
            <Text style={styles.loadingText}>Loading details...</Text>
          </View>
        ) : item ? (
          <View style={styles.chatContainer}>
            {/* Request Info - WhatsApp-style Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <View style={styles.infoTitleRow}>
                  <Text style={styles.infoTitle}>{item.nature}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusConfig(item.status).color }
                  ]}>
                    <Text style={styles.statusText}>{getStatusConfig(item.status).label}</Text>
                  </View>
                </View>
                <Text style={styles.infoDate}>
                  Submitted on {formatDate(item.created_at)}
                </Text>
              </View>
              <View style={styles.infoBody}>
                <Text style={styles.infoDescription}>
                  {item.description || item.issue}
                </Text>
              </View>
              <View style={styles.infoFooter}>
                <Text style={styles.infoFooterText}>
                  Last updated: {formatDate(item.updated_at)}
                </Text>
              </View>
            </View>

            {/* Comments/Conversation Header */}
            <View style={styles.commentsHeader}>
              <View style={styles.commentsHeaderLine} />
              <Text style={styles.commentsTitle}>Discussion</Text>
              <View style={styles.commentsHeaderLine} />
            </View>

            {/* Comments Count Badge */}
            {totalComments > 0 && (
              <View style={styles.commentCountBadge}>
                <Text style={styles.commentCountBadgeText}>
                  {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
                </Text>
              </View>
            )}

            {/* Comments List with WhatsApp-style chat */}
            <ScrollView 
              style={styles.commentsList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.commentsListContent}
            >
              {item.comments && item.comments.length > 0 ? (
                item.comments.map((comment) => {
                  // FIXED: WhatsApp-style alignment logic
                  // Determine if message is from current user or other user
                  // Assuming is_hr_comment = true means HR user (other user)
                  // and is_hr_comment = false means current user (employee)
                  const isCurrentUser = !comment.is_hr_comment;
                  
                  return (
                    <View 
                      key={comment.id} 
                      style={[
                        styles.messageContainer,
                        // Current user's messages on RIGHT side
                        isCurrentUser ? styles.userMessageContainer : styles.hrMessageContainer
                      ]}
                    >
                      <View style={[
                        styles.messageBubbleWrapper,
                        isCurrentUser ? styles.userMessageWrapper : styles.hrMessageWrapper
                      ]}>
                        {/* WhatsApp-style message bubble */}
                        <View style={[
                          styles.messageBubble,
                          // Different colors for user vs HR messages
                          isCurrentUser ? styles.userMessageBubble : styles.hrMessageBubble
                        ]}>
                          <Text style={[
                            styles.messageText,
                            // Different text colors
                            isCurrentUser ? styles.userMessageText : styles.hrMessageText
                          ]}>
                            {comment.comment}
                          </Text>
                          <View style={styles.messageTimeContainer}>
                            <Text style={[
                              styles.messageTime,
                              // Different time text colors
                              isCurrentUser ? styles.userMessageTime : styles.hrMessageTime
                            ]}>
                              {formatTime(comment.created_at)}
                            </Text>
                          </View>
                        </View>
                        {/* Sender name for HR messages (other users) */}
                        {!isCurrentUser && (
                          <Text style={styles.messageSender}>
                            {comment.created_by_name} • HR Team
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.noComments}>
                  <Ionicons name="chatbubble-outline" size={60} color={WHATSAPP_COLORS.gray} />
                  <Text style={styles.noCommentsTitle}>No comments yet</Text>
                  <Text style={styles.noCommentsText}>
                    Start the conversation by adding a comment
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Comment Input - WhatsApp-style */}
            <View style={styles.commentInputContainer}>
              <View style={styles.commentInputWrapper}>
                <TextInput
                  style={styles.commentInput}
                  value={newComment}
                  onChangeText={onCommentChange}
                  placeholder="Type a message..."
                  placeholderTextColor={WHATSAPP_COLORS.gray}
                  multiline
                  maxLength={300}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    !newComment.trim() && styles.sendButtonDisabled
                  ]}
                  onPress={onAddComment}
                  disabled={loading || !newComment.trim()}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={WHATSAPP_COLORS.white} size="small" />
                  ) : (
                    <Ionicons name="send" size={20} color={WHATSAPP_COLORS.white} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
          
          // FIXED: Fetch comments count for each grievance
          const transformedGrievances = await Promise.all(grievancesData.map(async (grievance: any) => {
            const commentsCount = await fetchCommentsCount(grievance.id, 'grievance');
            return {
              id: grievance.id.toString(),
              nature: grievance.nature,
              description: grievance.issue,
              issue: grievance.issue,
              status: grievance.status,
              created_at: grievance.created_at,
              updated_at: grievance.updated_at,
              comments: new Array(commentsCount).fill({}) // Create array with correct length
            };
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
          const itemsData = data.requests || [];
          
          // FIXED: Fetch comments count for each request
          const transformedRequests = await Promise.all(itemsData.map(async (item: any) => {
            const commentsCount = await fetchCommentsCount(item.id, 'request');
            return {
              id: item.id.toString(),
              nature: item.nature,
              description: item.description,
              issue: item.issue,
              status: item.status,
              created_at: item.created_at,
              updated_at: item.updated_at,
              comments: new Array(commentsCount).fill({}) // Create array with correct length
            };
          }));
          
          setRequests(transformedRequests);
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

  // NEW FUNCTION: Fetch comments count for an item
  const fetchCommentsCount = async (itemId: string, type: 'request' | 'grievance'): Promise<number> => {
    if (!token) return 0;
    
    try {
      const endpoint = type === 'request' ? 'getRequest' : 'getGrievance';
      const idField = type === 'request' ? 'request_id' : 'grievance_id';
      
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
        const itemData = type === 'request' ? data.request : data.grievance;
        
        // Return the actual comment count from backend
        return itemData.comments?.length || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error fetching comments count:', error);
      return 0;
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
        
        // FIXED: Properly count comments from backend response
        const transformedComments = itemData.comments?.map((commentWrapper: any) => {
          const comment = commentWrapper.comment;
          return {
            id: comment.id.toString(),
            comment: comment.content,
            created_by: comment.user.employee_id,
            created_by_name: comment.user.full_name,
            created_at: comment.created_at,
            // FIXED: Determine if comment is from HR or user
            // Assuming user's own comments are when created_by matches current user
            // For demo, we'll assume HR comments have role === 'hr'
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
      fetchItems(); // Refresh the list to update comment counts
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
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusConfig = (status: string): { color: string, label: string } => {
    switch (status) {
      case 'resolved': return { color: WHATSAPP_COLORS.green, label: 'Resolved' };
      case 'rejected': return { color: WHATSAPP_COLORS.red, label: 'Rejected' };
      case 'in_progress': return { color: WHATSAPP_COLORS.blue, label: 'In Progress' };
      case 'pending': return { color: WHATSAPP_COLORS.yellow, label: 'Pending' };
      default: return { color: WHATSAPP_COLORS.gray, label: status };
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
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={WHATSAPP_COLORS.primaryDark}
      />

      {/* WhatsApp-style Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={WHATSAPP_COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>HR Portal</Text>
            <Text style={styles.headerSubtitle}>
              {activeTab === 'requests' ? `${requests.length} requests` : `${grievances.length} grievances`}
            </Text>
          </View>
          {/* REMOVED: The "+" icon from top-right corner as requested */}
          <View style={styles.headerRight} />
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {[
          { key: 'requests' as const, label: 'Requests', icon: 'document-text' },
          { key: 'grievances' as const, label: 'Grievances', icon: 'alert-circle' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={20} 
              color={activeTab === tab.key ? WHATSAPP_COLORS.white : 'rgba(255, 255, 255, 0.7)'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
            {tab.key === 'requests' && requests.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{requests.length}</Text>
              </View>
            )}
            {tab.key === 'grievances' && grievances.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{grievances.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Create New Button */}
          <TouchableOpacity
            style={styles.createNewCard}
            onPress={handleNewItemPress}
            activeOpacity={0.7}
          >
            <View style={styles.createNewIcon}>
              <Ionicons name="add-circle" size={28} color={WHATSAPP_COLORS.primary} />
            </View>
            <View style={styles.createNewContent}>
              <Text style={styles.createNewTitle}>
                Create New {activeTab === 'requests' ? 'Request' : 'Grievance'}
              </Text>
              <Text style={styles.createNewSubtitle}>
                Submit a new {activeTab.slice(0, -1)} to HR team
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.gray} />
          </TouchableOpacity>

          {/* Items List */}
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>
              Your {activeTab === 'requests' ? 'Requests' : 'Grievances'}
            </Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
                <Text style={styles.loadingText}>Loading {activeTab}...</Text>
              </View>
            ) : currentItems.length > 0 ? (
              currentItems.map((item) => {
                const statusConfig = getStatusConfig(item.status);
                // FIXED: Using accurate comment count from fetched data
                const commentCount = item.comments?.length || 0;
                
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.itemCard}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemIcon}>
                      <Ionicons 
                        name={activeTab === 'requests' ? 'document-text' : 'alert-circle'} 
                        size={24} 
                        color={WHATSAPP_COLORS.primary} 
                      />
                    </View>
                    <View style={styles.itemContent}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {item.nature}
                        </Text>
                        <View style={[
                          styles.itemStatus,
                          { backgroundColor: statusConfig.color }
                        ]}>
                          <Text style={styles.itemStatusText}>{statusConfig.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.itemDescription} numberOfLines={2}>
                        {item.description || item.issue}
                      </Text>
                      <View style={styles.itemFooter}>
                        <View style={styles.itemMeta}>
                          <Ionicons name="time-outline" size={14} color={WHATSAPP_COLORS.gray} />
                          <Text style={styles.itemMetaText}>{formatDate(item.created_at)}</Text>
                          <Ionicons name="chatbubble-outline" size={14} color={WHATSAPP_COLORS.gray} style={styles.metaIcon} />
                          {/* FIXED: Shows accurate comment count */}
                          <Text style={styles.itemMetaText}>{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={WHATSAPP_COLORS.gray} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Ionicons 
                  name={activeTab === 'requests' ? 'document-text-outline' : 'alert-circle-outline'} 
                  size={60} 
                  color={WHATSAPP_COLORS.gray} 
                />
                <Text style={styles.emptyTitle}>
                  No {activeTab} yet
                </Text>
                <Text style={styles.emptySubtitle}>
                  {activeTab === 'requests' 
                    ? 'Submit your first request to HR team'
                    : 'Submit your first grievance to HR team'}
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={handleNewItemPress}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={20} color={WHATSAPP_COLORS.white} />
                  <Text style={styles.emptyButtonText}>
                    Create {activeTab === 'requests' ? 'Request' : 'Grievance'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.white,
  },
  header: {
    backgroundColor: WHATSAPP_COLORS.primaryDark,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: WHATSAPP_COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: WHATSAPP_COLORS.white,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 8,
  },
  activeTabText: {
    color: WHATSAPP_COLORS.white,
  },
  tabBadge: {
    backgroundColor: WHATSAPP_COLORS.white,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: WHATSAPP_COLORS.primary,
  },
  content: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.lightGray,
  },
  scrollView: {
    flex: 1,
  },
  createNewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createNewIcon: {
    marginRight: 12,
  },
  createNewContent: {
    flex: 1,
  },
  createNewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.darkGray,
    marginBottom: 4,
  },
  createNewSubtitle: {
    fontSize: 12,
    color: WHATSAPP_COLORS.gray,
  },
  listSection: {
    paddingHorizontal: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.darkGray,
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: WHATSAPP_COLORS.gray,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: WHATSAPP_COLORS.white,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.darkGray,
    flex: 1,
    marginRight: 8,
  },
  itemStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: WHATSAPP_COLORS.white,
    textTransform: 'uppercase',
  },
  itemDescription: {
    fontSize: 14,
    color: WHATSAPP_COLORS.gray,
    marginBottom: 12,
    lineHeight: 20,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemMetaText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.gray,
    marginLeft: 4,
    marginRight: 12,
  },
  metaIcon: {
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.darkGray,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: WHATSAPP_COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.white,
    marginLeft: 8,
  },
  // New Item Page Styles
  formCard: {
    backgroundColor: WHATSAPP_COLORS.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.darkGray,
    marginBottom: 8,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WHATSAPP_COLORS.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.lightGray,
  },
  selectFieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fieldIcon: {
    marginRight: 12,
  },
  selectFieldText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.darkGray,
  },
  placeholderText: {
    color: WHATSAPP_COLORS.gray,
  },
  textAreaContainer: {
    backgroundColor: WHATSAPP_COLORS.lightGray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.lightGray,
  },
  textArea: {
    minHeight: 120,
    fontSize: 16,
    color: WHATSAPP_COLORS.darkGray,
    padding: 16,
    textAlignVertical: 'top',
  },
  characterCounter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  characterCount: {
    fontSize: 12,
    color: WHATSAPP_COLORS.gray,
  },
  submitButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.white,
    marginLeft: 8,
  },
  submitButtonDisabled: {
    backgroundColor: WHATSAPP_COLORS.gray,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  // Detail Page Styles
  chatContainer: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.chatBackground,
  },
  infoCard: {
    backgroundColor: WHATSAPP_COLORS.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    marginBottom: 12,
  },
  infoTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.darkGray,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: WHATSAPP_COLORS.white,
    textTransform: 'uppercase',
  },
  infoDate: {
    fontSize: 12,
    color: WHATSAPP_COLORS.gray,
  },
  infoBody: {
    marginBottom: 12,
  },
  infoDescription: {
    fontSize: 14,
    color: WHATSAPP_COLORS.darkGray,
    lineHeight: 22,
  },
  infoFooter: {
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.lightGray,
    paddingTop: 12,
  },
  infoFooterText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.gray,
    textAlign: 'right',
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  commentsHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: WHATSAPP_COLORS.lightGray,
  },
  commentsTitle: {
    fontSize: 14,
    color: WHATSAPP_COLORS.gray,
    marginHorizontal: 12,
    fontWeight: '500',
  },
  commentCountBadge: {
    backgroundColor: WHATSAPP_COLORS.primary,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  commentCountBadgeText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.white,
    fontWeight: '600',
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  commentsListContent: {
    paddingVertical: 8,
  },
  messageContainer: {
    marginBottom: 16,
  },
  // WhatsApp-style alignment: Current user messages on RIGHT
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  // WhatsApp-style alignment: Other users messages on LEFT
  hrMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubbleWrapper: {
    maxWidth: '80%',
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  hrMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 4,
  },
  // User messages - green bubble on right (current user)
  userMessageBubble: {
    backgroundColor: WHATSAPP_COLORS.primaryLight,
    borderBottomRightRadius: 4,
  },
  // HR messages - white bubble on left (other users)
  hrMessageBubble: {
    backgroundColor: WHATSAPP_COLORS.white,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  // User message text - dark color
  userMessageText: {
    color: WHATSAPP_COLORS.darkGray,
  },
  // HR message text - dark color
  hrMessageText: {
    color: WHATSAPP_COLORS.darkGray,
  },
  messageTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
  },
  messageTime: {
    fontSize: 11,
  },
  // User message time - slightly transparent
  userMessageTime: {
    color: 'rgba(0, 0, 0, 0.6)',
  },
  // HR message time - gray
  hrMessageTime: {
    color: WHATSAPP_COLORS.gray,
  },
  messageStatusIcon: {
    marginLeft: 4,
  },
  messageSender: {
    fontSize: 11,
    color: WHATSAPP_COLORS.gray,
    marginLeft: 8,
    marginTop: 2,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noCommentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.darkGray,
    marginTop: 16,
    marginBottom: 8,
  },
  noCommentsText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.gray,
    textAlign: 'center',
  },
  commentInputContainer: {
    backgroundColor: WHATSAPP_COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.lightGray,
  },
  commentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.lightGray,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: WHATSAPP_COLORS.darkGray,
    minHeight: 36,
    maxHeight: 120,
    paddingHorizontal: 4,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentActionButton: {
    padding: 4,
  },
  sendButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: WHATSAPP_COLORS.gray,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 60,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.white,
    textAlign: 'center',
  },
  modalSpacer: {
    width: 40,
  },
  searchContainerModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.lightGray,
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  searchIconModal: {
    marginRight: 8,
  },
  searchInputModal: {
    flex: 1,
    fontSize: 16,
    color: WHATSAPP_COLORS.darkGray,
    paddingVertical: 12,
  },
  dropdownList: {
    flex: 1,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.lightGray,
  },
  dropdownItemIcon: {
    marginRight: 12,
  },
  dropdownItemContent: {
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: WHATSAPP_COLORS.darkGray,
    marginBottom: 4,
  },
  dropdownItemDescription: {
    fontSize: 12,
    color: WHATSAPP_COLORS.gray,
  },
  emptyDropdown: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyDropdownText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.gray,
    textAlign: 'center',
    marginTop: 12,
  },
});

export default HR;