import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';

interface AttachmentMenuProps {
  visible: boolean;
  onFileSelect: () => void;
  onCameraSelect: () => void;
  onGallerySelect: () => void;
  onAudioSelect: () => void;
  onClose: () => void;
}

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({
  visible,
  onFileSelect,
  onCameraSelect,
  onGallerySelect,
  onAudioSelect,
  onClose,
}) => {
  const options = [
    { icon: '📄', label: 'Document', color: '#5157AE', onPress: onFileSelect },
    { icon: '📷', label: 'Camera', color: '#D3396D', onPress: onCameraSelect },
    { icon: '🖼️', label: 'Gallery', color: '#BF59CF', onPress: onGallerySelect },
    { icon: '🎤', label: 'Audio', color: '#F3601A', onPress: onAudioSelect },
    { icon: '📍', label: 'Location', color: '#1FA855', onPress: () => {} },
    { icon: '👤', label: 'Contact', color: '#009DE2', onPress: () => {} },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.optionsContainer}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.option}
              onPress={() => {
                option.onPress();
                onClose();
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, { backgroundColor: option.color }]}>
                <Text style={styles.icon}>{option.icon}</Text>
              </View>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>{option.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsContainer: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    fontSize: 24,
  },
  labelContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    color: '#111b21',
    fontWeight: '500',
  },
});