import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  Linking,
  Platform,
  ActivityIndicator,
  Dimensions,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoPlayer } from './videoPlayer'; // reuse existing component

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const { width, height } = Dimensions.get('window');
const MEDIA_ITEM_SIZE = (width - 4) / 3; // 3-column grid, 2px gap
const PAGE_SIZE = 20;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ActiveTab = 'media' | 'links' | 'docs';
type ApiMediaType = 'image' | 'link' | 'file';

interface Sender {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
}

interface MediaItem {
  id: string;
  message_type: 'image' | 'video' | 'text' | 'file' | 'audio';
  content: string;
  image_url?: string;
  video_url?: string;
  file_url?: string;
  audio_url?: string;
  sender: Sender;
  created_at: string;
}

interface TabPagination {
  page: number;
  hasMore: boolean;
  loadingMore: boolean;
}

interface Props {
  chatRoomId: number;
  onBack: () => void;
  // apiCall signature unchanged — backward compatible
  apiCall: (endpoint: string, data: Record<string, unknown>) => Promise<any>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab metadata
// ─────────────────────────────────────────────────────────────────────────────

const TABS: { key: ActiveTab; label: string; apiType: ApiMediaType }[] = [
  { key: 'media', label: 'Media', apiType: 'image' },
  { key: 'links', label: 'Links', apiType: 'link' },
  { key: 'docs',  label: 'Docs',  apiType: 'file' },
];

const DEFAULT_PAGINATION: TabPagination = {
  page: 1,
  hasMore: true,
  loadingMore: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const MediaLinksDocsScreen: React.FC<Props> = ({
  chatRoomId,
  onBack,
  apiCall,
}) => {
  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<ActiveTab>('media');

  // ── Per-tab item lists ──
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [linkItems, setLinkItems]   = useState<MediaItem[]>([]);
  const [docItems, setDocItems]     = useState<MediaItem[]>([]);

  // ── Per-tab pagination ──
  const [mediaPag, setMediaPag] = useState<TabPagination>({ ...DEFAULT_PAGINATION });
  const [linksPag, setLinksPag] = useState<TabPagination>({ ...DEFAULT_PAGINATION });
  const [docsPag,  setDocsPag]  = useState<TabPagination>({ ...DEFAULT_PAGINATION });

  // ── Initial load spinner ──
  const [initialLoading, setInitialLoading] = useState(true);

  // ── Fullscreen viewer state (Fix #1) ──
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);

  // Prevent duplicate concurrent paginate calls per tab
  const isFetchingRef = useRef<Partial<Record<ActiveTab, boolean>>>({});

  // ─────────────────────────────────────────────────────────────────────────
  // Accessor helpers — map activeTab → state getters/setters
  // ─────────────────────────────────────────────────────────────────────────

  const getItems = useCallback(
    (tab: ActiveTab): MediaItem[] => {
      if (tab === 'media') return mediaItems;
      if (tab === 'links') return linkItems;
      return docItems;
    },
    [mediaItems, linkItems, docItems],
  );

  const getPag = useCallback(
    (tab: ActiveTab): TabPagination => {
      if (tab === 'media') return mediaPag;
      if (tab === 'links') return linksPag;
      return docsPag;
    },
    [mediaPag, linksPag, docsPag],
  );

  const setItems = useCallback(
    (tab: ActiveTab, updater: (prev: MediaItem[]) => MediaItem[]) => {
      if (tab === 'media') setMediaItems(updater);
      else if (tab === 'links') setLinkItems(updater);
      else setDocItems(updater);
    },
    [],
  );

  const setPag = useCallback(
    (tab: ActiveTab, updater: (prev: TabPagination) => TabPagination) => {
      if (tab === 'media') setMediaPag(updater);
      else if (tab === 'links') setLinksPag(updater);
      else setDocsPag(updater);
    },
    [],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Core fetch — one page, one tab
  // ─────────────────────────────────────────────────────────────────────────

  const fetchPage = useCallback(
    async (
      apiType: ApiMediaType,
      page: number,
    ): Promise<{ items: MediaItem[]; hasMore: boolean }> => {
      try {
        const result = await apiCall('getChatMedia', {
          chat_room_id: chatRoomId,
          media_type: apiType,
          page,
          page_size: PAGE_SIZE,
        });
        return {
          items:   result.media    ?? [],
          hasMore: result.has_more ?? false,
        };
      } catch (err) {
        console.error(`[MediaLinksDocsScreen] fetch error — type:${apiType} page:${page}`, err);
        return { items: [], hasMore: false };
      }
    },
    [chatRoomId, apiCall],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Initial load — page 1 for all three tabs in parallel
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      setInitialLoading(true);
      const [m, l, d] = await Promise.all([
        fetchPage('image', 1),
        fetchPage('link',  1),
        fetchPage('file',  1),
      ]);
      if (cancelled) return;

      setMediaItems(m.items);
      setLinkItems(l.items);
      setDocItems(d.items);

      setMediaPag({ page: 1, hasMore: m.hasMore, loadingMore: false });
      setLinksPag({ page: 1, hasMore: l.hasMore, loadingMore: false });
      setDocsPag({  page: 1, hasMore: d.hasMore, loadingMore: false });

      setInitialLoading(false);
    };

    loadAll();
    return () => { cancelled = true; };
  }, [fetchPage]);

