// screens/ChatScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Image,
    Alert,
    Modal,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
    StatusBar,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL, BACKEND_URL_WEBSOCKET } from '../../config/config';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

// WhatsApp Colors
const whatsappColors = {
    dark: {
        background: '#0C1317',
        card: '#202C33',
        text: '#E9EDEF',
        textSecondary: '#8696A0',
        textLight: '#667781',
        border: '#2A3942',
        primary: '#008069', // WhatsApp green
        accent: '#00A884',
        header: '#202C33',
        icon: '#AEBAC1',
        danger: '#F15C6D',
        warning: '#F59E0B',
        unread: '#53BDEB',
        myMessageBg: '#005C4B',
        theirMessageBg: '#202C33',
        inputBg: '#2A3942',
        chatItemBg: '#111B21',
        modalBg: '#111B21',
        searchBg: '#202C33',
    },
    light: {
        background: '#FFFFFF',
        card: '#F0F2F5',
        text: '#111B21',
        textSecondary: '#667781',
        textLight: '#8696A0',
        border: '#E1E8ED',
        primary: '#008069', // WhatsApp green
        accent: '#00A884',
        header: '#008069', // WhatsApp green header
        icon: '#8696A0',
        danger: '#F15C6D',
        warning: '#F59E0B',
        unread: '#008069',
        myMessageBg: '#D9FDD3',
        theirMessageBg: '#FFFFFF',
        inputBg: '#F0F2F5',
        chatItemBg: '#FFFFFF',
        modalBg: '#FFFFFF',
        searchBg: '#F0F2F5',
    }
};

const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 20,
    full: 999,
};

const fontSize = {
    xs: 12,
    sm: 13,
    md: 14,
    lg: 16,
    xl: 17,
    xxl: 20,
};

interface Message {
  id: number;
  chat_room: number;
  sender: any;
  message_type: 'text' | 'image' | 'file' | 'contact';
  content?: string;
  file?: any;
  image?: any;
  contact_data?: any;
  parent_message?: any;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  reactions: any[];
  read_receipts: any[];
  thread: any;
  is_read: boolean;
}

interface ChatRoom {
  id: number;
  name?: string;
  room_type: 'direct' | 'group';
  last_message?: string | Message;
  last_message_at?: string;
  unread_count?: number;
  profile_picture?: string;
  members?: Array<{
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  }>;
}

interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    full_name?: string;
}

