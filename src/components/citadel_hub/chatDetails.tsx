import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface User {
  id?: number;
  employee_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
}

interface ChatRoomMember {
  id?: number;
  user?: User;
  is_muted?: boolean;
  is_pinned?: boolean;
}

interface ChatRoom {
  id: number;
  name?: string;
  description?: string;
  room_type: 'direct' | 'group';
  profile_picture?: string;
  admin?: User;
  members: (User | ChatRoomMember)[];
  created_at: string;
  is_muted?: boolean;
  is_blocked?: boolean;
  media_count?: number;
}

interface ChatDetailsProps {
  chatRoom: ChatRoom;
  currentUser: User;
  onBack: () => void;
  onEdit: () => void;
  onMute: () => void;
  onUnmute: () => void;
  onBlock?: () => void;
  onUnblock?: () => void;
  onDeleteChat?: () => void;
  onExitGroup?: () => void;
  onReportGroup?: () => void;
  onViewMedia?: () => void;
  onAddMember?: () => void;
}

export const ChatDetails: React.FC<ChatDetailsProps> = ({
  chatRoom,
  currentUser,
  onBack,
  onEdit,
  onMute,
  onUnmute,
  onBlock,
  onUnblock,
  onDeleteChat,
  onExitGroup,
  onReportGroup,
  onViewMedia,
  onAddMember,
}) => {
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [showEncryptionModal, setShowEncryptionModal] = useState(false);
  const [showMuteOptions, setShowMuteOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);

  // Helper function to extract user from member object
  const getUserFromMember = (member: User | ChatRoomMember): User | null => {
    if (!member) return null;

    // If it's already a User object
    if ('first_name' in member && 'last_name' in member && 'email' in member) {
      return member as User;
    }

    // If it's a ChatRoomMember with nested user
    if ('user' in member && member.user) {
      return member.user;
    }

    return null;
  };

  const getChatName = () => {
    if (chatRoom.room_type === 'group') {
      return chatRoom.name || 'Unnamed Group';
    }

    const currentUserId = currentUser.id || currentUser.employee_id;
    const otherMember = chatRoom.members.find(m => {
      const user = getUserFromMember(m);
      return user && (user.id || user.employee_id) !== currentUserId;
    });

    if (otherMember) {
      const user = getUserFromMember(otherMember);
      return user ? `${user.first_name} ${user.last_name}` : 'Unknown';
    }

    return 'Unknown';
  };

  const getChatAvatar = () => {
    if (chatRoom.room_type === 'group') {
      if (chatRoom.profile_picture) {
        return (
          <Image
            source={{ uri: chatRoom.profile_picture }}
            style={styles.profileAvatar}
          />
        );
      }
      return (
        <View style={[styles.profileAvatar, styles.avatarPlaceholder]}>
          <Ionicons name="people" size={60} color="#8696a0" />
        </View>
      );
    }

    const currentUserId = currentUser.id || currentUser.employee_id;
    const otherMember = chatRoom.members.find(m => {
      const user = getUserFromMember(m);
      return user && (user.id || user.employee_id) !== currentUserId;
    });

    const otherUser = otherMember ? getUserFromMember(otherMember) : null;

    if (otherUser?.profile_picture) {
      return (
        <Image
          source={{ uri: otherUser.profile_picture }}
          style={styles.profileAvatar}
        />
      );
    }

    return (
      <View style={[styles.profileAvatar, styles.avatarPlaceholder]}>
        <Text style={styles.avatarText}>
          {otherUser
            ? `${otherUser.first_name[0] || '?'}${otherUser.last_name?.[0] || ''}`
            : '?'}
        </Text>
      </View>
    );
  };

  const isAdmin = chatRoom.admin?.id === currentUser.id;

  // Extract and normalize members list
  const normalizedMembers = chatRoom.members.map(m => getUserFromMember(m)).filter(Boolean) as User[];
  const displayedMembers = showAllMembers ? normalizedMembers : normalizedMembers.slice(0, 5);

  const getOtherUserEmail = () => {
    const currentUserId = currentUser.id || currentUser.employee_id;
    const otherMember = chatRoom.members.find(m => {
      const user = getUserFromMember(m);
      return user && (user.id || user.employee_id) !== currentUserId;
    });

    const otherUser = otherMember ? getUserFromMember(otherMember) : null;
    return otherUser?.email || '';
  };

  const handleMutePress = () => {
    setShowMuteOptions(true);
  };

  const handleMuteOption = (duration: string) => {
    setShowMuteOptions(false);
    // Call the backend mute function with duration
    if (onMute) {
      onMute();
      Alert.alert(
        'Muted',
        `Notifications muted for ${duration}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleUnmute = () => {
    if (onUnmute) {
      onUnmute();
      Alert.alert('Unmuted', 'Notifications turned on', [{ text: 'OK' }]);
    }
  };

  const handleBlockPress = () => {
    setShowBlockConfirm(true);
  };

  const handleBlock = () => {
    setShowBlockConfirm(false);
    if (chatRoom.is_blocked) {
      if (onUnblock) {
        onUnblock();
        Alert.alert('Unblocked', 'User has been unblocked', [{ text: 'OK' }]);
      }
    } else {
      if (onBlock) {
        onBlock();
        Alert.alert('Blocked', 'User has been blocked', [{ text: 'OK' }]);
      }
    }
  };

  const handleDeletePress = () => {
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    if (onDeleteChat) {
      onDeleteChat();
    }
  };

  const handleExitPress = () => {
    setShowExitConfirm(true);
  };

  const handleExit = () => {
    setShowExitConfirm(false);
    if (onExitGroup) {
      onExitGroup();
    }
  };

  const handleReportPress = () => {
    setShowReportConfirm(true);
  };

  const handleReport = () => {
    setShowReportConfirm(false);
    if (onReportGroup) {
      onReportGroup();
      Alert.alert('Reported', 'Group has been reported', [{ text: 'OK' }]);
    }
  };

  const handleMediaPress = () => {
    if (onViewMedia) {
      onViewMedia();
    }
  };

  const EncryptionModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showEncryptionModal}
      onRequestClose={() => setShowEncryptionModal(false)}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={() => setShowEncryptionModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalIconContainer}>
            <Ionicons name="lock-closed" size={48} color="#00a884" />
          </View>
          <Text style={styles.modalTitle}>End-to-end encrypted</Text>
          <Text style={styles.modalMessage}>
            Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
          </Text>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setShowEncryptionModal(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.modalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  const MuteOptionsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showMuteOptions}
      onRequestClose={() => setShowMuteOptions(false)}
    >
      <Pressable 
        style={styles.bottomSheetOverlay}
        onPress={() => setShowMuteOptions(false)}
      >
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>Mute notifications</Text>
          </View>
          <TouchableOpacity
            style={styles.bottomSheetOption}
            onPress={() => handleMuteOption('8 hours')}
            activeOpacity={0.7}
          >
            <Text style={styles.bottomSheetOptionText}>8 hours</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomSheetOption}
            onPress={() => handleMuteOption('1 week')}
            activeOpacity={0.7}
          >
            <Text style={styles.bottomSheetOptionText}>1 week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomSheetOption}
            onPress={() => handleMuteOption('Always')}
            activeOpacity={0.7}
          >
            <Text style={styles.bottomSheetOptionText}>Always</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomSheetOption, styles.bottomSheetCancel]}
            onPress={() => setShowMuteOptions(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.bottomSheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  const ConfirmationModal = ({ 
    visible, 
    onClose, 
    onConfirm, 
    title, 
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDanger = false
  }: {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  }) => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.confirmModalContent}>
          <Text style={styles.confirmModalTitle}>{title}</Text>
          <Text style={styles.confirmModalMessage}>{message}</Text>
          <View style={styles.confirmModalButtons}>
            <TouchableOpacity
              style={[styles.confirmModalButton, styles.confirmModalButtonCancel]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmModalButtonCancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmModalButton, isDanger && styles.confirmModalButtonDanger]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.confirmModalButtonText,
                isDanger && styles.confirmModalButtonDangerText
              ]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );

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
        <Text style={styles.headerTitle}>Contact Info</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          {getChatAvatar()}
          <Text style={styles.profileName}>{getChatName()}</Text>
          {chatRoom.room_type === 'group' && (
            <Text style={styles.profileMeta}>
              Group · {normalizedMembers.length} members
            </Text>
          )}
          {chatRoom.room_type === 'direct' && (
            <Text style={styles.profileMeta}>
              {getOtherUserEmail()}
            </Text>
          )}
        </View>

        {/* Group Description */}
        {chatRoom.room_type === 'group' && chatRoom.description && (
          <View style={styles.section}>
            <View style={styles.sectionItem}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionValue}>{chatRoom.description}</Text>
            </View>
          </View>
        )}

        {/* Encryption Info */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionItem} 
            onPress={() => setShowEncryptionModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionIcon}>
              <Ionicons name="lock-closed" size={22} color="#00a884" />
            </View>
            <View style={styles.sectionText}>
              <Text style={styles.sectionLabel}>Encryption</Text>
              <Text style={styles.sectionValue}>Messages are end-to-end encrypted</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8696a0" />
          </TouchableOpacity>
        </View>

        {/* Media Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionItem} 
            onPress={handleMediaPress}
            activeOpacity={0.7}
          >
            <View style={styles.sectionIcon}>
              <Ionicons name="images" size={22} color="#00a884" />
            </View>
            <View style={styles.sectionText}>
              <Text style={styles.sectionLabel}>Media, links, and docs</Text>
              <Text style={styles.sectionValue}>{chatRoom.media_count || 0}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8696a0" />
          </TouchableOpacity>
        </View>

        {/* Group Members */}
        {chatRoom.room_type === 'group' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>
                {normalizedMembers.length} members
              </Text>
              {isAdmin && (
                <TouchableOpacity 
                  style={styles.addMemberBtn} 
                  onPress={onAddMember}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-add" size={20} color="#00a884" />
                </TouchableOpacity>
              )}
            </View>

            {displayedMembers.map(member => (
              <View key={member.id || member.employee_id} style={styles.memberItem}>
                <View style={styles.memberAvatar}>
                  {member.profile_picture ? (
                    <Image
                      source={{ uri: member.profile_picture }}
                      style={styles.memberAvatarImage}
                    />
                  ) : (
                    <View style={styles.memberAvatarPlaceholder}>
                      <Text style={styles.memberAvatarText}>
                        {member.first_name[0] || '?'}
                        {member.last_name?.[0] || ''}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {member.first_name} {member.last_name}
                    {(member.id || member.employee_id) === (currentUser.id || currentUser.employee_id) && ' (You)'}
                  </Text>
                  <Text style={styles.memberStatus} numberOfLines={1}>
                    {(member.id || member.employee_id) === chatRoom.admin?.id ? 'Group Admin' : member.email}
                  </Text>
                </View>
              </View>
            ))}

            {normalizedMembers.length > 5 && !showAllMembers && (
              <TouchableOpacity
                style={styles.showAllMembers}
                onPress={() => setShowAllMembers(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.showAllMembersText}>Show all members</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Settings Section */}
        <View style={styles.section}>
          {/* Mute/Unmute */}
          <TouchableOpacity
            style={styles.sectionItem}
            onPress={chatRoom.is_muted ? handleUnmute : handleMutePress}
            activeOpacity={0.7}
          >
            <View style={styles.sectionIcon}>
              <Ionicons
                name={chatRoom.is_muted ? 'notifications-off' : 'notifications'}
                size={22}
                color="#667781"
              />
            </View>
            <View style={styles.sectionText}>
              <Text style={styles.sectionLabel}>
                {chatRoom.is_muted ? 'Unmute notifications' : 'Mute notifications'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Block/Unblock (only for direct chats) */}
          {chatRoom.room_type === 'direct' && (
            <TouchableOpacity
              style={styles.sectionItem}
              onPress={handleBlockPress}
              activeOpacity={0.7}
            >
              <View style={styles.sectionIcon}>
                <Ionicons
                  name={chatRoom.is_blocked ? "checkmark-circle" : "ban"}
                  size={22}
                  color="#667781"
                />
              </View>
              <View style={styles.sectionText}>
                <Text style={styles.sectionLabel}>
                  {chatRoom.is_blocked ? 'Unblock' : 'Block'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Edit Group (only for group admins) */}
        {chatRoom.room_type === 'group' && isAdmin && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionItem}
              onPress={onEdit}
              activeOpacity={0.7}
            >
              <View style={[styles.sectionIcon, styles.sectionIconEdit]}>
                <Ionicons name="create" size={22} color="#ffffff" />
              </View>
              <View style={styles.sectionText}>
                <Text style={styles.sectionLabel}>Edit group info</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Danger Zone */}
        <View style={[styles.section, styles.sectionDanger]}>
          <TouchableOpacity 
            style={styles.sectionItem} 
            onPress={chatRoom.room_type === 'group' ? handleExitPress : handleDeletePress}
            activeOpacity={0.7}
          >
            <View style={styles.sectionIcon}>
              <Ionicons 
                name={chatRoom.room_type === 'group' ? "exit" : "trash"} 
                size={22} 
                color="#f15c6d" 
              />
            </View>
            <View style={styles.sectionText}>
              <Text style={[styles.sectionLabel, styles.sectionLabelRed]}>
                {chatRoom.room_type === 'group' ? 'Exit group' : 'Delete chat'}
              </Text>
            </View>
          </TouchableOpacity>

          {chatRoom.room_type === 'group' && (
            <TouchableOpacity 
              style={styles.sectionItem} 
              onPress={handleReportPress}
              activeOpacity={0.7}
            >
              <View style={styles.sectionIcon}>
                <Ionicons name="flag" size={22} color="#f15c6d" />
              </View>
              <View style={styles.sectionText}>
                <Text style={[styles.sectionLabel, styles.sectionLabelRed]}>
                  Report group
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Modals */}
      <EncryptionModal />
      <MuteOptionsModal />
      
      <ConfirmationModal
        visible={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        onConfirm={handleBlock}
        title={chatRoom.is_blocked ? "Unblock Contact" : "Block Contact"}
        message={
          chatRoom.is_blocked 
            ? "Are you sure you want to unblock this contact?" 
            : "Blocked contacts will no longer be able to call you or send you messages."
        }
        confirmText={chatRoom.is_blocked ? "Unblock" : "Block"}
        isDanger={!chatRoom.is_blocked}
      />

      <ConfirmationModal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Chat"
        message="Are you sure you want to delete this chat? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
      />

      <ConfirmationModal
        visible={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={handleExit}
        title="Exit Group"
        message="Are you sure you want to exit this group?"
        confirmText="Exit"
        isDanger={true}
      />

      <ConfirmationModal
        visible={showReportConfirm}
        onClose={() => setShowReportConfirm(false)}
        onConfirm={handleReport}
        title="Report Group"
        message="Report this group to WhatsApp?"
        confirmText="Report"
        isDanger={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#008069',
    paddingTop: 90,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 16,
    marginTop: -80,
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
  profileSection: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  profileAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#e9edef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '600',
    color: '#8696a0',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '500',
    color: '#111b21',
    marginBottom: 4,
  },
  profileMeta: {
    fontSize: 14,
    color: '#667781',
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 8,
  },
  sectionDanger: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  sectionHeaderText: {
    fontSize: 14,
    color: '#667781',
    fontWeight: '500',
  },
  addMemberBtn: {
    padding: 4,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e9edef',
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionIconEdit: {
    backgroundColor: '#00a884',
  },
  sectionText: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 16,
    color: '#111b21',
    fontWeight: '400',
  },
  sectionLabelRed: {
    color: '#f15c6d',
  },
  sectionValue: {
    fontSize: 14,
    color: '#667781',
    marginTop: 2,
  },
  descriptionLabel: {
    fontSize: 14,
    color: '#00a884',
    marginBottom: 8,
  },
  descriptionValue: {
    fontSize: 14,
    color: '#667781',
    lineHeight: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e9edef',
  },
  memberAvatar: {
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
    backgroundColor: '#e9edef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8696a0',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '400',
    color: '#111b21',
    marginBottom: 2,
  },
  memberStatus: {
    fontSize: 14,
    color: '#667781',
  },
  showAllMembers: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  showAllMembersText: {
    fontSize: 15,
    color: '#00a884',
    fontWeight: '500',
  },
  bottomPadding: {
    height: 32,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d9fdd3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111b21',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#667781',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#00a884',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    width: '100%',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Bottom Sheet Styles
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  bottomSheetHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111b21',
    textAlign: 'center',
  },
  bottomSheetOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e9edef',
  },
  bottomSheetOptionText: {
    fontSize: 16,
    color: '#111b21',
  },
  bottomSheetCancel: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  bottomSheetCancelText: {
    fontSize: 16,
    color: '#00a884',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Confirmation Modal Styles
  confirmModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 340,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111b21',
    marginBottom: 12,
  },
  confirmModalMessage: {
    fontSize: 14,
    color: '#667781',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#00a884',
    alignItems: 'center',
  },
  confirmModalButtonCancel: {
    backgroundColor: '#f0f2f5',
  },
  confirmModalButtonDanger: {
    backgroundColor: '#f15c6d',
  },
  confirmModalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  confirmModalButtonCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111b21',
  },
  confirmModalButtonDangerText: {
    color: '#ffffff',
  },
});