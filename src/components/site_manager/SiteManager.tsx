import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    StatusBar,
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

    // Sites State - Keep only for CreateAssignment component
    const [sites, setSites] = useState<Site[]>([]);
    const [selectedSite, setSelectedSite] = useState<Site | null>(null);

    // Assignment State - Only for details view
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    
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

    // Fetch sites for CreateAssignment when needed
    const fetchSitesForAssignment = useCallback(async () => {
        if (!token) return;

        try {
            const response = await fetch(`${BACKEND_URL}/manager/searchAndFilterSites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    query: '',
                    page: 1,
                    page_size: 100,
                    filters: {}
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.message === "Sites search successful") {
                setSites(data.sites);
            }
        } catch (error) {
            console.error('Error fetching sites for assignment:', error);
        }
    }, [token]);

    // Event Handlers
    const handleSitePress = useCallback((site: Site) => {
        setSelectedSite(site);
        setFirstLoadSiteDetails(true);
        setViewMode('details');
    }, []);

    const handleAssignmentPress = useCallback((assignment: Assignment) => {
        setSelectedAssignment(assignment);
        setViewMode('assignment-details');
    }, []);

    const handleCreateSite = useCallback(() => {
        setViewMode('create');
    }, []);

    const handleCreateAssignment = useCallback(async () => {
        if (sites.length === 0) {
            await fetchSitesForAssignment();
        }
        setViewMode('create-assignment');
    }, [sites, fetchSitesForAssignment]);

    const handleEditSite = useCallback((site: Site) => {
        setSelectedSite(site);
        setViewMode('edit');
    }, []);

    const handleBackPress = useCallback(() => {
        if (viewMode !== 'list') {
            setViewMode('list');
            setSelectedSite(null);
            setSelectedAssignment(null);
            setFirstLoadSiteDetails(true);
        } else {
            onBack();
        }
    }, [viewMode, onBack]);

    const handleSiteCreated = useCallback(() => {
        setViewMode('list');
    }, []);

    const handleSiteUpdated = useCallback(() => {
        setViewMode('list');
        setSelectedSite(null);
    }, []);

    const handleAssignmentCreated = useCallback(() => {
        setViewMode('list');
        // ListAssignment will handle its own refresh
    }, []);

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
                            loading={false}
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
                                    token={token}
                                    onSitePress={handleSitePress}
                                    onEditSite={handleEditSite}
                                    onDeleteSite={(siteId) => console.log('Delete site', siteId)}
                                    onCreateSite={handleCreateSite}
                                    onRefreshParent={() => {}}
                                    theme={WHATSAPP_COLORS}
                                />
                            ) : (
                                <ListAssignment
                                    token={token}
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
        firstLoadSiteDetails,
        handleBackPress,
        handleSiteCreated,
        handleSiteUpdated,
        handleAssignmentCreated,
        handleSitePress,
        handleEditSite,
        handleFirstLoadComplete,
        handleCreateSite,
        handleCreateAssignment,
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