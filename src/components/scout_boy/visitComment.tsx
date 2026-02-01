import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Keyboard,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors } from './types';

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
  chatBg: '#ECE5DD',
  incoming: '#FFFFFF',
  outgoing: '#DCF8C6',
};

interface VisitCommentProps {
  visitId: number;
  token: string | null;
  onCommentAdded: (comment: { content: string; documents: any[] }) => void;
  theme: ThemeColors;
}

interface DocumentAsset {
  uri: string;
  name: string;
  mimeType: string;
  type: 'image' | 'document';
  size?: number;
}

const VisitComment: React.FC<VisitCommentProps> = ({
  visitId,
  token,
  onCommentAdded,
  theme,
}) => {
  const [commentText, setCommentText] = useState('');
  const [commentDocuments, setCommentDocuments] = useState<DocumentAsset[]>([]);
  const [addingComment, setAddingComment] = useState(false);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Animated value for keyboard offset
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  // Handle keyboard events
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

  const handleKeyboardShow = (event: any) => {
    setIsKeyboardVisible(true);
    // Only animate on Android, iOS handles it with KeyboardAvoidingView
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

  const handleAttachFile = useCallback(() => {
    Alert.alert(
      'Attach File',
      'Choose attachment type',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handlePickImage },
        { text: 'Choose Document', onPress: handlePickDocument },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, []);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setCommentDocuments(prev => [...prev, {
          uri: asset.uri,
          name: `photo_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          type: 'image'
        }]);
        // Refocus input after selecting
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  }, []);

  const handlePickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setCommentDocuments(prev => [...prev, {
          uri: asset.uri,
          name: `image_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          type: 'image'
        }]);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  }, []);

  const handlePickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setCommentDocuments(prev => [...prev, {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || 'application/octet-stream',
          type: 'document' as const,
          size: asset.size
        }]);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  }, []);

  const handleRemoveDocument = useCallback((index: number) => {
    setCommentDocuments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const truncateFileName = useCallback((fileName: string, maxLength: number = 25): string => {
    if (fileName.length <= maxLength) return fileName;
    return fileName.substring(0, maxLength - 3) + '...';
  }, []);

  const formatFileSize = useCallback((bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }, []);

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim() && commentDocuments.length === 0) {
      Alert.alert('Error', 'Please enter a comment or attach a file');
      return;
    }

    if (!token || !visitId) return;

    // Store current values before clearing
    const textToSend = commentText.trim();
    const docsToSend = [...commentDocuments];

    try {
      setAddingComment(true);

      // Immediately notify parent with optimistic data
      onCommentAdded({
        content: textToSend,
        documents: docsToSend
      });

      // Clear input immediately for better UX
      setCommentText('');
      setCommentDocuments([]);

      // Send to backend
      const formData = new FormData();
      formData.append('token', token);
      formData.append('visit_id', visitId.toString());

      if (textToSend) {
        formData.append('comment', textToSend);
      }

      docsToSend.forEach((doc, index) => {
        formData.append('documents', {
          uri: doc.uri,
          type: doc.mimeType || 'application/octet-stream',
          name: doc.name || `document_${index}`,
        } as any);
      });

      const response = await fetch(`${BACKEND_URL}/employee/addVisitComment`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to add comment');

      const data = await response.json();
      if (!data.comment) throw new Error('Invalid response from server');

      // Success - comment is already shown optimistically
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to send comment. Please try again.');
      // On error, restore the stored values (not the current state which is empty)
      setCommentText(textToSend);
      setCommentDocuments(docsToSend);
    } finally {
      setAddingComment(false);
    }
  }, [commentText, commentDocuments, token, visitId, onCommentAdded]);

  const isSendEnabled = commentText.trim().length > 0 || commentDocuments.length > 0;

  // Render for Android with Animated
  if (Platform.OS === 'android') {
    return (
      <View style={styles.mainContainer}>
        {commentDocuments.length > 0 && (
          <View style={styles.attachedFilesContainer}>
            <Text style={styles.attachedFilesTitle}>Attached files:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {commentDocuments.map((doc, index) => (
                <View key={index} style={styles.attachedFile}>
                  <Ionicons
                    name={doc.type === 'image' ? 'image' : 'document'}
                    size={16}
                    color={WHATSAPP_COLORS.primary}
                  />
                  <View style={styles.attachedFileInfo}>
                    <Text style={styles.attachedFileName} numberOfLines={1}>
                      {truncateFileName(doc.name)}
                    </Text>
                    <Text style={styles.attachedFileSize}>{formatFileSize(doc.size)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveDocument(index)}
                    style={styles.removeFileButton}
                  >
                    <Ionicons name="close-circle" size={18} color={WHATSAPP_COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <Animated.View style={[styles.inputContainer, { marginBottom: keyboardHeightAnim }]}>
          <View style={styles.inputWrapper}>
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.attachmentButton}
                onPress={handleAttachFile}
                disabled={addingComment}
              >
                <Ionicons name="attach" size={22} color={WHATSAPP_COLORS.primary} />
                {commentDocuments.length > 0 && (
                  <View style={styles.fileCounterBadge}>
                    <Text style={styles.fileCounterText}>{commentDocuments.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.inputField}>
                <TextInput
                  ref={inputRef}
                  style={styles.messageInput}
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Type your message..."
                  multiline
                  maxLength={1000}
                  placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                  editable={!addingComment}
                  returnKeyType="default"
                  blurOnSubmit={false}
                  onSubmitEditing={() => {
                    if (isSendEnabled) {
                      handleAddComment();
                    }
                  }}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: isSendEnabled ? WHATSAPP_COLORS.primary : WHATSAPP_COLORS.border }
                ]}
                onPress={handleAddComment}
                disabled={!isSendEnabled || addingComment}
              >
                {addingComment ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={isSendEnabled ? '#FFF' : WHATSAPP_COLORS.textTertiary}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    );
  }

  // Render for iOS with KeyboardAvoidingView
  return (
    <KeyboardAvoidingView
      style={styles.mainContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {commentDocuments.length > 0 && (
        <View style={styles.attachedFilesContainer}>
          <Text style={styles.attachedFilesTitle}>Attached files:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {commentDocuments.map((doc, index) => (
              <View key={index} style={styles.attachedFile}>
                <Ionicons
                  name={doc.type === 'image' ? 'image' : 'document'}
                  size={16}
                  color={WHATSAPP_COLORS.primary}
                />
                <View style={styles.attachedFileInfo}>
                  <Text style={styles.attachedFileName} numberOfLines={1}>
                    {truncateFileName(doc.name)}
                  </Text>
                  <Text style={styles.attachedFileSize}>{formatFileSize(doc.size)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveDocument(index)}
                  style={styles.removeFileButton}
                >
                  <Ionicons name="close-circle" size={18} color={WHATSAPP_COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={handleAttachFile}
              disabled={addingComment}
            >
              <Ionicons name="attach" size={22} color={WHATSAPP_COLORS.primary} />
              {commentDocuments.length > 0 && (
                <View style={styles.fileCounterBadge}>
                  <Text style={styles.fileCounterText}>{commentDocuments.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputField}>
              <TextInput
                ref={inputRef}
                style={styles.messageInput}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Type your message..."
                multiline
                maxLength={1000}
                placeholderTextColor={WHATSAPP_COLORS.textTertiary}
                editable={!addingComment}
                returnKeyType="default"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  if (isSendEnabled) {
                    handleAddComment();
                  }
                }}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: isSendEnabled ? WHATSAPP_COLORS.primary : WHATSAPP_COLORS.border }
              ]}
              onPress={handleAddComment}
              disabled={!isSendEnabled || addingComment}
            >
              {addingComment ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Ionicons
                  name="send"
                  size={18}
                  color={isSendEnabled ? '#FFF' : WHATSAPP_COLORS.textTertiary}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: WHATSAPP_COLORS.border,
    marginBottom: Platform.OS === 'ios' ? -25 : 0,
  },
  attachedFilesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: WHATSAPP_COLORS.border,
    backgroundColor: WHATSAPP_COLORS.surface,
  },
  attachedFilesTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 8,
  },
  attachedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 180,
    gap: 8,
  },
  attachedFileInfo: {
    flex: 1,
  },
  attachedFileName: {
    fontSize: 13,
    fontWeight: '500',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 2,
  },
  attachedFileSize: {
    fontSize: 11,
    color: WHATSAPP_COLORS.textTertiary,
  },
  removeFileButton: {
    padding: 4,
  },
  inputContainer: {
    backgroundColor: WHATSAPP_COLORS.surface,
    // marginBottom: Platform.OS === 'ios' ? -25 : 0,
    // This was causing the blank space below the message box on iOS
  },
  inputWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachmentButton: {
    padding: 6,
    marginBottom: 2,
    position: 'relative',
  },
  fileCounterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: WHATSAPP_COLORS.danger,
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  fileCounterText: {
    fontSize: 10,
    color: WHATSAPP_COLORS.white,
    fontWeight: '600',
  },
  inputField: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
    maxHeight: 100,

  },
  messageInput: {
    fontSize: 15,
    color: WHATSAPP_COLORS.textPrimary,
    padding: 0,
    maxHeight: 80,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default VisitComment;