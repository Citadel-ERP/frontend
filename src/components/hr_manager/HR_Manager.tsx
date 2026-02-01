import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StatusBar,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';
import { WHATSAPP_COLORS, TOKEN_KEY } from './constants';
import { Header } from './header';
import { Requests } from './requests';
import { Grievances } from './grievances';
import { RequestInfo } from './requestInfo';
import { GrievanceInfo } from './grievanceInfo';
import { CommonRequest } from './commonRequest';
import { CommonGrievance } from './commonGrievance';
import { EditRequest } from './editRequest';
import { EditGrievance } from './editGrievance';
import { Item, TabType, ViewMode } from './types';
import { BACKEND_URL } from '../../config/config';

interface HRManagerProps {
    onBack: () => void;
}

const HR_Manager: React.FC<HRManagerProps> = ({ onBack }) => {
    const insets = useSafeAreaInsets();
    const [token, setToken] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('requests');
    const [loading, setLoading] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [newComment, setNewComment] = useState('');
    const [requests, setRequests] = useState<Item[]>([]);
    const [grievances, setGrievances] = useState<Item[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('main');
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string | null>(null);

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
            fetchItems();
        }
    }, [token, activeTab, viewMode]);

    const fetchItems = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const endpoint = activeTab === 'requests' ? 'getRequests' : 'getGriviences';
            const response = await fetch(`${BACKEND_URL}/manager/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            if (response.ok) {
                const data = await response.json();
                const itemsData = data[activeTab] || [];
                console.log(`Raw ${activeTab} data:`,itemsData[0].raised_by.first_name);  
                const transformedItems = itemsData.map((item: any) => ({
                    id: item.id.toString(),
                    nature: item.nature || item.issue_type,
                    description: activeTab === 'requests' ? item.description : item.issue,
                    issue: item.issue,
                    status: item.status,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    employee_name: item.raised_by.first_name + ' ' + item.raised_by.last_name || item.user_name,
                    employee_email: item.raised_by.email || item.user_email,
                    comments: item.comments || []
                }));
                const sortedItems = transformedItems.sort((a: Item, b: Item) =>
                    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                );
                if (activeTab === 'requests') {
                    setRequests(sortedItems);
                } else {
                    setGrievances(sortedItems);
                }
            } else {
                if (activeTab === 'requests') {
                    setRequests([]);
                } else {
                    setGrievances([]);
                }
            }
        } catch (error) {
            console.error(`Error fetching ${activeTab}:`, error);
            if (activeTab === 'requests') setRequests([]);
            else setGrievances([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchItemDetails = async (itemId: string) => {
        if (!token) return null;
        setLoadingDetails(true);
        try {
            const endpoint = activeTab === 'requests' ? 'getRequest' : 'getGrivience';
            const idField = activeTab === 'requests' ? 'request_id' : 'grievance_id';
            const response = await fetch(`${BACKEND_URL}/manager/${endpoint}`, {
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
                console.log('Raw comment data:', JSON.stringify(itemData.comments, null, 2));
                const transformedComments = itemData.comments?.map((commentWrapper: any) => {
                    const comment = commentWrapper.comment;
                    return {
                        id: comment.id.toString(),
                        content: comment.content,
                        created_by: comment.user?.employee_id || comment.created_by,
                        created_by_name: comment.user?.full_name || comment.created_by_name,
                        created_by_email: comment.user?.email || comment.created_by_email,
                        created_at: comment.created_at,
                        is_hr_comment: comment.user?.role === 'hr' || comment.user?.role === 'admin' || comment.is_hr_comment,
                        images: comment.images || [],
                        documents: comment.documents?.map((doc: any) => ({
                            id: doc.id,
                            document: doc.document,
                            document_url: doc.document_url || doc.document,
                            document_name: doc.document_name,
                            uploaded_at: doc.uploaded_at
                        })) || []
                    };
                }) || [];
                const detailedItem: Item = {
                    id: itemData.id.toString(),
                    nature: itemData.nature || itemData.issue_type,
                    description: activeTab === 'requests' ? itemData.description : itemData.issue,
                    issue: itemData.issue,
                    status: itemData.status,
                    created_at: itemData.created_at,
                    updated_at: itemData.updated_at,
                    employee_name: itemData.employee_name || itemData.user_name,
                    employee_email: itemData.employee_email || itemData.user_email,
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

    const fetchCurrentUser = async (tkn: string) => {
        if (!tkn) return null;
        try {
            const response = await fetch(`${BACKEND_URL}/manager/getUser`, {
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

    const handleUpdateStatus = async (status: string) => {
        if (!token || !selectedItem) return;
        setLoading(true);
        try {
            const endpoint = activeTab === 'requests' ? 'updateRequest' : 'updateGrivience';
            const idField = activeTab === 'requests' ? 'request_id' : 'grievance_id';
            const response = await fetch(`${BACKEND_URL}/manager/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    [idField]: parseInt(selectedItem.id),
                    status: status
                }),
            });
            if (response.ok) {
                Alert.alert('Success', 'Status updated successfully!');
                const updatedItem = await fetchItemDetails(selectedItem.id);
                if (updatedItem) {
                    setSelectedItem(updatedItem);
                }
                await fetchItems();
            } else {
                const error = await response.json();
                Alert.alert('Error', error.message || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!selectedItem) return;
        // Only fetch if we need fresh data (e.g., after file upload)
        const updatedItem = await fetchItemDetails(selectedItem.id);
        if (updatedItem) {
            setSelectedItem(updatedItem);
        }
    };

    const handleEditItem = () => {
        if (!selectedItem) return;
        setViewMode(activeTab === 'requests' ? 'editRequest' : 'editGrievance');
    };

    const handleUpdateItem = async (data: { request_id?: string; grievance_id?: string; status: string }) => {
        if (!token || !selectedItem) return;
        setLoading(true);
        try {
            const endpoint = activeTab === 'requests' ? 'updateRequest' : 'updateGrivience';
            const idField = activeTab === 'requests' ? 'request_id' : 'grievance_id';
            const response = await fetch(`${BACKEND_URL}/manager/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    [idField]: parseInt(data.request_id || data.grievance_id || selectedItem.id),
                    status: data.status
                }),
            });
            if (response.ok) {
                Alert.alert('Success', `${activeTab === 'requests' ? 'Request' : 'Grievance'} updated successfully!`);
                if (viewMode.includes('edit')) {
                    setViewMode('main');
                } else {
                    const updatedItem = await fetchItemDetails(selectedItem.id);
                    if (updatedItem) {
                        setSelectedItem(updatedItem);
                    }
                }
                await fetchItems();
            } else {
                const error = await response.json();
                Alert.alert('Error', error.message || 'Failed to update');
            }
        } catch (error) {
            console.error('Error updating item:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCommonRequest = useCallback(async (formData: { common_request: string; description: string }) => {
        if (!token) return;
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/manager/addCommonRequest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    ...formData
                }),
            });
            if (response.ok) {
                Alert.alert('Success', 'Common request added successfully!');
                setViewMode('main');
                await fetchItems();
            } else {
                const error = await response.json();
                Alert.alert('Error', error.message || 'Failed to add common request');
            }
        } catch (error) {
            console.error('Error adding common request:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoading(false);
        }
    }, [token]);

    const handleAddCommonGrievance = useCallback(async (formData: { common_grievance: string; description: string }) => {
        if (!token) return;
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/manager/addCommonGrievance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    ...formData
                }),
            });
            if (response.ok) {
                Alert.alert('Success', 'Common grievance added successfully!');
                setViewMode('main');
                await fetchItems();
            } else {
                const error = await response.json();
                Alert.alert('Error', error.message || 'Failed to add common grievance');
            }
        } catch (error) {
            console.error('Error adding common grievance:', error);
            Alert.alert('Error', 'Network error occurred');
        } finally {
            setLoading(false);
        }
    }, [token]); // Only recreate if token changes

    const handleBackToMain = useCallback(() => {
        setViewMode('main');
    }, []);
    const getHeaderRightButton = () => {
        if (viewMode === 'main') {
            return {
                icon: 'add-circle-outline',
                onPress: () => {
                    const newMode = activeTab === 'requests' ? 'addCommonRequest' : 'addCommonGrievance';
                    // Use requestAnimationFrame to ensure state update happens after current render cycle
                    requestAnimationFrame(() => {
                        setViewMode(newMode);
                    });
                }
            };
        }
        return undefined;
    };

    // Render different views based on viewMode
    if (viewMode === 'addCommonRequest') {
        return (
            <CommonRequest
                onSubmit={handleAddCommonRequest}
                onBack={handleBackToMain}  // ← Use memoized callback
                loading={loading}
            />
        );
    }

    if (viewMode === 'addCommonGrievance') {
        return (
            <CommonGrievance
                onSubmit={handleAddCommonGrievance}
                onBack={handleBackToMain}  // ← Use memoized callback
                loading={loading}
            />
        );
    }

    if (viewMode === 'editRequest' && selectedItem) {
        return (
            <EditRequest
                item={selectedItem}
                token={token}
                onUpdate={handleUpdateItem}
                onBack={() => setViewMode('itemDetail')}
                loading={loading}
            />
        );
    }

    if (viewMode === 'editGrievance' && selectedItem) {
        return (
            <EditGrievance
                item={selectedItem}
                token={token}
                onUpdate={handleUpdateItem}
                onBack={() => setViewMode('itemDetail')}
                loading={loading}
            />
        );
    }

    if (viewMode === 'itemDetail') {
        if (activeTab === 'requests') {
            return (
                <RequestInfo
                    item={selectedItem}
                    activeTab={activeTab}
                    newComment={newComment}
                    onCommentChange={setNewComment}
                    onAddComment={handleAddComment}
                    onUpdateStatus={handleUpdateStatus}
                    onBack={() => {
                        setViewMode('main');
                        setSelectedItem(null);
                        setNewComment('');
                    }}
                    onEdit={handleEditItem}
                    loading={loading}
                    loadingDetails={loadingDetails}
                    currentUserEmail={currentUserEmail}
                    token={token}
                />
            );
        } else {
            return (
                <GrievanceInfo
                    item={selectedItem}
                    activeTab={activeTab}
                    newComment={newComment}
                    onCommentChange={setNewComment}
                    onAddComment={handleAddComment}
                    onUpdateStatus={handleUpdateStatus}
                    onBack={() => {
                        setViewMode('main');
                        setSelectedItem(null);
                        setNewComment('');
                    }}
                    onEdit={handleEditItem}
                    loading={loading}
                    loadingDetails={loadingDetails}
                    currentUserEmail={currentUserEmail}
                    token={token}
                />
            );
        }
    }

    // Main View
    return (
        <View style={styles.container}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={WHATSAPP_COLORS.primaryDark}
            />
            <Header
                title="HR Manager"
                subtitle=""
                onBack={onBack}
                rightButton={getHeaderRightButton()}
            />
            <View style={styles.tabBar}>
                {([
                    { key: 'requests' as const, label: 'Requests', icon: 'document-text' },
                    { key: 'grievances' as const, label: 'Grievances', icon: 'alert-circle' }
                ] as const).map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                        onPress={() => {
                            setActiveTab(tab.key);
                            setFilterStatus(null);
                        }}
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
            {activeTab === 'requests' ? (
                <Requests
                    items={requests}
                    loading={loading}
                    onItemPress={handleItemPress}
                    onUpdateStatus={(item, status) => handleUpdateStatus(status)}
                    activeTab={activeTab}
                    filterStatus={filterStatus}
                    onFilterChange={setFilterStatus}
                />
            ) : (
                <Grievances
                    items={grievances}
                    loading={loading}
                    onItemPress={handleItemPress}
                    onUpdateStatus={(item, status) => handleUpdateStatus(status)}
                    activeTab={activeTab}
                    filterStatus={filterStatus}
                    onFilterChange={setFilterStatus}
                />
            )}
        </View>
    );
};

export default HR_Manager;