import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Fixed height – exactly like WhatsApp (50% of screen)
const EMOJI_PICKER_HEIGHT = SCREEN_HEIGHT * 0.5;

interface EmojiPickerProps {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = {
  recent: {
    name: 'Recent',
    icon: 'time-outline',
    emojis: [] as string[], // Will be populated dynamically
  },
  smileys: {
    name: 'Smileys & People',
    icon: 'happy-outline',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'],
  },
  animals: {
    name: 'Animals & Nature',
    icon: 'paw-outline',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿', '🦔'],
  },
  food: {
    name: 'Food & Drink',
    icon: 'fast-food-outline',
    emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯'],
  },
  activity: {
    name: 'Activity',
    icon: 'football-outline',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸', '🥌', '🎿', '⛷', '🏂', '🪂', '🏋️‍♀️', '🏋️', '🤼‍♀️', '🤼', '🤸‍♀️', '🤸', '⛹️‍♀️', '⛹️', '🤺', '🤾‍♀️', '🤾', '🏌️‍♀️', '🏌️', '🏇', '🧘‍♀️', '🧘', '🏄‍♀️', '🏄', '🏊‍♀️', '🏊', '🤽‍♀️', '🤽', '🚣‍♀️', '🚣', '🧗‍♀️', '🧗', '🚵‍♀️', '🚵', '🚴‍♀️', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖', '🏵', '🎗', '🎫', '🎟', '🎪', '🤹', '🤹‍♀️', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟', '🎯', '🎳', '🎮', '🎰', '🧩'],
  },
  travel: {
    name: 'Travel & Places',
    icon: 'airplane-outline',
    emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩', '💺', '🛰', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥', '🛳', '⛴', '🚢', '⚓', '⛽', '🚧', '🚦', '🚥', '🚏', '🗺', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟', '🎡', '🎢', '🎠', '⛲', '⛱', '🏖', '🏝', '🏜', '🌋', '⛰', '🏔', '🗻', '🏕', '⛺', '🏠', '🏡', '🏘', '🏚', '🏗', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛', '⛪', '🕌', '🕍', '🛕'],
  },
  objects: {
    name: 'Objects',
    icon: 'bulb-outline',
    emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽', '🎞', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙', '🎚', '🎛', '🧭', '⏱', '⏲', '⏰', '🕰', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯', '🪔', '🧯', '🛢', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒', '🛠', '⛏', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡', '⚔️', '🛡', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡', '🧹', '🪠', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎', '🔑', '🗝', '🚪', '🪑', '🛋', '🛏', '🛌', '🧸', '🪆', '🖼', '🪞', '🪟', '🛍', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧'],
  },
  symbols: {
    name: 'Symbols',
    icon: 'heart-outline',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'],
  },
  flags: {
    name: 'Flags',
    icon: 'flag-outline',
    emojis: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇦🇫', '🇦🇽', '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇼', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪', '🇧🇿', '🇧🇯', '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼', '🇧🇷', '🇮🇴', '🇻🇬', '🇧🇳', '🇧🇬', '🇧🇫', '🇧🇮', '🇰🇭', '🇨🇲', '🇨🇦', '🇮🇨', '🇨🇻', '🇧🇶', '🇰🇾', '🇨🇫', '🇹🇩', '🇨🇱', '🇨🇳', '🇨🇽', '🇨🇨', '🇨🇴', '🇰🇲', '🇨🇬', '🇨🇩', '🇨🇰', '🇨🇷', '🇨🇮', '🇭🇷', '🇨🇺', '🇨🇼', '🇨🇾', '🇨🇿', '🇩🇰', '🇩🇯', '🇩🇲', '🇩🇴', '🇪🇨', '🇪🇬', '🇸🇻', '🇬🇶', '🇪🇷', '🇪🇪', '🇸🇿', '🇪🇹', '🇪🇺', '🇫🇰', '🇫🇴', '🇫🇯', '🇫🇮', '🇫🇷', '🇬🇫', '🇵🇫', '🇹🇫', '🇬🇦', '🇬🇲', '🇬🇪', '🇩🇪', '🇬🇭', '🇬🇮', '🇬🇷', '🇬🇱', '🇬🇩', '🇬🇵', '🇬🇺', '🇬🇹', '🇬🇬', '🇬🇳', '🇬🇼', '🇬🇾', '🇭🇹', '🇭🇳', '🇭🇰', '🇭🇺', '🇮🇸', '🇮🇳', '🇮🇩', '🇮🇷', '🇮🇶', '🇮🇪', '🇮🇲', '🇮🇱', '🇮🇹', '🇯🇲', '🇯🇵', '🎌', '🇯🇪', '🇯🇴', '🇰🇿', '🇰🇪', '🇰🇮', '🇽🇰', '🇰🇼', '🇰🇬', '🇱🇦', '🇱🇻', '🇱🇧', '🇱🇸', '🇱🇷', '🇱🇾', '🇱🇮', '🇱🇹', '🇱🇺', '🇲🇴', '🇲🇬', '🇲🇼', '🇲🇾', '🇲🇻', '🇲🇱', '🇲🇹', '🇲🇭', '🇲🇶', '🇲🇷', '🇲🇺', '🇾🇹', '🇲🇽', '🇫🇲', '🇲🇩', '🇲🇨', '🇲🇳', '🇲🇪', '🇲🇸', '🇲🇦', '🇲🇿', '🇲🇲', '🇳🇦', '🇳🇷', '🇳🇵', '🇳🇱', '🇳🇨', '🇳🇿', '🇳🇮', '🇳🇪', '🇳🇬', '🇳🇺', '🇳🇫', '🇰🇵', '🇲🇰', '🇲🇵', '🇳🇴', '🇴🇲', '🇵🇰', '🇵🇼', '🇵🇸', '🇵🇦', '🇵🇬', '🇵🇾', '🇵🇪', '🇵🇭', '🇵🇳', '🇵🇱', '🇵🇹', '🇵🇷', '🇶🇦', '🇷🇪', '🇷🇴', '🇷🇺', '🇷🇼', '🇼🇸', '🇸🇲', '🇸🇹', '🇸🇦', '🇸🇳', '🇷🇸', '🇸🇨', '🇸🇱', '🇸🇬', '🇸🇽', '🇸🇰', '🇸🇮', '🇬🇸', '🇸🇧', '🇸🇴', '🇿🇦', '🇰🇷', '🇸🇸', '🇪🇸', '🇱🇰', '🇧🇱', '🇸🇭', '🇰🇳', '🇱🇨', '🇵🇲', '🇻🇨', '🇸🇩', '🇸🇷', '🇸🇪', '🇨🇭', '🇸🇾', '🇹🇼', '🇹🇯', '🇹🇿', '🇹🇭', '🇹🇱', '🇹🇬', '🇹🇰', '🇹🇴', '🇹🇹', '🇹🇳', '🇹🇷', '🇹🇲', '🇹🇨', '🇹🇻', '🇻🇮', '🇺🇬', '🇺🇦', '🇦🇪', '🇬🇧', '🏴󐁧󐁢󐁥󐁮󐁧󐁿', '🏴󐁧󐁢󐁳󐁣󐁴󐁿', '🏴󐁧󐁢󐁷󐁬󐁳󐁿', '🇺🇸', '🇺🇾', '🇺🇿', '🇻🇺', '🇻🇦', '🇻🇪', '🇻🇳', '🇼🇫', '🇪🇭', '🇾🇪', '🇿🇲', '🇿🇼'],
  },
};

