import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Alert,
  BackHandler,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/config';
import { 
  ScoutBoyProps, 
  Visit, 
  ViewMode, 
  ThemeColors, 
  Pagination 
} from './types';
import { lightTheme, darkTheme } from './theme';
import Header from './header';
import SearchAndFilter from './searchAndFilter';
import VisitsList from './lists';
import VisitDetails from './visitDetails';
import EditSiteVisit from './editSiteVisit';
import CreateNewSite from './createNewSite';
import { Ionicons } from '@expo/vector-icons';
import { Modal, TouchableOpacity, Text, ActivityIndicator } from 'react-native';

const TOKEN_KEY = 'token_2';
const DARK_MODE_KEY = 'dark_mode';

const WHATSAPP_COLORS = {
  primary: '#075E54',
  success: '#25D366',
  danger: '#EF4444',
  info: '#3B82F6',
  surface: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  lightGreen: '#D1FAE5',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
};

const ScoutBoy: React.FC<ScoutBoyProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  
  // State Management
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [token, setToken] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [currentVisitIndex, setCurrentVisitIndex] = useState(0);

  // List View State
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [filterBy, setFilterBy] = useState('');
  const [filterValue, setFilterValue] = useState('');

  // Selection State
  const [selectedVisits, setSelectedVisits] = useState<number[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);

  // Photo Modal State
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Ref to track if initial fetch has been done
  const initialFetchDone = useRef(false);

  // Memoized Values
  const theme: ThemeColors = useMemo(() => 
    isDarkMode ? darkTheme : lightTheme, 
    [isDarkMode]
  );

  // Initialization Effects
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const [darkMode, apiToken] = await Promise.all([
          AsyncStorage.getItem(DARK_MODE_KEY),
          AsyncStorage.getItem(TOKEN_KEY)
        ]);
        
        setIsDarkMode(darkMode === 'true');
        setToken(apiToken);
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };
    
    initializeApp();
  }, []);

  // API Functions
  const fetchVisits = useCallback(async (page: number = 1, append: boolean = false): Promise<void> => {
    if (!token) return;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`${BACKEND_URL}/employee/getAssignedVisits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, page })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const transformedVisits: Visit[] = data.visits.map((visit: any) => ({
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
        setVisits(prev => [...prev, ...transformedVisits]);
      } else {
        setVisits(transformedVisits);
      }

      setPagination(data.pagination || null);
      setIsSearchMode(false);
    } catch (error) {
      console.error('Error fetching visits:', error);
      Alert.alert('Error', 'Failed to fetch visits. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [token]);

  const searchVisits = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setIsSearchMode(false);
      fetchVisits(1);
      return;
    }

    if (!token) return;

    try {
      setLoading(true);
      setIsSearchMode(true);
      
      const response = await fetch(`${BACKEND_URL}/employee/searchVisits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, query })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const transformedVisits: Visit[] = data.visits.map((visit: any) => ({
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

      setVisits(transformedVisits);
      setPagination(null);
    } catch (error) {
      console.error('Error searching visits:', error);
      Alert.alert('Error', 'Failed to search visits. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token, fetchVisits]);

  // Initial Data Fetch
  useEffect(() => {
    if (token && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchVisits(1);
    }
  }, [token]);

  // Theme Toggle
  const toggleDarkMode = useCallback(async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    await AsyncStorage.setItem(DARK_MODE_KEY, newDarkMode.toString());
  }, [isDarkMode]);

  // Selection Handlers
  const handleLongPress = useCallback((visitId: number) => {
    setSelectionMode(true);
    setSelectedVisits([visitId]);
  }, []);

  const handleVisitSelection = useCallback((visitId: number) => {
    if (!selectionMode) return;
    setSelectedVisits(prev => {
      if (prev.includes(visitId)) {
        const newSelection = prev.filter(id => id !== visitId);
        if (newSelection.length === 0) {
          setSelectionMode(false);
        }
        return newSelection;
      } else {
        return [...prev, visitId];
      }
    });
  }, [selectionMode]);

  const cancelSelection = useCallback(() => {
    setSelectedVisits([]);
    setSelectionMode(false);
  }, []);

  // Mark as Complete Handler
  const handleMarkComplete = useCallback(async () => {
    setShowActionsModal(false);
    
    Alert.alert(
      'Mark as Complete',
      `Are you sure you want to mark ${selectedVisits.length} visit(s) as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Complete',
          style: 'default',
          onPress: async () => {
            setMarkingComplete(true);
            try {
              const response = await fetch(`${BACKEND_URL}/employee/updateVisitDetails`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  token, 
                  visit_ids: selectedVisits 
                })
              });

              const data = await response.json();

              if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
              }
              
              Alert.alert('Success', `${selectedVisits.length} visit(s) marked as completed!`);
              cancelSelection();
              // Refresh the list
              fetchVisits(1);
            } catch (error) {
              console.error('Error marking visits complete:', error);
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to mark visits as complete');
            } finally {
              setMarkingComplete(false);
            }
          }
        }
      ]
    );
  }, [selectedVisits, token, cancelSelection, fetchVisits]);

  // Event Handlers
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    searchVisits(query);
  }, [searchVisits]);

  const handleFilter = useCallback((filterBy: string, filterValue: string) => {
    setFilterBy(filterBy);
    setFilterValue(filterValue);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (pagination && pagination.has_next && !loadingMore && !isSearchMode) {
      fetchVisits(pagination.current_page + 1, true);
    }
  }, [pagination, loadingMore, isSearchMode, fetchVisits]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (isSearchMode) {
      searchVisits(searchQuery);
    } else {
      fetchVisits(1);
    }
  }, [isSearchMode, searchQuery, searchVisits, fetchVisits]);

  const handleVisitPress = useCallback((visit: Visit, index: number) => {
    setSelectedVisit({ ...visit });
    setCurrentVisitIndex(index);
    setViewMode('detail');
  }, []);

  const handleCreateSiteClick = useCallback(() => {
    setViewMode('create-site');
  }, []);

  const handleBackPress = useCallback(() => {
    switch (viewMode) {
      case 'detail':
      case 'create-site':
      case 'edit':
        setViewMode('list');
        setSelectedVisit(null);
        if (token) {
          fetchVisits(1);
        }
        break;
      case 'list':
        onBack();
        break;
    }
  }, [viewMode, token, onBack, fetchVisits]);

  const handleEditPress = useCallback(() => {
    setViewMode('edit');
  }, []);

  const handleMarkCompleteDetail = useCallback(async () => {
    if (!selectedVisit || !token) return;

    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/employee/markVisitCompleted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, visit_id: selectedVisit.id })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedVisit = { 
        ...selectedVisit, 
        status: 'scout_completed' 
      };
      
      const updatedVisits = [...visits];
      updatedVisits[currentVisitIndex] = updatedVisit;
      
      setSelectedVisit(updatedVisit);
      setVisits(updatedVisits);
      
      Alert.alert('Success', 'Visit marked as completed');
    } catch (error) {
      console.error('Error marking visit complete:', error);
      Alert.alert('Error', 'Failed to mark visit as complete. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedVisit, token, visits, currentVisitIndex]);

  // Filtered Visits
  const filteredVisits = useMemo(() => {
    return visits.filter(visit => {
      if (!filterBy || !filterValue) return true;
      
      if (filterBy === 'status') {
        return visit.status === filterValue;
      }
      
      return true;
    });
  }, [visits, filterBy, filterValue]);

  // Back Handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackPress();
      return true;
    });
    return () => backHandler.remove();
  }, [handleBackPress]);

  // View Title
  const getHeaderTitle = useCallback((): string => {
    switch (viewMode) {
      case 'detail': return 'Visit Details';
      case 'create-site': return 'Create New Site';
      case 'edit': return 'Edit Visit';
      default: return 'Scout Boy';
    }
  }, [viewMode]);

  // Render Actions Modal
  const renderActionsModal = useCallback(() => (
    <Modal
      visible={showActionsModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowActionsModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowActionsModal(false)}
      >
        <View style={styles.actionsModal}>
          <Text style={styles.actionsModalTitle}>
            {selectedVisits.length} visit(s) selected
          </Text>
          <TouchableOpacity
            style={styles.actionOption}
            onPress={handleMarkComplete}
          >
            <View style={styles.actionOptionLeft}>
              <Ionicons name="checkmark-circle-outline" size={22} color={WHATSAPP_COLORS.success} />
              <Text style={styles.actionOptionText}>
                Mark as Complete
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelActionButton}
            onPress={() => setShowActionsModal(false)}
          >
            <Text style={styles.cancelActionText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  ), [showActionsModal, selectedVisits, handleMarkComplete]);

  // Render Content Based on View Mode
  const renderContent = useCallback(() => {
    switch (viewMode) {
      case 'detail':
        return selectedVisit ? (
          <VisitDetails
            visit={selectedVisit}
            currentIndex={currentVisitIndex}
            totalVisits={visits.length}
            onBack={handleBackPress}
            onEdit={handleEditPress}
            onMarkComplete={handleMarkCompleteDetail}
            onPhotoPress={(url, index) => {
              setSelectedPhotoUrl(url);
              setSelectedPhotoIndex(index);
              setShowPhotoModal(true);
            }}
            onPrevious={() => {
              if (currentVisitIndex > 0) {
                const newIndex = currentVisitIndex - 1;
                setCurrentVisitIndex(newIndex);
                setSelectedVisit(visits[newIndex]);
              }
            }}
            onNext={() => {
              if (currentVisitIndex < visits.length - 1) {
                const newIndex = currentVisitIndex + 1;
                setCurrentVisitIndex(newIndex);
                setSelectedVisit(visits[newIndex]);
              }
            }}
            hasPrevious={currentVisitIndex > 0}
            hasNext={currentVisitIndex < visits.length - 1}
            token={token}
            theme={theme}
          />
        ) : null;

      case 'create-site':
        return (
          <CreateNewSite
            onBack={handleBackPress}
            colors={theme}
            spacing={lightTheme.spacing}
            fontSize={lightTheme.fontSize}
            borderRadius={lightTheme.borderRadius}
            shadows={lightTheme.shadows}
          />
        );

      case 'edit':
        return selectedVisit ? (
          <EditSiteVisit
            visit={selectedVisit}
            onBack={handleBackPress}
            token={token}
            theme={theme}
          />
        ) : null;

      default:
        return (
          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={[0]}
          >
            <View>
              <SearchAndFilter
                onSearch={handleSearch}
                onFilter={handleFilter}
                theme={theme}
                selectionMode={selectionMode}
                selectedCount={selectedVisits.length}
                onSettingsPress={() => setShowActionsModal(true)}
                onCancelSelection={cancelSelection}
              />
            </View>
            <VisitsList
              visits={filteredVisits}
              onVisitPress={handleVisitPress}
              loading={loading}
              loadingMore={loadingMore}
              refreshing={refreshing}
              onLoadMore={handleLoadMore}
              onRefresh={handleRefresh}
              token={token}
              theme={theme}
              isDarkMode={isDarkMode}
              pagination={pagination}
              selectionMode={selectionMode}
              selectedVisits={selectedVisits}
              onVisitSelection={handleVisitSelection}
              onLongPress={handleLongPress}
            />
          </ScrollView>
        );
    }
  }, [
    viewMode, 
    selectedVisit, 
    currentVisitIndex, 
    visits, 
    token, 
    theme, 
    filteredVisits,
    loading,
    loadingMore,
    refreshing,
    pagination,
    isDarkMode,
    selectionMode,
    selectedVisits,
    handleBackPress,
    handleEditPress,
    handleMarkCompleteDetail,
    handleSearch,
    handleFilter,
    handleVisitPress,
    handleLoadMore,
    handleRefresh,
    handleVisitSelection,
    handleLongPress,
    cancelSelection
  ]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />
      
      {viewMode === 'list' && (
        <Header
          title={getHeaderTitle()}
          onBack={handleBackPress}
          onCreateSite={handleCreateSiteClick}
          theme={theme}
          loading={loading}
          showCreateButton={true}
        />
      )}

      <View style={[styles.contentContainer, { paddingBottom: insets.bottom }]}>
        {renderContent()}
      </View>

      {/* Actions Modal */}
      {renderActionsModal()}

      {/* Loading Overlay */}
      {markingComplete && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
            <Text style={styles.loadingOverlayText}>
              Marking {selectedVisits.length} visit(s) as complete...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};
// Platform.OS === 'ios' ? -30 : 0,
const styles = StyleSheet.create({
  container: {
    flex: 1,
    height:'100%',
    marginBottom:Platform.OS === 'ios' ? -30 : 0,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.overlay,
    justifyContent: 'flex-end',
  },
  actionsModal: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  actionsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  actionOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: WHATSAPP_COLORS.lightGreen,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.success,
  },
  cancelActionButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelActionText: {
    fontSize: 16,
    color: WHATSAPP_COLORS.textSecondary,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: WHATSAPP_COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: WHATSAPP_COLORS.surface,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingOverlayText: {
    marginTop: 16,
    fontSize: 16,
    color: WHATSAPP_COLORS.textPrimary,
    fontWeight: '600',
  },
});

export default ScoutBoy;