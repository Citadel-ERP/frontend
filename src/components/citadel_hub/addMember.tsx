import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Image,
    ActivityIndicator,
    Alert,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface User {
    id?: number;
    employee_id?: string;
    first_name: string;
    last_name: string;
    email: string;
    profile_picture?: string;
    designation?: string;
}

interface ChatRoomMember {
    id?: number;
    user?: User;
}

interface ChatRoom {
    id: number;
    name?: string;
    room_type: 'direct' | 'group';
    members: (User | ChatRoomMember)[];
}

interface AddMemberProps {
    chatRoom: ChatRoom;
    currentUser: User;
    onBack: () => void;
    onMembersAdded: () => void;
    onOptimisticAdd?: (member: User) => void;  // ← ADD THIS
    apiCall: (endpoint: string, data: any) => Promise<any>;
}

export const AddMember: React.FC<AddMemberProps> = ({
    chatRoom,
    currentUser,
    onBack,
    onMembersAdded,
    onOptimisticAdd,
    apiCall,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // Get existing member IDs
    const existingMemberIds = new Set(
        chatRoom.members.map(m => {
            const user = 'user' in m ? m.user : m;
            return user?.employee_id || user?.id?.toString();
        }).filter(Boolean)
    );

    useEffect(() => {
        loadUsers();
    }, [searchQuery]);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const result = await apiCall('searchUsers', { search: searchQuery });
            if (result.users) {
                // Filter out existing members and current user
                const availableUsers = result.users.filter((user: User) => {
                    const userId = user.employee_id || user.id?.toString();
                    return !existingMemberIds.has(userId);
                });
                setUsers(availableUsers);
            }
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleUserSelection = (employeeId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(employeeId)) {
            newSelected.delete(employeeId);
        } else {
            newSelected.add(employeeId);
        }
        setSelectedUsers(newSelected);
    };

    const handleAddMembers = async () => {
        if (selectedUsers.size === 0) {
            Alert.alert('No Selection', 'Please select at least one member to add');
            return;
        }

        setIsAdding(true);
        let successCount = 0;
        let failedCount = 0;

        try {
            // Add members one by one
            for (const employeeId of Array.from(selectedUsers)) {
                try {
                    await apiCall('addMember', {
                        chat_room_id: chatRoom.id,
                        user_id: employeeId,
                    });
                    successCount++;
                    if (onOptimisticAdd) {
                        const addedUser = users.find(u =>
                            (u.employee_id || u.id?.toString()) === employeeId
                        );
                        if (addedUser) {
                            onOptimisticAdd(addedUser);
                        }
                    }
                } catch (error) {
                    console.error(`Failed to add user ${employeeId}:`, error);
                    failedCount++;
                }
            }

            if (successCount > 0) {
                Alert.alert(
                    'Success',
                    `Successfully added ${successCount} member${successCount > 1 ? 's' : ''}${failedCount > 0 ? `. Failed to add ${failedCount}.` : ''
                    }`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                onMembersAdded();
                                onBack();
                            },
                        },
                    ]
                );
            } else {
                Alert.alert('Error', 'Failed to add members. Please try again.');
            }
        } catch (error) {
            console.error('Error adding members:', error);
            Alert.alert('Error', 'An error occurred while adding members');
        } finally {
            setIsAdding(false);
        }
    };

    const renderUser = ({ item }: { item: User }) => {
        const userId = item.employee_id || item.id?.toString() || '';
        const isSelected = selectedUsers.has(userId);

        return (
            <TouchableOpacity
                style={[styles.userItem, isSelected && styles.userItemSelected]}
                onPress={() => toggleUserSelection(userId)}
                activeOpacity={0.7}
            >
                <View style={styles.userAvatar}>
                    {item.profile_picture ? (
                        <Image source={{ uri: item.profile_picture }} style={styles.userAvatarImage} />
                    ) : (
                        <View style={styles.userAvatarPlaceholder}>
                            <Text style={styles.userAvatarText}>
                                {item.first_name[0]}{item.last_name?.[0] || ''}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                        {item.first_name} {item.last_name}
                    </Text>
                    <Text style={styles.userEmail} numberOfLines={1}>
                        {item.designation || item.email}
                    </Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={18} color="#ffffff" />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Add Members</Text>
                    <Text style={styles.headerSubtitle}>
                        {selectedUsers.size} selected
                    </Text>
                </View>
                <View style={styles.headerSpacer} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#8696a0" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search users..."
                    placeholderTextColor="#8696a0"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* User List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#00a884" />
                </View>
            ) : users.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={64} color="#8696a0" />
                    <Text style={styles.emptyText}>
                        {searchQuery ? 'No users found' : 'All users are already members'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderUser}
                    keyExtractor={(item) => item.employee_id || item.id?.toString() || Math.random().toString()}
                    contentContainerStyle={styles.listContent}
                />
            )}

            {/* Add Button */}
            {selectedUsers.size > 0 && (
                <View style={styles.addButtonContainer}>
                    <TouchableOpacity
                        style={[styles.addButton, isAdding && styles.addButtonDisabled]}
                        onPress={handleAddMembers}
                        disabled={isAdding}
                        activeOpacity={0.8}
                    >
                        {isAdding ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <>
                                <Ionicons name="person-add" size={20} color="#ffffff" />
                                <Text style={styles.addButtonText}>
                                    Add {selectedUsers.size} Member{selectedUsers.size > 1 ? 's' : ''}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#008069',
        paddingTop: 90,
        paddingBottom: 16,
        paddingHorizontal: 16,
        marginTop: Platform.OS === 'ios' ? -80 : -50,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 19,
        color: '#ffffff',
        fontWeight: '500',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#d9fdd3',
        marginTop: 2,
    },
    headerSpacer: {
        width: 40,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
        margin: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#111b21',
        paddingVertical: 4,
    },
    listContent: {
        paddingBottom: 100,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f2f5',
    },
    userItemSelected: {
        backgroundColor: '#d9fdd3',
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    userAvatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    userAvatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
        backgroundColor: '#e9edef',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userAvatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8696a0',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '400',
        color: '#111b21',
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 14,
        color: '#667781',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#8696a0',
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#00a884',
        borderColor: '#00a884',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#667781',
        textAlign: 'center',
        marginTop: 16,
    },
    addButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#e9edef',
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00a884',
        paddingVertical: 14,
        borderRadius: 24,
        gap: 8,
    },
    addButtonDisabled: {
        opacity: 0.6,
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
});