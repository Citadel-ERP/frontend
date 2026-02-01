import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    StyleSheet,
    StatusBar,
    Alert,
    BackHandler,
    Dimensions,
    TouchableOpacity,
    Text,
    ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../../config/config';
import Header from './header';
import ListSite from './listSite';
import ListAssignment from './listAssignment';
import CreateSite from './createSite';
import CreateAssignment from './createAssignment';
import EditSite from './editSite';
import SiteDetails from './siteDetails';
import AssignmentDetails from './assignmentDetails';

const { width: screenWidth } = Dimensions.get('window');
const TOKEN_KEY = 'token_2';

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
    backgroundSecondary: '#F5F5F5',
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

interface Assignment {
    id: number;
    site: {
        id: number;
        building_name: string;
        location: string;
        building_status: string;
        building_photos: any[];
    };
    assigned_to: {
        employee_id: string;
        first_name: string;
        last_name: string;
        profile_picture: string;
    };
    assigned_by: {
        employee_id: string;
        first_name: string;
        last_name: string;
    };
    status: 'pending' | 'scout_completed' | 'admin_completed' | 'cancelled';
    is_visible_to_scout: boolean;
    scout_completed_at: string | null;
    admin_completed_at: string | null;
    assign_date: string;
    created_at: string;
    updated_at: string;
    comments: any[];
}

interface Pagination {
    current_page: number;
    total_pages: number;
    total_items: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
}

type ViewMode = 'list' | 'create' | 'edit' | 'details' | 'create-assignment' | 'assignment-details';
type TabMode = 'sites' | 'assignments';

interface SiteManagerProps {
    onBack: () => void;
}

