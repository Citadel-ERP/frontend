import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert,
  Modal, ActivityIndicator, TextInput, Platform, Dimensions, FlatList,
  KeyboardAvoidingView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BACKEND_URL } from '../config/config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const TOKEN_KEY = 'token_2';

interface HRProps { onBack: () => void; }
interface RequestNature { id: string; name: string; description?: string; }
interface Comment {
  id: string; 
  comment: string; 
  created_by: string; 
  created_by_name: string;
  created_by_email: string;
  created_at: string; 
  is_hr_comment: boolean;
}
interface Item {
  id: string; nature: string; description: string; issue?: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected' | 'cancelled';
  created_at: string; updated_at: string; comments: Comment[];
}
type TabType = 'requests' | 'grievances';
type ViewMode = 'main' | 'itemDetail' | 'newItem';

const OTHER_OPTION: RequestNature = {
  id: 'other',
  name: 'Other',
  description: 'Any other option not listed above'
};

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
  yellow: '#FFC107',
  purple: '#9C27B0',
  userBubble: '#DCF8C6',
  otherBubble: '#FFFFFF',
  chatBackgroundDark: '#0C1317',
  chatBubbleDark: '#202C33',
  tabBarBackground: '#1F2C34',
  inputBackground: '#FFFFFF',
  inputBorder: '#E0E0E0',
  sendButton: '#128C7E',
  sendButtonDisabled: '#CCCCCC'
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

const BackIcon: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.backIconContainer}>
    <View style={styles.backIcon}>
      <View style={styles.backArrow} />
      <Text style={styles.backText}>Back</Text>
    </View>
  </TouchableOpacity>
);

