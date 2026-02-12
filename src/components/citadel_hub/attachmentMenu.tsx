import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MENU_HEIGHT = 280;

interface AttachmentMenuProps {
  visible: boolean;
  onClose: () => void;
  onCameraPress: () => void;
  onVideoPress: () => void;
  onGalleryPress: () => void;
  onFilePress: () => void;
   onAudioPress: () => void;
}

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({
  visible,
  onClose,
  onCameraPress,
  onVideoPress,
  onGalleryPress,
  onFilePress,
   onAudioPress,
}) => {
  const slideAnim = useRef(new Animated.Value(MENU_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const optionsScale = useRef(
    [
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
    ]
  ).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        ...optionsScale.map((scale, index) =>
          Animated.spring(scale, {
            toValue: 1,
            delay: 100 + index * 50,
            useNativeDriver: true,
            tension: 100,
            friction: 7,
          })
        ),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: MENU_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        ...optionsScale.map((scale) =>
          Animated.timing(scale, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          })
        ),
      ]).start();
    }
  }, [visible]);

  const handleOptionPress = (callback: () => void) => {
    // Close menu first, then execute callback
    onClose();
    // Small delay to ensure menu closes before opening picker
    setTimeout(() => {
      callback();
    }, 100);
  };

  const options = [
    {
      icon: 'document-text',
      iconType: 'ionicons' as const,
      label: 'Document',
      color: '#7F66FF',
      onPress: () => handleOptionPress(onFilePress),
      scale: optionsScale[0],
    },
    {
      icon: 'camera',
      iconType: 'ionicons' as const,
      label: 'Camera',
      color: '#FF6B9D',
      onPress: () => handleOptionPress(onCameraPress),
      scale: optionsScale[1],
    },
    {
      icon: 'image',
      iconType: 'ionicons' as const,
      label: 'Gallery',
      color: '#C861F9',
      onPress: () => handleOptionPress(onGalleryPress),
      scale: optionsScale[2],
    },
    {
      icon: 'headset',
      iconType: 'ionicons' as const,
      label: 'Audio',
      color: '#F3A638',
      onPress: () => handleOptionPress(onAudioPress),
      scale: optionsScale[3],
    },
    {
      icon: 'location',
      iconType: 'ionicons' as const,
      label: 'Location',
      color: '#1DA467',
      onPress: () => handleOptionPress(() => console.log('Location')),
      scale: optionsScale[4],
    },
    {
      icon: 'video-camera',
      iconType: 'ionicons' as const,
      label: 'Video',
      color: '#009DE2',
      onPress: () => handleOptionPress(onVideoPress),
      scale: optionsScale[5],
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.container} onPress={onClose} activeOpacity={1}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.menuContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle Bar */}
          <View style={styles.handleBar} />

          {/* Options Grid */}
          <View style={styles.optionsGrid}>
            {options.map((option, index) => (
              <Animated.View
                key={option.label}
                style={[
                  styles.optionWrapper,
                  {
                    transform: [{ scale: option.scale }],
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.option}
                  onPress={option.onPress}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: option.color },
                    ]}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={28}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.label}>{option.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  optionWrapper: {
    width: '33.33%',
    alignItems: 'center',
    marginBottom: 24,
  },
  option: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  label: {
    fontSize: 13,
    color: '#3B4A54',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});