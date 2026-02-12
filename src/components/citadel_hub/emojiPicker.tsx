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
  TouchableWithoutFeedback,
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
    emojis: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇦🇫', '🇦🇽', '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇼', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪', '🇧🇿', '🇧🇯', '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼', '🇧🇷', '🇮🇴', '🇻🇬', '🇧🇳', '🇧🇬', '🇧🇫', '🇧🇮', '🇰🇭', '🇨🇲', '🇨🇦', '🇮🇨', '🇨🇻', '🇧🇶', '🇰🇾', '🇨🇫', '🇹🇩', '🇨🇱', '🇨🇳', '🇨🇽', '🇨🇨', '🇨🇴', '🇰🇲', '🇨🇬', '🇨🇩', '🇨🇰', '🇨🇷', '🇨🇮', '🇭🇷', '🇨🇺', '🇨🇼', '🇨🇾', '🇨🇿', '🇩🇰', '🇩🇯', '🇩🇲', '🇩🇴', '🇪🇨', '🇪🇬', '🇸🇻', '🇬🇶', '🇪🇷', '🇪🇪', '🇸🇿', '🇪🇹', '🇪🇺', '🇫🇰', '🇫🇴', '🇫🇯', '🇫🇮', '🇫🇷', '🇬🇫', '🇵🇫', '🇹🇫', '🇬🇦', '🇬🇲', '🇬🇪', '🇩🇪', '🇬🇭', '🇬🇮', '🇬🇷', '🇬🇱', '🇬🇩', '🇬🇵', '🇬🇺', '🇬🇹', '🇬🇬', '🇬🇳', '🇬🇼', '🇬🇾', '🇭🇹', '🇭🇳', '🇭🇰', '🇭🇺', '🇮🇸', '🇮🇳', '🇮🇩', '🇮🇷', '🇮🇶', '🇮🇪', '🇮🇲', '🇮🇱', '🇮🇹', '🇯🇲', '🇯🇵', '🎌', '🇯🇪', '🇯🇴', '🇰🇿', '🇰🇪', '🇰🇮', '🇽🇰', '🇰🇼', '🇰🇬', '🇱🇦', '🇱🇻', '🇱🇧', '🇱🇸', '🇱🇷', '🇱🇾', '🇱🇮', '🇱🇹', '🇱🇺', '🇲🇴', '🇲🇬', '🇲🇼', '🇲🇾', '🇲🇻', '🇲🇱', '🇲🇹', '🇲🇭', '🇲🇶', '🇲🇷', '🇲🇺', '🇾🇹', '🇲🇽', '🇫🇲', '🇲🇩', '🇲🇨', '🇲🇳', '🇲🇪', '🇲🇸', '🇲🇦', '🇲🇿', '🇲🇲', '🇳🇦', '🇳🇷', '🇳🇵', '🇳🇱', '🇳🇨', '🇳🇿', '🇳🇮', '🇳🇪', '🇳🇬', '🇳🇺', '🇳🇫', '🇰🇵', '🇲🇰', '🇲🇵', '🇳🇴', '🇴🇲', '🇵🇰', '🇵🇼', '🇵🇸', '🇵🇦', '🇵🇬', '🇵🇾', '🇵🇪', '🇵🇭', '🇵🇳', '🇵🇱', '🇵🇹', '🇵🇷', '🇶🇦', '🇷🇪', '🇷🇴', '🇷🇺', '🇷🇼', '🇼🇸', '🇸🇲', '🇸🇹', '🇸🇦', '🇸🇳', '🇷🇸', '🇸🇨', '🇸🇱', '🇸🇬', '🇸🇽', '🇸🇰', '🇸🇮', '🇬🇸', '🇸🇧', '🇸🇴', '🇿🇦', '🇰🇷', '🇸🇸', '🇪🇸', '🇱🇰', '🇧🇱', '🇸🇭', '🇰🇳', '🇱🇨', '🇵🇲', '🇻🇨', '🇸🇩', '🇸🇷', '🇸🇪', '🇨🇭', '🇸🇾', '🇹🇼', '🇹🇯', '🇹🇿', '🇹🇭', '🇹🇱', '🇹🇬', '🇹🇰', '🇹🇴', '🇹🇹', '🇹🇳', '🇹🇷', '🇹🇲', '🇹🇨', '🇹🇻', '🇻🇮', '🇺🇬', '🇺🇦', '🇦🇪', '🇬🇧', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', '🇺🇸', '🇺🇾', '🇺🇿', '🇻🇺', '🇻🇦', '🇻🇪', '🇻🇳', '🇼🇫', '🇪🇭', '🇾🇪', '🇿🇲', '🇿🇼'],
  },
};

