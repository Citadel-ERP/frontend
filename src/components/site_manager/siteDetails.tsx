import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  Modal,
  Dimensions,
  Linking,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import SiteDetailedInfo from './SiteDetailedInfo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

const { width: screenWidth } = Dimensions.get('window');

const WHATSAPP_COLORS = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  primaryDark: '#054D44',
  secondary: '#25D366',
  accent: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#e7e6e5',
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

interface Site {
  id: number;
  building_name: string;
  location: string;
  building_status: string;
  floor_condition: string;
  total_area: string;
  rent: string;
  managed_property: boolean;
  conventional_property: boolean;
  created_at: string;
  updated_at: string;
  created_by: any;
  active: boolean;
  building_photos: any[];
  meta: any;
  nearest_metro_station: any;
}

interface SiteDetailsProps {
  site: Site;
  onBack: () => void;
  onEdit: () => void;
  token: string | null;
  theme?: any;
  firstLoad?: boolean;
  onFirstLoadComplete?: () => void;
}

interface SiteData {
  id: number;
  building_name: string;
  location: string;
  location_link: string;
  landmark: string;
  building_status: string;
  floor_condition: string;
  total_floors: string;
  number_of_basements: string;
  total_area: string;
  area_per_floor: string;
  availble_floors: string;
  area_offered: string;
  rent: string;
  rent_per_seat: string;
  cam: string;
  cam_deposit: string;
  oc: boolean;
  security_deposit: string;
  two_wheeler_slots: string;
  two_wheeler_charges: string;
  efficiency: string;
  notice_period: string;
  lease_term: string;
  lock_in_period: string;
  will_developer_do_fitouts: boolean;
  contact_person_name: string;
  contact_person_designation: string;
  contact_person_number: string;
  contact_person_email: string;
  power: string;
  power_backup: string;
  number_of_cabins: string;
  number_of_workstations: string;
  size_of_workstation: string;
  server_room: string;
  training_room: string;
  pantry: string;
  electrical_ups_room: string;
  cafeteria: string;
  gym: string;
  discussion_room: string;
  meeting_room: string;
  remarks: string;
  building_owner_name: string;
  building_owner_contact: string;
  maintenance_rate: string;
  managed_property: boolean;
  conventional_property: boolean;
  business_hours_of_operation: string;
  premises_access: string;
  total_seats: string;
  seats_available: string;
  number_of_units: string;
  number_of_seats_per_unit: string;
  latitude: number;
  longitude: number;
  created_by: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
  created_at: string;
  building_photos: Array<{
    id: number;
    file_url: string;
    description: string;
  }>;
  nearest_metro_station: {
    id: number;
    name: string;
    city: string;
  } | null;
  car_parking_charges: string;
  car_parking_ratio: string;
  car_parking_slots: string;
  rental_escalation: string;
  meta: Record<string, any>;
}

interface VisitWithComments {
  visit: {
    id: number;
    assigned_to: {
      first_name: string;
      last_name: string;
      employee_id: string;
    };
    status: string;
    created_at: string;
  };
  comments: any[];
  total_comments_in_visit: number;
  comments_shown: number;
}

interface ChatMessage {
  id: string;
  type: 'comment' | 'dateSeparator';
  data?: any;
  date?: string;
  originalDate?: string;
}