const SiteManager: React.FC<SiteManagerProps> = ({ onBack }) => {
    const insets = useSafeAreaInsets();

    // State Management
    const [token, setToken] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [activeTab, setActiveTab] = useState<TabMode>('sites');

    // Sites State
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedSite, setSelectedSite] = useState<Site | null>(null);
    const [sitesPagination, setSitesPagination] = useState<Pagination | null>(null);
    const [loadingSites, setLoadingSites] = useState(false);
    const [refreshingSites, setRefreshingSites] = useState(false);
    const [loadingMoreSites, setLoadingMoreSites] = useState(false);
    const [sitesSearchQuery, setSitesSearchQuery] = useState('');
    const [sitesFilter, setSitesFilter] = useState<any>({});

    // Assignments State
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [assignmentsPagination, setAssignmentsPagination] = useState<Pagination | null>(null);
    const [loadingAssignments, setLoadingAssignments] = useState(false);
    const [refreshingAssignments, setRefreshingAssignments] = useState(false);
    const [loadingMoreAssignments, setLoadingMoreAssignments] = useState(false);
    const [assignmentsSearchQuery, setAssignmentsSearchQuery] = useState('');
    const [assignmentsFilter, setAssignmentsFilter] = useState<any>({});
    
    // SiteDetails first load tracking
    const [firstLoadSiteDetails, setFirstLoadSiteDetails] = useState(true);

    // Initialization
    useEffect(() => {
        const getToken = async () => {
            try {
                const API_TOKEN = await AsyncStorage.getItem(TOKEN_KEY);
                setToken(API_TOKEN);
            } catch (error) {
                console.error('Error getting token:', error);
            }
        };
        getToken();
    }, []);

    // API Functions for Sites
    const fetchSites = useCallback(async (page: number = 1, append: boolean = false) => {
        if (!token) return;

        try {
            if (append) {
                setLoadingMoreSites(true);
            } else {
                setLoadingSites(true);
            }

            const response = await fetch(`${BACKEND_URL}/manager/getSites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    page,
                    page_size: 20,
                    filters: sitesFilter
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Fetched sites data:', data);
            if (data.message !== "Sites fetched successfully") {
                throw new Error(data.message || 'Failed to fetch sites');
            }

            if (append) {
                setSites(prev => [...prev, ...data.sites]);
            } else {
                setSites(data.sites);
            }
            setSitesPagination(data.pagination);
        } catch (error) {
            console.error('Error fetching sites:', error);
            Alert.alert('Error', 'Failed to fetch sites. Please try again.');
        } finally {
            setLoadingSites(false);
            setLoadingMoreSites(false);
            setRefreshingSites(false);
        }
    }, [token, sitesFilter]);

    const searchSites = useCallback(async (query: string) => {
        if (!token) return;

        try {
            setLoadingSites(true);
            setSitesSearchQuery(query);

            const response = await fetch(`${BACKEND_URL}/manager/searchAndFilterSites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    query,
                    page: 1,
                    page_size: 20,
                    filters: sitesFilter
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.message !== "Sites search successful") {
                throw new Error(data.message || 'Failed to search sites');
            }

            setSites(data.sites);
            setSitesPagination(data.pagination);
        } catch (error) {
            console.error('Error searching sites:', error);
            Alert.alert('Error', 'Failed to search sites. Please try again.');
        } finally {
            setLoadingSites(false);
        }
    }, [token, sitesFilter]);

    const deleteSite = useCallback(async (siteId: number) => {
        if (!token) return;

        try {
            Alert.alert(
                'Delete Site',
                'Are you sure you want to delete this site?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            const response = await fetch(`${BACKEND_URL}/manager/deleteSite`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    token,
                                    site_ids: [siteId]
                                })
                            });

                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }

                            const data = await response.json();

                            if (data.message !== "Site deleted successfully") {
                                throw new Error(data.message || 'Failed to delete site');
                            }

                            Alert.alert('Success', 'Site deleted successfully');
                            fetchSites(1);
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error deleting site:', error);
            Alert.alert('Error', 'Failed to delete site. Please try again.');
        }
    }, [token, fetchSites]);

    const bulkDeleteSites = useCallback(async (siteIds: number[]) => {
        if (!token) return;

        try {
            const response = await fetch(`${BACKEND_URL}/manager/deleteSite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    site_ids: siteIds
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.message !== "Site deleted successfully") {
                throw new Error(data.message || 'Failed to delete sites');
            }

            fetchSites(1);
        } catch (error) {
            console.error('Error deleting sites:', error);
            throw error;
        }
    }, [token, fetchSites]);

    // API Functions for Assignments
    const fetchAssignments = useCallback(async (page: number = 1, append: boolean = false) => {
        if (!token) return;

        try {
            if (append) {
                setLoadingMoreAssignments(true);
            } else {
                setLoadingAssignments(true);
            }

            const response = await fetch(`${BACKEND_URL}/manager/getFutureVisits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    page,
                    page_size: 20,
                    filters: assignmentsFilter
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.message !== "Future site visits fetched successfully") {
                throw new Error(data.message || 'Failed to fetch assignments');
            }

            if (append) {
                setAssignments(prev => [...prev, ...data.visits]);
            } else {
                setAssignments(data.visits);
            }
            setAssignmentsPagination(data.pagination);
        } catch (error) {
            console.error('Error fetching assignments:', error);
            Alert.alert('Error', 'Failed to fetch assignments. Please try again.');
        } finally {
            setLoadingAssignments(false);
            setLoadingMoreAssignments(false);
            setRefreshingAssignments(false);
        }
    }, [token, assignmentsFilter]);

    const searchAssignments = useCallback(async (query: string) => {
        if (!token) return;

        try {
            setLoadingAssignments(true);
            setAssignmentsSearchQuery(query);

            const response = await fetch(`${BACKEND_URL}/manager/searchAndFilterSiteVisits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    query,
                    page: 1,
                    page_size: 20,
                    filters: assignmentsFilter
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.message !== "Site visits search successful") {
                throw new Error(data.message || 'Failed to search assignments');
            }

            setAssignments(data.visits);
            setAssignmentsPagination(data.pagination);
        } catch (error) {
            console.error('Error searching assignments:', error);
            Alert.alert('Error', 'Failed to search assignments. Please try again.');
        } finally {
            setLoadingAssignments(false);
        }
    }, [token, assignmentsFilter]);

    // UPDATED: Update assignment instead of delete
    const updateAssignmentStatus = useCallback(async (visitId: number, newStatus: 'admin_completed' | 'cancelled') => {
        if (!token) return;

        try {
            const response = await fetch(`${BACKEND_URL}/manager/updateSiteVisit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    visit_id: visitId,
                    status: newStatus
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.message !== "Site visit updated successfully") {
                throw new Error(data.message || 'Failed to update assignment');
            }

            return data;
        } catch (error) {
            console.error('Error updating assignment:', error);
            throw error;
        }
    }, [token]);

    // NEW: Bulk update assignments
    const bulkUpdateAssignments = useCallback(async (visitIds: number[], newStatus: 'admin_completed' | 'cancelled') => {
        if (!token) return;

        try {
            const response = await fetch(`${BACKEND_URL}/manager/bulkUpdateSiteVisits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    visit_ids: visitIds,
                    status: newStatus
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.message.includes('Successfully updated')) {
                throw new Error(data.message || 'Failed to update assignments');
            }

            fetchAssignments(1);
            return data;
        } catch (error) {
            console.error('Error bulk updating assignments:', error);
            throw error;
        }
    }, [token, fetchAssignments]);

    // Initial Data Fetch
    useEffect(() => {
        if (token) {
            fetchSites(1);
            fetchAssignments(1);
        }
    }, [token]);

    // Event Handlers
    const handleSitePress = useCallback((site: Site) => {
        setSelectedSite(site);
        setFirstLoadSiteDetails(true); // Reset firstLoad when opening site details
        setViewMode('details');
    }, []);

    const handleAssignmentPress = useCallback((assignment: Assignment) => {
        setSelectedAssignment(assignment);
        setViewMode('assignment-details');
    }, []);

    const handleCreateSite = useCallback(() => {
        setViewMode('create');
    }, []);

    const handleCreateAssignment = useCallback(() => {
        setViewMode('create-assignment');
    }, []);

    const handleEditSite = useCallback((site: Site) => {
        setSelectedSite(site);
        setViewMode('edit');
    }, []);

    const handleBackPress = useCallback(() => {
        if (viewMode !== 'list') {
            setViewMode('list');
            setSelectedSite(null);
            setSelectedAssignment(null);
            setFirstLoadSiteDetails(true); // Reset when going back
        } else {
            onBack();
        }
    }, [viewMode, onBack]);

    const handleSiteCreated = useCallback(() => {
        setViewMode('list');
        fetchSites(1);
    }, [fetchSites]);

    const handleSiteUpdated = useCallback(() => {
        setViewMode('list');
        setSelectedSite(null);
        fetchSites(1);
    }, [fetchSites]);

    const handleAssignmentCreated = useCallback(() => {
        setViewMode('list');
        fetchAssignments(1);
    }, [fetchAssignments]);

    const handleLoadMoreSites = useCallback(() => {
        if (sitesPagination && sitesPagination.has_next && !loadingMoreSites) {
            fetchSites(sitesPagination.current_page + 1, true);
        }
    }, [sitesPagination, loadingMoreSites, fetchSites]);

    const handleLoadMoreAssignments = useCallback(() => {
        if (assignmentsPagination && assignmentsPagination.has_next && !loadingMoreAssignments) {
            fetchAssignments(assignmentsPagination.current_page + 1, true);
        }
    }, [assignmentsPagination, loadingMoreAssignments, fetchAssignments]);

    const handleRefreshSites = useCallback(() => {
        setRefreshingSites(true);
        if (sitesSearchQuery) {
            searchSites(sitesSearchQuery);
        } else {
            fetchSites(1);
        }
    }, [sitesSearchQuery, searchSites, fetchSites]);

    const handleRefreshAssignments = useCallback(() => {
        setRefreshingAssignments(true);
        if (assignmentsSearchQuery) {
            searchAssignments(assignmentsSearchQuery);
        } else {
            fetchAssignments(1);
        }
    }, [assignmentsSearchQuery, searchAssignments, fetchAssignments]);
    
    // NEW: Handle first load complete callback from SiteDetails
    const handleFirstLoadComplete = useCallback(() => {
        setFirstLoadSiteDetails(false);
    }, []);

    // Back Handler
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleBackPress();
            return true;
        });
        return () => backHandler.remove();
    }, [handleBackPress]);

    // Get Header Title
    const getHeaderTitle = useCallback((): string => {
        switch (viewMode) {
            case 'create': return 'Create New Site';
            case 'edit': return 'Edit Site';
            case 'details': return 'Site Details';
            case 'create-assignment': return 'Create Assignment';
            case 'assignment-details': return 'Assignment Details';
            default: return 'Database Manager';
        }
    }, [viewMode]);

    // Render Content Based on View Mode
    const renderContent = useCallback(() => {
        switch (viewMode) {
            case 'create':
                return (
                    <CreateSite
                        token={token}
                        onBack={handleBackPress}
                        onSiteCreated={handleSiteCreated}
                        theme={WHATSAPP_COLORS}
                    />
                );
            case 'edit':
                return selectedSite ? (
                    <EditSite
                        site={selectedSite}
                        token={token}
                        onBack={handleBackPress}
                        onSiteUpdated={handleSiteUpdated}
                        theme={WHATSAPP_COLORS}
                    />
                ) : null;
            case 'details':
                return selectedSite ? (
                    <SiteDetails
                        site={selectedSite}  
                        token={token}
                        onBack={handleBackPress}
                        onEdit={() => handleEditSite(selectedSite)}
                        theme={WHATSAPP_COLORS}
                        firstLoad={firstLoadSiteDetails}
                        onFirstLoadComplete={handleFirstLoadComplete}
                    />
                ) : null;
            case 'create-assignment':
                return (
                    <CreateAssignment
                        token={token}
                        sites={sites}
                        onBack={handleBackPress}
                        onAssignmentCreated={handleAssignmentCreated}
                        theme={WHATSAPP_COLORS}
                    />
                );
            case 'assignment-details':
                return selectedAssignment ? (
                    <AssignmentDetails
                        assignment={selectedAssignment}
                        token={token}
                        onBack={handleBackPress}
                        theme={WHATSAPP_COLORS}
                    />
                ) : null;
            default:
                return (
                    <ScrollView
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
                    >
                        <Header
                            title={getHeaderTitle()}
                            onBack={handleBackPress}
                            onCreate={viewMode === 'list' ? (activeTab === 'sites' ? handleCreateSite : handleCreateAssignment) : undefined}
                            theme={WHATSAPP_COLORS}
                            loading={viewMode === 'list' ? (activeTab === 'sites' ? loadingSites : loadingAssignments) : false}
                            showCreateButton={viewMode === 'list'}
                        />

                        {/* Tab Bar */}
                        <View style={styles.tabBar}>
                            <TouchableOpacity
                                style={[
                                    styles.tabButton,
                                    activeTab === 'sites' && styles.activeTabButton
                                ]}
                                onPress={() => setActiveTab('sites')}
                            >
                                <Text style={[
                                    styles.tabButtonText,
                                    activeTab === 'sites' && styles.activeTabButtonText
                                ]}>
                                    Sites
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.tabButton,
                                    activeTab === 'assignments' && styles.activeTabButton
                                ]}
                                onPress={() => setActiveTab('assignments')}
                            >
                                <Text style={[
                                    styles.tabButtonText,
                                    activeTab === 'assignments' && styles.activeTabButtonText
                                ]}>
                                    Assignments
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Tab Content */}
                        <View style={styles.listWrapper}>
                            {activeTab === 'sites' ? (
                                <ListSite
                                    sites={sites}
                                    loading={loadingSites}
                                    loadingMore={loadingMoreSites}
                                    refreshing={refreshingSites}
                                    pagination={sitesPagination}
                                    searchQuery={sitesSearchQuery}
                                    filter={sitesFilter}
                                    onSitePress={handleSitePress}
                                    onEditSite={handleEditSite}
                                    onDeleteSite={deleteSite}
                                    onBulkDeleteSites={bulkDeleteSites}
                                    onSearch={searchSites}
                                    onFilter={setSitesFilter}
                                    onLoadMore={handleLoadMoreSites}
                                    onRefresh={handleRefreshSites}
                                    onCreateSite={handleCreateSite}
                                    theme={WHATSAPP_COLORS}
                                />
                            ) : (
                                <ListAssignment
                                    assignments={assignments}
                                    loading={loadingAssignments}
                                    loadingMore={loadingMoreAssignments}
                                    refreshing={refreshingAssignments}
                                    pagination={assignmentsPagination}
                                    searchQuery={assignmentsSearchQuery}
                                    filter={assignmentsFilter}
                                    token={token}
                                    onUpdateAssignmentStatus={updateAssignmentStatus}
                                    onBulkUpdateAssignments={bulkUpdateAssignments}
                                    onSearch={searchAssignments}
                                    onFilter={setAssignmentsFilter}
                                    onLoadMore={handleLoadMoreAssignments}
                                    onRefresh={handleRefreshAssignments}
                                    onCreateAssignment={handleCreateAssignment}
                                    theme={WHATSAPP_COLORS}
                                />
                            )}
                        </View>
                    </ScrollView>
                );
        }
    }, [
        viewMode,
        activeTab,
        token,
        selectedSite,
        selectedAssignment,
        sites,
        assignments,
        loadingSites,
        loadingMoreSites,
        refreshingSites,
        sitesPagination,
        sitesSearchQuery,
        sitesFilter,
        loadingAssignments,
        loadingMoreAssignments,
        refreshingAssignments,
        assignmentsPagination,
        assignmentsSearchQuery,
        assignmentsFilter,
        firstLoadSiteDetails,
        handleBackPress,
        handleSiteCreated,
        handleSiteUpdated,
        handleAssignmentCreated,
        handleSitePress,
        handleEditSite,
        handleAssignmentPress,
        handleFirstLoadComplete,
        deleteSite,
        bulkDeleteSites,
        updateAssignmentStatus,
        bulkUpdateAssignments,
        searchSites,
        searchAssignments,
        handleLoadMoreSites,
        handleLoadMoreAssignments,
        handleRefreshSites,
        handleRefreshAssignments,
        handleCreateSite,
        handleCreateAssignment
    ]);

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={WHATSAPP_COLORS.primary}
            />
            <View style={styles.contentContainer}>
                {renderContent()}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: WHATSAPP_COLORS.background,
    },
    contentContainer: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: WHATSAPP_COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: WHATSAPP_COLORS.border,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
    },
    activeTabButton: {
        borderBottomWidth: 2,
        borderBottomColor: WHATSAPP_COLORS.primary,
    },
    tabButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: WHATSAPP_COLORS.textSecondary,
    },
    activeTabButtonText: {
        color: WHATSAPP_COLORS.primary,
        fontWeight: '600',
    },
    listWrapper: {
        flex: 1,
        minHeight: 500,
    },
});

export default SiteManager;