const RECENT_EMOJIS_KEY = '@recent_emojis';
const MAX_RECENT_EMOJIS = 32;

// Lazy loading chunks
const EMOJIS_PER_CHUNK = 40;

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  visible,
  onSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('recent');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [loadedChunks, setLoadedChunks] = useState<Set<string>>(new Set(['recent', 'smileys']));
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryRefs = useRef<{ [key: string]: number }>({});
  const chunkTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Animated value for slide in/out
  const translateY = useRef(new Animated.Value(EMOJI_PICKER_HEIGHT)).current;

  // Load recent emojis
  useEffect(() => {
    loadRecentEmojis();
  }, []);

  // Animate when visibility changes
  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : EMOJI_PICKER_HEIGHT,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [visible]);

  const loadRecentEmojis = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_EMOJIS_KEY);
      if (stored) setRecentEmojis(JSON.parse(stored));
    } catch (error) {
      console.error('Failed to load recent emojis:', error);
    }
  };

  const saveRecentEmoji = async (emoji: string) => {
    try {
      let updated = [emoji, ...recentEmojis.filter(e => e !== emoji)];
      updated = updated.slice(0, MAX_RECENT_EMOJIS);
      setRecentEmojis(updated);
      await AsyncStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent emoji:', error);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji);
    saveRecentEmoji(emoji);
  };

  const clearSearch = () => setSearchQuery('');

  // Lazy load category when it becomes visible
  const loadCategoryChunk = (categoryKey: string) => {
    if (!loadedChunks.has(categoryKey)) {
      // Clear any existing timer
      if (chunkTimers.current[categoryKey]) {
        clearTimeout(chunkTimers.current[categoryKey]);
      }
      
      // Delay loading slightly to allow smooth scrolling
      chunkTimers.current[categoryKey] = setTimeout(() => {
        setLoadedChunks(prev => new Set([...prev, categoryKey]));
        delete chunkTimers.current[categoryKey];
      }, 50);
    }
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      const categories = { ...EMOJI_CATEGORIES };
      categories.recent.emojis = recentEmojis;
      return categories;
    }
    return EMOJI_CATEGORIES;
  }, [searchQuery, recentEmojis]);

  const categoryKeys = Object.keys(filteredCategories) as (keyof typeof EMOJI_CATEGORIES)[];

  const scrollToCategory = (category: keyof typeof EMOJI_CATEGORIES) => {
    const offset = categoryRefs.current[category];
    if (offset !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: offset, animated: true });
      setActiveCategory(category);
      // Preload this category
      loadCategoryChunk(category);
    }
  };

  const renderEmojiGrid = (emojis: string[], categoryKey: string) => {
    if (emojis.length === 0) {
      return (
        <View style={styles.emptyCategory}>
          <Text style={styles.emptyCategoryText}>No emojis</Text>
        </View>
      );
    }

    // Check if this category should be lazy loaded
    const shouldLazyLoad = !loadedChunks.has(categoryKey);
    
    if (shouldLazyLoad) {
      // Show placeholder
      return (
        <View style={styles.loadingPlaceholder}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emojiGrid}>
        {emojis.map((emoji, index) => (
          <TouchableOpacity
            key={`${emoji}-${index}`}
            style={styles.emojiButton}
            onPress={() => handleEmojiSelect(emoji)}
            activeOpacity={0.6}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          height: EMOJI_PICKER_HEIGHT,
        },
      ]}
    >
      {/* Header with search */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8696a0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search emoji"
            placeholderTextColor="#8696a0"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color="#8696a0" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Emoji categories scroll */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          const scrollY = e.nativeEvent.contentOffset.y;
          let currentCategory: keyof typeof EMOJI_CATEGORIES = 'recent';
          Object.entries(categoryRefs.current).forEach(([key, offset]) => {
            if (scrollY >= offset - 50) {
              currentCategory = key as keyof typeof EMOJI_CATEGORIES;
              // Preload next category
              const currentIndex = categoryKeys.indexOf(currentCategory);
              if (currentIndex < categoryKeys.length - 1) {
                loadCategoryChunk(categoryKeys[currentIndex + 1]);
              }
            }
          });
          setActiveCategory(currentCategory);
        }}
        scrollEventThrottle={16}
      >
        {categoryKeys.map((categoryKey) => {
          const category = filteredCategories[categoryKey];
          return (
            <View
              key={categoryKey}
              onLayout={(e) => {
                categoryRefs.current[categoryKey] = e.nativeEvent.layout.y;
                // Trigger lazy load when category becomes visible
                if (e.nativeEvent.layout.y < EMOJI_PICKER_HEIGHT * 2) {
                  loadCategoryChunk(categoryKey);
                }
              }}
              style={styles.category}
            >
              <Text style={styles.categoryTitle}>{category.name}</Text>
              {renderEmojiGrid(category.emojis, categoryKey)}
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom category tabs */}
      <View style={styles.bottomTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {categoryKeys.map((categoryKey) => {
            const category = filteredCategories[categoryKey];
            const isActive = activeCategory === categoryKey;
            return (
              <TouchableOpacity
                key={categoryKey}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => scrollToCategory(categoryKey)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={category.icon as any}
                  size={24}
                  color={isActive ? '#00a884' : '#8696a0'}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
    zIndex: 1,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9edef',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111b21',
    padding: 0,
  },
  clearButton: { padding: 4, marginLeft: 4 },
  categoriesScroll: { flex: 1 },
  categoriesContent: { paddingHorizontal: 8, paddingVertical: 12, paddingBottom: 20 },
  category: { marginBottom: 20 },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667781',
    marginBottom: 10,
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  emojiButton: {
    width: (SCREEN_WIDTH - 40) / 8,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  emoji: { fontSize: 28 },
  emptyCategory: { paddingVertical: 20, alignItems: 'center' },
  emptyCategoryText: { fontSize: 14, color: '#8696a0' },
  loadingPlaceholder: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#8696a0',
  },
  bottomTabs: {
    borderTopWidth: 1,
    borderTopColor: '#e9edef',
    backgroundColor: '#f0f2f5',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  tabsContent: { paddingHorizontal: 8, paddingVertical: 6, gap: 4 },
  tabButton: { width: 48, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  tabButtonActive: { backgroundColor: 'rgba(0, 168, 132, 0.1)' },
});