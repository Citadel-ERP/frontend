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
  id: string; nature: string; description: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  created_at: string; updated_at: string; comments: Comment[];
}
type TabType = 'requests' | 'grievances';

const HR: React.FC<HRProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('requests');
  const [loading, setLoading] = useState(false);
  const [isNewItemModalVisible, setIsNewItemModalVisible] = useState(false);
  const [isItemDetailModalVisible, setIsItemDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [requestNatures, setRequestNatures] = useState<RequestNature[]>([]);
  const [grievanceNatures, setGrievanceNatures] = useState<RequestNature[]>([]);
  const [newItemForm, setNewItemForm] = useState({ nature: '', natureName: '', description: '' });
  const [newComment, setNewComment] = useState('');
  const [requests, setRequests] = useState<Item[]>([]);
  const [grievances, setGrievances] = useState<Item[]>([]);

  const currentNatures = activeTab === 'requests' ? requestNatures : grievanceNatures;
  const currentItems = activeTab === 'requests' ? requests : grievances;
  const filteredNatures = currentNatures.filter(nature => 
    nature.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    if (token) fetchInitialData();
  }, [token, activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchNatures(), fetchItems()]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNatures = async () => {
    try {
      const endpoint = activeTab === 'requests' ? 'getCommonRequests' : 'getCommonGrievances';
      const response = await fetch(`${BACKEND_URL}/core/${endpoint}`, {
        method: 'GET', 
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        const backendNatures = activeTab === 'requests' 
          ? data.common_requests || [] 
          : data.common_grievances || [];
        
        const transformedNatures = backendNatures.map((item: any) => ({
          id: item.id.toString(),
          name: activeTab === 'requests' ? item.common_request : item.common_grievance,
          description: activeTab === 'requests' ? item.common_request : item.common_grievance
        }));

        const natures = [
          ...transformedNatures,
          { 
            id: 'other', 
            name: 'Other', 
            description: 'Any other ' + (activeTab === 'requests' ? 'request' : 'grievance') + ' not listed above'
          }
        ];
        
        if (activeTab === 'requests') setRequestNatures(natures);
        else setGrievanceNatures(natures);
      } else {
        // Set default natures if API fails
        setDefaultNatures();
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab} natures:`, error);
      setDefaultNatures();
    }
  };

  const setDefaultNatures = () => {
    const defaultNatures = activeTab === 'requests' 
      ? [
          { id: 'leave_extension', name: 'Leave Extension', description: 'Request for leave extension' },
          { id: 'salary_certificate', name: 'Salary Certificate', description: 'Request for salary certificate' },
          { id: 'experience_letter', name: 'Experience Letter', description: 'Request for experience letter' },
          { id: 'transfer_request', name: 'Transfer Request', description: 'Request for transfer to another location' },
          { id: 'other', name: 'Other', description: 'Any other request not listed above' }
        ]
      : [
          { id: 'workplace_harassment', name: 'Workplace Harassment', description: 'Issues related to workplace harassment' },
          { id: 'unfair_treatment', name: 'Unfair Treatment', description: 'Issues related to unfair treatment' },
          { id: 'policy_violation', name: 'Policy Violation', description: 'Issues related to policy violations' },
          { id: 'discrimination', name: 'Discrimination', description: 'Issues related to discrimination' },
          { id: 'other', name: 'Other', description: 'Any other grievance not listed above' }
        ];
    
    if (activeTab === 'requests') setRequestNatures(defaultNatures);
    else setGrievanceNatures(defaultNatures);
  };

  const fetchItems = async () => {
    try {
      // This endpoint seems to be incorrect in the original code
      // You might need to update this with the correct endpoint for fetching user's requests/grievances
      const endpoint = activeTab === 'requests' ? 'getUserRequests' : 'getUserGrievances';
      const response = await fetch(`${BACKEND_URL}/core/${endpoint}`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        const items = data[activeTab] || [];
        
        if (activeTab === 'requests') setRequests(items);
        else setGrievances(items);
      } else {
        if (activeTab === 'requests') setRequests([]);
        else setGrievances([]);
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error);
      if (activeTab === 'requests') setRequests([]);
      else setGrievances([]);
    }
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
        closeNewItemModal();
        await fetchItems(); // Refresh the list
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
      const endpoint = activeTab === 'requests' ? 'addRequestComment' : 'addGrievanceComment';
      const idField = activeTab === 'requests' ? 'request_id' : 'grievance_id';
      
      const response = await fetch(`${BACKEND_URL}/core/${endpoint}`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          [idField]: selectedItem.id,
          comment: newComment
        }),
      });

      if (response.ok) {
        setNewComment('');
        await fetchItems();
        const updatedItems = activeTab === 'requests' ? requests : grievances;
        const updatedItem = updatedItems.find(item => item.id === selectedItem.id);
        if (updatedItem) setSelectedItem(updatedItem);
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

  const closeNewItemModal = () => {
    setIsNewItemModalVisible(false);
    setIsDropdownVisible(false);
    setSearchQuery('');
    setNewItemForm({ nature: '', natureName: '', description: '' });
  };

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

  const DropdownModal = () => (
    <Modal
      visible={isDropdownVisible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setIsDropdownVisible(false);
        setSearchQuery('');
      }}
    >
      <TouchableOpacity
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={() => {
          setIsDropdownVisible(false);
          setSearchQuery('');
        }}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.dropdownContainer}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
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
                  onPress={() => selectNature(item)}
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

  const NewItemModal = () => (
    <Modal
      visible={isNewItemModalVisible}
      transparent
      animationType="slide"
      onRequestClose={closeNewItemModal}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Raise New {activeTab === 'requests' ? 'Request' : 'Grievance'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={closeNewItemModal}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Nature of {activeTab === 'requests' ? 'Request' : 'Grievance'} *
                </Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setIsDropdownVisible(true)}
                >
                  <Text style={[
                    styles.dropdownButtonText,
                    !newItemForm.natureName && styles.dropdownPlaceholder
                  ]}>
                    {newItemForm.natureName || `Select ${activeTab === 'requests' ? 'request' : 'grievance'} type`}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={styles.descriptionInput}
                  value={newItemForm.description}
                  onChangeText={(text) => setNewItemForm({ ...newItemForm, description: text })}
                  placeholder={`Please provide detailed description of your ${activeTab.slice(0, -1)}`}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={closeNewItemModal}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalSubmitButton,
                    (!newItemForm.nature || !newItemForm.description.trim()) && styles.modalSubmitButtonDisabled
                  ]}
                  onPress={submitNewItem}
                  disabled={loading || !newItemForm.nature || !newItemForm.description.trim()}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <View style={styles.submitButtonContent}>
                      <Text style={styles.modalSubmitText}>
                        Submit {activeTab === 'requests' ? 'Request' : 'Grievance'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
      {isDropdownVisible && <DropdownModal />}
    </Modal>
  );

  const ItemDetailModal = () => (
    <Modal
      visible={isItemDetailModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setIsItemDetailModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={[styles.modalContainer, { maxHeight: screenHeight * 0.9 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeTab === 'requests' ? 'Request' : 'Grievance'} Details
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsItemDetailModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.itemDetailContainer}>
                  <View style={styles.itemDetailHeader}>
                    <View style={styles.itemDetailInfo}>
                      <Text style={styles.itemNatureText}>{selectedItem.nature}</Text>
                      <Text style={styles.itemDateText}>
                        Created: {formatDate(selectedItem.created_at)}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBadgeColor(selectedItem.status) }
                    ]}>
                      <Text style={styles.statusBadgeText}>
                        {selectedItem.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.itemDescription}>
                    <Text style={styles.descriptionLabel}>Description:</Text>
                    <Text style={styles.itemDescriptionText}>{selectedItem.description}</Text>
                  </View>

                  <View style={styles.commentsSection}>
                    <Text style={styles.commentsTitle}>Comments</Text>
                    
                    {selectedItem.comments && selectedItem.comments.length > 0 ? (
                      selectedItem.comments.map((comment) => (
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
                        onChangeText={setNewComment}
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
                        onPress={addComment}
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
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

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
          onPress={() => setIsNewItemModalVisible(true)}
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
              onPress={() => {
                setSelectedItem(item);
                setIsItemDetailModalVisible(true);
              }}
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
                {item.description}
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

      <NewItemModal />
      <ItemDetailModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: colors.white, fontSize: fontSize.sm, color: colors.text, minHeight: 120,
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
    backgroundColor: colors.backgroundSecondary, borderRadius: borderRadius.md,
  },
  descriptionLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  commentsSection: { flex: 1 },
  commentsTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  commentItem: {
    backgroundColor: colors.backgroundSecondary, padding: spacing.md,
    borderRadius: borderRadius.md, marginBottom: spacing.sm,
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