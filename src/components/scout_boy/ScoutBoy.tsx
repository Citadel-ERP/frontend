import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Alert,
  BackHandler,
  RefreshControl,
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
import VisitComment from './visitComment';

const TOKEN_KEY = 'token_2';
const DARK_MODE_KEY = 'dark_mode';

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
  const [filterValue, setFilterValue] = useState('all');

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

  // API Functions - Using useCallback with stable dependencies
  const fetchVisits = useCallback(async (page: number = 1, append: boolean = false, statusFilter?: string): Promise<void> => {
    if (!token) return;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const requestBody: any = { token, page };
      
      // Add status filter if provided
      if (statusFilter && statusFilter !== 'all') {
        requestBody.status = statusFilter;
      }

      const response = await fetch(`${BACKEND_URL}/employee/getAssignedVisits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
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

  // Initial Data Fetch - Only run once when token is available
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

  // Event Handlers
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    searchVisits(query);
  }, [searchVisits]);

  const handleFilter = useCallback((filterBy: string, filterValue: string) => {
    setFilterBy(filterBy);
    setFilterValue(filterValue);
    
    // Pass the filter value to fetchVisits
    if (filterValue === 'all') {
      fetchVisits(1, false);
    } else {
      fetchVisits(1, false, filterValue);
    }
  }, [fetchVisits]);

  const handleLoadMore = useCallback(() => {
    if (pagination && pagination.has_next && !loadingMore && !isSearchMode) {
      // Pass the current filter value when loading more
      const statusFilter = filterValue !== 'all' ? filterValue : undefined;
      fetchVisits(pagination.current_page + 1, true, statusFilter);
    }
  }, [pagination, loadingMore, isSearchMode, fetchVisits, filterValue]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (isSearchMode) {
      searchVisits(searchQuery);
    } else {
      // Pass the current filter value when refreshing
      const statusFilter = filterValue !== 'all' ? filterValue : undefined;
      fetchVisits(1, false, statusFilter);
    }
  }, [isSearchMode, searchQuery, searchVisits, fetchVisits, filterValue]);

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
        // Refresh the list when coming back
        if (token) {
          const statusFilter = filterValue !== 'all' ? filterValue : undefined;
          fetchVisits(1, false, statusFilter);
        }
        break;
      case 'list':
        onBack();
        break;
    }
  }, [viewMode, token, fetchVisits, filterValue, onBack]);

  const handleEditPress = useCallback(() => {
    setViewMode('edit');
  }, []);

  const handleMarkComplete = useCallback(async () => {
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

  // Filtered Visits - This is now handled by backend, but we keep client-side filtering as fallback
  const filteredVisits = useMemo(() => {
    // If backend already filtered by status, just return all visits
    if (filterBy === 'status' && filterValue !== 'all') {
      return visits.filter(visit => visit.status === filterValue);
    }
    
    // If no filter or 'all', return all visits
    return visits;
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
            onMarkComplete={handleMarkComplete}
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
          <View style={styles.listContainer}>
            <SearchAndFilter
              onSearch={handleSearch}
              onFilter={handleFilter}
              theme={theme}
            />
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
            />
          </View>
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
    handleBackPress,
    handleEditPress,
    handleMarkComplete,
    handleSearch,
    handleFilter,
    handleVisitPress,
    handleLoadMore,
    handleRefresh
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
});

export default ScoutBoy;