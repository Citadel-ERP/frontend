import React, { useState, useEffect } from 'react';
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
import { CreateRequest } from './createRequest';
import { RequestInfo } from './requestInfo';
import { DropdownModal } from './DropdownModal';
import { RequestNature, Item, TabType, ViewMode, OTHER_OPTION } from './types';
import { BACKEND_URL } from '../../config/config';

interface HRProps {
    onBack: () => void;
}

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

    // Replace your fetchItemDetails function with this debug version
    // This will show you exactly what the backend is sending

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
                console.log('📦 RAW BACKEND RESPONSE:', JSON.stringify(data, null, 2));

                const itemData = activeTab === 'requests' ? data.request : data.grievance;

                console.log('📋 ITEM DATA:', JSON.stringify(itemData, null, 2));
                console.log('💬 COMMENTS COUNT:', itemData.comments?.length);

                // Log first comment with documents if exists
                if (itemData.comments && itemData.comments.length > 0) {
                    const firstComment = itemData.comments[0];
                    console.log('🔍 FIRST COMMENT STRUCTURE:', JSON.stringify(firstComment, null, 2));
                    console.log('📎 FIRST COMMENT HAS DOCUMENTS?', 'documents' in (firstComment.comment || firstComment));

                    // Check if documents exist anywhere in the structure
                    const commentObj = firstComment.comment || firstComment;
                    console.log('📄 COMMENT OBJECT KEYS:', Object.keys(commentObj));
                    console.log('📄 DOCUMENTS FIELD:', commentObj.documents);
                }

                const transformedComments = itemData.comments?.map((commentWrapper: any, index: number) => {
                    const comment = commentWrapper.comment;

                    console.log(`\n--- Processing Comment ${index + 1} ---`);
                    console.log('Comment ID:', comment.id);
                    console.log('Comment has documents?', !!comment.documents);
                    console.log('Documents array:', comment.documents);

                    // Transform documents array
                    const documents = comment.documents?.map((doc: any) => {
                        console.log('  📎 Processing document:', doc);
                        return {
                            id: doc.id,
                            document: doc.document,
                            document_url: doc.document_url || doc.document,
                            document_name: doc.document_name,
                            uploaded_at: doc.uploaded_at
                        };
                    }) || [];

                    console.log('  ✅ Transformed documents count:', documents.length);

                    return {
                        id: comment.id.toString(),
                        comment: comment.content,
                        content: comment.content,
                        created_by: comment.user.employee_id,
                        created_by_name: comment.user.full_name,
                        created_by_email: comment.user.email,
                        created_at: comment.created_at,
                        is_hr_comment: comment.user.role === 'hr' || comment.user.role === 'admin',
                        images: comment.images || [],
                        documents: documents
                    };
                }) || [];

                console.log('\n✨ FINAL TRANSFORMED COMMENTS:', JSON.stringify(transformedComments, null, 2));

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
        // FIXED: This function should only refresh the item, not send a new comment
        // The actual comment sending is handled by RequestInfo component's handleSendComment
        if (!selectedItem) {
            return;
        }

        setLoading(true);
        try {
            // Just refresh the item details
            setTimeout(async () => {
                const updatedItem = await fetchItemDetails(selectedItem.id);
                if (updatedItem) {
                    setSelectedItem(updatedItem);
                }
            }, 500);
        } catch (error) {
            console.error('Error refreshing item:', error);
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

    if (viewMode === 'itemDetail') {
        return (
            <RequestInfo
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
                <CreateRequest
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

            <Header
                title="HR Portal"
                subtitle={`${activeTab === 'requests' ? `${requests.length} requests` : `${grievances.length} grievances`}`}
                onBack={onBack}
            />

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

            <Requests
                items={currentItems}
                loading={loading}
                onItemPress={handleItemPress}
                onCancelItem={(item) => {
                    setSelectedItem(item);
                    cancelItem();
                }}
                onCreateNew={handleNewItemPress}
                activeTab={activeTab}
            />
        </View>
    );
};

export default HR;