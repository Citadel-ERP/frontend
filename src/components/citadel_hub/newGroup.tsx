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
  token?: string;
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
  const [isCreating, setIsCreating] = useState(false); // NEW: Loading state for group creation

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
    if (user.id !== undefined && typeof user.id === 'number') {
      return user.id;
    }
    
    if (user.employee_id) {
      const directParse = parseInt(user.employee_id, 10);
      if (!isNaN(directParse) && directParse > 0) {
        return directParse;
      }
      
      const match = user.employee_id.match(/\d+/);
      if (match) {
        const extracted = parseInt(match[0], 10);
        if (!isNaN(extracted) && extracted > 0) {
          return extracted;
        }
      }
    }
    
    if (user.email) {
      let hash = 0;
      for (let i = 0; i < user.email.length; i++) {
        const char = user.email.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash) || 1;
    }
    
    return null;
  };

  useEffect(() => {
    searchUsers();
  }, [searchQuery]);

  const searchUsers = async () => {
    if (!currentUser?.token) {
      console.error('No token available for search');
      setUsers([]);
      return;
    }

    setIsSearching(true);
    try {
      const requestData = {
        token: currentUser.token,
        search: searchQuery
      };
      
      const result = await apiCall('searchUsers', requestData);
      
      if (result.users && Array.isArray(result.users)) {
        setUsers(result.users);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setUsers([]);
    } finally {
      setIsSearching(false);
    }
  };

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

  const getSelectedUsers = (): User[] => {
    return users.filter(user => selectedUserIds.has(getUserId(user)));
  };

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

  const handleCreate = async () => {
    // Prevent duplicate creation
    if (isCreating) {
      return;
    }

    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    const selectedUsers = getSelectedUsers();
    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'No members selected');
      return;
    }

    const memberIds: number[] = selectedUsers
      .map(user => getNumericId(user))
      .filter((id): id is number => id !== null);

    if (memberIds.length === 0) {
      Alert.alert(
        'Error',
        'Selected users do not have valid numeric IDs. Please contact support.'
      );
      return;
    }

    if (memberIds.length !== selectedUsers.length) {
      Alert.alert(
        'Warning',
        `Only ${memberIds.length} out of ${selectedUsers.length} members have valid IDs. Proceeding...`
      );
    }

    // Set loading state
    setIsCreating(true);

    try {
      await onCreate(
        groupName,
        groupDescription,
        memberIds,
        groupImage
      );
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
      setIsCreating(false);
    }
    // Note: Don't set isCreating to false on success because onCreate should navigate away
  };

  const clearSearch = () => {
    setSearchQuery('');
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
            disabled={isCreating}
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New group</Text>
        </View>

        <ScrollView style={styles.content}>
          {/* Group Avatar Section with Gradient Background */}
          <View style={styles.groupAvatarSection}>
            <TouchableOpacity
              style={styles.groupAvatarUpload}
              onPress={pickImage}
              activeOpacity={0.7}
              disabled={isCreating}
            >
              {groupImage ? (
                <View style={styles.avatarContainer}>
                  <Image
                    source={{ uri: groupImage }}
                    style={styles.avatarImage}
                  />
                  <View style={styles.imageEditOverlay}>
                    <View style={styles.editIconContainer}>
                      <Ionicons name="camera" size={22} color="#ffffff" />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.avatarPlaceholderContainer}>
                  <View style={styles.avatarPlaceholderCircle}>
                    <Ionicons name="camera" size={32} color="#00a884" />
                  </View>
                  <Text style={styles.avatarPlaceholderText}>Add group icon</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Group Info Form with Enhanced Design */}
          <View style={styles.groupInfoForm}>
            <View style={styles.formCard}>
              <View style={styles.inputContainer}>
                <View style={styles.inputIconWrapper}>
                  <Ionicons name="text" size={20} color="#00a884" />
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Group name</Text>
                  <TextInput
                    style={styles.groupNameInput}
                    placeholder="Enter group name"
                    placeholderTextColor="#8696a0"
                    value={groupName}
                    onChangeText={setGroupName}
                    maxLength={25}
                    editable={!isCreating}
                  />
                </View>
                <Text style={styles.characterCount}>{groupName.length}/25</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.inputContainer}>
                <View style={styles.inputIconWrapper}>
                  <Ionicons name="document-text" size={20} color="#00a884" />
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Description (optional)</Text>
                  <TextInput
                    style={[styles.groupNameInput, styles.descriptionInput]}
                    placeholder="Add a group description"
                    placeholderTextColor="#8696a0"
                    value={groupDescription}
                    onChangeText={setGroupDescription}
                    maxLength={100}
                    multiline
                    numberOfLines={2}
                    editable={!isCreating}
                  />
                </View>
                <Text style={styles.characterCount}>{groupDescription.length}/100</Text>
              </View>
            </View>
          </View>

          {/* Members Section - WhatsApp Style */}
          <View style={styles.membersSection}>
            <View style={styles.membersSectionHeader}>
              <Text style={styles.membersSectionTitle}>
                Participants: {selectedUsers.length}
              </Text>
            </View>

            <View style={styles.membersListCard}>
              {selectedUsers.map((user, index) => {
                const userId = getUserId(user);
                return (
                  <View key={`member-${userId}`}>
                    <View style={styles.memberItemContainer}>
                      <View style={styles.memberAvatarContainer}>
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
                      
                      <View style={styles.memberInfoContainer}>
                        <Text style={styles.memberName}>
                          {user.first_name} {user.last_name}
                        </Text>
                        <Text style={styles.memberEmail} numberOfLines={1}>
                          {user.email}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.removeMemberButton}
                        onPress={() => toggleUserSelection(user)}
                        activeOpacity={0.7}
                        disabled={isCreating}
                      >
                        <View style={styles.removeIconCircle}>
                          <Ionicons name="close" size={18} color="#ea4335" />
                        </View>
                      </TouchableOpacity>
                    </View>
                    
                    {index < selectedUsers.length - 1 && (
                      <View style={styles.memberDivider} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Create Group Button with Loading State */}
        <TouchableOpacity
          style={[
            styles.createGroupButton,
            (!groupName.trim() || isCreating) && styles.createGroupButtonDisabled,
          ]}
          onPress={handleCreate}
          disabled={!groupName.trim() || isCreating}
          activeOpacity={0.8}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="checkmark" size={28} color="#ffffff" />
          )}
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
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={clearSearch}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#8696a0" />
            </TouchableOpacity>
          )}
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
    marginTop: Platform.OS === 'ios' ? -80 : -50,
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
  clearButton: {
    padding: 4,
    marginLeft: 4,
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
    backgroundColor: '#f0f2f5',
  },
  groupAvatarSection: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderBottomWidth: 8,
    borderBottomColor: '#f0f2f5',
  },
  groupAvatarUpload: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#00a884',
  },
  imageEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  editIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00a884',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  avatarPlaceholderContainer: {
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholderCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e7f8f4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00a884',
    borderStyle: 'dashed',
  },
  avatarPlaceholderText: {
    fontSize: 14,
    color: '#00a884',
    fontWeight: '500',
  },
  groupInfoForm: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  inputIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e7f8f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: '#00a884',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupNameInput: {
    fontSize: 16,
    color: '#111b21',
    paddingVertical: 4,
  },
  descriptionInput: {
    fontSize: 14,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f2f5',
    marginHorizontal: 16,
    marginVertical: 4,
  },
  membersSection: {
    marginTop: 16,
    paddingBottom: 20,
  },
  membersSectionHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
  },
  membersSectionTitle: {
    fontSize: 14,
    color: '#00a884',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  membersListCard: {
    backgroundColor: '#ffffff',
  },
  memberItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  memberAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  memberAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e7f8f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00a884',
  },
  memberInfoContainer: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111b21',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 13,
    color: '#667781',
  },
  removeMemberButton: {
    padding: 8,
  },
  removeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef1f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberDivider: {
    height: 1,
    backgroundColor: '#f0f2f5',
    marginLeft: 76,
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