  // ─────────────────────────────────────────────────────────────────────────
  // Infinite scroll — load next page when FlatList reaches end (Fix #3)
  // ─────────────────────────────────────────────────────────────────────────

  const handleLoadMore = useCallback(async () => {
    const pag     = getPag(activeTab);
    const tabMeta = TABS.find(t => t.key === activeTab)!;

    if (pag.loadingMore || !pag.hasMore || isFetchingRef.current[activeTab]) {
      return;
    }

    isFetchingRef.current[activeTab] = true;
    setPag(activeTab, prev => ({ ...prev, loadingMore: true }));

    const nextPage = pag.page + 1;
    const { items, hasMore } = await fetchPage(tabMeta.apiType, nextPage);

    setItems(activeTab, prev => [...prev, ...items]);
    setPag(activeTab, () => ({ page: nextPage, hasMore, loadingMore: false }));
    isFetchingRef.current[activeTab] = false;
  }, [activeTab, getPag, fetchPage, setItems, setPag]);

  // ─────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────

  const extractUrl = (text: string): string | null => {
    const m = text?.match(/https?:\/\/[^\s]+/);
    return m ? m[0] : null;
  };

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day:   'numeric',
      year:  'numeric',
    });

  const senderName = (sender: Sender) =>
    `${sender.first_name} ${sender.last_name}`.trim();

  // ─────────────────────────────────────────────────────────────────────────
  // Render: media grid cell — image or video thumbnail (Fix #1)
  // ─────────────────────────────────────────────────────────────────────────

  const renderMediaItem = ({ item }: { item: MediaItem }) => {
    const isVideo  = item.message_type === 'video';
    const thumbUri = item.image_url || item.video_url;

    const handlePress = () => {
      if (isVideo && item.video_url) {
        setSelectedVideoUrl(item.video_url);
      } else if (item.image_url) {
        setSelectedImageUrl(item.image_url);
      }
    };

    return (
      <TouchableOpacity
        style={styles.mediaCell}
        activeOpacity={0.8}
        onPress={handlePress}
      >
        {/* Thumbnail */}
        {thumbUri ? (
          <Image
            source={{ uri: thumbUri }}
            style={styles.mediaThumb}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.mediaThumb, styles.mediaPlaceholder]}>
            <Ionicons name={isVideo ? 'videocam' : 'image'} size={28} color="#8696a0" />
          </View>
        )}

        {/* Video play-button overlay */}
        {isVideo && (
          <View style={styles.videoOverlay}>
            <View style={styles.videoPlayBtn}>
              <Ionicons name="play" size={18} color="#fff" style={{ paddingLeft: 2 }} />
            </View>
          </View>
        )}

        {/* Date badge */}
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText} numberOfLines={1}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render: link row
  // ─────────────────────────────────────────────────────────────────────────

  const renderLinkItem = ({ item }: { item: MediaItem }) => {
    const url = extractUrl(item.content);
    if (!url) return null;

    let domain = url;
    try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch (_) {}

    return (
      <TouchableOpacity
        style={styles.rowItem}
        onPress={() => Linking.openURL(url).catch(() => {})}
        activeOpacity={0.7}
      >
        <View style={styles.rowIcon}>
          <Ionicons name="link" size={22} color="#00a884" />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>{domain}</Text>
          <Text style={styles.linkUrl} numberOfLines={1}>{url}</Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {senderName(item.sender)} · {formatDate(item.created_at)}
          </Text>
        </View>
        <Ionicons name="open-outline" size={18} color="#8696a0" />
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render: doc / audio row
  // ─────────────────────────────────────────────────────────────────────────

  const renderDocItem = ({ item }: { item: MediaItem }) => {
    const isAudio = item.message_type === 'audio';
    const url     = item.file_url || item.audio_url;

    return (
      <TouchableOpacity
        style={styles.rowItem}
        onPress={() => url && Linking.openURL(url).catch(() => {})}
        activeOpacity={0.7}
      >
        <View style={[styles.rowIcon, isAudio && styles.rowIconAudio]}>
          <Ionicons name={isAudio ? 'mic' : 'document-attach'} size={24} color="#00a884" />
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.content || (isAudio ? 'Voice message' : 'File')}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {senderName(item.sender)} · {formatDate(item.created_at)}
          </Text>
        </View>
        <Ionicons
          name={isAudio ? 'play-circle-outline' : 'download-outline'}
          size={22}
          color="#8696a0"
        />
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // FlatList footer
  // ─────────────────────────────────────────────────────────────────────────

  const ListFooter = ({ tab }: { tab: ActiveTab }) => {
    const { loadingMore } = getPag(tab);
    if (!loadingMore) return <View style={{ height: 24 }} />;
    return (
      <View style={styles.loadMoreRow}>
        <ActivityIndicator size="small" color="#00a884" />
        <Text style={styles.loadMoreText}>Loading more…</Text>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Empty state
  // ─────────────────────────────────────────────────────────────────────────

  const EmptyState = ({
    icon,
    label,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
  }) => (
    <View style={styles.centered}>
      <Ionicons name={icon} size={64} color="#e9edef" />
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Fullscreen image modal (Fix #1)
  // ─────────────────────────────────────────────────────────────────────────

  const ImageViewerModal = () => (
    <Modal
      visible={!!selectedImageUrl}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setSelectedImageUrl(null)}
    >
      <View style={styles.imgViewerBg}>
        <SafeAreaView style={styles.imgViewerBar}>
          <TouchableOpacity
            style={styles.imgViewerClose}
            onPress={() => setSelectedImageUrl(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>

        {selectedImageUrl && (
          <Image
            source={{ uri: selectedImageUrl }}
            style={styles.imgViewerImg}
            resizeMode="contain"
          />
        )}
      </View>
    </Modal>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Decide what content the active tab shows
  // ─────────────────────────────────────────────────────────────────────────

  const currentItems = getItems(activeTab);
  const currentPag   = getPag(activeTab);
  const isEmpty      = !initialLoading && currentItems.length === 0 && !currentPag.loadingMore;

  const EMPTY_COPY: Record<ActiveTab, { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }> = {
    media: { icon: 'images-outline',   label: 'No media shared yet' },
    links: { icon: 'link-outline',     label: 'No links shared yet' },
    docs:  { icon: 'document-outline', label: 'No docs shared yet'  },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#008069" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Media, Links, and Docs</Text>
      </View>

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Content area ── */}
      {initialLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00a884" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : isEmpty ? (
        <EmptyState {...EMPTY_COPY[activeTab]} />
      ) : activeTab === 'media' ? (
        /* ── 3-column image / video grid ── */
        <FlatList<MediaItem>
          data={mediaItems}
          renderItem={renderMediaItem}
          keyExtractor={item => item.id}
          numColumns={3}
          columnWrapperStyle={styles.mediaRow}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={<ListFooter tab="media" />}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
        />
      ) : activeTab === 'links' ? (
        /* ── Links list ── */
        <FlatList<MediaItem>
          data={linkItems}
          renderItem={renderLinkItem}
          keyExtractor={item => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={<ListFooter tab="links" />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        /* ── Docs / audio list ── */
        <FlatList<MediaItem>
          data={docItems}
          renderItem={renderDocItem}
          keyExtractor={item => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={<ListFooter tab="docs" />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* ── Fix #1a: Fullscreen image viewer ── */}
      <ImageViewerModal />

      {/* ── Fix #1b: Fullscreen video player (reuses existing VideoPlayer) ── */}
      <VideoPlayer
        visible={!!selectedVideoUrl}
        videoUri={selectedVideoUrl ?? ''}
        onClose={() => setSelectedVideoUrl(null)}
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#008069',
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 14,
    paddingHorizontal: 12,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
    flex: 1,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#008069',
  },
  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.3,
  },
  tabTextActive: {
    color: '#fff',
  },

  // Media grid
  mediaRow: {
    gap: 2,
    marginBottom: 2,
  },
  mediaCell: {
    width: MEDIA_ITEM_SIZE,
    height: MEDIA_ITEM_SIZE,
    backgroundColor: '#ccc',
    position: 'relative',
    overflow: 'hidden',
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#d1d5db',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  videoPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,168,132,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.42)',
    paddingVertical: 2,
    paddingHorizontal: 3,
  },
  dateBadgeText: {
    fontSize: 9,
    color: '#fff',
    textAlign: 'center',
  },

  // Shared row (links + docs)
  listContent: {
    paddingBottom: 24,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e9edef',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  rowIconAudio: {
    backgroundColor: '#d9fdd3',
    borderRadius: 8,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111b21',
    marginBottom: 2,
  },
  linkUrl: {
    fontSize: 12,
    color: '#00a884',
    marginBottom: 3,
  },
  rowMeta: {
    fontSize: 11,
    color: '#8696a0',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#e9edef',
    marginLeft: 72,
  },

  // Pagination footer
  loadMoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 13,
    color: '#8696a0',
  },

  // Empty / loading states
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#8696a0',
  },
  loadingText: {
    fontSize: 14,
    color: '#8696a0',
    marginTop: 6,
  },

  // Fullscreen image viewer
  imgViewerBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imgViewerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  imgViewerClose: {
    alignSelf: 'flex-end',
    margin: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imgViewerImg: {
    width,
    height: height * 0.82,
  },
});