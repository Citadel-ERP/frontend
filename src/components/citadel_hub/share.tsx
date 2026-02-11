// share.tsx - Fixed version
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Keyboard,
    Platform,
    Modal,
    Animated,
    Dimensions,
    Image,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// ============= TYPE DEFINITIONS =============
interface User {
    id?: number;
    employee_id?: string;
    first_name: string;
    last_name: string;
    profile_picture?: string;
    email?: string;
    designation?: string;
    department?: string;
    full_name?: string;
    type?: 'user';
}

interface Group {
    id: string;
    name: string;
    description?: string;
    profile_picture?: string;
    member_count: number;
    room_type: 'group';
    created_at?: string;
    type?: 'group';
}

interface Message {
    id: number;
    content: string;
    message_type: 'text' | 'image' | 'file' | 'audio' | 'video';
    sender: User;
    chat_room?: number;
}

interface ShareScreenProps {
    messageIds: number[];
    messages: Message[];
    chatRoomId?: number;
    apiBaseUrl: string;
    token: string;
    currentUser: User;
    onBack: () => void;
    onShareComplete: () => void;
    apiCall: (endpoint: string, data: any) => Promise<any>;
}

// ============= USER ITEM COMPONENT =============
interface UserItemProps {
    user: User;
    isSelected: boolean;
    onToggle: (userId: string) => void;
    disabled?: boolean;
}

