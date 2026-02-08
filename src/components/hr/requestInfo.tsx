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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
  onBack: () => void;
  loading: boolean;
  loadingDetails: boolean;
  currentUserEmail: string | null;
  onCancelItem: () => void;
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

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const RequestInfo: React.FC<RequestInfoProps> = ({
  item,
  activeTab,
  newComment,
  onCommentChange,
  onAddComment,
  onBack,
  loading,
  loadingDetails,
  currentUserEmail,
  onCancelItem,
  token
}) => {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [currentUserName, setCurrentUserName] = useState<string>('You');

  useEffect(() => {
    if (item?.comments) {
      setLocalComments(item.comments);
    }
  }, [item?.comments]);

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
            setCurrentUserName(data.user?.full_name || 'You');
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
    if (scrollViewRef.current && !isUserScrolling) {
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated });
        }
      }, 100);
    }
  };

  const handleScrollBeginDrag = () => {
    setIsUserScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 2000);
  };

  const handleTakePhoto = async () => {
    if (isPickerActive) {
      console.log('Picker already active, ignoring...');
      return;
    }
    setIsPickerActive(true);
    
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        Alert.alert('Permission Required', 'Camera permissions are needed to take photos.');
        setIsPickerActive(false);
        setShowAttachmentModal(false);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = `photo_${Date.now()}.jpg`;
        const newFile: AttachedFile = {
          uri: asset.uri,
          name: fileName,
          type: 'image',
          mimeType: 'image/jpeg',
        };
        setAttachedFiles(prev => [...prev, newFile]);
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      Alert.alert('Camera Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsPickerActive(false);
      setShowAttachmentModal(false);
    }
  };

  const handleSelectFromGallery = async () => {
    if (isPickerActive) {
      console.log('Picker already active, ignoring...');
      return;
    }
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
      Alert.alert('Selection Error', 'Failed to select images. Please try again. ' + error.message);
    } finally {
      setIsPickerActive(false);
      setShowAttachmentModal(false);
    }
  };

  const handleSelectDocument = async () => {
    if (isPickerActive) {
      console.log('Picker already active, ignoring...');
      return;
    }
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
      Alert.alert('Selection Error', 'Failed to select document. Please try again.'+ error.message);
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
      created_by_email: currentUserEmail || '',
      created_at: new Date().toISOString(),
      is_hr_comment: false,
      images: [],
      documents: attachedFiles.map((file, index) => ({
        id: `temp-doc-${index}`,
        document: file.uri,
        document_url: file.uri,
        document_name: file.name,
        uploaded_at: new Date().toISOString()
      }))
    };
    setLocalComments(prev => [...prev, optimisticComment]);
    const commentText = newComment;
    const files = [...attachedFiles];
    onCommentChange('');
    setAttachedFiles([]);
    setTimeout(() => {
      scrollToBottom(true);
    }, 100);
    setUploadingFile(true);
    try {
      const endpoint = `${BACKEND_URL}/core/${activeTab === 'requests' ? 'addCommentToRequest' : 'addCommentToGrievance'}`;
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
      } else {
        setLocalComments(prev => prev.filter(c => c.id !== optimisticComment.id));
        const errorText = await response.text();
        console.error('Upload error:', errorText);
        Alert.alert('Error', 'Failed to send comment. Please try again.'+ errorText);
        onCommentChange(commentText);
        setAttachedFiles(files);
      }
    } catch (error: any) {
      setLocalComments(prev => prev.filter(c => c.id !== optimisticComment.id));
      console.error('Error sending comment:', error);
      Alert.alert('Error', error.message || 'Failed to send comment. Please try again.');
      onCommentChange(commentText);
      setAttachedFiles(files);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const supported = await Linking.canOpenURL(fileUrl);
      if (supported) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert('Notification', 'File is Being Uploaded, kindly wait for some time and try again.');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Notification', 'File is Being Uploaded, kindly wait for some time and try again.');
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
    const isCurrentUser = comment.created_by_email === currentUserEmail;
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
                        onError={(error) => console.log('Image loading error:', error.nativeEvent.error)}
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
          <Text style={styles.messageText}>{comment.comment}</Text>
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>
              {formatTime(comment.created_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  useEffect(() => {
    if (localComments.length > 0 && !loadingDetails) {
      setTimeout(() => {
        scrollToBottom(true);
      }, 300);
    }
  }, [localComments, loadingDetails]);

  useEffect(() => {
    if (item?.comments && item.comments.length > 0) {
      setTimeout(() => {
        scrollToBottom(false);
      }, 500);
    }
  }, [item?.id]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={WHATSAPP_COLORS.primaryDark}
      />
      <Header
        title={`${activeTab === 'requests' ? 'Request' : 'Grievance'} Details`}
        subtitle={item?.nature || 'Loading...'}
        onBack={onBack}
      />
      <View style={styles.content}>
        {loadingDetails ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
            <Text style={styles.loadingText}>Loading details...</Text>
          </View>
        ) : item ? (
          <>
            <View style={styles.chatContainer}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.chatScrollView}
                contentContainerStyle={styles.chatScrollContent}
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={handleScrollBeginDrag}
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
            </View>
            
            {attachedFiles.length > 0 && (
              <View style={styles.attachedFilesPreview}>
                <Text style={styles.attachedFilesTitle}>Attached Files ({attachedFiles.length}):</Text>
                {attachedFiles.map((file, index) => {
                  if (file.type === 'image') {
                    return (
                      <View key={`attached-image-${index}-${file.name}`} style={styles.previewImageWrapper}>
                        <Image 
                          source={{ uri: file.uri }}
                          style={styles.previewImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity 
                          style={styles.removeFileButton}
                          onPress={() => removeAttachedFile(index)}
                        >
                          <Ionicons name="close-circle" size={24} color={WHATSAPP_COLORS.red} />
                        </TouchableOpacity>
                      </View>
                    );
                  } else {
                    return (
                      <View key={`attached-doc-${index}-${file.name}`} style={styles.previewDocumentItem}>
                        <Ionicons name="document-text" size={24} color={WHATSAPP_COLORS.primary} />
                        <View style={styles.previewDocumentInfo}>
                          <Text style={styles.previewDocumentName} numberOfLines={1}>
                            {file.name}
                          </Text>
                          <Text style={styles.previewDocumentSize}>
                            {formatFileSize(file.size)}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => removeAttachedFile(index)}>
                          <Ionicons name="close-circle" size={24} color={WHATSAPP_COLORS.red} />
                        </TouchableOpacity>
                      </View>
                    );
                  }
                })}
              </View>
            )}
            
            <View style={styles.chatInputContainer}>
              <View style={styles.chatInputWrapper}>
                <TouchableOpacity 
                  style={styles.attachmentButton}
                  onPress={() => setShowAttachmentModal(true)}
                  disabled={uploadingFile || isPickerActive}
                >
                  {uploadingFile ? (
                    <ActivityIndicator size="small" color={WHATSAPP_COLORS.gray} />
                  ) : (
                    <>
                      <Ionicons name="attach" size={24} color={WHATSAPP_COLORS.gray} />
                      {attachedFiles.length > 0 && (
                        <View style={styles.imageCounterBadge}>
                          <Text style={styles.imageCounterText}>{attachedFiles.length}</Text>
                        </View>
                      )}
                    </>
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
          </>
        ) : null}
      </View>
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
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            if (!isPickerActive) {
              setShowAttachmentModal(false);
            }
          }}
        >
          <View style={styles.attachmentModalContent}>
            <TouchableOpacity
              style={styles.attachmentOption}
              onPress={handleSelectDocument}
              disabled={isPickerActive}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: '#7F66FF' }]}>
                <Ionicons name="document-text" size={24} color="#FFF" />
              </View>
              <Text style={styles.attachmentOptionText}>Document</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.attachmentOption}
              onPress={handleTakePhoto}
              disabled={isPickerActive}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: '#FF4D67' }]}>
                <Ionicons name="camera" size={24} color="#FFF" />
              </View>
              <Text style={styles.attachmentOptionText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.attachmentOption}
              onPress={handleSelectFromGallery}
              disabled={isPickerActive}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: '#C861F9' }]}>
                <Ionicons name="images" size={24} color="#FFF" />
              </View>
              <Text style={styles.attachmentOptionText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};