interface ChatScreenProps {
    onBack: () => void;
    onOpenChatRoom: (chatRoom: ChatRoom) => void;
    currentUserId?: number;
    isDark?: boolean;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ 
    onBack, 
    onOpenChatRoom, 
    currentUserId = 1,
    isDark = false 
}) => {
    const insets = useSafeAreaInsets();
    const currentColors = isDark ? whatsappColors.dark : whatsappColors.light;
    
    const [chats, setChats] = useState<ChatRoom[]>([]);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [isGroupChat, setIsGroupChat] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState<string>('');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        const getToken = async () => {
            const storedToken = await AsyncStorage.getItem('token_2');
            if (storedToken) {
                setToken(storedToken);
            }
        };
        getToken();
    }, []);

    useEffect(() => {
        if (token) {
            loadChatRooms();
        }
    }, [token]);

    const loadChatRooms = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${BACKEND_URL}/citadel_hub/getChatRooms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token }),
            });

            const data = await response.json();

            if (response.ok) {
                setChats(data.chat_rooms || []);
            } else {
                Alert.alert('Error', data.message || 'Failed to load chats');
            }
        } catch (error) {
            console.error('Error loading chats:', error);
            Alert.alert('Error', 'Failed to load chats');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadChatRooms();
    };

    const getMessagePreview = (message: any): string => {
        if (!message) return '';

        if (typeof message === 'string') {
            return message;
        }

        if (typeof message === 'object') {
            if (message.message_type === 'text' && message.content) {
                return message.content.length > 30 
                    ? message.content.substring(0, 30) + '...' 
                    : message.content;
            } else if (message.message_type === 'image') {
                return '📷 Photo';
            } else if (message.message_type === 'file' && message.file) {
                return `📎 ${message.file.name || 'File'}`;
            } else if (message.message_type === 'contact' && message.contact_data) {
                return '👤 Contact';
            } else if (message.content) {
                return message.content.length > 30 
                    ? message.content.substring(0, 30) + '...' 
                    : message.content;
            }
        }

        return '';
    };

    const searchUsers = async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/citadel_hub/searchUsers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    search: query
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSearchResults(data.users || []);
            }
        } catch (error) {
            console.error('Error searching users:', error);
        }
    };

    const createNewChat = async () => {
        if (selectedUsers.length === 0) return;

        try {
            setLoading(true);

            const endpoint = isGroupChat
                ? `${BACKEND_URL}/citadel_hub/createGroupChat`
                : `${BACKEND_URL}/citadel_hub/createDirectChat`;

            const body = isGroupChat
                ? {
                    token,
                    name: groupName,
                    member_ids: selectedUsers.map(user => user.id)
                }
                : {
                    token,
                    user_id: selectedUsers[0].id
                };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.ok) {
                setShowNewChatModal(false);
                resetNewChatModal();
                loadChatRooms();
                onOpenChatRoom(data.chat_room);
            } else {
                Alert.alert('Error', data.message || 'Failed to create chat');
            }
        } catch (error) {
            console.error('Error creating chat:', error);
            Alert.alert('Error', 'Failed to create chat');
        } finally {
            setLoading(false);
        }
    };

    const resetNewChatModal = () => {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedUsers([]);
        setIsGroupChat(false);
        setGroupName('');
    };

    const getOtherUserName = (chatRoom: ChatRoom): string => {
        if (chatRoom.room_type === 'direct' && chatRoom.members) {
            const otherMember = chatRoom.members.find(member => member.id !== currentUserId);
            return otherMember ? `${otherMember.first_name} ${otherMember.last_name}` : 'Unknown User';
        }
        return chatRoom.name || 'Group Chat';
    };

    const formatTime = (timestamp?: string): string => {
        if (!timestamp) return '';
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now.getTime() - date.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));

            if (hours < 24) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (hours < 48) {
                return 'Yesterday';
            } else {
                return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
        } catch (error) {
            return '';
        }
    };

    const getInitials = (name: string): string => {
        return name.split(' ').map(n => n.charAt(0).toUpperCase()).join('').substring(0, 2);
    };

    const renderChatItem = ({ item }: { item: ChatRoom }) => {
        const displayName = getOtherUserName(item);
        const initials = getInitials(displayName);
        const timeString = formatTime(item.last_message_at);
        const messagePreview = getMessagePreview(item.last_message);
        const isUnread = item.unread_count && item.unread_count > 0;

        return (
            <TouchableOpacity
                style={[styles.chatItem, { 
                    backgroundColor: currentColors.chatItemBg,
                    borderBottomColor: currentColors.border 
                }]}
                onPress={() => onOpenChatRoom(item)}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.chatAvatar,
                    { backgroundColor: currentColors.primary }
                ]}>
                    {item.profile_picture ? (
                        <Image 
                            source={{ uri: item.profile_picture }} 
                            style={styles.chatAvatarImage} 
                        />
                    ) : (
                        <Text style={styles.chatAvatarText}>{initials}</Text>
                    )}
                </View>

                <View style={styles.chatInfo}>
                    <View style={styles.chatInfoTop}>
                        <Text style={[styles.chatName, { color: currentColors.text }]} numberOfLines={1}>
                            {displayName}
                        </Text>
                        {timeString ? (
                            <Text style={[styles.chatTime, { color: currentColors.textSecondary }]}>
                                {timeString}
                            </Text>
                        ) : null}
                    </View>
                    
                    <View style={styles.chatInfoBottom}>
                        {messagePreview ? (
                            <Text style={[
                                styles.lastMessage, 
                                { 
                                    color: isUnread ? currentColors.text : currentColors.textSecondary,
                                    fontWeight: isUnread ? '500' : '400'
                                }
                            ]} numberOfLines={1}>
                                {messagePreview}
                            </Text>
                        ) : (
                            <Text style={[styles.lastMessage, { color: currentColors.textSecondary }]}>
                                Start a conversation
                            </Text>
                        )}
                        
                        {isUnread && (
                            <View style={[styles.unreadBadge, { backgroundColor: currentColors.primary }]}>
                                <Text style={styles.unreadCount}>
                                    {item.unread_count && item.unread_count > 99 ? '99+' : item.unread_count?.toString()}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                <TouchableOpacity style={styles.chatMenuButton}>
                    <Ionicons name="ellipsis-vertical" size={16} color={currentColors.textSecondary} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    const renderUserSearchItem = ({ item: user }: { item: User }) => {
        const isSelected = selectedUsers.some(u => u.id === user.id);
        const fullName = user.full_name || `${user.first_name} ${user.last_name}`;

        return (
            <TouchableOpacity
                style={[
                    styles.userItem, 
                    { 
                        backgroundColor: currentColors.card,
                        borderBottomColor: currentColors.border 
                    },
                    isSelected && { backgroundColor: currentColors.primary + '20' }
                ]}
                onPress={() => {
                    if (!isGroupChat) {
                        setSelectedUsers([user]);
                        setSearchQuery('');
                        setSearchResults([]);
                    } else {
                        setSelectedUsers(prev =>
                            prev.some(u => u.id === user.id)
                                ? prev.filter(u => u.id !== user.id)
                                : [...prev, user]
                        );
                    }
                }}
            >
                <View style={styles.userItemContent}>
                    <View style={[styles.userAvatar, { backgroundColor: currentColors.primary }]}>
                        <Text style={styles.userAvatarText}>
                            {getInitials(fullName)}
                        </Text>
                    </View>
                    <View style={styles.userDetails}>
                        <Text style={[styles.userName, { color: currentColors.text }]}>
                            {fullName}
                        </Text>
                        <Text style={[styles.userEmail, { color: currentColors.textSecondary }]}>
                            {user.email}
                        </Text>
                    </View>
                    {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={currentColors.primary} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderHeader = () => (
        <View style={[
            styles.header,
            { 
                backgroundColor: currentColors.header,
                paddingTop: Platform.OS === 'ios' ? insets.top : 10,
            }
        ]}>
            <View style={styles.headerContent}>
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={onBack}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                
                <Text style={styles.headerTitle}>Chats</Text>
                
                <TouchableOpacity style={styles.headerMenuButton}>
                    <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderModalHeader = () => (
        <View style={[
            styles.modalHeaderContainer,
            { backgroundColor: currentColors.header }
        ]}>
            <TouchableOpacity 
                style={styles.modalBackButton}
                onPress={() => {
                    setShowNewChatModal(false);
                    resetNewChatModal();
                }}
            >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                <Text style={styles.modalBackText}>Cancel</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>
                {isGroupChat ? 'New group' : 'New chat'}
            </Text>
            
            <TouchableOpacity 
                style={[
                    styles.modalActionButton,
                    (selectedUsers.length === 0 || loading) && styles.modalActionButtonDisabled
                ]}
                onPress={createNewChat}
                disabled={selectedUsers.length === 0 || loading}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <Ionicons 
                        name="arrow-forward" 
                        size={24} 
                        color={selectedUsers.length === 0 ? 'rgba(255,255,255,0.5)' : '#FFFFFF'} 
                    />
                )}
            </TouchableOpacity>
        </View>
    );

    const renderSelectedUsers = () => {
        if (selectedUsers.length === 0) return null;

        return (
            <View style={styles.selectedUsersContainer}>
                <FlatList
                    data={selectedUsers}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item: user }) => {
                        const fullName = user.full_name || `${user.first_name} ${user.last_name}`;
                        const firstName = fullName.split(' ')[0];
                        return (
                            <View style={[styles.selectedUserChip, { backgroundColor: currentColors.primary }]}>
                                <Text style={styles.selectedUserName}>{firstName}</Text>
                                <TouchableOpacity
                                    onPress={() => setSelectedUsers(prev => prev.filter(u => u.id !== user.id))}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        );
                    }}
                    keyExtractor={item => item.id.toString()}
                />
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: currentColors.background }]}>
            <StatusBar 
                barStyle="light-content" 
                backgroundColor={currentColors.header} 
            />
            
            {/* Header */}
            {renderHeader()}
            
            {/* Chat List */}
            <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
                {loading && chats.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={currentColors.primary} />
                    </View>
                ) : chats.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={[styles.emptyIconContainer, { backgroundColor: currentColors.card }]}>
                            <Ionicons 
                                name="chatbubbles-outline" 
                                size={48} 
                                color={currentColors.textSecondary} 
                            />
                        </View>
                        <Text style={[styles.emptyStateText, { color: currentColors.text }]}>
                            No chats yet
                        </Text>
                        <Text style={[styles.emptyStateSubtext, { color: currentColors.textSecondary }]}>
                            Tap the button below to start a conversation
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={chats}
                        renderItem={renderChatItem}
                        keyExtractor={item => item.id.toString()}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.chatList}
                        style={styles.chatListContainer}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                )}
            </SafeAreaView>

            {/* Floating Action Button */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: currentColors.primary }]}
                onPress={() => setShowNewChatModal(true)}
                activeOpacity={0.8}
            >
                <Ionicons name="chatbubble" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* New Chat Modal */}
            <Modal
                visible={showNewChatModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowNewChatModal(false)}
                statusBarTranslucent={false}
            >
                <View style={[styles.modalContainer, { backgroundColor: currentColors.modalBg }]}>
                    {/* Modal Header */}
                    {renderModalHeader()}
                    
                    {/* Content */}
                    <View style={styles.modalContent}>
                        {isGroupChat && (
                            <View style={styles.groupNameSection}>
                                <Text style={[styles.groupNameLabel, { color: currentColors.textSecondary }]}>
                                    Group name
                                </Text>
                                <TextInput
                                    style={[
                                        styles.groupNameInput,
                                        { 
                                            color: currentColors.text,
                                            backgroundColor: currentColors.card,
                                            borderColor: currentColors.border 
                                        }
                                    ]}
                                    placeholder="Enter group name"
                                    placeholderTextColor={currentColors.textSecondary}
                                    value={groupName}
                                    onChangeText={setGroupName}
                                    autoFocus={isGroupChat}
                                />
                            </View>
                        )}

                        {renderSelectedUsers()}

                        {/* Search Section */}
                        <View style={[
                            styles.searchContainer,
                            { backgroundColor: currentColors.searchBg }
                        ]}>
                            <Ionicons 
                                name="search" 
                                size={20} 
                                color={currentColors.textSecondary} 
                                style={styles.searchIcon}
                            />
                            <TextInput
                                style={[styles.searchInput, { color: currentColors.text }]}
                                placeholder="Search name or number"
                                placeholderTextColor={currentColors.textSecondary}
                                value={searchQuery}
                                onChangeText={(text) => {
                                    setSearchQuery(text);
                                    searchUsers(text);
                                }}
                                autoFocus={!isGroupChat}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons 
                                        name="close-circle" 
                                        size={20} 
                                        color={currentColors.textSecondary} 
                                    />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Search Results or Contacts List */}
                        <View style={styles.searchResultsContainer}>
                            {searchResults.length > 0 ? (
                                <FlatList
                                    data={searchResults}
                                    renderItem={renderUserSearchItem}
                                    keyExtractor={item => item.id.toString()}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={styles.searchResultsList}
                                />
                            ) : searchQuery.length >= 2 ? (
                                <View style={styles.noResultsContainer}>
                                    <Ionicons 
                                        name="people-outline" 
                                        size={48} 
                                        color={currentColors.textSecondary} 
                                    />
                                    <Text style={[styles.noResultsText, { color: currentColors.text }]}>
                                        No contacts found
                                    </Text>
                                    <Text style={[styles.noResultsSubtext, { color: currentColors.textSecondary }]}>
                                        Try a different search
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.contactsHeader}>
                                    <Text style={[styles.contactsTitle, { color: currentColors.textSecondary }]}>
                                        CONTACTS ON WHATSAPP
                                    </Text>
                                    <Text style={[styles.contactsCount, { color: currentColors.textSecondary }]}>
                                        0 contacts
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Group Chat Toggle */}
                        <TouchableOpacity
                            style={[
                                styles.groupChatToggle,
                                { backgroundColor: currentColors.card }
                            ]}
                            onPress={() => setIsGroupChat(!isGroupChat)}
                        >
                            <View style={styles.groupChatToggleContent}>
                                <View style={[
                                    styles.groupChatToggleIcon,
                                    { backgroundColor: currentColors.primary }
                                ]}>
                                    <Ionicons
                                        name={isGroupChat ? "people" : "people"}
                                        size={20}
                                        color="#FFFFFF"
                                    />
                                </View>
                                <View style={styles.groupChatToggleText}>
                                    <Text style={[styles.groupChatToggleTitle, { color: currentColors.text }]}>
                                        {isGroupChat ? 'New group' : 'New group'}
                                    </Text>
                                    <Text style={[styles.groupChatToggleSubtitle, { color: currentColors.textSecondary }]}>
                                        {isGroupChat ? 'Create a group with multiple people' : 'Create a group with multiple people'}
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={currentColors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        paddingHorizontal: spacing.sm,
        paddingBottom: spacing.sm,
        zIndex: 1000,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.full,
    },
    backText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#FFFFFF',
        marginLeft: spacing.xs,
    },
    headerTitle: {
        flex: 1,
        fontSize: fontSize.xxl,
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
        marginLeft: -40,
    },
    headerMenuButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatListContainer: {
        flex: 1,
    },
    chatList: {
        paddingBottom: spacing.lg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
    },
    chatAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    chatAvatarImage: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    chatAvatarText: {
        color: '#FFFFFF',
        fontSize: fontSize.lg,
        fontWeight: '500',
    },
    chatInfo: {
        flex: 1,
    },
    chatInfoTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    chatName: {
        fontSize: fontSize.xl,
        fontWeight: '500',
        flex: 1,
        marginRight: spacing.sm,
    },
    chatTime: {
        fontSize: fontSize.xs,
    },
    chatInfoBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    lastMessage: {
        fontSize: fontSize.md,
        flex: 1,
        marginRight: spacing.sm,
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xs,
    },
    unreadCount: {
        color: '#FFFFFF',
        fontSize: fontSize.xs,
        fontWeight: '600',
    },
    chatMenuButton: {
        padding: spacing.sm,
        marginLeft: spacing.sm,
    },
    fab: {
        position: 'absolute',
        right: spacing.lg,
        bottom: spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
    },
    modalHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: spacing.md,
        paddingHorizontal: spacing.md,
    },
    modalBackButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalBackText: {
        fontSize: fontSize.lg,
        fontWeight: '500',
        color: '#FFFFFF',
        marginLeft: spacing.sm,
    },
    modalTitle: {
        fontSize: fontSize.xl,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    modalActionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalActionButtonDisabled: {
        opacity: 0.5,
    },
    modalContent: {
        flex: 1,
    },
    groupNameSection: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },
    groupNameLabel: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: spacing.sm,
    },
    groupNameInput: {
        borderWidth: 1,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: fontSize.lg,
    },
    selectedUsersContainer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    selectedUserChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginRight: spacing.sm,
    },
    selectedUserName: {
        color: '#FFFFFF',
        fontSize: fontSize.sm,
        fontWeight: '500',
        marginRight: spacing.sm,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: fontSize.md,
        paddingVertical: spacing.sm,
    },
    searchResultsContainer: {
        flex: 1,
    },
    searchResultsList: {
        paddingBottom: spacing.lg,
    },
    noResultsContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    noResultsText: {
        fontSize: fontSize.xl,
        fontWeight: '600',
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    noResultsSubtext: {
        fontSize: fontSize.md,
    },
    contactsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    contactsTitle: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    contactsCount: {
        fontSize: fontSize.sm,
    },
    groupChatToggle: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },
    groupChatToggleContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    groupChatToggleIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    groupChatToggleText: {
        flex: 1,
    },
    groupChatToggleTitle: {
        fontSize: fontSize.lg,
        fontWeight: '500',
        marginBottom: spacing.xs,
    },
    groupChatToggleSubtitle: {
        fontSize: fontSize.sm,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    userItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    userAvatarText: {
        color: '#FFFFFF',
        fontSize: fontSize.lg,
        fontWeight: '500',
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: fontSize.lg,
        fontWeight: '500',
        marginBottom: spacing.xs,
    },
    userEmail: {
        fontSize: fontSize.sm,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyStateText: {
        fontSize: fontSize.xl,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    emptyStateSubtext: {
        fontSize: fontSize.md,
        textAlign: 'center',
    },
});

export default ChatScreen;