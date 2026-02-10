import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';

interface AttachmentMenuProps {
  visible: boolean;
  onFileSelect: () => void;
  onCameraSelect: () => void;
  onGallerySelect: () => void;
  onClose: () => void;
}

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({
  visible,
  onFileSelect,
  onCameraSelect,
  onGallerySelect,
  onClose,
}) => {
  const options = [
    { icon: '🖼️', label: 'Photos', color: '#0984e3', onPress: onGallerySelect },
    { icon: '📷', label: 'Camera', color: '#fd79a8', onPress: onCameraSelect },
    { icon: '📄', label: 'Document', color: '#ffb157', onPress: onFileSelect },
  ];

  const handleOptionPress = (onPress: () => void) => {
    try {
      onPress();
      // Menu will close when the picker opens or through onClose
    } catch (error) {
      console.error('Error in attachment menu:', error);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.menuContainer}>
          <View style={styles.optionsGrid}>
            {options.map((option, index) => (
              <View key={index} style={styles.optionWrapper}>
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => handleOptionPress(option.onPress)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: option.color }]}>
                    <Text style={styles.icon}>{option.icon}</Text>
                  </View>
                  <Text style={styles.label}>{option.label}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
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
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
  },
  optionWrapper: {
    width: '33.33%',
    alignItems: 'center',
    marginBottom: 20,
  },
  option: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  icon: {
    fontSize: 30,
  },
  label: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    fontWeight: '500',
  },
});