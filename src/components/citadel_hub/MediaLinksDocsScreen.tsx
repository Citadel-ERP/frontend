import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Image, FlatList,
  StyleSheet, Linking, Platform, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const MEDIA_ITEM_SIZE = (width - 4) / 3; // 3 columns like WhatsApp

type Tab = 'media' | 'links' | 'docs';

interface MediaItem {
  id: string;
  message_type: string;
  content: string;
  image_url?: string;
  video_url?: string;
  file_url?: string;
  audio_url?: string;
  sender: { first_name: string; last_name: string };
  created_at: string;
}

interface Props {
  chatRoomId: number;
  onBack: () => void;
  apiCall: (endpoint: string, data: any) => Promise<any>;
}

export const MediaLinksDocsScreen: React.FC<Props> = ({ chatRoomId, onBack, apiCall }) => {
  const [activeTab, setActiveTab] = useState<Tab>('media');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [linkItems, setLinkItems] = useState<MediaItem[]>([]);
  const [docItems, setDocItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMedia = useCallback(async (type: 'image' | 'link' | 'file') => {
    try {
      const result = await apiCall('getChatMedia', {
        chat_room_id: chatRoomId,
        media_type: type,
      });
      return result.media || [];
    } catch (e) {
      return [];
    }
  }, [chatRoomId, apiCall]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      const [media, links, docs] = await Promise.all([
        fetchMedia('image'),
        fetchMedia('link'),
        fetchMedia('file'),
      ]);
      setMediaItems(media);
      setLinkItems(links);
      setDocItems(docs);
      setLoading(false);
    };
    loadAll();
  }, [fetchMedia]);

  // Extract URLs from text messages
  const extractUrl = (text: string) => {
    const match = text.match(/https?:\/\/[^\s]+/);
    return match ? match[0] : null;
  };

  const renderMediaItem = ({ item }: { item: MediaItem }) => {
    const uri = item.image_url || item.video_url;
    return (
      <TouchableOpacity style={styles.mediaItem} activeOpacity={0.8}>
        {item.message_type === 'video' && (
          <View style={styles.playOverlay}>
            <Ionicons name="play-circle" size={32} color="#fff" />
          </View>
        )}
        <Image source={{ uri }} style={styles.mediaThumb} resizeMode="cover" />
      </TouchableOpacity>
    );
  };

  const renderLinkItem = ({ item }: { item: MediaItem }) => {
    const url = extractUrl(item.content);
    if (!url) return null;
    return (
      <TouchableOpacity style={styles.linkItem} onPress={() => Linking.openURL(url)} activeOpacity={0.7}>
        <View style={styles.linkIconContainer}>
          <Ionicons name="link" size={22} color="#00a884" />
        </View>
        <View style={styles.linkContent}>
          <Text style={styles.linkUrl} numberOfLines={1}>{url}</Text>
          <Text style={styles.linkSender} numberOfLines={1}>
            {item.sender.first_name} {item.sender.last_name}
          </Text>
        </View>
        <Ionicons name="open-outline" size={18} color="#8696a0" />
      </TouchableOpacity>
    );
  };

  const renderDocItem = ({ item }: { item: MediaItem }) => {
    const icon = item.message_type === 'audio' ? 'mic' : 'document';
    const url = item.file_url || item.audio_url;
    return (
      <TouchableOpacity
        style={styles.docItem}
        onPress={() => url && Linking.openURL(url)}
        activeOpacity={0.7}
      >
        <View style={styles.docIconContainer}>
          <Ionicons name={icon} size={24} color="#00a884" />
        </View>
        <View style={styles.docContent}>
          <Text style={styles.docName} numberOfLines={1}>{item.content || 'File'}</Text>
          <Text style={styles.docSender} numberOfLines={1}>
            {item.sender.first_name} {item.sender.last_name}
          </Text>
        </View>
        <Ionicons name="download-outline" size={20} color="#8696a0" />
      </TouchableOpacity>
    );
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'media', label: 'Media', count: mediaItems.length },
    { key: 'links', label: 'Links', count: linkItems.length },
    { key: 'docs', label: 'Docs', count: docItems.length },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Media, Links, and Docs</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00a884" />
        </View>
      ) : (
        <>
          {activeTab === 'media' && (
            mediaItems.length === 0 ? (
              <EmptyState icon="images-outline" text="No media shared yet" />
            ) : (
              <FlatList
                data={mediaItems}
                renderItem={renderMediaItem}
                keyExtractor={item => item.id}
                numColumns={3}
                columnWrapperStyle={styles.mediaRow}
              />
            )
          )}
          {activeTab === 'links' && (
            linkItems.length === 0 ? (
              <EmptyState icon="link-outline" text="No links shared yet" />
            ) : (
              <FlatList
                data={linkItems}
                renderItem={renderLinkItem}
                keyExtractor={item => item.id}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )
          )}
          {activeTab === 'docs' && (
            docItems.length === 0 ? (
              <EmptyState icon="document-outline" text="No docs shared yet" />
            ) : (
              <FlatList
                data={docItems}
                renderItem={renderDocItem}
                keyExtractor={item => item.id}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )
          )}
        </>
      )}
    </View>
  );
};

const EmptyState = ({ icon, text }: { icon: any; text: string }) => (
  <View style={styles.centered}>
    <Ionicons name={icon} size={64} color="#e9edef" />
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#008069',
    paddingTop: 90,
    paddingBottom: 16,
    paddingHorizontal: 16,
    marginTop: Platform.OS === 'ios' ? -80 : -50,
    gap: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '500', color: '#fff', flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#008069',
    borderBottomWidth: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: '#fff' },
  tabText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  activeTabText: { color: '#fff' },
  mediaRow: { gap: 2, marginBottom: 2 },
  mediaItem: {
    width: MEDIA_ITEM_SIZE,
    height: MEDIA_ITEM_SIZE,
    backgroundColor: '#e9edef',
  },
  mediaThumb: { width: '100%', height: '100%' },
  playOverlay: {
    position: 'absolute',
    zIndex: 1,
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
  },
  linkIconContainer: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#e9edef',
    justifyContent: 'center', alignItems: 'center',
  },
  linkContent: { flex: 1 },
  linkUrl: { fontSize: 14, color: '#111b21', fontWeight: '500' },
  linkSender: { fontSize: 12, color: '#8696a0', marginTop: 2 },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
  },
  docIconContainer: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: '#e9edef',
    justifyContent: 'center', alignItems: 'center',
  },
  docContent: { flex: 1 },
  docName: { fontSize: 14, color: '#111b21', fontWeight: '500' },
  docSender: { fontSize: 12, color: '#8696a0', marginTop: 2 },
  separator: { height: 0.5, backgroundColor: '#e9edef', marginLeft: 72 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: '#8696a0' },
});