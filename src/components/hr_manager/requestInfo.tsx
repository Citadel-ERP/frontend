import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    ActivityIndicator,
    TextInput,
    Alert,
    Image,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Linking,
    Animated,
    Keyboard,
    KeyboardEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { styles } from './styles';
import { WHATSAPP_COLORS } from './constants';
import { Header } from './header';
import { Item, TabType, Comment } from './types';
import { BACKEND_URL } from '../../config/config';

interface RequestInfoProps {
    item: Item | null;
    activeTab: TabType;
    newComment: string;
    onCommentChange: (comment: string) => void;
    onAddComment: () => void;
    onUpdateStatus: (status: string) => void;
    onBack: () => void;
    onEdit?: () => void;
    loading: boolean;
    loadingDetails: boolean;
    currentUserEmail: string | null;
    token: string | null;
}

interface AttachedFile {
    uri: string;
    name: string;
    type: string;
    size?: number;
    mimeType: string;
}

const formatWhatsAppDate = (dateString: string): string => {
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
};

const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).toLowerCase();
};

const getStatusConfig = (status: string): { color: string, label: string } => {
    switch (status) {
        case 'resolved': return { color: WHATSAPP_COLORS.green, label: 'Resolved' };
        case 'rejected': return { color: WHATSAPP_COLORS.red, label: 'Rejected' };
        case 'in_progress': return { color: WHATSAPP_COLORS.blue, label: 'In Progress' };
        case 'pending': return { color: WHATSAPP_COLORS.yellow, label: 'Pending' };
        case 'cancelled': return { color: WHATSAPP_COLORS.purple, label: 'Cancelled' };
        default: return { color: WHATSAPP_COLORS.gray, label: status };
    }
};

