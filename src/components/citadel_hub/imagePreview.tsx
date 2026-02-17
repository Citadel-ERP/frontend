import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImagePreviewProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onSend: (uri: string, caption: string) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  visible,
  imageUri,
  onClose,
  onSend,
}) => {
  const [caption, setCaption] = useState('');
  const [currentImageUri, setCurrentImageUri] = useState(imageUri);
  const inputRef = useRef<TextInput>(null);

  // Reset when modal opens
  React.useEffect(() => {
    if (visible) {
      setCaption('');
      setCurrentImageUri(imageUri);
    }
  }, [visible, imageUri]);

  const handleCrop = async () => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        currentImageUri,
        [], // We'll open native crop by re-launching with allowsEditing
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      // For actual cropping, we need a cropping library or native UI
      // Using expo-image-manipulator's crop action:
      Alert.alert(
        'Crop Image',
        'Crop functionality requires additional setup. For now, this is a placeholder.',
        [{ text: 'OK' }]
      );
      
      // TODO: Implement proper cropping with react-native-image-crop-picker
      // or expo-image-manipulator with specific crop dimensions
      
    } catch (error) {
      console.error('Crop error:', error);
      Alert.alert('Error', 'Failed to crop image');
    }
  };

  const handleSend = () => {
    onSend(currentImageUri, caption);
    onClose();
  };

  const handleClose = () => {
    setCaption('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* Top Toolbar */}
        <View style={styles.topToolbar}>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.topToolbarRight}>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={handleCrop}
              activeOpacity={0.7}
            >
              <MaterialIcons name="crop" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            {/* Optional: Drawing/Pen tool - you can enable this later */}
            {/* <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => Alert.alert('Draw', 'Drawing feature coming soon')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={24} color="#ffffff" />
            </TouchableOpacity> */}
          </View>
        </View>

        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: currentImageUri }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Bottom Section - Caption Input + Send Button */}
        <View style={styles.bottomSection}>
          <View style={styles.captionContainer}>
            <TextInput
              ref={inputRef}
              style={styles.captionInput}
              placeholder="Add a caption..."
              placeholderTextColor="#8696a0"
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={1024}
            />
          </View>

          {/* Send Button (WhatsApp-style circular green button) */}
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  toolbarButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topToolbarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  bottomSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  captionContainer: {
    flex: 1,
    backgroundColor: '#1f2c34',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  captionInput: {
    fontSize: 16,
    color: '#ffffff',
    maxHeight: 80,
    paddingVertical: 4,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00a884',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});