const SiteDetails: React.FC<SiteDetailsProps> = ({
  site,
  onBack,
  onEdit,
  token,
  theme,
  firstLoad = true,
  onFirstLoadComplete,
}) => {
  const [loading, setLoading] = useState(true);
  const [siteData, setSiteData] = useState<SiteData | null>(null);
  const [siteVisits, setSiteVisits] = useState<VisitWithComments[]>([]);
  const [showFullImage, setShowFullImage] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [apiToken, setApiToken] = useState<string | null>(token);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('You');
  const [newComment, setNewComment] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [addingComment, setAddingComment] = useState(false);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);


  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
  const isLoadingMoreRef = useRef(false);
  const scrollPositionRef = useRef(0);
  const shouldAutoScrollRef = useRef(false);
  const [isFirstLoad, setIsFirstLoad] = useState(firstLoad);

  // NEW: Debouncing and threshold refs for pagination
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');
  const paginationTriggeredAt = useRef(0);
  const PAGINATION_COOLDOWN = 1000; // 1 second cooldown between pagination requests
  const SCROLL_THRESHOLD = 50; // Trigger when within 50px of top

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user_data');
        if (userData) {
          const parsedData = JSON.parse(userData);
          setCurrentUserEmployeeId(parsedData.employee_id);
          setCurrentUserName(`${parsedData.first_name || ''} ${parsedData.last_name || ''}`.trim() || 'You');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const getToken = async () => {
      if (!token) {
        const storedToken = await AsyncStorage.getItem('token_2');
        setApiToken(storedToken);
      }
    };
    getToken();
  }, [token]);

  useEffect(() => {
    if (apiToken && site?.id) {
      fetchSiteDetails();
    }
  }, [apiToken, site?.id]);

  // Handle keyboard events
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      handleKeyboardShow
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      handleKeyboardHide
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleKeyboardShow = (event: any) => {
    setIsKeyboardVisible(true);
    if (Platform.OS === 'android') {
      Animated.timing(keyboardHeightAnim, {
        toValue: event.endCoordinates.height,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleKeyboardHide = () => {
    setIsKeyboardVisible(false);
    if (Platform.OS === 'android') {
      Animated.timing(keyboardHeightAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  };

  const fetchSiteDetails = async () => {
    if (!apiToken || !site?.id) {
      console.error('Missing apiToken or site.id');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching site details for site ID:', site.id);

      const response = await fetch(`${BACKEND_URL}/manager/getSite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: apiToken,
          site_id: site.id,
          page: 1,
          page_size: 50
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Site details response:', data);

      if (data.message === 'Site details fetched successfully') {
        setSiteData(data.site);
        setSiteVisits(data.site_visits || []);

        // Set pagination info
        if (data.pagination) {
          setCurrentPage(data.pagination.current_page);
          setTotalPages(data.pagination.total_pages);
          setHasMoreComments(data.pagination.has_next);
        }

        // Mark initial load as done and enable auto-scroll for this first load only
        setInitialLoadDone(true);
        shouldAutoScrollRef.current = true;
        setIsFirstLoad(true);
      } else {
        throw new Error(data.message || 'Failed to fetch site details');
      }
    } catch (error) {
      console.error('Error fetching site details:', error);
      Alert.alert('Error', 'Failed to fetch site details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreComments = async () => {
    // Check cooldown period
    const now = Date.now();
    if (now - paginationTriggeredAt.current < PAGINATION_COOLDOWN) {
      console.log('Pagination on cooldown, skipping...');
      return;
    }

    // Don't load more if first load, already loading, or no more comments
    if (!apiToken || !site?.id || !hasMoreComments || isLoadingMoreRef.current || loadingMore || isFirstLoad) {
      return;
    }

    isLoadingMoreRef.current = true;
    setLoadingMore(true);
    paginationTriggeredAt.current = now;

    try {
      const nextPage = currentPage + 1;
      console.log(`Fetching page ${nextPage} of comments...`);

      const response = await fetch(`${BACKEND_URL}/manager/getSite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: apiToken,
          site_id: site.id,
          page: nextPage,
          page_size: 50
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.message === 'Site details fetched successfully') {
        // Prepend the new comments to existing ones
        setSiteVisits(prevVisits => {
          const newVisits = data.site_visits || [];

          // Merge comments from new visits with existing visits
          const mergedVisits = [...prevVisits];

          newVisits.forEach((newVisit: VisitWithComments) => {
            const existingVisitIndex = mergedVisits.findIndex(
              v => v.visit.id === newVisit.visit.id
            );

            if (existingVisitIndex >= 0) {
              // Prepend new comments to existing visit
              mergedVisits[existingVisitIndex] = {
                ...mergedVisits[existingVisitIndex],
                comments: [...newVisit.comments, ...mergedVisits[existingVisitIndex].comments],
                total_comments_in_visit: newVisit.total_comments_in_visit,
                comments_shown: mergedVisits[existingVisitIndex].comments_shown + newVisit.comments.length,
              };
            } else {
              // Add new visit at the end
              mergedVisits.push(newVisit);
            }
          });

          return mergedVisits;
        });

        // Update pagination info
        if (data.pagination) {
          setCurrentPage(data.pagination.current_page);
          setTotalPages(data.pagination.total_pages);
          setHasMoreComments(data.pagination.has_next);
        }

        console.log(`Successfully loaded page ${nextPage}`);

        // DO NOT auto-scroll when loading older messages via pagination
        shouldAutoScrollRef.current = false;
      }
    } catch (error) {
      console.error('Error fetching more comments:', error);
      Alert.alert('Error', 'Failed to load more comments.');
    } finally {
      setLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  };

  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    const currentY = contentOffset.y;

    // Determine scroll direction
    if (currentY > lastScrollY.current) {
      scrollDirection.current = 'down';
    } else if (currentY < lastScrollY.current) {
      scrollDirection.current = 'up';
    }

    lastScrollY.current = currentY;
    scrollPositionRef.current = currentY;

    // Only trigger pagination when:
    // 1. Scrolling up (towards older messages)
    // 2. Within threshold of top
    // 3. Not on first load
    // 4. Has more comments to load
    // 5. Not already loading
    const isNearTop = currentY < SCROLL_THRESHOLD;
    console.log(`Scroll Y: ${currentY}, Direction: ${scrollDirection.current}, Near Top: ${isNearTop}`, { isFirstLoad, hasMoreComments, loadingMore });

    const shouldLoadMore =
      scrollDirection.current === 'up' &&
      isNearTop &&
      !isFirstLoad &&
      hasMoreComments &&
      !loadingMore &&
      !isLoadingMoreRef.current;

    if (shouldLoadMore) {
      console.log('Triggering pagination - scroll position:', currentY);
      fetchMoreComments();
    }
  };

  const formatTime = useCallback((dateString?: string): string => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }, []);

  const formatWhatsAppDate = useCallback((dateString: string): string => {
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
  }, []);

  const getInitials = (name: string): string => {
    if (!name || name.trim().length === 0) return '?';
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
    }
  };

  const truncateFileName = (fileName: string, maxLength: number = 25): string => {
    if (fileName.length <= maxLength) return fileName;
    return fileName.substring(0, maxLength - 3) + '...';
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleTakePhoto = useCallback(async (): Promise<void> => {
    if (isPickerActive) return;
    setIsPickerActive(true);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permissions are needed to take photos.');
        setIsPickerActive(false);
        setShowAttachmentModal(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = `photo_${Date.now()}.jpg`;
        const newFile: DocumentPicker.DocumentPickerAsset = {
          uri: asset.uri,
          name: fileName,
          mimeType: 'image/jpeg',
          size: asset.fileSize,
          lastModified: Date.now(),
        };

        setSelectedDocuments(prev => [...prev, newFile]);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Camera Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsPickerActive(false);
      setShowAttachmentModal(false);
    }
  }, [isPickerActive]);

  const handleSelectFromGallery = useCallback(async (): Promise<void> => {
    if (isPickerActive) return;
    setIsPickerActive(true);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library permissions are needed to select images.');
        setIsPickerActive(false);
        setShowAttachmentModal(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles: DocumentPicker.DocumentPickerAsset[] = result.assets.map((asset, index) => {
          const extension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
          return {
            uri: asset.uri,
            name: `image_${Date.now()}_${index}.${extension}`,
            mimeType: `image/${extension === 'png' ? 'png' : 'jpeg'}`,
            size: asset.fileSize,
            lastModified: Date.now(),
          };
        });

        setSelectedDocuments(prev => [...prev, ...newFiles]);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error('Error selecting images:', error);
      Alert.alert('Selection Error', 'Failed to select images. Please try again.');
    } finally {
      setIsPickerActive(false);
      setShowAttachmentModal(false);
    }
  }, [isPickerActive]);

  const handleSelectDocument = useCallback(async (): Promise<void> => {
    if (isPickerActive) return;
    setIsPickerActive(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        setSelectedDocuments(prev => [...prev, ...result.assets]);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      Alert.alert('Error', 'Failed to pick documents. Please try again.');
    } finally {
      setIsPickerActive(false);
      setShowAttachmentModal(false);
    }
  }, [isPickerActive]);

  const handleRemoveDocument = (index: number) => {
    setSelectedDocuments(prevDocs => prevDocs.filter((_, i) => i !== index));
  };

  const handleAddComment = async () => {
    if (!newComment.trim() && selectedDocuments.length === 0) {
      Alert.alert('Error', 'Please enter a message or attach a file');
      return;
    }

    if (!apiToken) {
      Alert.alert('Error', 'Authentication token not found');
      return;
    }

    // Get the latest visit ID from siteVisits, or create a default visit
let visitId;
let latestVisit;

if (siteVisits && siteVisits.length > 0) {
  latestVisit = siteVisits[0].visit;
  visitId = latestVisit.id;
}  else {
  // If no visits exist, use the site ID as a fallback or create a visit automatically
  // Option 1: Use site ID as visit context
  visitId = site.id;
  latestVisit = {
    id: site.id,
    status: 'active',
    assigned_to: {
      employee_id: currentUserEmployeeId || '',
      first_name: currentUserName.split(' ')[0] || '',
      last_name: currentUserName.split(' ')[1] || '',
    },
    created_at: new Date().toISOString(),
  };
}

    try {
      setAddingComment(true);

      const formData = new FormData();
      formData.append('token', apiToken);
      formData.append('visit_id', visitId.toString());
      formData.append('content', newComment.trim());

      // Add documents if any
      if (selectedDocuments.length > 0) {
        selectedDocuments.forEach((doc) => {
          const file: any = {
            uri: doc.uri,
            type: doc.mimeType || 'application/octet-stream',
            name: doc.name || 'document',
          };
          formData.append('documents', file);
        });
      }

      const response = await fetch(`${BACKEND_URL}/manager/siteAddComment`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add comment');
      }

      if (data.message === 'Comment added successfully') {
        // Add the new comment to the local state for real-time update
        const newCommentData = {
          ...data.comment,
          visit_id: visitId,
          visit_status: latestVisit.status,
          assigned_to: latestVisit.assigned_to,
          user: {
            employee_id: currentUserEmployeeId,
            full_name: currentUserName,
          },
        };

        // Update the siteVisits state to include the new comment
        // Update the siteVisits state to include the new comment
setSiteVisits(prevVisits => {
  const updatedVisits = [...prevVisits];
  if (updatedVisits.length > 0) {
    updatedVisits[0] = {
      ...updatedVisits[0],
      comments: [...updatedVisits[0].comments, newCommentData],
      total_comments_in_visit: updatedVisits[0].total_comments_in_visit + 1,
      comments_shown: updatedVisits[0].comments_shown + 1,
    };
  } else {
    // Create a new visit entry with the comment
    updatedVisits.push({
      visit: latestVisit,
      comments: [newCommentData],
      total_comments_in_visit: 1,
      comments_shown: 1,
    });
  }
  return updatedVisits;
});

        // Clear input and documents - keep keyboard open
        setNewComment('');
        setSelectedDocuments([]);

        // Enable auto-scroll for user's new comment
        shouldAutoScrollRef.current = true;

        // Scroll to bottom after a short delay to ensure the new message is rendered
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        throw new Error(data.message || 'Failed to add comment');
      }
    } catch (error: any) {
      console.error('Error adding comment:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to add comment. Please try again.'
      );
    } finally {
      setAddingComment(false);
    }
  };

  const getProcessedComments = useCallback(() => {
    if (!siteVisits || siteVisits.length === 0) return [];

    const processed: ChatMessage[] = [];
    let lastDate = '';

    // Flatten all comments from all visits
    const allComments: any[] = [];
    siteVisits.forEach(visitData => {
      visitData.comments.forEach(comment => {
        allComments.push({
          ...comment,
          visit_id: visitData.visit.id,
          visit_status: visitData.visit.status,
          assigned_to: visitData.visit.assigned_to
        });
      });
    });

    // Sort by date
    const sortedComments = allComments.sort((a, b) =>
      new Date(a.created_at || a.date).getTime() - new Date(b.created_at || b.date).getTime()
    );

    sortedComments.forEach((comment, index) => {
      const commentDate = formatWhatsAppDate(comment.created_at || comment.date);

      if (commentDate !== lastDate) {
        processed.push({
          type: 'dateSeparator',
          id: `date-${commentDate}-${index}`,
          date: commentDate,
          originalDate: comment.created_at || comment.date
        });
        lastDate = commentDate;
      }

      processed.push({
        type: 'comment',
        id: comment.id?.toString() || `comment-${index}`,
        data: comment
      });
    });

    return processed;
  }, [siteVisits, formatWhatsAppDate]);

  // Auto-scroll effect - only for initial load and new user comments
  useEffect(() => {
    if (initialLoadDone && shouldAutoScrollRef.current && siteVisits.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        shouldAutoScrollRef.current = false;

        // After successfully scrolling to bottom, mark first load as complete
        if (isFirstLoad) {
          setTimeout(() => {
            setIsFirstLoad(false);
            onFirstLoadComplete?.();
          }, 200);
        }
      }, 150);
    }
  }, [siteVisits, initialLoadDone, isFirstLoad, onFirstLoadComplete]);

  const renderChatItem = useCallback(({ item }: { item: ChatMessage }) => {
    if (item.type === 'dateSeparator') {
      return (
        <View style={styles.dateSeparatorContainer}>
          <View style={styles.dateSeparatorBubble}>
            <Text style={styles.dateSeparatorText}>{item.date}</Text>
          </View>
        </View>
      );
    }

    const comment = item.data;
    const time = formatTime(comment.created_at || comment.date);
    const isCurrentUser = comment.user?.employee_id === currentUserEmployeeId ||
      comment.assigned_to?.employee_id === currentUserEmployeeId;

    return (
      <View style={[
        styles.messageRow,
        isCurrentUser ? styles.messageRowRight : styles.messageRowLeft
      ]}>
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
        ]}>
          {!isCurrentUser && (
            <View style={styles.senderHeader}>
              <Text style={styles.senderName}>
                {comment.user?.full_name ||
                  `${comment.assigned_to?.first_name} ${comment.assigned_to?.last_name}` ||
                  'User'}
              </Text>
            </View>
          )}
          {comment.content && (
            <Text style={styles.messageText}>
              {comment.content}
            </Text>
          )}
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>{time}</Text>
            {isCurrentUser && (
              <Ionicons name="checkmark-done" size={14} color={WHATSAPP_COLORS.primary} style={styles.deliveryIcon} />
            )}
          </View>
        </View>
      </View>
    );
  }, [currentUserEmployeeId, formatTime]);

  const BackIcon = () => (
  <View style={styles.backIcon}>
    <View style={styles.backArrow} />
    <Text style={styles.backText}>Back</Text>
  </View>
);

  const DetailsModal = useMemo(() => (
    <SiteDetailedInfo
      visible={showDetailsModal}
      onClose={() => setShowDetailsModal(false)}
      siteData={siteData}
    />
  ), [showDetailsModal, siteData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading site details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!siteData) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Site Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={WHATSAPP_COLORS.danger} />
          <Text style={styles.errorText}>Site not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSiteDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const MainContent = (
    <>
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <View style={styles.header}>
          <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <BackIcon />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerInfo}
              onPress={() => setShowDetailsModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {siteData.building_name || 'Site'}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {siteData.location || 'Tap for details'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity onPress={onEdit} style={styles.headerActionButton}>
                <MaterialIcons name="edit" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {DetailsModal}

      <View style={styles.chatContainer}>
        {siteVisits.length === 0 ? (
          <View style={styles.emptyChat}>
            <MaterialIcons name="forum" size={64} color={WHATSAPP_COLORS.border} />
            <Text style={styles.emptyChatTitle}>No site visits yet</Text>
            <Text style={styles.emptyChatText}>
              Site visit comments will appear here
            </Text>
          </View>
        ) : (
          <>
            {loadingMore && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
                <Text style={styles.loadingMoreText}>Loading more comments...</Text>
              </View>
            )}
            <FlatList
              ref={flatListRef}
              data={getProcessedComments()}
              renderItem={renderChatItem}
              keyExtractor={(item) => item.id}
              inverted={false}
              contentContainerStyle={styles.chatListContent}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={400}
              onContentSizeChange={() => {
                // Only auto-scroll if the flag is set (initial load or new user comment)
                if (shouldAutoScrollRef.current) {
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }
              }}
            />
          </>
        )}
      </View>

      {selectedDocuments.length > 0 && (
        <View style={styles.selectedFilesPreview}>
          <Text style={styles.selectedFilesTitle}>Attachments ({selectedDocuments.length})</Text>
          <FlatList
            horizontal
            data={selectedDocuments}
            renderItem={({ item: doc, index }) => (
              <View style={styles.selectedDocumentItem}>
                <MaterialIcons name="insert-drive-file" size={20} color={WHATSAPP_COLORS.primary} />
                <View style={styles.selectedDocumentInfo}>
                  <Text style={styles.selectedDocumentName} numberOfLines={1}>
                    {truncateFileName(doc.name, 20)}
                  </Text>
                  <Text style={styles.selectedDocumentSize}>{formatFileSize(doc.size)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveDocument(index)}>
                  <Ionicons name="close" size={18} color={WHATSAPP_COLORS.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
            keyExtractor={(_, idx) => `doc-${idx}`}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      <Modal
        visible={showFullImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullImage(false)}
      >
        <View style={styles.fullImageModal}>
          <TouchableOpacity
            style={styles.closeImageButton}
            onPress={() => setShowFullImage(false)}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>

          {siteData.building_photos[selectedImageIndex] && (
            <Image
              source={{ uri: siteData.building_photos[selectedImageIndex].file_url }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}

          {siteData.building_photos[selectedImageIndex]?.description && (
            <View style={styles.fullImageDescription}>
              <Text style={styles.fullImageDescriptionText}>
                {siteData.building_photos[selectedImageIndex].description}
              </Text>
            </View>
          )}

          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {selectedImageIndex + 1} / {siteData.building_photos.length}
            </Text>
          </View>

          {siteData.building_photos.length > 1 && (
            <>
              {selectedImageIndex > 0 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.prevButton]}
                  onPress={() => setSelectedImageIndex(prev => prev - 1)}
                >
                  <Ionicons name="chevron-back" size={28} color="#FFF" />
                </TouchableOpacity>
              )}
              {selectedImageIndex < siteData.building_photos.length - 1 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.nextButton]}
                  onPress={() => setSelectedImageIndex(prev => prev + 1)}
                >
                  <Ionicons name="chevron-forward" size={28} color="#FFF" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Modal>

      <Modal
        visible={showAttachmentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!isPickerActive) {
            setShowAttachmentModal(false);
          }
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            if (!isPickerActive) {
              setShowAttachmentModal(false);
            }
          }}
        >
          <View style={styles.attachmentModalContent}>
            <TouchableOpacity
              style={styles.attachmentOption}
              onPress={handleSelectDocument}
              disabled={isPickerActive}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: '#7F66FF' }]}>
                <MaterialIcons name="insert-drive-file" size={24} color="#FFF" />
              </View>
              <Text style={styles.attachmentOptionText}>Document</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attachmentOption}
              onPress={handleTakePhoto}
              disabled={isPickerActive}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: '#FF4D67' }]}>
                <Ionicons name="camera" size={24} color="#FFF" />
              </View>
              <Text style={styles.attachmentOptionText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attachmentOption}
              onPress={handleSelectFromGallery}
              disabled={isPickerActive}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: '#C861F9' }]}>
                <Ionicons name="images" size={24} color="#FFF" />
              </View>
              <Text style={styles.attachmentOptionText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );

  if (Platform.OS === 'android') {
    return (
      <View style={styles.mainContainer}>
        {MainContent}
        <Animated.View style={[styles.androidInputContainer, { marginBottom: keyboardHeightAnim }]}>
          <SafeAreaView style={styles.inputSafeArea} edges={['bottom']}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <View style={styles.inputRow}>
                  <TouchableOpacity
                    style={styles.attachmentButton}
                    onPress={() => setShowAttachmentModal(true)}
                    disabled={addingComment || isPickerActive}
                  >
                    <Ionicons name="attach" size={22} color={WHATSAPP_COLORS.primary} />
                    {selectedDocuments.length > 0 && (
                      <View style={styles.fileCounterBadge}>
                        <Text style={styles.fileCounterText}>{selectedDocuments.length}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.inputField}>
                    <TextInput
                      ref={inputRef}
                      style={styles.messageInput}
                      value={newComment}
                      onChangeText={setNewComment}
                      placeholder="Type your message..."
                      multiline
                      maxLength={1000}
                      placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                      editable={!addingComment}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      { backgroundColor: (newComment.trim() || selectedDocuments.length > 0) ? WHATSAPP_COLORS.primary : WHATSAPP_COLORS.border }
                    ]}
                    onPress={handleAddComment}
                    disabled={addingComment || (!newComment.trim() && selectedDocuments.length === 0)}
                  >
                    {addingComment ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Ionicons
                        name="send"
                        size={18}
                        color={(newComment.trim() || selectedDocuments.length > 0) ? '#FFF' : WHATSAPP_COLORS.textTertiary}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.mainContainer}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {MainContent}
      <View style={[
        styles.inputContainerWrapper,
        { marginBottom: isKeyboardVisible ? 0 : -30 }
      ]}>
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.attachmentButton}
                onPress={() => setShowAttachmentModal(true)}
                disabled={addingComment || isPickerActive}
              >
                <Ionicons name="attach" size={22} color={WHATSAPP_COLORS.primary} />
                {selectedDocuments.length > 0 && (
                  <View style={styles.fileCounterBadge}>
                    <Text style={styles.fileCounterText}>{selectedDocuments.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.inputField}>
                <TextInput
                  ref={inputRef}
                  style={styles.messageInput}
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="Type your message..."
                  multiline
                  maxLength={1000}
                  placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                  editable={!addingComment}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: (newComment.trim() || selectedDocuments.length > 0) ? WHATSAPP_COLORS.primary : WHATSAPP_COLORS.border }
                ]}
                onPress={handleAddComment}
                disabled={addingComment || (!newComment.trim() && selectedDocuments.length === 0)}
              >
                {addingComment ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={(newComment.trim() || selectedDocuments.length > 0) ? '#FFF' : WHATSAPP_COLORS.textTertiary}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.chatBg
  },
  container: {
    flex: 1,
    marginTop:10,
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  // Header Styles
  headerSafeArea: {

    backgroundColor: WHATSAPP_COLORS.primary,
  },
  header: {
    backgroundColor: WHATSAPP_COLORS.primary,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: "#fff",
    transform: [{ rotate: '-45deg' }],
  },
  backText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 2,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: WHATSAPP_COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 1,
    marginTop:10,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerSpacer: {
    width: 40,
  },
  // Chat Container
  chatContainer: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.chatBg
  },
  chatListContent: {
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 10,
    flexGrow: 1,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: WHATSAPP_COLORS.chatBg,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 13,
    color: WHATSAPP_COLORS.textSecondary,
  },
  // Date Separator
  dateSeparatorContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateSeparatorBubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
  },
  dateSeparatorText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  // Message Styles
  messageRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingHorizontal: 6,
    alignItems: 'flex-start',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    minWidth: 220,
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  currentUserBubble: {
    backgroundColor: WHATSAPP_COLORS.outgoing,
    borderBottomRightRadius: 3,
  },
  otherUserBubble: {
    backgroundColor: WHATSAPP_COLORS.incoming,
    borderBottomLeftRadius: 3,
  },
  senderHeader: {
    marginBottom: 3,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: WHATSAPP_COLORS.primary,
    marginBottom: 1,
  },
  messageText: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textPrimary,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  messageTime: {
    fontSize: 10,
    color: WHATSAPP_COLORS.textTertiary,
  },
  visitIdBadge: {
    fontSize: 9,
    color: WHATSAPP_COLORS.primary,
    backgroundColor: WHATSAPP_COLORS.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '600',
  },
  deliveryIcon: {
    marginLeft: 3,
  },
  // Input Styles
  androidInputContainer: {
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
    backgroundColor: WHATSAPP_COLORS.surface,
  },
  inputSafeArea: {
    backgroundColor: WHATSAPP_COLORS.surface,
  },
  inputContainer: {
    backgroundColor: WHATSAPP_COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
  },
  inputContainerWrapper: {
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
    backgroundColor: WHATSAPP_COLORS.surface,
  },
  inputWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachmentButton: {
    padding: 6,
    marginBottom: 2,
    position: 'relative',
  },
  fileCounterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: WHATSAPP_COLORS.danger,
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  fileCounterText: {
    fontSize: 10,
    color: WHATSAPP_COLORS.white,
    fontWeight: '600',
  },
  inputField: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
    maxHeight: 100,
  },
  messageInput: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textPrimary,
    padding: 0,
    maxHeight: 80,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Selected Files Preview
  selectedFilesPreview: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedFilesTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 6,
  },
  selectedDocumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 160,
    gap: 6,
    marginRight: 8,
  },
  selectedDocumentInfo: {
    flex: 1
  },
  selectedDocumentName: {
    fontSize: 12,
    fontWeight: '500',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 2,
  },
  selectedDocumentSize: {
    fontSize: 10,
    color: WHATSAPP_COLORS.textTertiary
  },
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyChatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary
  },
  emptyChatText: {
    fontSize: 13,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 180,
  },
  // Modal Styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: WHATSAPP_COLORS.primary
  },
  modalBackButton: {
    padding: 8,
    marginRight: 12
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    flex: 1
  },
  modalScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1
  },
  modalBottomSpacing: {
    height: 40
  },
  // Container Box Styles
  containerBox: {
    backgroundColor: WHATSAPP_COLORS.surface,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    overflow: 'hidden'
  },
  containerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: WHATSAPP_COLORS.primary + '08',
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
    gap: 10
  },
  containerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.primary,
    flex: 1
  },
  containerContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12
  },
  // Site Info Styles
  siteInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
    gap: 16
  },
  siteAvatarSection: {
    alignItems: 'center'
  },
  siteAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: WHATSAPP_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: WHATSAPP_COLORS.primary
  },
  siteAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF'
  },
  siteHeaderSection: {
    flex: 1,
    justifyContent: 'center'
  },
  siteNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 4
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: WHATSAPP_COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  statusBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10
  },
  statusBadgeBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusBadgeBoxText: {
    fontSize: 12,
    fontWeight: '600'
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  mapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  locationButtonText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  mapButtonText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // Info Item Styles
  infoItem: {
    marginBottom: 12
  },
  infoItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 6
  },
  infoItemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border
  },
  infoItemValue: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1
  },
  // Metadata Styles
  metadataItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
  },
  metadataLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 4
  },
  metadataValue: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary
  },
  // Photo Grid
  photosGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  photoGridItem: {
    width: (screenWidth - 48) / 3,
    height: (screenWidth - 48) / 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  // Full Image Modal
  fullImageModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeImageButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  fullImage: {
    width: screenWidth,
    height: screenWidth,
  },
  fullImageDescription: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
  },
  fullImageDescriptionText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 14,
    textAlign: 'center',
  },
  imageCounter: {
    position: 'absolute',
    top: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageCounterText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  // Attachment Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  attachmentModalContent: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  attachmentOption: {
    alignItems: 'center',
    gap: 8,
  },
  attachmentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentOptionText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '500',
  },
});

export default SiteDetails;