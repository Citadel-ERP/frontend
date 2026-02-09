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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface User {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
}

interface NewGroupProps {
  currentUser: User;
  onBack: () => void;
  onCreate: (name: string, description: string, memberIds: number[]) => void;
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
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    searchUsers();
  }, [searchQuery]);

  const searchUsers = async () => {
    setIsSearching(true);
    try {
      const result = await apiCall('searchUsers', { search: searchQuery });
      if (result.users) {
        setUsers(result.users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleUserSelection = (user: User) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleNext = () => {
    if (selectedUsers.length > 0) {
      setStep('groupInfo');
    }
  };

  const handleCreate = () => {
    if (groupName.trim()) {
      onCreate(
        groupName,
        groupDescription,
        selectedUsers.map(u => u.id)
      );
    }
  };

  if (step === 'groupInfo') {
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
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New group</Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.groupAvatarSection}>
            <View style={styles.groupAvatarUpload}>
              <View style={[styles.avatarPlaceholder, styles.avatarPlaceholderLarge]}>
                <Ionicons name="camera" size={40} color="#8696a0" />
              </View>
            </View>
          </View>

          <View style={styles.groupInfoForm}>
            <View style={styles.formGroup}>
              <TextInput
                style={styles.groupNameInput}
                placeholder="Group name (optional)"
                placeholderTextColor="#8696a0"
                value={groupName}
                onChangeText={setGroupName}
                maxLength={25}
              />
              <Text style={styles.characterCount}>{groupName.length}/25</Text>
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
            {selectedUsers.map(user => (
              <View key={user.id} style={styles.selectedMemberItem}>
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
            ))}
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

  const renderUser = ({ item: user }: { item: User }) => {
    const isSelected = selectedUsers.find(u => u.id === user.id);
    
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Add group members</Text>
          <Text style={styles.headerSubtitle}>Add at least 1 member</Text>
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
        <ScrollView
          horizontal
          style={styles.selectedChips}
          contentContainerStyle={styles.chipsContainer}
          showsHorizontalScrollIndicator={false}
        >
          {selectedUsers.map(user => (
            <View key={user.id} style={styles.userChip}>
              <View style={styles.chipAvatar}>
                {user.profile_picture ? (
                  <Image
                    source={{ uri: user.profile_picture }}
                    style={styles.chipAvatarImage}
                  />
                ) : (
                  <View style={styles.chipAvatarPlaceholder}>
                    <Text style={styles.chipAvatarText}>
                      {user.first_name[0]}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.chipName}>{user.first_name}</Text>
              <TouchableOpacity
                style={styles.chipRemove}
                onPress={() => toggleUserSelection(user)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={16} color="#111b21" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
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
          keyExtractor={(item) => item.employee_id}
          style={styles.usersList}
        />
      )}

      {selectedUsers.length > 0 && (
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-forward" size={24} color="#ffffff" />
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
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 19,
    color: '#ffffff',
    fontWeight: '500',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
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
  },
  selectedChips: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
  },
  chipsContainer: {
    gap: 8,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1f4cc',
    borderRadius: 16,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 12,
    gap: 6,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  chipAvatarImage: {
    width: '100%',
    height: '100%',
  },
  chipAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#00a884',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  chipName: {
    fontSize: 14,
    color: '#111b21',
    fontWeight: '500',
  },
  chipRemove: {
    padding: 2,
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
  usersList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  userItemSelected: {
    backgroundColor: '#d1f4cc',
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
    fontSize: 16,
    fontWeight: '500',
    color: '#111b21',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#667781',
  },
  userCheckbox: {},
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#8696a0',
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
  groupAvatarUpload: {},
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