export const RequestInfo: React.FC<RequestInfoProps> = ({
    item,
    activeTab,
    newComment,
    onCommentChange,
    onAddComment,
    onUpdateStatus,
    onBack,
    onEdit,
    loading,
    loadingDetails,
    currentUserEmail,
    token
}) => {
    const insets = useSafeAreaInsets();
    const scrollViewRef = useRef<ScrollView>(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [showAttachmentModal, setShowAttachmentModal] = useState(false);
    const [isPickerActive, setIsPickerActive] = useState(false);
    const [localComments, setLocalComments] = useState<Comment[]>([]);
    const [showStatusSelector, setShowStatusSelector] = useState(false);
    const [currentUserName, setCurrentUserName] = useState<string>('HR Manager');
    const [currentUserEmailLocal, setCurrentUserEmailLocal] = useState<string>('');

    // Keyboard handling state
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const keyboardHeightAnim = useRef(new Animated.Value(0)).current;

    // Keyboard event listeners
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

    const handleKeyboardShow = (event: KeyboardEvent) => {
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

    // Auto-scroll when comments change or component mounts
    useEffect(() => {
        if (localComments.length > 0) {
            scrollToBottom(true);
        }
    }, [localComments.length]);

    // Set local comments when item changes
    useEffect(() => {
        if (item?.comments) {
            setLocalComments(item.comments);
            // Auto-scroll after comments are loaded
            setTimeout(() => scrollToBottom(true), 200);
        }
    }, [item?.comments]);

    // Fetch current user info
    useEffect(() => {
        const fetchUserName = async () => {
            if (token) {
                try {
                    const response = await fetch(`${BACKEND_URL}/core/getUser`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token }),
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setCurrentUserName(data.user?.full_name || 'HR Manager');
                        setCurrentUserEmailLocal(data.user?.email || '');
                    }
                } catch (error) {
                    console.error('Error fetching user name:', error);
                }
            }
        };
        fetchUserName();
    }, [token]);

    const getProcessedComments = () => {
        if (!localComments || localComments.length === 0) return [];
        const processed: any[] = [];
        let lastDate = '';
        const sortedComments = [...localComments].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        sortedComments.forEach((comment, index) => {
            const commentDate = formatWhatsAppDate(comment.created_at);
            if (commentDate !== lastDate) {
                processed.push({
                    type: 'dateSeparator',
                    id: `date-${commentDate}-${index}`,
                    date: commentDate,
                    originalDate: comment.created_at
                });
                lastDate = commentDate;
            }
            processed.push({
                type: 'comment',
                id: comment.id,
                data: comment
            });
        });
        return processed;
    };

    const scrollToBottom = (animated = true) => {
        if (scrollViewRef.current) {
            // Use a longer timeout to ensure content is rendered
            setTimeout(() => {
                if (scrollViewRef.current) {
                    scrollViewRef.current.scrollToEnd({ animated });
                }
            }, 150);
        }
    };

    const handleSelectFromGallery = async () => {
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
                const newFiles: AttachedFile[] = result.assets.map((asset, index) => {
                    const extension = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
                    return {
                        uri: asset.uri,
                        name: `image_${Date.now()}_${index}.${extension}`,
                        type: 'image',
                        mimeType: `image/${extension === 'png' ? 'png' : 'jpeg'}`,
                    };
                });
                setAttachedFiles(prev => [...prev, ...newFiles]);
            }
        } catch (error: any) {
            console.error('Error selecting images:', error);
            Alert.alert('Selection Error', 'Failed to select images. Please try again.');
        } finally {
            setIsPickerActive(false);
            setShowAttachmentModal(false);
        }
    };

    const handleSelectDocument = async () => {
        if (isPickerActive) return;
        setIsPickerActive(true);

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
                multiple: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newFiles: AttachedFile[] = result.assets.map((asset) => ({
                    uri: asset.uri,
                    name: asset.name,
                    type: 'document',
                    size: asset.size,
                    mimeType: asset.mimeType || 'application/octet-stream',
                }));
                setAttachedFiles(prev => [...prev, ...newFiles]);
            }
        } catch (error: any) {
            console.error('Error selecting document:', error);
            Alert.alert('Selection Error', 'Failed to select document. Please try again.');
        } finally {
            setIsPickerActive(false);
            setShowAttachmentModal(false);
        }
    };

    const removeAttachedFile = (index: number) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSendComment = async () => {
        if (!token || !item) {
            Alert.alert('Error', 'Unable to send comment. Please try again.');
            return;
        }
        if (!newComment.trim() && attachedFiles.length === 0) {
            return;
        }

        const optimisticComment: Comment = {
            id: `temp-${Date.now()}`,
            comment: newComment.trim() || 'Sent attachment(s)',
            content: newComment.trim() || 'Sent attachment(s)',
            created_by: 'current_user',
            created_by_name: currentUserName,
            created_by_email: currentUserEmailLocal || currentUserEmail || '',
            created_at: new Date().toISOString(),
            is_hr_comment: true,
            images: [],
            documents: attachedFiles.map((file, index) => ({
                id: `temp-doc-${index}`,
                document: file.uri,
                document_url: file.uri,
                document_name: file.name,
                uploaded_at: new Date().toISOString()
            }))
        };

        // Add optimistic comment to local state
        setLocalComments(prev => [...prev, optimisticComment]);
        const commentText = newComment;
        const files = [...attachedFiles];
        
        // Clear input and files
        onCommentChange('');
        setAttachedFiles([]);

        // Scroll to bottom after state updates
        setTimeout(() => {
            scrollToBottom(true);
        }, 100);

        setUploadingFile(true);
        try {
            const endpoint = `${BACKEND_URL}/manager/${activeTab === 'requests' ? 'addCommentToARequest' : 'addCommentToAGrievance'}`;
            const formData = new FormData();
            formData.append('token', token);
            formData.append(activeTab === 'requests' ? 'request_id' : 'grievance_id', item.id);
            formData.append('content', commentText.trim() || 'Sent attachment(s)');

            for (const file of files) {
                let cleanUri = file.uri;
                if (Platform.OS === 'ios') {
                    cleanUri = file.uri.replace('file://', '');
                }
                formData.append('documents', {
                    uri: Platform.OS === 'ios' ? file.uri : cleanUri,
                    name: file.name,
                    type: file.mimeType,
                } as any);
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                },
                body: formData,
            });

            if (response.ok) {
                console.log('Comment sent successfully');
                // ONLY reload if there were attachments, otherwise keep optimistic UI
                if (files.length > 0) {
                    onAddComment(); // This will reload to get proper file URLs
                }
                // If no files, the optimistic comment stays as-is (no reload!)
            } else {
                // Remove optimistic comment on error
                setLocalComments(prev => prev.filter(c => c.id !== optimisticComment.id));
                const errorText = await response.text();
                console.error('Upload error:', errorText);
                Alert.alert('Error', 'Failed to send comment. Please try again.');
                onCommentChange(commentText);
                setAttachedFiles(files);
            }
        } catch (error: any) {
            // Remove optimistic comment on error
            setLocalComments(prev => prev.filter(c => c.id !== optimisticComment.id));
            console.error('Error sending comment:', error);
            Alert.alert('Error', error.message || 'Failed to send comment. Please try again.');
            onCommentChange(commentText);
            setAttachedFiles(files);
        } finally {
            setUploadingFile(false);
        }
    };

    const handleUpdateStatus = async (status: string) => {
        if (!token || !item) return;

        Alert.alert(
            `Update Status to ${getStatusConfig(status).label}`,
            `Are you sure you want to mark this ${activeTab.slice(0, -1)} as ${getStatusConfig(status).label.toLowerCase()}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Update',
                    style: 'default',
                    onPress: async () => {
                        setShowStatusSelector(false);
                        onUpdateStatus(status);
                    }
                }
            ]
        );
    };

    const handleDownloadFile = async (fileUrl: string, fileName: string) => {
        try {
            const supported = await Linking.canOpenURL(fileUrl);
            if (supported) {
                await Linking.openURL(fileUrl);
            } else {
                Alert.alert('Error', 'Cannot open this file type');
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            Alert.alert('Error', 'Failed to open file');
        }
    };

    const renderCommentItem = ({ item: listItem }: { item: any }) => {
        if (listItem.type === 'dateSeparator') {
            return (
                <View style={styles.dateSeparatorContainer}>
                    <View style={styles.dateSeparatorBubble}>
                        <Text style={styles.dateSeparatorText}>{listItem.date}</Text>
                    </View>
                </View>
            );
        }
        const comment = listItem.data;
        const isCurrentUser = comment.created_by_email === currentUserEmailLocal ||
            comment.created_by_email === currentUserEmail;
        return (
            <View
                style={[
                    styles.messageRow,
                    isCurrentUser ? styles.messageRowRight : styles.messageRowLeft
                ]}
            >
                {!isCurrentUser && (
                    <View style={styles.otherAvatar}>
                        <Ionicons name="person-circle-outline" size={32} color="#999" />
                    </View>
                )}
                <View style={[
                    styles.messageBubble,
                    isCurrentUser ? styles.userBubble : styles.otherBubble
                ]}>
                    {!isCurrentUser && (
                        <View style={styles.senderHeader}>
                            <Text style={styles.senderName}>{comment.created_by_name}</Text>
                            {comment.is_hr_comment && (
                                <View style={styles.hrBadge}>
                                    <Text style={styles.hrBadgeText}>HR</Text>
                                </View>
                            )}
                        </View>
                    )}
                    {comment.documents && comment.documents.length > 0 && (
                        <View style={styles.documentsContainer}>
                            {comment.documents.map((doc: any, index: number) => {
                                const isImage = doc.document_name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                                if (isImage) {
                                    return (
                                        <TouchableOpacity
                                            key={`${doc.id}-${index}`}
                                            style={styles.imageWrapper}
                                            onPress={() => handleDownloadFile(doc.document_url, doc.document_name)}
                                        >
                                            <Image
                                                source={{ uri: doc.document_url }}
                                                style={styles.commentImage}
                                                resizeMode="cover"
                                            />
                                            <View style={styles.imageOverlay}>
                                                <Ionicons name="download-outline" size={20} color="#FFF" />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                } else {
                                    return (
                                        <TouchableOpacity
                                            key={`${doc.id}-${index}`}
                                            style={styles.documentItem}
                                            onPress={() => handleDownloadFile(doc.document_url, doc.document_name)}
                                        >
                                            <View style={styles.documentIconContainer}>
                                                <Ionicons name="document-text" size={24} color={WHATSAPP_COLORS.primary} />
                                            </View>
                                            <View style={styles.documentInfo}>
                                                <Text style={styles.documentName} numberOfLines={1}>
                                                    {doc.document_name}
                                                </Text>
                                                <Text style={styles.documentSize}>Tap to download</Text>
                                            </View>
                                            <Ionicons name="download-outline" size={20} color={WHATSAPP_COLORS.primary} />
                                        </TouchableOpacity>
                                    );
                                }
                            })}
                        </View>
                    )}
                    <Text style={styles.messageText}>{comment.content}</Text>
                    <View style={styles.messageFooter}>
                        <Text style={styles.messageTime}>
                            {formatTime(comment.created_at)}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderAttachedFiles = () => {
        if (attachedFiles.length === 0) return null;

        return (
            <View style={styles.attachedFilesContainer}>
                <Text style={styles.attachedFilesTitle}>Attached Files:</Text>
                {attachedFiles.map((file, index) => (
                    <View key={index} style={styles.attachedFileItem}>
                        <Ionicons 
                            name={file.type === 'image' ? 'image' : 'document-text'} 
                            size={20} 
                            color={WHATSAPP_COLORS.primary} 
                        />
                        <Text style={styles.attachedFileName} numberOfLines={1}>
                            {file.name}
                        </Text>
                        <TouchableOpacity onPress={() => removeAttachedFile(index)}>
                            <Ionicons name="close-circle" size={20} color={WHATSAPP_COLORS.red} />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        );
    };

    const renderContent = () => {
        if (loadingDetails) {
            return (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
                    <Text style={styles.loadingText}>Loading details...</Text>
                </View>
            );
        }

        if (!item) {
            return (
                <View style={styles.centerContent}>
                    <Ionicons name="alert-circle-outline" size={60} color={WHATSAPP_COLORS.gray} />
                    <Text style={styles.emptyTitle}>No item selected</Text>
                    <Text style={styles.emptySubtitle}>
                        Please go back and select a {activeTab.slice(0, -1)} to view details
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.chatContainer}>
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.chatScrollView}
                    contentContainerStyle={styles.chatScrollContent}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => {
                        // Auto-scroll when content size changes (new messages)
                        if (localComments.length > 0) {
                            scrollToBottom(false);
                        }
                    }}
                >
                    <View style={styles.infoCardCompact}>
                        <View style={styles.infoHeaderCompact}>
                            <View style={styles.infoTitleRowCompact}>
                                <View style={styles.infoIconContainerCompact}>
                                    <Ionicons
                                        name={activeTab === 'requests' ? 'document-text' : 'alert-circle'}
                                        size={20}
                                        color={WHATSAPP_COLORS.white}
                                    />
                                </View>
                                <View style={styles.infoTitleContentCompact}>
                                    <Text style={styles.infoTitleCompact} numberOfLines={1}>
                                        {item.nature}
                                    </Text>
                                    <Text style={styles.infoStatusCompact}>
                                        <Text style={{ fontWeight: '600' }}>Status: </Text>
                                        <Text style={{ color: getStatusConfig(item.status).color }}>
                                            {getStatusConfig(item.status).label}
                                        </Text>
                                    </Text>
                                </View>
                            </View>
                            {item.employee_name && (
                                <Text style={styles.infoEmployeeCompact}>
                                    Submitted by: {item.employee_name}
                                    {item.employee_email && ` (${item.employee_email})`}
                                </Text>
                            )}
                            <View style={styles.infoDateCompact}>
                                <Ionicons name="calendar-outline" size={12} color={WHATSAPP_COLORS.gray} />
                                <Text style={styles.infoDateTextCompact}>
                                    Submitted {new Date(item.created_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.descriptionContainerCompact}>
                            <Text style={styles.descriptionLabelCompact}>Description</Text>
                            <Text style={styles.descriptionTextCompact}>
                                {item.description || item.issue}
                            </Text>
                        </View>
                        <View style={styles.infoFooterCompact}>
                            <View style={styles.updateInfoCompact}>
                                <Ionicons name="time-outline" size={12} color={WHATSAPP_COLORS.gray} />
                                <Text style={styles.infoFooterTextCompact}>
                                    Last updated: {new Date(item.updated_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.chatMessagesContainer}>
                        <FlatList
                            data={getProcessedComments()}
                            renderItem={renderCommentItem}
                            keyExtractor={(item) => item.id}
                            style={styles.messagesList}
                            contentContainerStyle={styles.messagesListContent}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                            ListEmptyComponent={() => (
                                <View style={styles.noMessages}>
                                    <Ionicons name="chatbubble-ellipses-outline" size={48} color={WHATSAPP_COLORS.gray} />
                                    <Text style={styles.noMessagesTitle}>No messages yet</Text>
                                    <Text style={styles.noMessagesText}>
                                        Start the conversation by sending a message
                                    </Text>
                                </View>
                            )}
                        />
                    </View>
                </ScrollView>

                {renderAttachedFiles()}

                {Platform.OS === 'android' ? (
                    <Animated.View style={[styles.chatInputContainer, { marginBottom: keyboardHeightAnim }]}>
                        <View style={styles.chatInputWrapper}>
                            <TouchableOpacity
                                style={styles.attachmentButton}
                                onPress={() => setShowAttachmentModal(true)}
                                disabled={uploadingFile || isPickerActive}
                            >
                                {uploadingFile ? (
                                    <ActivityIndicator size="small" color={WHATSAPP_COLORS.gray} />
                                ) : (
                                    <Ionicons name="attach" size={24} color={WHATSAPP_COLORS.gray} />
                                )}
                            </TouchableOpacity>
                            <View style={styles.inputFieldContainer}>
                                <TextInput
                                    style={styles.chatInput}
                                    value={newComment}
                                    onChangeText={onCommentChange}
                                    placeholder="Type a message..."
                                    placeholderTextColor="#999"
                                    multiline
                                    maxLength={300}
                                />
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    (newComment.trim() || attachedFiles.length > 0) ? styles.sendButtonActive : styles.sendButtonDisabled
                                ]}
                                onPress={handleSendComment}
                                disabled={(!newComment.trim() && attachedFiles.length === 0) || uploadingFile}
                                activeOpacity={0.8}
                            >
                                {uploadingFile ? (
                                    <ActivityIndicator color={WHATSAPP_COLORS.white} size="small" />
                                ) : (
                                    <Ionicons
                                        name="send"
                                        size={20}
                                        color={(newComment.trim() || attachedFiles.length > 0) ? WHATSAPP_COLORS.white : WHATSAPP_COLORS.gray}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                ) : (
                    <View style={[
                        styles.chatInputContainer,
                        { marginBottom: isKeyboardVisible ? 0 : -30 }
                    ]}>
                        <View style={styles.chatInputWrapper}>
                            <TouchableOpacity
                                style={styles.attachmentButton}
                                onPress={() => setShowAttachmentModal(true)}
                                disabled={uploadingFile || isPickerActive}
                            >
                                {uploadingFile ? (
                                    <ActivityIndicator size="small" color={WHATSAPP_COLORS.gray} />
                                ) : (
                                    <Ionicons name="attach" size={24} color={WHATSAPP_COLORS.gray} />
                                )}
                            </TouchableOpacity>
                            <View style={styles.inputFieldContainer}>
                                <TextInput
                                    style={styles.chatInput}
                                    value={newComment}
                                    onChangeText={onCommentChange}
                                    placeholder="Type a message..."
                                    placeholderTextColor="#999"
                                    multiline
                                    maxLength={300}
                                />
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    (newComment.trim() || attachedFiles.length > 0) ? styles.sendButtonActive : styles.sendButtonDisabled
                                ]}
                                onPress={handleSendComment}
                                disabled={(!newComment.trim() && attachedFiles.length === 0) || uploadingFile}
                                activeOpacity={0.8}
                            >
                                {uploadingFile ? (
                                    <ActivityIndicator color={WHATSAPP_COLORS.white} size="small" />
                                ) : (
                                    <Ionicons
                                        name="send"
                                        size={20}
                                        color={(newComment.trim() || attachedFiles.length > 0) ? WHATSAPP_COLORS.white : WHATSAPP_COLORS.gray}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={WHATSAPP_COLORS.primaryDark}
            />
            <Header
                title={`${activeTab === 'requests' ? 'Request' : 'Grievance'} Details`}
                subtitle="HR Manager View"
                onBack={onBack}
                rightButton={onEdit ? {
                    icon: 'create-outline',
                    onPress: onEdit
                } : undefined}
            />
            
            <View style={styles.content}>
                {Platform.OS === 'ios' ? (
                    <KeyboardAvoidingView
                        style={styles.iosContainer}
                        behavior="padding"
                        keyboardVerticalOffset={0}
                    >
                        {renderContent()}
                    </KeyboardAvoidingView>
                ) : (
                    <View style={styles.androidContainer}>
                        {renderContent()}
                    </View>
                )}
            </View>

            {/* Status Selector Modal */}
            <Modal
                visible={showStatusSelector}
                transparent
                animationType="slide"
                onRequestClose={() => setShowStatusSelector(false)}
            >
                <View style={styles.filterModalOverlay}>
                    <View style={styles.filterModalContainer}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Update Status</Text>
                            <TouchableOpacity onPress={() => setShowStatusSelector(false)}>
                                <Ionicons name="close" size={24} color={WHATSAPP_COLORS.gray} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.filterSectionTitle}>
                            Current status: <Text style={{ color: getStatusConfig(item?.status || '').color }}>
                                {getStatusConfig(item?.status || '').label}
                            </Text>
                        </Text>

                        <View style={styles.statusOptions}>
                            {['pending', 'in_progress', 'resolved', 'rejected'].map((status) => (
                                <TouchableOpacity
                                    key={status}
                                    style={[
                                        styles.statusOption,
                                        item?.status === status && styles.statusOptionActive,
                                        { borderColor: getStatusConfig(status).color }
                                    ]}
                                    onPress={() => handleUpdateStatus(status)}
                                >
                                    <Text style={[
                                        styles.statusOptionText,
                                        { color: getStatusConfig(status).color }
                                    ]}>
                                        {getStatusConfig(status).label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Attachment Modal */}
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
                    style={styles.filterModalOverlay}
                    activeOpacity={1}
                    onPress={() => {
                        if (!isPickerActive) {
                            setShowAttachmentModal(false);
                        }
                    }}
                >
                    <View style={[styles.filterModalContainer, { paddingBottom: 40 }]}>
                        <View style={styles.filterModalHeader}>
                            <Text style={styles.filterModalTitle}>Attach File</Text>
                            <TouchableOpacity onPress={() => setShowAttachmentModal(false)}>
                                <Ionicons name="close" size={24} color={WHATSAPP_COLORS.gray} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 20 }}>
                            <TouchableOpacity
                                style={styles.attachmentOption}
                                onPress={handleSelectDocument}
                                disabled={isPickerActive}
                            >
                                <View style={[styles.actionCardIcon, { backgroundColor: '#7F66FF' }]}>
                                    <Ionicons name="document-text" size={24} color="#FFF" />
                                </View>
                                <Text style={styles.actionCardTitle}>Document</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.attachmentOption}
                                onPress={handleSelectFromGallery}
                                disabled={isPickerActive}
                            >
                                <View style={[styles.actionCardIcon, { backgroundColor: '#C861F9' }]}>
                                    <Ionicons name="images" size={24} color="#FFF" />
                                </View>
                                <Text style={styles.actionCardTitle}>Gallery</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};
