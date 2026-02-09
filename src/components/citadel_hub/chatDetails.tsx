import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
}

interface ChatRoom {
  id: number;
  name?: string;
  description?: string;
  room_type: 'direct' | 'group';
  profile_picture?: string;
  admin?: User;
  members: User[];
  created_at: string;
  is_muted?: boolean;
}

interface ChatDetailsProps {
  chatRoom: ChatRoom;
  currentUser: User;
  onBack: () => void;
  onEdit: () => void;
  onMute: () => void;
  onUnmute: () => void;
}

export const ChatDetails: React.FC<ChatDetailsProps> = ({
  chatRoom,
  currentUser,
  onBack,
  onEdit,
  onMute,
  onUnmute,
}) => {
  const [showAllMembers, setShowAllMembers] = useState(false);

  const getChatName = () => {
    if (chatRoom.room_type === 'group') {
      return chatRoom.name || 'Unnamed Group';
    }
    const otherUser = chatRoom.members.find(m => m.id !== currentUser.id);
    return otherUser ? `${otherUser.first_name} ${otherUser.last_name}` : 'Unknown';
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
    const otherUser = chatRoom.members.find(m => m.id !== currentUser.id);
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
          {otherUser ? `${otherUser.first_name[0]}${otherUser.last_name?.[0] || ''}` : '?'}
        </Text>
      </View>
    );
  };

  const isAdmin = chatRoom.admin?.id === currentUser.id;
  const displayedMembers = showAllMembers ? chatRoom.members : chatRoom.members.slice(0, 5);

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
        <Text style={styles.headerTitle}>Contact Info</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          {getChatAvatar()}
          <Text style={styles.profileName}>{getChatName()}</Text>
          {chatRoom.room_type === 'group' && (
            <Text style={styles.profileMeta}>
              Group · {chatRoom.members.length} members
            </Text>
          )}
          {chatRoom.room_type === 'direct' && (
            <Text style={styles.profileMeta}>
              {chatRoom.members.find(m => m.id !== currentUser.id)?.email}
            </Text>
          )}
        </View>

        {chatRoom.room_type === 'group' && chatRoom.description && (
          <View style={styles.section}>
            <View style={styles.sectionItem}>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.sectionValue}>{chatRoom.description}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionItem} activeOpacity={0.7}>
            <View style={styles.sectionIcon}>
              <Ionicons name="images" size={24} color="#00a884" />
            </View>
            <View style={styles.sectionText}>
              <Text style={styles.sectionLabel}>Media, links, and docs</Text>
              <Text style={styles.sectionValue}>924</Text>
            </View>
          </TouchableOpacity>
        </View>

        {chatRoom.room_type === 'group' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>
                {chatRoom.members.length} members
              </Text>
              {isAdmin && (
                <TouchableOpacity style={styles.addMemberBtn} activeOpacity={0.7}>
                  <Ionicons name="person-add" size={20} color="#00a884" />
                </TouchableOpacity>
              )}
            </View>

            {displayedMembers.map(member => (
              <View key={member.id} style={styles.memberItem}>
                <View style={styles.memberAvatar}>
                  {member.profile_picture ? (
                    <Image
                      source={{ uri: member.profile_picture }}
                      style={styles.memberAvatarImage}
                    />
                  ) : (
                    <View style={styles.memberAvatarPlaceholder}>
                      <Text style={styles.memberAvatarText}>
                        {member.first_name[0]}{member.last_name?.[0] || ''}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {member.first_name} {member.last_name}
                    {member.id === currentUser.id && ' (You)'}
                  </Text>
                  <Text style={styles.memberStatus} numberOfLines={1}>
                    {member.id === chatRoom.admin?.id ? 'Group Admin' : member.email}
                  </Text>
                </View>
              </View>
            ))}

            {chatRoom.members.length > 5 && !showAllMembers && (
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

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionItem}
            onPress={chatRoom.is_muted ? onUnmute : onMute}
            activeOpacity={0.7}
          >
            <View style={styles.sectionIcon}>
              <Ionicons
                name={chatRoom.is_muted ? 'notifications-off' : 'notifications'}
                size={24}
                color="#667781"
              />
            </View>
            <View style={styles.sectionText}>
              <Text style={styles.sectionLabel}>
                {chatRoom.is_muted ? 'Unmute notifications' : 'Mute notifications'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sectionItem} activeOpacity={0.7}>
            <View style={styles.sectionIcon}>
              <Ionicons name="time" size={24} color="#667781" />
            </View>
            <View style={styles.sectionText}>
              <Text style={styles.sectionLabel}>Disappearing messages</Text>
              <Text style={styles.sectionValue}>Off</Text>
            </View>
          </TouchableOpacity>
        </View>

        {chatRoom.room_type === 'group' && isAdmin && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionItem}
              onPress={onEdit}
              activeOpacity={0.7}
            >
              <View style={[styles.sectionIcon, styles.sectionIconEdit]}>
                <Ionicons name="create" size={24} color="#ffffff" />
              </View>
              <View style={styles.sectionText}>
                <Text style={styles.sectionLabel}>Edit group info</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.section, styles.sectionDanger]}>
          <TouchableOpacity style={styles.sectionItem} activeOpacity={0.7}>
            <View style={styles.sectionIcon}>
              <Ionicons name="trash" size={24} color="#f15c6d" />
            </View>
            <View style={styles.sectionText}>
              <Text style={[styles.sectionLabel, styles.sectionLabelRed]}>
                {chatRoom.room_type === 'group' ? 'Exit group' : 'Delete chat'}
              </Text>
            </View>
          </TouchableOpacity>

          {chatRoom.room_type === 'group' && (
            <TouchableOpacity style={styles.sectionItem} activeOpacity={0.7}>
              <View style={styles.sectionIcon}>
                <Ionicons name="flag" size={24} color="#f15c6d" />
              </View>
              <View style={styles.sectionText}>
                <Text style={[styles.sectionLabel, styles.sectionLabelRed]}>
                  Report group
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
    paddingVertical: 8,
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
    paddingVertical: 12,
    gap: 16,
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    marginBottom: 2,
  },
  sectionLabelRed: {
    color: '#f15c6d',
  },
  sectionValue: {
    fontSize: 14,
    color: '#667781',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
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
    fontWeight: '500',
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
  },
  showAllMembersText: {
    fontSize: 15,
    color: '#00a884',
  },
});