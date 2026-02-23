import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaLinksDocsScreen } from './MediaLinksDocsScreen';

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
  role?: string;
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
  updated_at?: string;
  is_muted?: boolean;          // ← now comes from serializer per-user
  muted_until?: string | null; // ← ISO string or null
  is_blocked?: boolean;
  media_count?: number;
  block_status?: {
    is_blocked: boolean;
    blocked_by_me: boolean;
    blocked_by_other: boolean;
    blocker_name?: string;
  };
}

interface ChatDetailsProps {
  chatRoom: ChatRoom;
  currentUser: User;
  onBack: () => void;
  onEdit: () => void;
  onMute: (duration: string) => void;  // ← CHANGED: now carries duration
  onUnmute: () => void;
  onBlock?: () => void;
  onUnblock?: () => void;
  onDeleteChat?: () => void;
  onExitGroup?: () => void;
  onReportGroup?: (reason: string, alsoExit: boolean) => void;
  onViewMedia?: () => void;
  onAddMember?: () => void;
  onRemoveMember?: (memberId: string) => void;
  apiCall?: (endpoint: string, data: any) => Promise<any>;
  wsRef?: React.MutableRefObject<WebSocket | null>;
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
  onRemoveMember,
  apiCall,
  wsRef,
}) => {
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [showEncryptionModal, setShowEncryptionModal] = useState(false);
  const [showMuteOptions, setShowMuteOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [alsoExitGroup, setAlsoExitGroup] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [showMediaScreen, setShowMediaScreen] = useState(false);

  // ─── Derived mute state ───────────────────────────────────────────────────
  // Computed here so the whole component reacts consistently to chatRoom updates
  const isMuted = useMemo(() => {
    if (!chatRoom.is_muted) return false;
    if (!chatRoom.muted_until) return true; // muted forever
    return new Date(chatRoom.muted_until) > new Date(); // check expiry
  }, [chatRoom.is_muted, chatRoom.muted_until]);

  const muteLabel = useMemo(() => {
    if (!isMuted) return null;
    if (!chatRoom.muted_until) return 'Always';
    const d = new Date(chatRoom.muted_until);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  }, [isMuted, chatRoom.muted_until]);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const getUserFromMember = (member: User | ChatRoomMember): User | null => {
    if (!member) return null;
    if ('first_name' in member && 'last_name' in member && 'email' in member) {
      return member as User;
    }
    if ('user' in member && member.user) return member.user;
    return null;
  };

  const getMemberRole = (member: User | ChatRoomMember): string => {
    if ('role' in member && (member as ChatRoomMember).role) {
      return (member as ChatRoomMember).role!;
    }
    const userId = (member as User).id || (member as User).employee_id;
    const adminId = chatRoom.admin?.id || chatRoom.admin?.employee_id;
    return userId === adminId ? 'admin' : 'member';
  };

  const isAdmin = useMemo(() => {
    const adminId = chatRoom.admin?.id || chatRoom.admin?.employee_id;
    const currentUserId = currentUser.id || currentUser.employee_id;
    if (adminId === currentUserId) return true;
    const m = chatRoom.members.find(m => {
      const u = getUserFromMember(m);
      return u && (u.id || u.employee_id) === currentUserId;
    });
    return !!(m && 'role' in m && (m as ChatRoomMember).role === 'admin');
  }, [chatRoom, currentUser]);

  const normalizedMembers = chatRoom.members
    .map(m => getUserFromMember(m))
    .filter(Boolean) as User[];

  const displayedMembers = showAllMembers
    ? normalizedMembers
    : normalizedMembers.slice(0, 5);

  useEffect(() => {
    console.log('📊 ChatDetails: member count:', chatRoom.members.length);
  }, [chatRoom.members.length]);

  // ─── Chat name / avatar ───────────────────────────────────────────────────
  const getChatName = () => {
    if (chatRoom.room_type === 'group') return chatRoom.name || 'Unnamed Group';
    const currentUserId = currentUser.id || currentUser.employee_id;
    const other = chatRoom.members.find(m => {
      const u = getUserFromMember(m);
      return u && (u.id || u.employee_id) !== currentUserId;
    });
    const otherUser = other ? getUserFromMember(other) : null;
    return otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : 'Unknown';
  };

  const getChatAvatar = () => {
    const ts = chatRoom.updated_at ? new Date(chatRoom.updated_at).getTime() : Date.now();

    if (chatRoom.room_type === 'group') {
      if (chatRoom.profile_picture) {
        return <Image source={{ uri: `${chatRoom.profile_picture}?t=${ts}` }} style={styles.profileAvatar} />;
      }
      return (
        <View style={[styles.profileAvatar, styles.avatarPlaceholder]}>
          <Ionicons name="people" size={60} color="#8696a0" />
        </View>
      );
    }

    const currentUserId = currentUser.id || currentUser.employee_id;
    const other = chatRoom.members.find(m => {
      const u = getUserFromMember(m);
      return u && (u.id || u.employee_id) !== currentUserId;
    });
    const otherUser = other ? getUserFromMember(other) : null;

    if (otherUser?.profile_picture) {
      return <Image source={{ uri: `${otherUser.profile_picture}?t=${ts}` }} style={styles.profileAvatar} />;
    }
    return (
      <View style={[styles.profileAvatar, styles.avatarPlaceholder]}>
        <Text style={styles.avatarText}>
          {otherUser ? `${otherUser.first_name[0] || '?'}${otherUser.last_name?.[0] || ''}` : '?'}
        </Text>
      </View>
    );
  };

  // ─── Member management ────────────────────────────────────────────────────
  const handleRemoveMember = useCallback((member: User) => {
    Alert.alert(
      'Remove Member',
      `Remove ${member.first_name} ${member.last_name} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            if (onRemoveMember) {
              setRemovingMemberId(member.employee_id || String(member.id));
              onRemoveMember(member.employee_id || String(member.id));
            }
          },
        },
      ]
    );
  }, [onRemoveMember]);

  const handleMakeAdmin = async (member: User, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    Alert.alert(
      currentRole === 'admin' ? 'Remove Admin' : 'Make Admin',
      `${currentRole === 'admin' ? 'Remove admin privileges from' : 'Make'} ${member.first_name} ${member.last_name}${currentRole === 'admin' ? '?' : ' an admin?'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentRole === 'admin' ? 'Remove' : 'Confirm',
          onPress: async () => {
            try {
              if (!apiCall) {
                Alert.alert('Info', 'This feature requires backend integration.');
                return;
              }
              const result = await apiCall('updateMemberRole', {
                chat_room_id: chatRoom.id,
                user_id: member.employee_id,
                new_role: newRole,
              });
              if (wsRef?.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  action: 'broadcast_role_update',
                  room_id: chatRoom.id.toString(),
                  updated_user: result.user || member,
                  new_role: result.new_role || newRole,
                  old_role: result.old_role || currentRole,
                  updated_by: currentUser,
                  system_message: result.system_message,
                }));
              }
              Alert.alert('Success', `${member.first_name} is now ${newRole === 'admin' ? 'an admin' : 'a member'}`);
            } catch (error) {
              Alert.alert('Error', 'Failed to update member role. Please try again.');
            }
          },
        },
      ]
    );
  };

  const showMemberActionSheet = (member: User, currentRole: string) => {
    Alert.alert(
      `Manage ${member.first_name} ${member.last_name}`,
      'Choose an action',
      [
        { text: currentRole === 'admin' ? 'Remove Admin' : 'Make Admin', onPress: () => handleMakeAdmin(member, currentRole) },
        { text: 'Remove from Group', style: 'destructive', onPress: () => handleRemoveMember(member) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ─── Mute handlers ────────────────────────────────────────────────────────
  const handleMutePress = () => setShowMuteOptions(true);

  const handleMuteOption = (duration: string, label: string) => {  // ← CHANGED
    setShowMuteOptions(false);
    onMute(duration);  // ← passes duration to CitadelHub
    Alert.alert(
      'Notifications Muted',
      duration === 'always' ? 'Notifications muted forever.' : `Notifications muted for ${label}.`,
      [{ text: 'OK' }]
    );
  };

  const handleUnmutePress = () => {
    Alert.alert(
      'Unmute Notifications',
      'Turn on notifications for this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unmute',
          onPress: () => {
            onUnmute();
            Alert.alert('Unmuted', 'Notifications turned on.', [{ text: 'OK' }]);
          },
        },
      ]
    );
  };

  // ─── Block handlers ───────────────────────────────────────────────────────
  const isBlockedByMe = chatRoom.block_status?.blocked_by_me ?? false;
  const isBlockedByOther = chatRoom.block_status?.blocked_by_other ?? false;
  const isBlocked = chatRoom.block_status?.is_blocked ?? false;

  const handleBlockPress = () => setShowBlockConfirm(true);

  const handleBlock = () => {
    setShowBlockConfirm(false);
    if (isBlockedByMe) {
      if (onUnblock) onUnblock();
    } else {
      if (onBlock) onBlock();
    }
  };

  // ─── Other handlers ───────────────────────────────────────────────────────
  const handleDeletePress = () => setShowDeleteConfirm(true);
  const handleDelete = () => { setShowDeleteConfirm(false); if (onDeleteChat) onDeleteChat(); };

  const handleExitPress = () => setShowExitConfirm(true);
  const handleExit = () => { setShowExitConfirm(false); if (onExitGroup) onExitGroup(); };

  const handleReportPress = () => setShowReportConfirm(true);
  const handleReport = () => {
    setShowReportConfirm(false);
    if (onReportGroup) onReportGroup(reportReason, alsoExitGroup);
    setReportReason('');
    setAlsoExitGroup(false);
  };

  const handleMediaPress = () => {
    if (onViewMedia) onViewMedia();
    else setShowMediaScreen(true);
  };

  if (showMediaScreen && apiCall) {
    return (
      <MediaLinksDocsScreen
        chatRoomId={chatRoom.id}
        onBack={() => setShowMediaScreen(false)}
        apiCall={apiCall}
      />
    );
  }

  // ─── Sub-components ───────────────────────────────────────────────────────
  const ConfirmationModal = ({
    visible, onClose, onConfirm, title, message,
    confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false,
  }: {
    visible: boolean; onClose: () => void; onConfirm: () => void;
    title: string; message: string; confirmText?: string;
    cancelText?: string; isDanger?: boolean;
  }) => (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.confirmModalContent} onPress={e => e.stopPropagation()}>
          <Text style={styles.confirmModalTitle}>{title}</Text>
          <Text style={styles.confirmModalMessage}>{message}</Text>
          <View style={styles.confirmModalButtons}>
            <TouchableOpacity style={[styles.confirmModalButton, styles.confirmModalButtonCancel]} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.confirmModalButtonCancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmModalButton, isDanger && styles.confirmModalButtonDanger]} onPress={onConfirm} activeOpacity={0.7}>
              <Text style={[styles.confirmModalButtonText, isDanger && styles.confirmModalButtonDangerText]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const ReportModal = () => (
    <Modal
      animationType="fade" transparent visible={showReportConfirm}
      onRequestClose={() => { setShowReportConfirm(false); setReportReason(''); setAlsoExitGroup(false); }}
    >
      <Pressable style={styles.modalOverlay} onPress={() => { setShowReportConfirm(false); setReportReason(''); setAlsoExitGroup(false); }}>
        <Pressable style={styles.confirmModalContent} onPress={e => e.stopPropagation()}>
          <Text style={styles.confirmModalTitle}>Report Group</Text>
          <Text style={styles.confirmModalMessage}>Why are you reporting this group?</Text>
          <TextInput
            style={styles.reportInput}
            placeholder="Enter reason for reporting..."
            placeholderTextColor="#8696a0"
            value={reportReason}
            onChangeText={setReportReason}
            multiline numberOfLines={4} textAlignVertical="top"
          />
          <TouchableOpacity style={styles.checkboxContainer} onPress={() => setAlsoExitGroup(!alsoExitGroup)} activeOpacity={0.7}>
            <View style={[styles.checkbox, alsoExitGroup && styles.checkboxChecked]}>
              {alsoExitGroup && <Ionicons name="checkmark" size={16} color="#ffffff" />}
            </View>
            <Text style={styles.checkboxLabel}>Also exit this group</Text>
          </TouchableOpacity>
          <View style={styles.confirmModalButtons}>
            <TouchableOpacity style={[styles.confirmModalButton, styles.confirmModalButtonCancel]} onPress={() => { setShowReportConfirm(false); setReportReason(''); setAlsoExitGroup(false); }} activeOpacity={0.7}>
              <Text style={styles.confirmModalButtonCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmModalButton, styles.confirmModalButtonDanger]}
              onPress={() => { if (reportReason.trim()) handleReport(); else Alert.alert('Error', 'Please provide a reason.'); }}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmModalButtonDangerText}>Report</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const EncryptionModal = () => (
    <Modal animationType="fade" transparent visible={showEncryptionModal} onRequestClose={() => setShowEncryptionModal(false)}>
      <Pressable style={styles.modalOverlay} onPress={() => setShowEncryptionModal(false)}>
        <View style={styles.modalContent}>
          <View style={styles.modalIconContainer}><Ionicons name="lock-closed" size={48} color="#00a884" /></View>
          <Text style={styles.modalTitle}>End-to-end encrypted</Text>
          <Text style={styles.modalMessage}>Messages and calls are end-to-end encrypted. No one outside this chat can read them.</Text>
          <TouchableOpacity style={styles.modalButton} onPress={() => setShowEncryptionModal(false)} activeOpacity={0.7}>
            <Text style={styles.modalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  // ─── CHANGED: Mute options modal — 8h / 24h / Always ────────────────────
  const MuteOptionsModal = () => (
    <Modal animationType="slide" transparent visible={showMuteOptions} onRequestClose={() => setShowMuteOptions(false)}>
      <Pressable style={styles.bottomSheetOverlay} onPress={() => setShowMuteOptions(false)}>
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>Mute notifications for…</Text>
          </View>
          <TouchableOpacity style={styles.bottomSheetOption} onPress={() => handleMuteOption('8h', '8 hours')} activeOpacity={0.7}>
            <Text style={styles.bottomSheetOptionText}>8 hours</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomSheetOption} onPress={() => handleMuteOption('24h', '24 hours')} activeOpacity={0.7}>
            <Text style={styles.bottomSheetOptionText}>24 hours</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomSheetOption} onPress={() => handleMuteOption('always', 'always')} activeOpacity={0.7}>
            <Text style={styles.bottomSheetOptionText}>Always</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bottomSheetOption, styles.bottomSheetCancel]} onPress={() => setShowMuteOptions(false)} activeOpacity={0.7}>
            <Text style={styles.bottomSheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Info</Text>
        {chatRoom.room_type === 'group' ? (
          <TouchableOpacity style={styles.headerButton} onPress={onEdit} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <View style={styles.profileSection}>
          {getChatAvatar()}
          <Text style={styles.profileName}>{getChatName()}</Text>
          {chatRoom.room_type === 'group' && (
            <Text style={styles.profileMeta}>Group · {normalizedMembers.length} members</Text>
          )}
        </View>

        {/* Description */}
        {chatRoom.room_type === 'group' && chatRoom.description && (
          <View style={styles.section}>
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionValue}>{chatRoom.description}</Text>
            </View>
          </View>
        )}

        {/* Encryption */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionItem} onPress={() => setShowEncryptionModal(true)} activeOpacity={0.7}>
            <View style={styles.sectionIcon}><Ionicons name="lock-closed" size={22} color="#00a884" /></View>
            <View style={styles.sectionText}>
              <Text style={styles.sectionLabel}>Encryption</Text>
              <Text style={styles.sectionValue}>Messages are end-to-end encrypted</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8696a0" />
          </TouchableOpacity>
        </View>

        {/* Media */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionItem} onPress={handleMediaPress} activeOpacity={0.7}>
            <View style={styles.sectionIcon}><Ionicons name="images" size={22} color="#00a884" /></View>
            <View style={styles.sectionText}>
              <Text style={styles.sectionLabel}>Media, links, and docs</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8696a0" />
          </TouchableOpacity>
        </View>

        {/* Group Members */}
        {chatRoom.room_type === 'group' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{normalizedMembers.length} members</Text>
              {isAdmin && (
                <TouchableOpacity style={styles.addMemberBtn} onPress={onAddMember} activeOpacity={0.7}>
                  <Ionicons name="person-add" size={20} color="#00a884" />
                </TouchableOpacity>
              )}
            </View>

            {displayedMembers.map(member => {
              const originalMember = chatRoom.members.find(m => {
                const u = getUserFromMember(m);
                return u && (u.id || u.employee_id) === (member.id || member.employee_id);
              });
              const memberRole = originalMember ? getMemberRole(originalMember) : 'member';
              const isMemberAdmin = memberRole === 'admin';
              const isCurrentUser = (member.id || member.employee_id) === (currentUser.id || currentUser.employee_id);
              const canManageMember = isAdmin && !isCurrentUser;

              return (
                <TouchableOpacity
                  key={member.id || member.employee_id}
                  style={styles.memberItem}
                  onPress={() => { if (canManageMember) showMemberActionSheet(member, memberRole); }}
                  activeOpacity={canManageMember ? 0.7 : 1}
                  disabled={!canManageMember}
                >
                  <View style={styles.memberAvatar}>
                    {member.profile_picture ? (
                      <Image source={{ uri: `${member.profile_picture}?t=${chatRoom.updated_at ? new Date(chatRoom.updated_at).getTime() : Date.now()}` }} style={styles.memberAvatarImage} />
                    ) : (
                      <View style={styles.memberAvatarPlaceholder}>
                        <Text style={styles.memberAvatarText}>{member.first_name[0]}{member.last_name?.[0]}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{member.first_name} {member.last_name}{isCurrentUser && ' (You)'}</Text>
                      {isMemberAdmin && (
                        <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>
                      )}
                    </View>
                    <Text style={styles.memberStatus} numberOfLines={1}>{member.email}</Text>
                  </View>
                  {canManageMember && <Ionicons name="chevron-forward" size={20} color="#8696a0" />}
                </TouchableOpacity>
              );
            })}

            {normalizedMembers.length > 5 && !showAllMembers && (
              <TouchableOpacity style={styles.showAllMembers} onPress={() => setShowAllMembers(true)} activeOpacity={0.7}>
                <Text style={styles.showAllMembersText}>Show all members</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Settings — Mute / Block */}
        <View style={styles.section}>
          {/* ── CHANGED: show Unmute row (with expiry label) when muted, else Mute ── */}
          {isMuted ? (
            <TouchableOpacity style={styles.sectionItem} onPress={handleUnmutePress} activeOpacity={0.7}>
              <View style={styles.sectionIcon}>
                <Ionicons name="notifications-off" size={22} color="#667781" />
              </View>
              <View style={styles.sectionText}>
                <Text style={styles.sectionLabel}>Unmute notifications</Text>
                {muteLabel && (
                  <Text style={styles.sectionValue}>Muted {muteLabel === 'Always' ? 'forever' : `until ${muteLabel}`}</Text>
                )}
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.sectionItem} onPress={handleMutePress} activeOpacity={0.7}>
              <View style={styles.sectionIcon}>
                <Ionicons name="notifications" size={22} color="#667781" />
              </View>
              <View style={styles.sectionText}>
                <Text style={styles.sectionLabel}>Mute notifications</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ── CHANGED: Block row — properly handles all 3 states ── */}
          {chatRoom.room_type === 'direct' && (
            <TouchableOpacity style={styles.sectionItem} onPress={handleBlockPress} activeOpacity={0.7}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name={isBlockedByMe ? 'checkmark-circle' : 'ban'}
                  size={22}
                  color={isBlockedByMe ? '#00a884' : '#667781'}
                />
              </View>
              <View style={styles.sectionText}>
                <Text style={styles.sectionLabel}>
                  {isBlockedByMe ? 'Unblock' : 'Block'}
                </Text>
                {isBlockedByOther && !isBlockedByMe && (
                  <Text style={styles.sectionValue}>This contact has blocked you</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, styles.sectionDanger]}>
          <TouchableOpacity
            style={styles.sectionItem}
            onPress={chatRoom.room_type === 'group' ? handleExitPress : handleDeletePress}
            activeOpacity={0.7}
          >
            <View style={styles.sectionIcon}>
              <Ionicons name={chatRoom.room_type === 'group' ? 'exit' : 'trash'} size={22} color="#f15c6d" />
            </View>
            <View style={styles.sectionText}>
              <Text style={[styles.sectionLabel, styles.sectionLabelRed]}>
                {chatRoom.room_type === 'group' ? 'Exit group' : 'Delete chat'}
              </Text>
            </View>
          </TouchableOpacity>

          {chatRoom.room_type === 'group' && (
            <TouchableOpacity style={styles.sectionItem} onPress={handleReportPress} activeOpacity={0.7}>
              <View style={styles.sectionIcon}><Ionicons name="flag" size={22} color="#f15c6d" /></View>
              <View style={styles.sectionText}>
                <Text style={[styles.sectionLabel, styles.sectionLabelRed]}>Report group</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <EncryptionModal />
      <MuteOptionsModal />
      <ReportModal />

      {/* ── Block confirmation — text adapts to current state ── */}
      <ConfirmationModal
        visible={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        onConfirm={handleBlock}
        title={isBlockedByMe ? 'Unblock Contact' : 'Block Contact'}
        message={
          isBlockedByMe
            ? `Unblock ${getChatName()}? They will be able to call you and send messages again.`
            : `Block ${getChatName()}? They will no longer be able to call you or send you messages.`
        }
        confirmText={isBlockedByMe ? 'Unblock' : 'Block'}
        isDanger={!isBlockedByMe}
      />

      <ConfirmationModal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Chat"
        message="Are you sure you want to delete this chat? This cannot be undone."
        confirmText="Delete"
        isDanger
      />

      <ConfirmationModal
        visible={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={handleExit}
        title="Exit Group"
        message="Are you sure you want to exit this group?"
        confirmText="Exit"
        isDanger
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#008069', paddingTop: 90, paddingBottom: 16,
    paddingHorizontal: 16, marginTop: Platform.OS === 'ios' ? -80 : -50,
  },
  headerButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 19, color: '#ffffff', fontWeight: '500', textAlign: 'center' },
  content: { flex: 1 },
  profileSection: { backgroundColor: '#ffffff', alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  profileAvatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 16 },
  avatarPlaceholder: { backgroundColor: '#e9edef', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 48, fontWeight: '600', color: '#8696a0' },
  profileName: { fontSize: 24, fontWeight: '500', color: '#111b21', marginBottom: 4 },
  profileMeta: { fontSize: 14, color: '#667781' },
  section: { backgroundColor: '#ffffff', marginTop: 8 },
  sectionDanger: { marginTop: 16 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f2f5',
  },
  sectionHeaderText: { fontSize: 14, color: '#667781', fontWeight: '500' },
  addMemberBtn: { padding: 4 },
  sectionItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, gap: 16, borderBottomWidth: 0.5, borderBottomColor: '#e9edef',
  },
  sectionIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f2f5',
    justifyContent: 'center', alignItems: 'center',
  },
  sectionText: { flex: 1 },
  sectionLabel: { fontSize: 16, color: '#111b21', fontWeight: '400' },
  sectionLabelRed: { color: '#f15c6d' },
  sectionValue: { fontSize: 13, color: '#667781', marginTop: 2 },
  descriptionContainer: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'column' },
  descriptionLabel: { fontSize: 14, color: '#00a884', marginBottom: 6 },
  descriptionValue: { fontSize: 14, color: '#667781', lineHeight: 20 },
  memberItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, gap: 12, borderBottomWidth: 0.5, borderBottomColor: '#e9edef',
  },
  memberAvatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  memberAvatarImage: { width: '100%', height: '100%' },
  memberAvatarPlaceholder: {
    width: '100%', height: '100%', backgroundColor: '#e9edef',
    justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarText: { fontSize: 16, fontWeight: '600', color: '#8696a0' },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  memberName: { fontSize: 16, fontWeight: '400', color: '#111b21' },
  adminBadge: { backgroundColor: '#00a884', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  adminBadgeText: { fontSize: 10, color: '#ffffff', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  memberStatus: { fontSize: 14, color: '#667781' },
  showAllMembers: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  showAllMembersText: { fontSize: 15, color: '#00a884', fontWeight: '500' },
  bottomPadding: { height: 32 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 12, padding: 24, alignItems: 'center', width: '100%', maxWidth: 340 },
  modalIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#d9fdd3', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '600', color: '#111b21', marginBottom: 12, textAlign: 'center' },
  modalMessage: { fontSize: 14, color: '#667781', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  modalButton: { backgroundColor: '#00a884', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 24, width: '100%' },
  modalButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 20 },
  bottomSheetHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#e9edef' },
  bottomSheetTitle: { fontSize: 16, fontWeight: '600', color: '#111b21', textAlign: 'center' },
  bottomSheetOption: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: '#e9edef' },
  bottomSheetOptionText: { fontSize: 16, color: '#111b21' },
  bottomSheetCancel: { borderBottomWidth: 0, marginTop: 8 },
  bottomSheetCancelText: { fontSize: 16, color: '#00a884', fontWeight: '600', textAlign: 'center' },
  confirmModalContent: { backgroundColor: '#ffffff', borderRadius: 12, padding: 24, width: '90%', maxWidth: 340 },
  confirmModalTitle: { fontSize: 18, fontWeight: '600', color: '#111b21', marginBottom: 12 },
  confirmModalMessage: { fontSize: 14, color: '#667781', lineHeight: 20, marginBottom: 24 },
  confirmModalButtons: { flexDirection: 'row', gap: 12 },
  confirmModalButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 24, backgroundColor: '#00a884', alignItems: 'center' },
  confirmModalButtonCancel: { backgroundColor: '#f0f2f5' },
  confirmModalButtonDanger: { backgroundColor: '#f15c6d' },
  confirmModalButtonText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  confirmModalButtonCancelText: { fontSize: 15, fontWeight: '600', color: '#111b21' },
  confirmModalButtonDangerText: { color: '#ffffff' },
  reportInput: { backgroundColor: '#f0f2f5', borderRadius: 8, padding: 12, fontSize: 15, color: '#111b21', marginBottom: 16, minHeight: 100, maxHeight: 150 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#8696a0', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#00a884', borderColor: '#00a884' },
  checkboxLabel: { fontSize: 15, color: '#111b21' },
});