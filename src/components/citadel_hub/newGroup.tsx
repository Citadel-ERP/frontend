import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface User {
  id?: number;
  employee_id?: string;
  token?: string;  // Add token field
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
}

interface NewGroupProps {
  currentUser: User;
  onBack: () => void;
  onCreate: (name: string, description: string, memberIds: number[], groupImage?: any) => void;
  apiCall: (endpoint: string, data: any) => Promise<any>;
}

export const NewGroup: React.FC<NewGroupProps> = ({
  currentUser,
  onBack,
  onCreate,
  apiCall,
}) => {
  const [step, setStep] = useState<'selectMembers' | 'groupInfo'>('selectMembers');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Helper function to get unique identifier for a user
  const getUserId = (user: User): string => {
    if (user.id !== undefined) {
      return String(user.id);
    }
    if (user.employee_id) {
      return String(user.employee_id);
    }
    return String(user.email);
  };

  // Helper to get numeric ID from user
  const getNumericId = (user: User): number | null => {
    // Try numeric ID first
    if (user.id !== undefined && typeof user.id === 'number') {
      return user.id;
    }
    
    // Try employee_id - extract numbers from strings like "EMP001" -> 1
    if (user.employee_id) {
      // Method 1: Try direct parse (if employee_id is already numeric like "123")
      const directParse = parseInt(user.employee_id, 10);
      if (!isNaN(directParse) && directParse > 0) {
        return directParse;
      }
      
      // Method 2: Extract numeric part from employee_id like "EMP001" -> 1
      const match = user.employee_id.match(/\d+/);
      if (match) {
        const extracted = parseInt(match[0], 10);
        if (!isNaN(extracted) && extracted > 0) {
          return extracted;
        }
      }
    }
    
    // Last resort: use email hash as numeric ID
    // This creates a consistent numeric ID from email
    if (user.email) {
      let hash = 0;
      for (let i = 0; i < user.email.length; i++) {
        const char = user.email.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash) || 1;
    }
    
    return null;
  };

  // Search users whenever query changes
  useEffect(() => {
    searchUsers();
  }, [searchQuery]);

  const searchUsers = async () => {
    // Validate token exists
    if (!currentUser?.token) {
      console.error('No token available for search');
      setUsers([]);
      return;
    }

    setIsSearching(true);
    try {
      // Build request with token - CRITICAL for backend
      const requestData = {
        token: currentUser.token,  // ← Add token to request
        search: searchQuery
      };
      
      console.log('Searching users with token and query:', searchQuery);
      
      const result = await apiCall('searchUsers', requestData);
      
      if (result.users && Array.isArray(result.users)) {
        console.log('Search returned:', result.users.length, 'users');
        setUsers(result.users);
      } else {
        console.warn('Unexpected response format:', result);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setUsers([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle selection using Set for IDs
  const toggleUserSelection = (user: User) => {
    const userId = getUserId(user);
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  // Get selected users from the users list
  const getSelectedUsers = (): User[] => {
    return users.filter(user => selectedUserIds.has(getUserId(user)));
  };

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setGroupImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleNext = () => {
    if (selectedUserIds.size > 0) {
      setStep('groupInfo');
    }
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    const selectedUsers = getSelectedUsers();

    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'No members selected');
      return;
    }

    // CRITICAL: Extract ONLY numeric IDs - Backend expects integer array [1, 2, 3, ...]
    const memberIds: number[] = selectedUsers
      .map(user => getNumericId(user))
      .filter((id): id is number => id !== null);

    if (memberIds.length === 0) {
      Alert.alert(
        'Error',
        'Selected users do not have valid numeric IDs. Please contact support.'
      );
      console.error('No numeric IDs found:', selectedUsers);
      return;
    }

    // Validation
    if (memberIds.length !== selectedUsers.length) {
      Alert.alert(
        'Warning',
        `Only ${memberIds.length} out of ${selectedUsers.length} members have valid IDs. Proceeding...`
      );
    }

    // Debug logging
    console.log('=== GROUP CREATION DEBUG ===');
    console.log('Name:', groupName);
    console.log('Description:', groupDescription);
    console.log('Member Count:', memberIds.length);
    console.log('Member IDs:', memberIds);
    console.log('All numeric?', memberIds.every(id => typeof id === 'number'));
    console.log('Image:', groupImage ? 'Selected' : 'None');
    console.log('=============================');

    // Call onCreate with numeric IDs and optional image
    onCreate(
      groupName,
      groupDescription,
      memberIds,
      groupImage
    );
  };

  // GROUPINFO SCREEN
  if (step === 'groupInfo') {
    const selectedUsers = getSelectedUsers();

    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep('selectMembers')}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New group</Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.groupAvatarSection}>
            <TouchableOpacity
              style={styles.groupAvatarUpload}
              onPress={pickImage}
              activeOpacity={0.7}
            >
              {groupImage ? (
                <Image
                  source={{ uri: groupImage }}
                  style={[styles.avatarPlaceholder, styles.avatarPlaceholderLarge]}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, styles.avatarPlaceholderLarge]}>
                  <Ionicons name="camera" size={40} color="#8696a0" />
                </View>
              )}
              {groupImage && (
                <View style={styles.imageOverlay}>
                  <Ionicons name="pencil" size={20} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.tapToUploadText}>Tap to upload group photo</Text>
          </View>

          <View style={styles.groupInfoForm}>
            <View style={styles.formGroup}>
              <TextInput
                style={styles.groupNameInput}
                placeholder="Group name"
                placeholderTextColor="#8696a0"
                value={groupName}
                onChangeText={setGroupName}
                maxLength={25}
              />
              <Text style={styles.characterCount}>{groupName.length}/25</Text>
            </View>

            <View style={styles.formGroup}>
              <TextInput
                style={[styles.groupNameInput, styles.descriptionInput]}
                placeholder="Group description (optional)"
                placeholderTextColor="#8696a0"
                value={groupDescription}
                onChangeText={setGroupDescription}
                maxLength={100}
                multiline
                numberOfLines={3}
              />
              <Text style={styles.characterCount}>{groupDescription.length}/100</Text>
            </View>

            <TouchableOpacity style={styles.groupSettingsItem} activeOpacity={0.7}>
              <View style={styles.settingIcon}>
                <Ionicons name="time" size={24} color="#667781" />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Disappearing messages</Text>
                <Text style={styles.settingValue}>Off</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.groupSettingsItem} activeOpacity={0.7}>
              <View style={styles.settingIcon}>
                <Ionicons name="settings" size={24} color="#667781" />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Group permissions</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.selectedMembersSection}>
            <Text style={styles.sectionTitle}>Members: {selectedUsers.length}</Text>
            {selectedUsers.map(user => {
              const userId = getUserId(user);
              return (
                <View key={`member-${userId}`} style={styles.selectedMemberItem}>
                  <View style={styles.memberAvatar}>
                    {user.profile_picture ? (
                      <Image
                        source={{ uri: user.profile_picture }}
                        style={styles.memberAvatarImage}
                      />
                    ) : (
                      <View style={styles.memberAvatarPlaceholder}>
                        <Text style={styles.memberAvatarText}>
                          {user.first_name[0]}{user.last_name?.[0] || ''}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberName}>
                    {user.first_name} {user.last_name}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeMember}
                    onPress={() => toggleUserSelection(user)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={20} color="#8696a0" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[
            styles.createGroupButton,
            !groupName.trim() && styles.createGroupButtonDisabled,
          ]}
          onPress={handleCreate}
          disabled={!groupName.trim()}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark" size={24} color="#ffffff" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  // MEMBER SELECTION SCREEN
  const renderUser = ({ item: user }: { item: User }) => {
    const userId = getUserId(user);
    const isSelected = selectedUserIds.has(userId);

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => toggleUserSelection(user)}
        activeOpacity={0.7}
      >
        <View style={styles.userAvatar}>
          {user.profile_picture ? (
            <Image
              source={{ uri: user.profile_picture }}
              style={styles.userAvatarImage}
            />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Text style={styles.userAvatarText}>
                {user.first_name[0]}{user.last_name?.[0] || ''}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {user.first_name} {user.last_name}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
        <View style={styles.userCheckbox}>
          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
            {isSelected && (
              <Ionicons name="checkmark" size={18} color="#ffffff" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const selectedUsers = getSelectedUsers();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Add group members</Text>
          <Text style={styles.headerSubtitle}>
            {selectedUserIds.size > 0
              ? `${selectedUserIds.size} selected`
              : 'Add at least 1 member'}
          </Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#8696a0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts"
            placeholderTextColor="#8696a0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {selectedUsers.length > 0 && (
        <View style={styles.selectedMembersBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedMembersContent}
          >
            {selectedUsers.map(user => {
              const userId = getUserId(user);
              return (
                <View key={`chip-${userId}`} style={styles.selectedMemberChip}>
                  <View style={styles.selectedMemberAvatar}>
                    {user.profile_picture ? (
                      <Image
                        source={{ uri: user.profile_picture }}
                        style={styles.selectedMemberAvatarImage}
                      />
                    ) : (
                      <View style={styles.selectedMemberAvatarPlaceholder}>
                        <Text style={styles.selectedMemberAvatarText}>
                          {user.first_name[0]}{user.last_name?.[0] || ''}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.selectedMemberRemove}
                      onPress={() => toggleUserSelection(user)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.removeIcon}>
                        <Ionicons name="close" size={14} color="#ffffff" />
                      </View>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.selectedMemberName} numberOfLines={1}>
                    {user.first_name}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {isSearching ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#00a884" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => `user-${getUserId(item)}`}
          style={styles.usersList}
          scrollEnabled={true}
          ListEmptyComponent={
            searchQuery ? (
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color="#e9edef" />
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            ) : null
          }
        />
      )}

      {selectedUserIds.size > 0 && (
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-forward" size={28} color="#ffffff" />
        </TouchableOpacity>
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
    backgroundColor: '#008069',
    paddingTop: 90,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 16,
    marginTop:-80,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#ffffff',
    opacity: 0.85,
    marginTop: 2,
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
    backgroundColor: '#ffffff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111b21',
    paddingVertical: 4,
  },
  selectedMembersBar: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
    backgroundColor: '#ffffff',
  },
  selectedMembersContent: {
    paddingHorizontal: 4,
    gap: 12,
  },
  selectedMemberChip: {
    alignItems: 'center',
    gap: 6,
  },
  selectedMemberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'visible',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  selectedMemberAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  selectedMemberAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#d1f4cc',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  selectedMemberAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00a884',
  },
  selectedMemberRemove: {
    position: 'absolute',
    bottom: -6,
    right: -6,
  },
  removeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00a884',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedMemberName: {
    fontSize: 12,
    color: '#111b21',
    fontWeight: '500',
    maxWidth: 60,
    textAlign: 'center',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#667781',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#667781',
  },
  usersList: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  userItemSelected: {
    backgroundColor: '#f0f8f6',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
  },
  userAvatarPlaceholder: {
    width: '100%',
    height: '100%',
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
    fontSize: 15,
    fontWeight: '500',
    color: '#111b21',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#667781',
  },
  userCheckbox: {},
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#bcc3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#00a884',
    borderColor: '#00a884',
  },
  nextButton: {
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
  content: {
    flex: 1,
  },
  groupAvatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  groupAvatarUpload: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  imageOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapToUploadText: {
    fontSize: 13,
    color: '#667781',
    marginTop: 8,
  },
  avatarPlaceholder: {
    backgroundColor: '#e9edef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  groupInfoForm: {
    paddingHorizontal: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  groupNameInput: {
    fontSize: 18,
    color: '#111b21',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e9edef',
  },
  descriptionInput: {
    fontSize: 14,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#8696a0',
    textAlign: 'right',
    marginTop: 4,
  },
  groupSettingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e9edef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#111b21',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
    color: '#667781',
  },
  selectedMembersSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#667781',
    fontWeight: '500',
    marginBottom: 8,
  },
  selectedMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  memberAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e9edef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8696a0',
  },
  memberName: {
    flex: 1,
    fontSize: 16,
    color: '#111b21',
  },
  removeMember: {
    padding: 4,
  },
  createGroupButton: {
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
  createGroupButtonDisabled: {
    backgroundColor: '#e9edef',
  },
});