import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  profile_picture?: string;
}

interface ChatRoom {
  id: number;
  name?: string;
  description?: string;
  room_type: 'direct' | 'group';
  profile_picture?: string;
}

interface EditProps {
  chatRoom: ChatRoom;
  currentUser: User;
  onBack: () => void;
  onSave: (name: string, description: string, image?: string | null) => void;
}

export const Edit: React.FC<EditProps> = ({
  chatRoom,
  currentUser,
  onBack,
  onSave,
}) => {
  const [name, setName] = useState(chatRoom.name || '');
  const [description, setDescription] = useState(chatRoom.description || '');
  const [selectedImage, setSelectedImage] = useState<string | null>(chatRoom.profile_picture || null);
  const [isNewImage, setIsNewImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isGroup = chatRoom.room_type === 'group';

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setIsNewImage(true);
      console.log('New image selected:', result.assets[0].uri);
    }
  };

  const handleSave = async () => { // ← CHANGE: Make async
    const isValid = isGroup ? name.trim() : true;
    if (isValid) {
      try {
        setIsSaving(true); // ← ADD: Start loading
        const imageToSend = isNewImage ? selectedImage : null;
        await onSave(name, description, imageToSend); // ← CHANGE: Await the promise
        // Navigation happens in parent after successful save
      } catch (error) {
        // ← ADD: Error handling
        console.error('Save error:', error);
        Alert.alert(
          'Error',
          'Failed to save changes. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsSaving(false); // ← ADD: Stop loading
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {isSaving && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00a884" />
            <Text style={styles.loadingText}>Saving changes...</Text>
          </View>
        </View>
      )}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        {/* Title changes based on chat type */}
        <Text style={styles.headerTitle}>
          {isGroup ? 'Edit group info' : 'Edit profile'}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                {isGroup ? (
                  <Ionicons name="people" size={60} color="#8696a0" />
                ) : (
                  <Text style={styles.avatarInitials}>
                    {currentUser.first_name?.[0] || '?'}
                    {currentUser.last_name?.[0] || ''}
                  </Text>
                )}
              </View>
            )}
            <TouchableOpacity
              style={styles.changeAvatarButton}
              activeOpacity={0.8}
              onPress={handlePickImage}
            >
              <Ionicons name="camera" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.form}>
          {/* Group name field — ONLY shown for groups */}
          {isGroup && (
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Group name</Text>
              <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder="Group name"
                placeholderTextColor="#8696a0"
                maxLength={25}
              />
              <Text style={styles.fieldCounter}>{name.length}/25</Text>
            </View>
          )}

          {/* Description — shown for both group and individual */}
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.fieldInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={isGroup ? 'Add group description' : 'Add a description about yourself'}
              placeholderTextColor="#8696a0"
              multiline
              numberOfLines={3}
              maxLength={512}
              textAlignVertical="top"
            />
            <Text style={styles.fieldCounter}>{description.length}/512</Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.saveButton,
          // Only disable for groups when name is empty
          isGroup && !name.trim() && styles.saveButtonDisabled,
        ]}
        onPress={handleSave}
        disabled={isGroup && !name.trim()}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark" size={24} color="#ffffff" />
      </TouchableOpacity>
    </KeyboardAvoidingView>
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
    backgroundColor: '#008069',
    paddingTop: 90,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 16,
    marginTop: Platform.OS === 'ios' ? -80 : -50,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 19,
    color: '#ffffff',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e9edef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 48,
    fontWeight: '600',
    color: '#8696a0',
  },
  changeAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00a884',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  form: {
    paddingHorizontal: 16,
  },
  formField: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#00a884',
    fontWeight: '500',
    marginBottom: 8,
  },
  fieldInput: {
    fontSize: 16,
    color: '#111b21',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
  },
  textArea: {
    minHeight: 80,
  },
  fieldCounter: {
    fontSize: 12,
    color: '#8696a0',
    textAlign: 'right',
    marginTop: 4,
  },
  saveButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00a884',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#e9edef',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minWidth: 150,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#111b21',
    fontWeight: '500',
  },
});