const UserItem: React.FC<UserItemProps> = React.memo(({ user, isSelected, onToggle, disabled }) => {
    const getInitials = () => {
        const first = user.first_name?.[0] || '';
        const last = user.last_name?.[0] || '';
        return `${first}${last}`.toUpperCase() || '?';
    };

    const handlePress = () => {
        if (!disabled) {
            onToggle(user.employee_id || user.id?.toString() || '');
        }
    };

    return (
        <TouchableOpacity
            style={[styles.userItem, disabled && styles.userItemDisabled]}
            onPress={handlePress}
            activeOpacity={disabled ? 1 : 0.7}
            disabled={disabled}
        >
            <View style={styles.userAvatarContainer}>
                {user.profile_picture ? (
                    <Image source={{ uri: user.profile_picture }} style={styles.userAvatar} />
                ) : (
                    <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                        <Text style={styles.userAvatarText}>{getInitials()}</Text>
                    </View>
                )}
            </View>

            <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                    {user.first_name} {user.last_name}
                </Text>
                {user.designation && (
                    <Text style={styles.userDesignation} numberOfLines={1}>
                        {user.designation}
                        {user.department ? ` • ${user.department}` : ''}
                    </Text>
                )}
                {user.email && (
                    <Text style={styles.userEmail} numberOfLines={1}>
                        {user.email}
                    </Text>
                )}
            </View>

            <View style={styles.selectionContainer}>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
});

// ============= GROUP ITEM COMPONENT =============
interface GroupItemProps {
    group: Group;
    isSelected: boolean;
    onToggle: (groupId: string) => void;
    disabled?: boolean;
}

const GroupItem: React.FC<GroupItemProps> = React.memo(({ group, isSelected, onToggle, disabled }) => {
    const handlePress = () => {
        if (!disabled) {
            onToggle(group.id);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.userItem, disabled && styles.userItemDisabled]}
            onPress={handlePress}
            activeOpacity={disabled ? 1 : 0.7}
            disabled={disabled}
        >
            <View style={styles.userAvatarContainer}>
                {group.profile_picture ? (
                    <Image source={{ uri: group.profile_picture }} style={styles.userAvatar} />
                ) : (
                    <View style={[styles.userAvatar, styles.groupAvatarPlaceholder]}>
                        <Ionicons name="people" size={24} color="#8696A0" />
                    </View>
                )}
            </View>

            <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                    {group.name}
                </Text>
                <View style={styles.groupMetaRow}>
                    <Ionicons name="people-outline" size={14} color="#8696A0" />
                    <Text style={styles.groupMemberCount}>
                        {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                    </Text>
                </View>
                {group.description && (
                    <Text style={styles.userEmail} numberOfLines={1}>
                        {group.description}
                    </Text>
                )}
            </View>

            <View style={styles.selectionContainer}>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
});

// ============= MAIN SHARE SCREEN =============
export const ShareScreen: React.FC<ShareScreenProps> = ({
    messageIds,
    messages,
    chatRoomId,
    apiBaseUrl,
    token,
    currentUser,
    onBack,
    onShareComplete,
    apiCall,
}) => {
    // State Management
    const [combinedList, setCombinedList] = useState<Array<(User & { type: 'user' }) | (Group & { type: 'group' })>>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [showGroupOptions, setShowGroupOptions] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [createAsGroup, setCreateAsGroup] = useState(false);
    const [totalUserCount, setTotalUserCount] = useState(0);
    const [totalGroupCount, setTotalGroupCount] = useState(0);
    const [hasChosenShareType, setHasChosenShareType] = useState(false);

    // Refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const isMountedRef = useRef(true);

    const fetchCombinedList = useCallback(async (search: string = '') => {
        if (isLoading) return;

        setIsLoading(true);
        setHasError(false);

        try {
            const result = await apiCall('getUsersForSharing', {
                search,
                exclude_chat_id: chatRoomId,
            });

            if (isMountedRef.current) {
                setCombinedList(result.combined_list || []);
                setTotalUserCount(result.user_count || 0);
                setTotalGroupCount(result.group_count || 0);
            }
        } catch (error) {
            console.error('Error fetching users and groups:', error);
            if (isMountedRef.current) {
                setHasError(true);
                Alert.alert(
                    'Connection Error',
                    'Unable to load users and groups. Please check your connection and try again.',
                    [{ text: 'Retry', onPress: () => fetchCombinedList(search) }]
                );
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [apiCall, chatRoomId, isLoading]);

    const debouncedSearch = useMemo(() => {
        let timeoutId: NodeJS.Timeout;
        return (query: string) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                fetchCombinedList(query);
            }, 500);
        };
    }, [fetchCombinedList]);

    // ============= SELECTION HANDLERS =============
    const handleUserToggle = useCallback((userId: string) => {
        setSelectedUserIds(prev => {
            const next = new Set(prev);
            const wasSelected = next.has(userId);

            if (wasSelected) {
                next.delete(userId);

                // Reset group settings if total selection goes below 2
                const totalSelected = next.size + selectedGroupIds.size;
                if (totalSelected <= 1) {
                    setCreateAsGroup(false);
                    setHasChosenShareType(false);
                }
            } else {
                next.add(userId);

                // Show group options if crossing 2-recipient threshold (users only)
                const totalSelected = next.size + selectedGroupIds.size;
                if (totalSelected === 2 && !hasChosenShareType && selectedGroupIds.size === 0) {
                    setShowGroupOptions(true);
                }
            }

            return next;
        });
    }, [selectedGroupIds.size, hasChosenShareType]);

    const handleGroupToggle = useCallback((groupId: string) => {
        setSelectedGroupIds(prev => {
            const next = new Set(prev);

            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }

            return next;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        const totalItems = combinedList.length;
        const totalSelected = selectedUserIds.size + selectedGroupIds.size;

        if (totalSelected === totalItems) {
            // Deselect all
            setSelectedUserIds(new Set());
            setSelectedGroupIds(new Set());
            setCreateAsGroup(false);
            setHasChosenShareType(false);
        } else {
            // Select all
            const allUserIds = new Set(
                combinedList
                    .filter(item => item.type === 'user')
                    .map(item => (item as User).employee_id || (item as User).id?.toString() || '')
            );
            const allGroupIds = new Set(
                combinedList
                    .filter(item => item.type === 'group')
                    .map(item => (item as Group).id)
            );

            setSelectedUserIds(allUserIds);
            setSelectedGroupIds(allGroupIds);

            // Show group options if selecting multiple users and no groups
            if (allUserIds.size > 1 && allGroupIds.size === 0 && !hasChosenShareType) {
                setShowGroupOptions(true);
            }
        }
    }, [combinedList, selectedUserIds.size, selectedGroupIds.size, hasChosenShareType]);

    const handleGroupOptionSelect = useCallback((isGroup: boolean) => {
        setCreateAsGroup(isGroup);
        setHasChosenShareType(true);
        setShowGroupOptions(false);
    }, []);

    // ============= SHARE FUNCTION =============
    const handleShare = useCallback(async () => {
        const totalSelected = selectedUserIds.size + selectedGroupIds.size;

        if (totalSelected === 0) {
            Alert.alert('No Recipients', 'Please select at least one recipient or group.');
            return;
        }
        if (messageIds.length === 0) {
            Alert.alert('No Messages', 'There are no messages to share.');
            return;
        }

        setIsSharing(true);

        try {
            const shareData: any = {
                message_ids: messageIds,
                recipient_ids: Array.from(selectedUserIds),
                recipient_group_ids: Array.from(selectedGroupIds),
                create_group: createAsGroup && selectedGroupIds.size === 0,
            };

            if (createAsGroup && selectedGroupIds.size === 0) {
                if (groupName.trim()) {
                    shareData.group_name = groupName.trim();
                }
                if (groupDescription.trim()) {
                    shareData.group_description = groupDescription.trim();
                }
            }

            const result = await apiCall('shareMessages', shareData);

            if (result.message) {
                Alert.alert(
                    'Success',
                    result.message,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                onShareComplete();
                                onBack();
                            },
                        },
                    ]
                );
            }
        } catch (error: any) {
            console.error('Error sharing messages:', error);
            Alert.alert(
                'Share Failed',
                error.message || 'Unable to share messages. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            if (isMountedRef.current) {
                setIsSharing(false);
            }
        }
    }, [
        selectedUserIds,
        selectedGroupIds,
        messageIds,
        createAsGroup,
        groupName,
        groupDescription,
        apiCall,
        onBack,
        onShareComplete,
    ]);

    // ============= EFFECTS =============
    useEffect(() => {
        isMountedRef.current = true;
        fetchCombinedList();

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (searchQuery !== undefined) {
            debouncedSearch(searchQuery);
        }
    }, [searchQuery, debouncedSearch]);

    // ============= RENDER FUNCTIONS =============
    const renderHeader = () => {
        const totalSelected = selectedUserIds.size + selectedGroupIds.size;

        return (
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={onBack}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Share Messages</Text>
                    <Text style={styles.headerSubtitle}>
                        {messageIds.length} message{messageIds.length !== 1 ? 's' : ''} • {totalSelected} selected
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.shareButton, totalSelected === 0 && styles.shareButtonDisabled]}
                    onPress={handleShare}
                    disabled={totalSelected === 0 || isSharing}
                    activeOpacity={0.7}
                >
                    {isSharing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.shareButtonText}>
                            Share{totalSelected > 0 ? ` (${totalSelected})` : ''}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    const renderSearchBar = () => (
        <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#8696A0" style={styles.searchIcon} />
            <TextInput
                style={styles.searchInput}
                placeholder="Search users and groups..."
                placeholderTextColor="#8696A0"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
            />
            {searchQuery.length > 0 && (
                <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.clearSearchButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="close-circle" size={20} color="#8696A0" />
                </TouchableOpacity>
            )}
        </View>
    );

    const renderEmptyState = () => {
        if (isLoading) {
            return (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color="#008069" />
                    <Text style={styles.emptyText}>Loading...</Text>
                </View>
            );
        }

        if (hasError) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cloud-offline-outline" size={64} color="#8696A0" />
                    <Text style={styles.emptyText}>Unable to load</Text>
                    <Text style={styles.emptySubtext}>Please check your connection</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => fetchCombinedList(searchQuery)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (searchQuery) {
            return (
                <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={64} color="#8696A0" />
                    <Text style={styles.emptyText}>No results found</Text>
                    <Text style={styles.emptySubtext}>Try a different search term</Text>
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#8696A0" />
                <Text style={styles.emptyText}>No users or groups available</Text>
            </View>
        );
    };

    const renderGroupOptionsModal = () => (
        <Modal
            visible={showGroupOptions}
            transparent
            animationType="fade"
            onRequestClose={() => { }}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.groupOptionsModal}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Share as Group?</Text>
                        <Text style={styles.modalSubtitle}>
                            You're sharing to {selectedUserIds.size} users. Would you like to create a group or send individually?
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.groupOption}
                        onPress={() => handleGroupOptionSelect(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.groupOptionIcon}>
                            <Ionicons name="people" size={24} color="#008069" />
                        </View>
                        <View style={styles.groupOptionText}>
                            <Text style={styles.groupOptionTitle}>Create New Group</Text>
                            <Text style={styles.groupOptionDescription}>
                                Messages will be shared in a new group chat
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.groupOption}
                        onPress={() => handleGroupOptionSelect(false)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.groupOptionIcon}>
                            <Ionicons name="person" size={24} color="#008069" />
                        </View>
                        <View style={styles.groupOptionText}>
                            <Text style={styles.groupOptionTitle}>Send Individually</Text>
                            <Text style={styles.groupOptionDescription}>
                                Each user will receive messages in separate chats
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderGroupSettings = () => {
        if (!createAsGroup || selectedUserIds.size <= 1 || selectedGroupIds.size > 0) return null;

        return (
            <View style={styles.groupSettings}>
                <View style={styles.groupSettingsHeader}>
                    <Ionicons name="people" size={20} color="#008069" />
                    <Text style={styles.groupSettingsTitle}>Group Settings</Text>
                    <TouchableOpacity
                        style={styles.changeShareTypeButton}
                        onPress={() => {
                            setHasChosenShareType(false);
                            setShowGroupOptions(true);
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.changeShareTypeText}>Change</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Group Name (Optional)</Text>
                    <TextInput
                        style={styles.formInput}
                        placeholder={`Chat with ${selectedUserIds.size} people`}
                        placeholderTextColor="#8696A0"
                        value={groupName}
                        onChangeText={setGroupName}
                        maxLength={100}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Description (Optional)</Text>
                    <TextInput
                        style={[styles.formInput, styles.formTextArea]}
                        placeholder="Add a group description"
                        placeholderTextColor="#8696A0"
                        value={groupDescription}
                        onChangeText={setGroupDescription}
                        multiline
                        numberOfLines={3}
                        maxLength={500}
                    />
                </View>
            </View>
        );
    };

    const renderIndividualShareInfo = () => {
        if (createAsGroup || selectedUserIds.size <= 1 || !hasChosenShareType || selectedGroupIds.size > 0) return null;

        return (
            <View style={styles.shareInfoBanner}>
                <View style={styles.shareInfoContent}>
                    <Ionicons name="information-circle" size={20} color="#008069" />
                    <Text style={styles.shareInfoText}>
                        Messages will be sent to {selectedUserIds.size} users individually
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.changeShareTypeButton}
                    onPress={() => {
                        setHasChosenShareType(false);
                        setShowGroupOptions(true);
                    }}
                    activeOpacity={0.7}
                >
                    <Text style={styles.changeShareTypeText}>Change</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderItem = ({ item }: { item: any }) => {
        if (item.type === 'group') {
            return (
                <GroupItem
                    group={item}
                    isSelected={selectedGroupIds.has(item.id)}
                    onToggle={handleGroupToggle}
                />
            );
        } else {
            return (
                <UserItem
                    user={item}
                    isSelected={selectedUserIds.has(item.employee_id || item.id?.toString() || '')}
                    onToggle={handleUserToggle}
                />
            );
        }
    };

    const totalSelected = selectedUserIds.size + selectedGroupIds.size;
    const totalItems = combinedList.length;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#008069" />

            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {renderHeader()}

                <View style={styles.contentBody}>
                    {renderSearchBar()}

                    <View style={styles.selectionHeader}>
                        <TouchableOpacity
                            style={styles.selectAllButton}
                            onPress={handleSelectAll}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.checkbox,
                                totalSelected === totalItems && totalItems > 0 && styles.checkboxSelected
                            ]}>
                                {totalSelected === totalItems && totalItems > 0 && (
                                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                )}
                            </View>
                            <Text style={styles.selectAllText}>
                                {totalSelected === totalItems && totalItems > 0
                                    ? 'Deselect All'
                                    : 'Select All'}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.userCount}>
                            {totalUserCount} user{totalUserCount !== 1 ? 's' : ''}, {totalGroupCount} group{totalGroupCount !== 1 ? 's' : ''}
                        </Text>
                    </View>

                    {renderGroupSettings()}
                    {renderIndividualShareInfo()}

                    <FlatList
                        data={combinedList}
                        renderItem={renderItem}
                        keyExtractor={(item, index) =>
                            item.type === 'group'
                                ? `group-${item.id}`
                                : `user-${(item as User).employee_id || (item as User).id || index}`
                        }
                        ListEmptyComponent={renderEmptyState}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    />
                </View>
            </Animated.View>

            {renderGroupOptionsModal()}
        </SafeAreaView>
    );
};