const DropdownModal: React.FC<DropdownModalProps> = ({
  visible,
  onClose,
  natures,
  searchQuery,
  onSearchChange,
  onSelectNature,
  activeTab
}) => {
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<TextInput>(null);
  const filteredNatures = natures.filter(nature =>
    nature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (nature.description && nature.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    if (visible && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  const getIconForNature = (natureName: string) => {
    const name = natureName.toLowerCase();
    
    if (activeTab === 'requests') {
      if (name.includes('leave') || name.includes('time off')) return 'calendar-outline';
      if (name.includes('salary') || name.includes('pay')) return 'cash-outline';
      if (name.includes('promotion') || name.includes('raise')) return 'trending-up-outline';
      if (name.includes('transfer')) return 'swap-horizontal-outline';
      if (name.includes('training')) return 'school-outline';
      if (name.includes('equipment')) return 'desktop-outline';
      return 'document-text-outline';
    } else {
      if (name.includes('harassment')) return 'warning-outline';
      if (name.includes('discrimination')) return 'ban-outline';
      if (name.includes('workload')) return 'barbell-outline';
      if (name.includes('management')) return 'people-outline';
      if (name.includes('policy')) return 'book-outline';
      if (name.includes('facility')) return 'business-outline';
      return 'alert-circle-outline';
    }
  };

  const getCategoryIcon = () => {
    return activeTab === 'requests' ? 'document-text' : 'alert-circle';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { height: screenHeight * 0.85, marginTop: insets.top + 50 }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <View style={styles.modalIconContainer}>
                <Ionicons 
                  name={getCategoryIcon()} 
                  size={24} 
                  color={WHATSAPP_COLORS.white} 
                />
              </View>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>
                  Select {activeTab === 'requests' ? 'Request' : 'Grievance'} Type
                </Text>
                <Text style={styles.modalSubtitle}>
                  Choose from the available options
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color={WHATSAPP_COLORS.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchSection}>
            <View style={styles.searchContainerModal}>
              <Ionicons name="search" size={20} color={WHATSAPP_COLORS.gray} style={styles.searchIconModal} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInputModal}
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder={`Search ${activeTab === 'requests' ? 'request types...' : 'grievance types...'}`}
                placeholderTextColor={WHATSAPP_COLORS.gray}
                autoFocus={true}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => onSearchChange('')}>
                  <Ionicons name="close-circle" size={20} color={WHATSAPP_COLORS.gray} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={filteredNatures}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.dropdownList}
            contentContainerStyle={styles.dropdownListContent}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  index === 0 && styles.dropdownItemFirst,
                  index === filteredNatures.length - 1 && styles.dropdownItemLast
                ]}
                onPress={() => onSelectNature(item)}
                activeOpacity={0.6}
              >
                <View style={[
                  styles.dropdownItemIcon,
                  { backgroundColor: item.id === 'other' ? 'rgba(156, 39, 176, 0.1)' : 'rgba(18, 140, 126, 0.1)' }
                ]}>
                  <Ionicons
                    name={item.id === 'other' ? 'ellipsis-horizontal' : getIconForNature(item.name)}
                    size={24}
                    color={item.id === 'other' ? WHATSAPP_COLORS.purple : WHATSAPP_COLORS.primary}
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
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={WHATSAPP_COLORS.gray} 
                  style={styles.dropdownItemArrow}
                />
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyDropdown}>
                <Ionicons name="search-outline" size={60} color={WHATSAPP_COLORS.gray} />
                <Text style={styles.emptyDropdownTitle}>
                  No matching results
                </Text>
                <Text style={styles.emptyDropdownText}>
                  No {activeTab} found for "{searchQuery}"
                </Text>
                <TouchableOpacity 
                  style={styles.emptyDropdownButton}
                  onPress={() => onSearchChange('')}
                >
                  <Text style={styles.emptyDropdownButtonText}>Clear Search</Text>
                </TouchableOpacity>
              </View>
            )}
            ListHeaderComponent={() => (
              filteredNatures.length > 0 ? (
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsText}>
                    {filteredNatures.length} {filteredNatures.length === 1 ? 'type' : 'types'} found
                  </Text>
                </View>
              ) : null
            )}
          />

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.customOptionButton} onPress={() => onSelectNature(OTHER_OPTION)}>
              <Ionicons name="add-circle-outline" size={20} color={WHATSAPP_COLORS.primary} />
              <Text style={styles.customOptionButtonText}>Custom Option</Text>
            </TouchableOpacity>
          </View>
        </View>
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

  const getTypeIcon = () => {
    if (!newItemForm.natureName) return activeTab === 'requests' ? 'document-text' : 'alert-circle';
    
    const name = newItemForm.natureName.toLowerCase();
    if (activeTab === 'requests') {
      if (name.includes('leave') || name.includes('time off')) return 'calendar';
      if (name.includes('salary') || name.includes('pay')) return 'cash';
      if (name.includes('promotion') || name.includes('raise')) return 'trending-up';
      if (name.includes('transfer')) return 'swap-horizontal';
      if (name.includes('training')) return 'school';
      if (name.includes('equipment')) return 'desktop';
      return 'document-text';
    } else {
      if (name.includes('harassment')) return 'warning';
      if (name.includes('discrimination')) return 'ban';
      if (name.includes('workload')) return 'barbell';
      if (name.includes('management')) return 'people';
      if (name.includes('policy')) return 'book';
      if (name.includes('facility')) return 'business';
      return 'alert-circle';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={WHATSAPP_COLORS.primaryDark}
      />

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <BackIcon onPress={onBack} />
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
            <View style={styles.formSection}>
              <View style={styles.formLabelContainer}>
                <Text style={styles.formLabel}>
                  Type of {activeTab === 'requests' ? 'Request' : 'Grievance'}
                </Text>
                <Text style={styles.requiredLabel}>Required</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.selectField,
                  !newItemForm.natureName && styles.selectFieldEmpty
                ]}
                onPress={onOpenDropdown}
                activeOpacity={0.7}
              >
                <View style={styles.selectFieldLeft}>
                  <View style={[
                    styles.fieldIconContainer,
                    { backgroundColor: !newItemForm.natureName ? 
                      'rgba(18, 140, 126, 0.1)' : 
                      newItemForm.nature === 'other' ? 'rgba(156, 39, 176, 0.1)' : 'rgba(18, 140, 126, 0.1)' }
                  ]}>
                    <Ionicons
                      name={getTypeIcon()}
                      size={20}
                      color={!newItemForm.natureName ? WHATSAPP_COLORS.gray : 
                        newItemForm.nature === 'other' ? WHATSAPP_COLORS.purple : WHATSAPP_COLORS.primary}
                    />
                  </View>
                  <View style={styles.selectFieldTextContainer}>
                    <Text style={[
                      styles.selectFieldText,
                      !newItemForm.natureName && styles.placeholderText
                    ]}>
                      {newItemForm.natureName || 'Select type...'}
                    </Text>
                    {newItemForm.natureName && (
                      <Text style={styles.selectFieldHint}>
                        Tap to change selection
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={WHATSAPP_COLORS.gray} 
                />
              </TouchableOpacity>
              {!newItemForm.natureName && (
                <Text style={styles.fieldHelpText}>
                  Tap to select from available {activeTab === 'requests' ? 'request' : 'grievance'} types
                </Text>
              )}
            </View>

            <View style={styles.formSection}>
              <View style={styles.formLabelContainer}>
                <Text style={styles.formLabel}>Description</Text>
                <Text style={styles.requiredLabel}>Required</Text>
              </View>
              <View style={styles.textAreaContainer}>
                <TextInput
                  style={styles.textArea}
                  value={newItemForm.description}
                  onChangeText={(text) => {
                    if (text.length <= 500) {
                      onFormChange({ ...newItemForm, description: text });
                    }
                  }}
                  placeholder={`Describe your ${activeTab.slice(0, -1)} in detail...`}
                  placeholderTextColor={WHATSAPP_COLORS.gray}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <View style={styles.textAreaFooter}>
                  <View style={styles.characterCounter}>
                    <Ionicons name="information-circle-outline" size={16} color={WHATSAPP_COLORS.gray} />
                    <Text style={styles.characterHint}>Be specific and include relevant details</Text>
                  </View>
                  <Text style={[
                    styles.characterCount,
                    newItemForm.description.length === 500 && styles.characterCountWarning
                  ]}>
                    {newItemForm.description.length}/500
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onBack}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={20} color={WHATSAPP_COLORS.white} />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

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
          </View>
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
  currentUserEmail: string | null;
  onCancelItem: () => void;
  token: string | null;
}

