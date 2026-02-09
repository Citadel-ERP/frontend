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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  onSave: (name: string, description: string) => void;
}

export const Edit: React.FC<EditProps> = ({
  chatRoom,
  currentUser,
  onBack,
  onSave,
}) => {
  const [name, setName] = useState(chatRoom.name || '');
  const [description, setDescription] = useState(chatRoom.description || '');

  const handleSave = () => {
    if (name.trim()) {
      onSave(name, description);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit group info</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {chatRoom.profile_picture ? (
              <Image
                source={{ uri: chatRoom.profile_picture }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="people" size={60} color="#8696a0" />
              </View>
            )}
            <TouchableOpacity style={styles.changeAvatarButton} activeOpacity={0.8}>
              <Ionicons name="camera" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.form}>
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

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.fieldInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add group description"
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
          !name.trim() && styles.saveButtonDisabled,
        ]}
        onPress={handleSave}
        disabled={!name.trim()}
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
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 16,
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
});