// ============= STYLES =============
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
    },
    contentBody: {
        flex: 1,
        backgroundColor: '#F0F2F5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#008069',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        paddingTop: 50,
    },
    backButton: {
        padding: 8,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    shareButton: {
        backgroundColor: '#00A884',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
    },
    shareButtonDisabled: {
        backgroundColor: 'rgba(0, 168, 132, 0.5)',
    },
    shareButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#111B21',
        padding: 0,
    },
    clearSearchButton: {
        padding: 4,
    },
    selectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E9EDEF',
    },
    selectAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#8696A0',
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    checkboxSelected: {
        backgroundColor: '#008069',
        borderColor: '#008069',
    },
    selectAllText: {
        fontSize: 15,
        color: '#111B21',
        fontWeight: '500',
    },
    userCount: {
        fontSize: 14,
        color: '#8696A0',
    },
    listContent: {
        paddingBottom: 20,
        flexGrow: 1,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F2F5',
    },
    userItemDisabled: {
        opacity: 0.5,
    },
    userAvatarContainer: {
        marginRight: 12,
    },
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    userAvatarPlaceholder: {
        backgroundColor: '#E9EDEF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupAvatarPlaceholder: {
        backgroundColor: '#D1F4E8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userAvatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#8696A0',
    },
    userInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111B21',
        marginBottom: 2,
    },
    userDesignation: {
        fontSize: 14,
        color: '#667781',
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 13,
        color: '#8696A0',
    },
    groupMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    groupMemberCount: {
        fontSize: 13,
        color: '#8696A0',
    },
    selectionContainer: {
        marginLeft: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#667781',
        marginTop: 20,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#8696A0',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    retryButton: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#008069',
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    groupSettings: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 10,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    groupSettingsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    groupSettingsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111B21',
        marginLeft: 8,
        flex: 1,
    },
    changeShareTypeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#F0F2F5',
    },
    changeShareTypeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#008069',
    },
    shareInfoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#E7F8F5',
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 10,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#008069',
    },
    shareInfoContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    shareInfoText: {
        fontSize: 14,
        color: '#111B21',
        marginLeft: 8,
        flex: 1,
    },
    formGroup: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#667781',
        marginBottom: 8,
    },
    formInput: {
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#E9EDEF',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: '#111B21',
    },
    formTextArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    groupOptionsModal: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        padding: 24,
    },
    modalHeader: {
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111B21',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#667781',
        lineHeight: 20,
    },
    groupOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    groupOptionIcon: {
        marginRight: 16,
    },
    groupOptionText: {
        flex: 1,
    },
    groupOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111B21',
        marginBottom: 4,
    },
    groupOptionDescription: {
        fontSize: 14,
        color: '#667781',
        lineHeight: 18,
    },
});

export default ShareScreen;