const ItemDetailPage: React.FC<ItemDetailPageProps> = ({
  item,
  activeTab,
  newComment,
  onCommentChange,
  onAddComment,
  onBack,
  loading,
  loadingDetails,
  currentUserEmail,
  onCancelItem,
  token
}) => {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const formatWhatsAppDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const compareToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const compareYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (compareDate.getTime() === compareToday.getTime()) {
      return 'Today';
    } else if (compareDate.getTime() === compareYesterday.getTime()) {
      return 'Yesterday';
    } else if (today.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };

  const getProcessedComments = () => {
    if (!item?.comments || item.comments.length === 0) return [];

    const processed: any[] = [];
    let lastDate = '';

    const sortedComments = [...item.comments].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    sortedComments.forEach((comment, index) => {
      const commentDate = formatWhatsAppDate(comment.created_at);

      if (commentDate !== lastDate) {
        processed.push({
          type: 'dateSeparator',
          id: `date-${commentDate}-${index}`,
          date: commentDate,
          originalDate: comment.created_at
        });
        lastDate = commentDate;
      }

      processed.push({
        type: 'comment',
        id: comment.id,
        data: comment
      });
    });

    return processed;
  };

  const scrollToBottom = (animated = true) => {
    if (scrollViewRef.current && !isUserScrolling) {
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated });
        }
      }, 100);
    }
  };

  const handleScrollBeginDrag = () => {
    setIsUserScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 2000);
  };

  const handleUploadPhoto = async () => {
    if (!token || !item) {
      Alert.alert('Error', 'Unable to upload image. Please try again.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload photos.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        const formData = new FormData();
        formData.append('token', token);
        formData.append(activeTab === 'requests' ? 'request_id' : 'grievance_id', parseInt(item.id));
        
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('image', {
          uri: imageUri,
          name: filename,
          type,
        } as any);

        setUploadingImage(true);

        Alert.alert(
          'Info',
          'Image upload functionality is not yet available. The backend endpoint for image upload is not implemented.',
          [{ text: 'OK' }]
        );
        setUploadingImage(false);
        return;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Image upload is currently unavailable. Please try adding your image as a comment instead.');
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    if (item?.comments && !loading) {
      setTimeout(() => {
        scrollToBottom(true);
      }, 300);
    }
  }, [item?.comments, loading]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
  };

  const getStatusConfig = (status: string): { color: string, label: string } => {
    switch (status) {
      case 'resolved': return { color: WHATSAPP_COLORS.green, label: 'Resolved' };
      case 'rejected': return { color: WHATSAPP_COLORS.red, label: 'Rejected' };
      case 'in_progress': return { color: WHATSAPP_COLORS.blue, label: 'In Progress' };
      case 'pending': return { color: WHATSAPP_COLORS.yellow, label: 'Pending' };
      case 'cancelled': return { color: WHATSAPP_COLORS.purple, label: 'Cancelled' };
      default: return { color: WHATSAPP_COLORS.gray, label: status };
    }
  };

  const renderCommentItem = ({ item: listItem }: { item: any }) => {
    if (listItem.type === 'dateSeparator') {
      return (
        <View style={styles.dateSeparatorContainer} key={listItem.id}>
          <View style={styles.dateSeparatorBubble}>
            <Text style={styles.dateSeparatorText}>{listItem.date}</Text>
          </View>
        </View>
      );
    }

    const comment = listItem.data;
    const isCurrentUser = comment.created_by_email === currentUserEmail;

    return (
      <View
        key={comment.id}
        style={[
          styles.messageRow,
          isCurrentUser ? styles.messageRowRight : styles.messageRowLeft
        ]}
      >
        {!isCurrentUser && (
          <View style={styles.otherAvatar}>
            <Ionicons name="person-circle-outline" size={32} color="#999" />
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.userBubble : styles.otherBubble
        ]}>
          {!isCurrentUser && (
            <View style={styles.senderHeader}>
              <Text style={styles.senderName}>{comment.created_by_name}</Text>
              {comment.is_hr_comment && (
                <View style={styles.hrBadge}>
                  <Text style={styles.hrBadgeText}>HR</Text>
                </View>
              )}
            </View>
          )}
          <Text style={styles.messageText}>{comment.comment}</Text>
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>
              {formatTime(comment.created_at)}
            </Text>
            {/* FIXED: Removed double tick icon that was causing issues */}
          </View>
        </View>
      </View>
    );
  };

  const totalComments = item?.comments?.length || 0;
  const showCancelButton = item && (item.status === 'pending' || item.status === 'in_progress');

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={WHATSAPP_COLORS.primaryDark}
      />

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <BackIcon onPress={onBack} />
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
            <ScrollView
              ref={scrollViewRef}
              style={styles.chatScrollView}
              contentContainerStyle={styles.chatScrollContent}
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={handleScrollBeginDrag}
            >
              <View style={styles.infoCardCompact}>
                <View style={styles.infoHeaderCompact}>
                  <View style={styles.infoTitleRowCompact}>
                    <View style={styles.infoIconContainerCompact}>
                      <Ionicons 
                        name={activeTab === 'requests' ? 'document-text' : 'alert-circle'} 
                        size={20} 
                        color={WHATSAPP_COLORS.white} 
                      />
                    </View>
                    <View style={styles.infoTitleContentCompact}>
                      <Text style={styles.infoTitleCompact} numberOfLines={1}>
                        {item.nature}
                      </Text>
                      <Text style={styles.infoStatusCompact}>
                        <Text style={{ fontWeight: '600' }}>Status: </Text>
                        <Text style={{ color: getStatusConfig(item.status).color }}>
                          {getStatusConfig(item.status).label}
                        </Text>
                      </Text>
                    </View>
                  </View>
                  <View style={styles.infoDateCompact}>
                    <Ionicons name="calendar-outline" size={12} color={WHATSAPP_COLORS.gray} />
                    <Text style={styles.infoDateTextCompact}>
                      Submitted {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>
                <View style={styles.descriptionContainerCompact}>
                  <Text style={styles.descriptionLabelCompact}>Description</Text>
                  <Text style={styles.descriptionTextCompact}>
                    {item.description || item.issue}
                  </Text>
                </View>
                <View style={styles.infoFooterCompact}>
                  <View style={styles.updateInfoCompact}>
                    <Ionicons name="time-outline" size={12} color={WHATSAPP_COLORS.gray} />
                    <Text style={styles.infoFooterTextCompact}>
                      Last updated: {new Date(item.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.chatMessagesContainer}>
                <FlatList
                  data={getProcessedComments()}
                  renderItem={renderCommentItem}
                  keyExtractor={(item) => item.id}
                  style={styles.messagesList}
                  contentContainerStyle={styles.messagesListContent}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                  ListEmptyComponent={() => (
                    <View style={styles.noMessages}>
                      <Ionicons name="chatbubble-ellipses-outline" size={48} color={WHATSAPP_COLORS.gray} />
                      <Text style={styles.noMessagesTitle}>No messages yet</Text>
                      <Text style={styles.noMessagesText}>
                        Start the conversation by sending a message
                      </Text>
                    </View>
                  )}
                />
              </View>
            </ScrollView>

            <View style={styles.chatInputContainer}>
              <View style={styles.chatInputWrapper}>
                <TouchableOpacity 
                  style={styles.attachmentButton}
                  onPress={handleUploadPhoto}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={WHATSAPP_COLORS.gray} />
                  ) : (
                    <Ionicons name="attach" size={24} color={WHATSAPP_COLORS.gray} />
                  )}
                </TouchableOpacity>
                <View style={styles.inputFieldContainer}>
                  <TextInput
                    style={styles.chatInput}
                    value={newComment}
                    onChangeText={onCommentChange}
                    placeholder="Type a message..."
                    placeholderTextColor="#999"
                    multiline
                    maxLength={300}
                    onSubmitEditing={() => {
                      if (newComment.trim()) {
                        onAddComment();
                        setTimeout(() => {
                          scrollToBottom(true);
                        }, 100);
                      }
                    }}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    newComment.trim() ? styles.sendButtonActive : styles.sendButtonDisabled
                  ]}
                  onPress={() => {
                    if (newComment.trim()) {
                      onAddComment();
                      setTimeout(() => {
                        scrollToBottom(true);
                      }, 100);
                    }
                  }}
                  disabled={!newComment.trim() || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={WHATSAPP_COLORS.white} size="small" />
                  ) : (
                    <Ionicons 
                      name="send" 
                      size={20} 
                      color={newComment.trim() ? WHATSAPP_COLORS.white : WHATSAPP_COLORS.gray} 
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
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
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const currentNatures = activeTab === 'requests' ? requestNatures : grievanceNatures;
  const currentItems = activeTab === 'requests' ? requests : grievances;

  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        setToken(storedToken);
        
        if (storedToken) {
          const email = await fetchCurrentUser(storedToken);
          setCurrentUserEmail(email);
        }
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
              comments: new Array(commentsCount).fill({})
            };
          }));

          const sortedGrievances = transformedGrievances.sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
          
          setGrievances(sortedGrievances);
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
              comments: new Array(commentsCount).fill({})
            };
          }));

          const sortedRequests = transformedRequests.sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
          
          setRequests(sortedRequests);
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

        return itemData.comments?.length || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error fetching comments count:', error);
      return 0;
    }
  };

  const fetchCurrentUser = async (tkn: string) => {
    if (!tkn) return null;
    try {
      const response = await fetch(`${BACKEND_URL}/core/getUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tkn }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.user?.email || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
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
            created_by_email: comment.user.email,
            created_at: comment.created_at,
            is_hr_comment: comment.user.role === 'hr' || comment.user.role === 'admin'
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

      // FIXED: Improved error handling and added better debugging
      const requestBody: any = {
        token,
        [idField]: parseInt(selectedItem.id),
        content: newComment.trim()
      };

      // Try adding role field if it might be required
      const user = await fetchCurrentUser(token!);
      if (user) {
        // You might need to fetch user role from backend
        // requestBody.role = 'employee'; // Default role
      }

      const response = await fetch(`${BACKEND_URL}/core/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        setNewComment('');

        // FIXED: Wait a bit before fetching updated details to ensure backend has processed
        setTimeout(async () => {
          const updatedItem = await fetchItemDetails(selectedItem.id);
          if (updatedItem) {
            setSelectedItem(updatedItem);
          }
        }, 500);
      } else {
        // FIXED: Better error handling with more specific messages
        try {
          const errorData = await response.json();
          console.log('Error response:', errorData);
          
          if (errorData.message && errorData.message.includes('hr_manager')) {
            Alert.alert('Permission Error', 'You need HR manager permissions to add comments. Please contact your HR department.');
          } else {
            Alert.alert('Error', errorData.message || 'Failed to add comment. Please try again.');
          }
        } catch (parseError) {
          Alert.alert('Error', 'Failed to add comment. Please check your connection and try again.');
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      // FIXED: Show user-friendly error message
      Alert.alert('Network Error', 'Unable to connect to server. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const cancelItem = async () => {
    if (!selectedItem) return;

    Alert.alert(
      `Cancel ${activeTab === 'requests' ? 'Request' : 'Grievance'}`,
      `Are you sure you want to cancel this ${activeTab.slice(0, -1)}? This action cannot be undone.`,
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const endpoint = activeTab === 'requests' ? 'cancelRequest' : 'cancelGrievance';
              const idField = activeTab === 'requests' ? 'request_id' : 'grievance_id';

              const response = await fetch(`${BACKEND_URL}/core/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  [idField]: parseInt(selectedItem.id)
                }),
              });

              if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                  const result = await response.json();
                  Alert.alert('Success', `${activeTab.slice(0, -1)} cancelled successfully!`);
                  
                  const updatedItem = await fetchItemDetails(selectedItem.id);
                  if (updatedItem) {
                    setSelectedItem(updatedItem);
                  }
                  
                  await fetchItems();
                } else {
                  Alert.alert('Success', `${activeTab.slice(0, -1)} cancelled successfully!`);
                  await fetchItems();
                }
              } else {
                try {
                  const error = await response.json();
                  Alert.alert('Error', error.message || `Failed to cancel ${activeTab.slice(0, -1)}`);
                } catch {
                  Alert.alert('Error', `Failed to cancel ${activeTab.slice(0, -1)}. Please try again.`);
                }
              }
            } catch (error) {
              console.error(`Error cancelling ${activeTab.slice(0, -1)}:`, error);
              Alert.alert('Error', 'Network error occurred');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
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
      case 'cancelled': return { color: WHATSAPP_COLORS.purple, label: 'Cancelled' };
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
        currentUserEmail={currentUserEmail}
        onCancelItem={cancelItem}
        token={token}
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

      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <BackIcon onPress={onBack} />
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>HR Portal</Text>
            <Text style={styles.headerSubtitle}>
              {activeTab === 'requests' ? `${requests.length} requests` : `${grievances.length} grievances`}
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      <View style={styles.tabBar}>
        {([
          { key: 'requests' as const, label: 'Requests', icon: 'document-text' },
          { key: 'grievances' as const, label: 'Grievances', icon: 'alert-circle' }
        ] as const).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
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

      <View style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
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

          <View style={styles.listSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Your {activeTab === 'requests' ? 'Requests' : 'Grievances'}
              </Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
                <Text style={styles.loadingText}>Loading {activeTab}...</Text>
              </View>
            ) : currentItems.length > 0 ? (
              currentItems.map((item) => {
                const statusConfig = getStatusConfig(item.status);
                const commentCount = item.comments?.length || 0;
                const showCancelInList = item.status === 'pending' || item.status === 'in_progress';

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
                          <Text style={styles.itemMetaText}>{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={WHATSAPP_COLORS.gray} />
                      </View>
                      {showCancelInList && (
                        <TouchableOpacity
                          style={styles.itemCancelButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                            cancelItem();
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close-circle-outline" size={16} color={WHATSAPP_COLORS.red} />
                          <Text style={styles.itemCancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      )}
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
    backgroundColor: WHATSAPP_COLORS.white 
  },
  header: { 
    backgroundColor: WHATSAPP_COLORS.primaryDark, 
    paddingHorizontal: 16, 
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 1
  },
  headerContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    minHeight: 44
  },
  backIconContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    zIndex: 2
  },
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'center'
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  backText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 2,
  },
  headerTitleContainer: { 
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: WHATSAPP_COLORS.white,
    letterSpacing: 0.5,
    textAlign: 'center'
  },
  headerSubtitle: { 
    fontSize: 12, 
    color: 'rgba(255, 255, 255, 0.85)', 
    marginTop: 2,
    textAlign: 'center'
  },
  headerRight: { 
    width: 60 
  },
  tabBar: { 
    flexDirection: 'row', 
    backgroundColor: WHATSAPP_COLORS.primary, 
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 1
  },
  tab: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 14, 
    borderBottomWidth: 3, 
    borderBottomColor: 'transparent',
    position: 'relative'
  },
  activeTab: { 
    borderBottomColor: WHATSAPP_COLORS.white 
  },
  tabText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: 'rgba(255, 255, 255, 0.7)', 
    marginLeft: 8 
  },
  activeTabText: { 
    color: WHATSAPP_COLORS.white 
  },
  tabBadge: { 
    backgroundColor: WHATSAPP_COLORS.white, 
    borderRadius: 10, 
    minWidth: 20, 
    height: 20, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginLeft: 8,
    position: 'absolute',
    top: 8,
    right: 20
  },
  tabBadgeText: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: WHATSAPP_COLORS.primary 
  },
  content: { 
    flex: 1, 
    backgroundColor: WHATSAPP_COLORS.background 
  },
  scrollView: { 
    flex: 1 
  },
  createNewCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: WHATSAPP_COLORS.white, 
    margin: 16, 
    marginTop: 20,
    padding: 16, 
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)'
  },
  createNewIcon: { 
    marginRight: 12,
    backgroundColor: 'rgba(18, 140, 126, 0.1)',
    padding: 10,
    borderRadius: 12
  },
  createNewContent: { 
    flex: 1 
  },
  createNewTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: WHATSAPP_COLORS.darkGray, 
    marginBottom: 4 
  },
  createNewSubtitle: { 
    fontSize: 13, 
    color: WHATSAPP_COLORS.gray,
    lineHeight: 18
  },
  listSection: { 
    paddingHorizontal: 16,
    marginBottom: 30
  },
  sectionHeader: {
    marginBottom: 16,
    paddingHorizontal: 4
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: WHATSAPP_COLORS.primaryDark, 
    letterSpacing: 0.3,
    lineHeight: 28
  },
  loadingContainer: { 
    alignItems: 'center', 
    paddingVertical: 40 
  },
  loadingText: { 
    marginTop: 12, 
    fontSize: 14, 
    color: WHATSAPP_COLORS.gray 
  },
  itemCard: { 
    flexDirection: 'row', 
    backgroundColor: WHATSAPP_COLORS.white, 
    marginBottom: 12, 
    padding: 16, 
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)'
  },
  itemIcon: { 
    marginRight: 12,
    backgroundColor: 'rgba(18, 140, 126, 0.08)',
    padding: 10,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  itemContent: { 
    flex: 1,
    position: 'relative'
  },
  itemHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 8 
  },
  itemTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: WHATSAPP_COLORS.darkGray, 
    flex: 1, 
    marginRight: 8 
  },
  itemStatus: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center'
  },
  itemStatusText: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: WHATSAPP_COLORS.white, 
    textTransform: 'uppercase' 
  },
  itemDescription: { 
    fontSize: 14, 
    color: WHATSAPP_COLORS.gray, 
    marginBottom: 12, 
    lineHeight: 20 
  },
  itemFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 8
  },
  itemMeta: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  itemMetaText: { 
    fontSize: 12, 
    color: WHATSAPP_COLORS.gray, 
    marginLeft: 4, 
    marginRight: 12 
  },
  metaIcon: { 
    marginLeft: 12 
  },
  itemCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4
  },
  itemCancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: WHATSAPP_COLORS.red,
    marginLeft: 4
  },
  emptyState: { 
    alignItems: 'center', 
    paddingVertical: 60, 
    paddingHorizontal: 32 
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: WHATSAPP_COLORS.darkGray, 
    marginTop: 16, 
    marginBottom: 8 
  },
  emptySubtitle: { 
    fontSize: 14, 
    color: WHATSAPP_COLORS.gray, 
    textAlign: 'center', 
    marginBottom: 24,
    lineHeight: 20
  },
  emptyButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: WHATSAPP_COLORS.primary, 
    paddingHorizontal: 24, 
    paddingVertical: 14, 
    borderRadius: 24,
    shadowColor: WHATSAPP_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  emptyButtonText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: WHATSAPP_COLORS.white, 
    marginLeft: 8 
  },
  formCard: { 
    backgroundColor: WHATSAPP_COLORS.white, 
    margin: 16, 
    marginTop: 20,
    padding: 20, 
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)'
  },
  formSection: { 
    marginBottom: 24 
  },
  formLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  formLabel: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: WHATSAPP_COLORS.darkGray,
    marginLeft: 2
  },
  requiredLabel: {
    fontSize: 12,
    color: WHATSAPP_COLORS.red,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  selectField: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: WHATSAPP_COLORS.white, 
    paddingHorizontal: 16, 
    paddingVertical: 15, 
    borderRadius: 12, 
    borderWidth: 1.5, 
    borderColor: 'rgba(18, 140, 126, 0.3)',
    shadowColor: 'rgba(18, 140, 126, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  selectFieldEmpty: {
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: WHATSAPP_COLORS.lightGray,
    shadowOpacity: 0
  },
  selectFieldLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1 
  },
  fieldIconContainer: {
    marginRight: 12,
    padding: 10,
    borderRadius: 10
  },
  selectFieldTextContainer: {
    flex: 1
  },
  selectFieldText: { 
    fontSize: 16, 
    color: WHATSAPP_COLORS.darkGray,
    fontWeight: '500'
  },
  placeholderText: { 
    color: WHATSAPP_COLORS.gray,
    fontWeight: 'normal'
  },
  selectFieldHint: {
    fontSize: 12,
    color: WHATSAPP_COLORS.gray,
    marginTop: 2
  },
  fieldHelpText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.gray,
    marginTop: 8,
    marginLeft: 2,
    fontStyle: 'italic'
  },
  textAreaContainer: { 
    backgroundColor: WHATSAPP_COLORS.white, 
    borderRadius: 12, 
    borderWidth: 1.5, 
    borderColor: 'rgba(18, 140, 126, 0.3)',
    shadowColor: 'rgba(18, 140, 126, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  textArea: { 
    minHeight: 140, 
    fontSize: 16, 
    color: WHATSAPP_COLORS.darkGray, 
    padding: 16, 
    textAlignVertical: 'top',
    lineHeight: 22
  },
  textAreaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1, 
    borderTopColor: 'rgba(0,0,0,0.05)', 
    paddingHorizontal: 16, 
    paddingVertical: 10
  },
  characterCounter: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  characterHint: {
    fontSize: 12, 
    color: WHATSAPP_COLORS.gray,
    marginLeft: 6
  },
  characterCount: { 
    fontSize: 12, 
    color: WHATSAPP_COLORS.gray,
    fontWeight: '500'
  },
  characterCountWarning: {
    color: WHATSAPP_COLORS.red,
    fontWeight: 'bold'
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 30,
    gap: 12
  },
  cancelButton: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.gray,
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: WHATSAPP_COLORS.gray,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.white,
    marginLeft: 10,
    letterSpacing: 0.3
  },
  submitButton: { 
    flex: 2,
    backgroundColor: WHATSAPP_COLORS.primary, 
    paddingVertical: 18, 
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: WHATSAPP_COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4
  },
  submitButtonContent: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  submitButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: WHATSAPP_COLORS.white, 
    marginLeft: 10,
    letterSpacing: 0.3
  },
  submitButtonDisabled: { 
    backgroundColor: WHATSAPP_COLORS.gray,
    shadowOpacity: 0
  },
  scrollContent: { 
    paddingBottom: 24 
  },
  chatContainer: { 
    flex: 1, 
    backgroundColor: WHATSAPP_COLORS.chatBackground
  },
  chatScrollView: {
    flex: 1,
  },
  chatScrollContent: {
    paddingVertical: 8,
  },
  
  infoCardCompact: { 
    backgroundColor: WHATSAPP_COLORS.white, 
    margin: 12, 
    marginTop: 8,
    padding: 16, 
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)'
  },
  infoHeaderCompact: { 
    marginBottom: 12 
  },
  infoTitleRowCompact: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  infoIconContainerCompact: {
    backgroundColor: WHATSAPP_COLORS.primary,
    padding: 8,
    borderRadius: 8,
    marginRight: 10
  },
  infoTitleContentCompact: {
    flex: 1
  },
  infoTitleCompact: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: WHATSAPP_COLORS.darkGray,
    marginBottom: 2
  },
  infoStatusCompact: { 
    fontSize: 12, 
    color: WHATSAPP_COLORS.gray
  },
  infoDateCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  infoDateTextCompact: { 
    fontSize: 11, 
    color: WHATSAPP_COLORS.gray, 
    marginLeft: 4
  },
  descriptionContainerCompact: { 
    marginBottom: 12,
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8
  },
  descriptionLabelCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: WHATSAPP_COLORS.primary,
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  descriptionTextCompact: { 
    fontSize: 14, 
    color: WHATSAPP_COLORS.darkGray, 
    lineHeight: 20 
  },
  infoFooterCompact: { 
    borderTopWidth: 1, 
    borderTopColor: '#EEEEEE', 
    paddingTop: 12 
  },
  updateInfoCompact: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  infoFooterTextCompact: { 
    fontSize: 11, 
    color: WHATSAPP_COLORS.gray, 
    marginLeft: 6
  },
  
  cancelItemButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.purple,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: WHATSAPP_COLORS.purple,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    alignSelf: 'flex-start'
  },
  cancelItemButtonTextCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: WHATSAPP_COLORS.white,
    marginLeft: 6
  },
  
  discussionHeader: { 
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 4
  },
  discussionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start'
  },
  discussionTitle: { 
    fontSize: 14, 
    color: WHATSAPP_COLORS.primary, 
    fontWeight: '600',
    marginLeft: 6,
    marginRight: 8
  },
  discussionCount: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center'
  },
  discussionCountText: {
    fontSize: 11,
    color: WHATSAPP_COLORS.white,
    fontWeight: 'bold'
  },
  
  chatMessagesContainer: {
    flex: 1,
    minHeight: 300
  },
  messagesList: {
    flex: 1,
  },
  messagesListContent: {
    paddingHorizontal: 8,
    paddingBottom: 20
  },
  
  messageRow: { 
    flexDirection: 'row',
    marginBottom: 8, 
    paddingHorizontal: 8,
    alignItems: 'flex-end'
  },
  messageRowRight: { 
    justifyContent: 'flex-end'
  },
  messageRowLeft: { 
    justifyContent: 'flex-start'
  },
  otherAvatar: {
    marginRight: 8,
    marginBottom: 2
  },
  messageBubble: { 
    maxWidth: '70%', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1
  },
  userBubble: { 
    backgroundColor: WHATSAPP_COLORS.userBubble, 
    borderBottomRightRadius: 4,
    marginLeft: 'auto'
  },
  otherBubble: { 
    backgroundColor: WHATSAPP_COLORS.otherBubble, 
    borderBottomLeftRadius: 4,
    marginRight: 'auto'
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  senderName: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: WHATSAPP_COLORS.primary, 
    marginRight: 6
  },
  hrBadge: {
    backgroundColor: 'rgba(18, 140, 126, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3
  },
  hrBadgeText: {
    fontSize: 9,
    color: WHATSAPP_COLORS.primary,
    fontWeight: 'bold'
  },
  messageText: { 
    fontSize: 15, 
    color: '#111111', 
    lineHeight: 20,
    letterSpacing: 0.2
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2
  },
  messageTime: { 
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.45)',
    marginRight: 4
  },
  messageStatus: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  
  chatInputContainer: { 
    backgroundColor: WHATSAPP_COLORS.inputBackground, 
    paddingHorizontal: 8, 
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    borderTopWidth: 0.5, 
    borderTopColor: WHATSAPP_COLORS.inputBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  chatInputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: WHATSAPP_COLORS.inputBackground, 
    borderRadius: 24, 
    paddingHorizontal: 4, 
    paddingVertical: 4,
    borderWidth: 1, 
    borderColor: WHATSAPP_COLORS.inputBorder
  },
  attachmentButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4
  },
  inputFieldContainer: {
    flex: 1,
    maxHeight: 100,
    minHeight: 36,
    justifyContent: 'center'
  },
  chatInput: { 
    fontSize: 16, 
    color: '#111111', 
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
    minHeight: 36,
    textAlignVertical: 'center'
  },
  sendButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginHorizontal: 4
  },
  sendButtonActive: { 
    backgroundColor: WHATSAPP_COLORS.sendButton,
    shadowColor: WHATSAPP_COLORS.sendButton,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  sendButtonDisabled: { 
    backgroundColor: WHATSAPP_COLORS.sendButtonDisabled
  },
  
  dateSeparatorContainer: { 
    alignItems: 'center', 
    marginVertical: 16 
  },
  dateSeparatorBubble: { 
    backgroundColor: 'rgba(225, 245, 254, 0.9)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12,
  },
  dateSeparatorText: { 
    fontSize: 12, 
    color: '#666666', 
    fontWeight: '500' 
  },
  noMessages: { 
    alignItems: 'center', 
    paddingVertical: 40,
    paddingHorizontal: 20
  },
  noMessagesTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: WHATSAPP_COLORS.darkGray, 
    marginTop: 16, 
    marginBottom: 8 
  },
  noMessagesText: { 
    fontSize: 14, 
    color: WHATSAPP_COLORS.gray, 
    textAlign: 'center',
    lineHeight: 20
  },
  centerContent: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContainer: { 
    backgroundColor: WHATSAPP_COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10
  },
  modalHeader: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WHATSAPP_COLORS.primaryDark, 
    paddingHorizontal: 20, 
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  modalIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 10,
    marginRight: 12
  },
  modalTitleContainer: {
    flex: 1
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: WHATSAPP_COLORS.white,
    marginBottom: 2
  },
  modalSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)'
  },
  modalCloseButton: {
    padding: 4
  },
  modalSearchSection: {
    backgroundColor: WHATSAPP_COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  searchContainerModal: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: WHATSAPP_COLORS.lightGray, 
    paddingHorizontal: 16, 
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(18, 140, 126, 0.2)'
  },
  searchIconModal: { 
    marginRight: 10 
  },
  searchInputModal: { 
    flex: 1, 
    fontSize: 16, 
    color: WHATSAPP_COLORS.darkGray, 
    paddingVertical: 14
  },
  dropdownList: { 
    flex: 1 
  },
  dropdownListContent: {
    paddingBottom: 16
  },
  dropdownItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(0,0,0,0.05)',
    backgroundColor: WHATSAPP_COLORS.white
  },
  dropdownItemFirst: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)'
  },
  dropdownItemLast: {
    borderBottomWidth: 0
  },
  dropdownItemIcon: { 
    marginRight: 16,
    padding: 10,
    borderRadius: 12
  },
  dropdownItemContent: { 
    flex: 1 
  },
  dropdownItemText: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: WHATSAPP_COLORS.darkGray, 
    marginBottom: 4 
  },
  dropdownItemDescription: { 
    fontSize: 14, 
    color: WHATSAPP_COLORS.gray, 
    lineHeight: 20 
  },
  dropdownItemArrow: {
    marginLeft: 8
  },
  emptyDropdown: { 
    alignItems: 'center', 
    paddingVertical: 60, 
    paddingHorizontal: 32 
  },
  emptyDropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.darkGray,
    marginTop: 12,
    marginBottom: 8
  },
  emptyDropdownText: { 
    fontSize: 14, 
    color: WHATSAPP_COLORS.gray, 
    textAlign: 'center', 
    marginBottom: 20,
    lineHeight: 20
  },
  emptyDropdownButton: {
    backgroundColor: WHATSAPP_COLORS.lightGray,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20
  },
  emptyDropdownButtonText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.darkGray,
    fontWeight: '500'
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(18, 140, 126, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  resultsText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.gray,
    fontWeight: '500'
  },
  modalFooter: {
    padding: 16,
    backgroundColor: WHATSAPP_COLORS.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)'
  },
  customOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 140, 126, 0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(18, 140, 126, 0.2)'
  },
  customOptionButtonText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '500',
    marginLeft: 8
  }
});

export default HR;