const RECENT_EMOJIS_KEY = '@recent_emojis';
const MAX_RECENT_EMOJIS = 32;

// Emoji button size calculation for exactly 8 per row
const HORIZONTAL_PADDING = 16; // Total horizontal padding (8px on each side)
const EMOJI_SIZE = (SCREEN_WIDTH - HORIZONTAL_PADDING) / 8;

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  visible,
  onSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

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

  // Comprehensive emoji to keywords mapping for search
  const getEmojiKeywords = (emoji: string): string[] => {
    const keywordMap: { [key: string]: string[] } = {
      // Hearts
      '❤️': ['heart', 'love', 'red'],
      '🧡': ['heart', 'orange', 'love'],
      '💛': ['heart', 'yellow', 'love'],
      '💚': ['heart', 'green', 'love'],
      '💙': ['heart', 'blue', 'love'],
      '💜': ['heart', 'purple', 'love'],
      '🖤': ['heart', 'black', 'love'],
      '🤍': ['heart', 'white', 'love'],
      '🤎': ['heart', 'brown', 'love'],
      '💔': ['heart', 'broken', 'love', 'sad'],
      '💕': ['heart', 'love', 'two'],
      '💞': ['heart', 'love', 'revolving'],
      '💓': ['heart', 'love', 'beating'],
      '💗': ['heart', 'love', 'growing'],
      '💖': ['heart', 'love', 'sparkle'],
      '💘': ['heart', 'love', 'arrow', 'cupid'],
      '💝': ['heart', 'love', 'gift'],
      
      // Smileys
      '😀': ['smile', 'happy', 'face', 'grin', 'joy'],
      '😃': ['smile', 'happy', 'face', 'joy'],
      '😄': ['smile', 'happy', 'face', 'laugh'],
      '😁': ['smile', 'happy', 'face', 'grin', 'teeth'],
      '😅': ['smile', 'happy', 'sweat', 'nervous'],
      '😂': ['laugh', 'cry', 'tears', 'joy', 'happy', 'lol'],
      '🤣': ['laugh', 'rolling', 'floor', 'happy', 'lol'],
      '😊': ['smile', 'happy', 'blush'],
      '😇': ['angel', 'halo', 'innocent', 'good'],
      '😍': ['love', 'heart', 'eyes', 'happy'],
      '🥰': ['love', 'hearts', 'happy', 'smile'],
      '😘': ['kiss', 'love', 'heart'],
      '😗': ['kiss', 'whistle'],
      '😙': ['kiss', 'smile'],
      '😚': ['kiss', 'closed', 'eyes'],
      '😋': ['yum', 'delicious', 'tongue'],
      '😛': ['tongue', 'playful'],
      '😝': ['tongue', 'wink', 'playful'],
      '😜': ['tongue', 'wink', 'playful'],
      '🤪': ['crazy', 'wild', 'silly'],
      '😎': ['cool', 'sunglasses'],
      '🤩': ['star', 'eyes', 'excited'],
      '🥳': ['party', 'celebrate', 'hat'],
      '😭': ['cry', 'tears', 'sad', 'sobbing'],
      '😢': ['cry', 'tears', 'sad'],
      '😤': ['angry', 'frustrated', 'steam'],
      '😠': ['angry', 'mad'],
      '😡': ['angry', 'mad', 'rage'],
      '🤬': ['angry', 'curse', 'swear'],
      '😱': ['scream', 'shock', 'scared'],
      '😨': ['fear', 'scared'],
      '😰': ['anxious', 'nervous', 'sweat'],
      '🤔': ['think', 'hmm', 'wonder'],
      '🤗': ['hug', 'embrace'],
      '🤭': ['giggle', 'oops', 'hand'],
      '😴': ['sleep', 'tired', 'zzz'],
      '🥱': ['yawn', 'tired', 'bored'],
      '😷': ['mask', 'sick', 'doctor'],
      
      // Party & Celebration
      '🎂': ['cake', 'birthday', 'party', 'celebration'],
      '🎉': ['party', 'celebrate', 'confetti', 'celebration'],
      '🎊': ['party', 'celebrate', 'confetti', 'celebration'],
      '🎁': ['gift', 'present', 'birthday'],
      '🎈': ['balloon', 'party', 'birthday'],
      '🎀': ['bow', 'ribbon', 'gift'],
      
      // Symbols
      '🔥': ['fire', 'hot', 'lit', 'flame'],
      '⭐': ['star', 'favorite'],
      '✨': ['sparkle', 'stars', 'shine'],
      '💯': ['hundred', 'perfect', 'score', '100'],
      '✅': ['check', 'yes', 'done', 'correct'],
      '❌': ['cross', 'no', 'wrong', 'x'],
      
      // Gestures
      '👍': ['thumbs', 'up', 'good', 'yes', 'like', 'ok'],
      '👎': ['thumbs', 'down', 'bad', 'no', 'dislike'],
      '👋': ['wave', 'hello', 'hi', 'bye', 'hand'],
      '🙏': ['pray', 'thank', 'please', 'hands', 'thanks'],
      '💪': ['strong', 'muscle', 'flex', 'arm', 'strength'],
      '👏': ['clap', 'applause', 'praise'],
      '🤝': ['handshake', 'deal', 'agreement'],
      '✌️': ['peace', 'victory', 'two'],
      '🤞': ['fingers', 'crossed', 'luck', 'hope'],
      '🤟': ['love', 'hand', 'you'],
      '🤘': ['rock', 'metal', 'horns'],
      '👌': ['ok', 'okay', 'perfect', 'good'],
      '🤌': ['pinch', 'italian', 'hand'],
      '👈': ['left', 'point', 'finger'],
      '👉': ['right', 'point', 'finger'],
      '👆': ['up', 'point', 'finger'],
      '👇': ['down', 'point', 'finger'],
      
      // Common Animals
      '🐶': ['dog', 'puppy', 'pet'],
      '🐱': ['cat', 'kitty', 'pet'],
      '🐭': ['mouse', 'rat'],
      '🐹': ['hamster', 'pet'],
      '🐰': ['rabbit', 'bunny'],
      '🦊': ['fox'],
      '🐻': ['bear'],
      '🐼': ['panda', 'bear'],
      '🐨': ['koala', 'bear'],
      '🐯': ['tiger', 'face'],
      '🦁': ['lion', 'face'],
      '🐮': ['cow', 'face'],
      '🐷': ['pig', 'face'],
      '🐸': ['frog', 'face'],
      '🐵': ['monkey', 'face'],
      
      // Food
      '🍕': ['pizza', 'food'],
      '🍔': ['burger', 'hamburger', 'food'],
      '🍟': ['fries', 'french', 'food'],
      '🌭': ['hotdog', 'food'],
      '🍿': ['popcorn', 'snack'],
      '🍩': ['donut', 'doughnut', 'sweet'],
      '🍪': ['cookie', 'sweet'],
      '🎂': ['cake', 'birthday', 'dessert'],
      '🍰': ['cake', 'dessert', 'sweet'],
      '🧁': ['cupcake', 'sweet'],
      '🍫': ['chocolate', 'sweet'],
      '🍬': ['candy', 'sweet'],
      '🍭': ['lollipop', 'candy', 'sweet'],
      '🍦': ['ice', 'cream', 'sweet'],
      '🍨': ['ice', 'cream', 'sweet'],
      '☕': ['coffee', 'drink', 'hot'],
      '🍵': ['tea', 'drink', 'hot'],
      '🥤': ['drink', 'soda', 'cup'],
      '🍺': ['beer', 'drink', 'alcohol'],
      '🍻': ['beer', 'cheers', 'drink'],
      '🍷': ['wine', 'drink', 'alcohol'],
      
      // Sports & Activity
      '⚽': ['soccer', 'football', 'ball', 'sport'],
      '🏀': ['basketball', 'ball', 'sport'],
      '🏈': ['football', 'american', 'ball', 'sport'],
      '⚾': ['baseball', 'ball', 'sport'],
      '🎾': ['tennis', 'ball', 'sport'],
      '🏐': ['volleyball', 'ball', 'sport'],
      '🏆': ['trophy', 'winner', 'award', 'champion'],
      '🥇': ['gold', 'medal', 'first', 'winner'],
      '🥈': ['silver', 'medal', 'second'],
      '🥉': ['bronze', 'medal', 'third'],
      
      // Nature
      '🌸': ['flower', 'blossom', 'cherry'],
      '🌺': ['flower', 'hibiscus'],
      '🌻': ['flower', 'sunflower'],
      '🌹': ['flower', 'rose'],
      '🌷': ['flower', 'tulip'],
      '🌲': ['tree', 'pine', 'evergreen'],
      '🌳': ['tree', 'deciduous'],
      '🌴': ['tree', 'palm'],
      '🌵': ['cactus', 'desert'],
      '🌾': ['grain', 'wheat'],
      '🌿': ['herb', 'leaf'],
      '☘️': ['shamrock', 'clover', 'lucky'],
      '🍀': ['clover', 'four', 'leaf', 'lucky'],
      
      // Weather
      '☀️': ['sun', 'sunny', 'weather'],
      '🌤️': ['sun', 'cloud', 'weather'],
      '⛅': ['sun', 'cloud', 'weather'],
      '🌥️': ['cloud', 'sun', 'weather'],
      '☁️': ['cloud', 'cloudy', 'weather'],
      '🌦️': ['rain', 'sun', 'weather'],
      '🌧️': ['rain', 'weather'],
      '⛈️': ['storm', 'thunder', 'weather'],
      '🌩️': ['lightning', 'weather'],
      '❄️': ['snow', 'cold', 'winter'],
      '⛄': ['snowman', 'winter'],
      '☃️': ['snowman', 'winter'],
      
      // Objects
      '📱': ['phone', 'mobile', 'cell', 'smartphone'],
      '💻': ['computer', 'laptop', 'pc'],
      '⌨️': ['keyboard', 'type'],
      '🖱️': ['mouse', 'computer'],
      '📷': ['camera', 'photo'],
      '📸': ['camera', 'photo', 'flash'],
      '🎥': ['camera', 'video', 'movie'],
      '📺': ['tv', 'television'],
      '📻': ['radio', 'music'],
      '🎵': ['music', 'note'],
      '🎶': ['music', 'notes'],
      '🎤': ['microphone', 'sing', 'karaoke'],
      '🎧': ['headphones', 'music'],
      '📚': ['books', 'library', 'study'],
      '📖': ['book', 'open', 'read'],
      '✏️': ['pencil', 'write'],
      '✒️': ['pen', 'write'],
      '🖊️': ['pen', 'write'],
      '📝': ['memo', 'note', 'write'],
    };
    
    return keywordMap[emoji] || [];
  };

  // Search functionality - filter emojis based on keywords
  const filteredCategories = useMemo(() => {
    const categories = { ...EMOJI_CATEGORIES };
    categories.recent.emojis = recentEmojis;

    if (!searchQuery.trim()) {
      return categories;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered: typeof EMOJI_CATEGORIES = {} as any;

    Object.entries(categories).forEach(([key, category]) => {
      // Search through emojis using keywords
      const matchingEmojis = category.emojis.filter(emoji => {
        const keywords = getEmojiKeywords(emoji);
        return keywords.some(keyword => keyword.includes(query) || query.includes(keyword));
      });

      // Only include category if it has matching emojis
      if (matchingEmojis.length > 0) {
        filtered[key as keyof typeof EMOJI_CATEGORIES] = {
          ...category,
          emojis: matchingEmojis,
        };
      }
    });

    return filtered;
  }, [searchQuery, recentEmojis]);

  const categoryKeys = Object.keys(filteredCategories) as (keyof typeof EMOJI_CATEGORIES)[];

  const renderEmojiGrid = (emojis: string[]) => {
    if (emojis.length === 0) {
      return (
        <View style={styles.emptyCategory}>
          <Text style={styles.emptyCategoryText}>No emojis found</Text>
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
    <>
      {/* Backdrop to detect outside clicks */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

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
        >
          {categoryKeys.length === 0 ? (
            <View style={styles.emptyCategory}>
              <Text style={styles.emptyCategoryText}>No categories match your search</Text>
            </View>
          ) : (
            categoryKeys.map((categoryKey) => {
              const category = filteredCategories[categoryKey];
              return (
                <View key={categoryKey} style={styles.category}>
                  <Text style={styles.categoryTitle}>{category.name}</Text>
                  {renderEmojiGrid(category.emojis)}
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 0,
  },
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
  categoriesContent: { 
    paddingHorizontal: 8, 
    paddingVertical: 12, 
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
  },
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
  },
  emojiButton: {
    width: EMOJI_SIZE,
    height: EMOJI_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: { fontSize: 28 },
  emptyCategory: { 
    paddingVertical: 40, 
    alignItems: 'center' 
  },
  emptyCategoryText: { 
    fontSize: 14, 
    color: '#8696a0' 
  },
});