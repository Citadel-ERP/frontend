import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    Image,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Alert,
    SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 6) / 3;

interface SelectedImage {
    uri: string;
    id: string;
    fileName?: string;
    fileSize?: number;
    type?: string;
}

interface MultiImagePickerProps {
    visible: boolean;
    mode: 'gallery' | 'camera';
    onComplete: (images: SelectedImage[]) => void;
    onClose: () => void;
    maxImages?: number;
}

export const MultiImagePicker: React.FC<MultiImagePickerProps> = ({
    visible,
    mode,
    onComplete,
    onClose,
    maxImages = 10,
}) => {
    const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);

    React.useEffect(() => {
        if (visible) {
            if (mode === 'gallery') {
                openGallery();
            } else {
                openCamera();
            }
        } else {
            setSelectedImages([]);
        }
    }, [visible, mode]);

    const openGallery = useCallback(() => {
        launchImageLibrary(
            {
                mediaType: 'photo',
                selectionLimit: maxImages,
                quality: 0.8,
                includeBase64: false,
                includeExtra: false,
            },
            (response) => {
                if (response.didCancel) {
                    onClose();
                } else if (response.errorCode) {
                    console.error('Gallery Error:', response.errorCode, response.errorMessage);
                    Alert.alert('Error', `Failed to open gallery: ${response.errorMessage || 'Unknown error'}`);
                    onClose();
                } else if (response.assets && response.assets.length > 0) {
                    const images: SelectedImage[] = response.assets.map((asset, index) => ({
                        uri: asset.uri!,
                        id: `${Date.now()}_${index}`,
                        fileName: asset.fileName || `image_${Date.now()}_${index}.jpg`,
                        fileSize: asset.fileSize,
                        type: asset.type || 'image/jpeg',
                    }));
                    setSelectedImages(images);
                } else {
                    onClose();
                }
            }
        );
    }, [maxImages, onClose]);


    const openCamera = useCallback(() => {
        launchCamera(
            {
                mediaType: 'photo',
                quality: 0.8,
                saveToPhotos: true,
                includeBase64: false,
                includeExtra: false,
                cameraType: 'back',
                // ✅ CRITICAL: These prevent cropping/editing screens
                presentationStyle: 'fullScreen',
            },
            (response) => {
                if (response.didCancel) {
                    if (selectedImages.length === 0) {
                        onClose();
                    }
                } else if (response.errorCode) {
                    console.error('Camera Error:', response.errorCode, response.errorMessage);
                    Alert.alert('Error', `Failed to open camera: ${response.errorMessage || 'Unknown error'}`);
                    if (selectedImages.length === 0) {
                        onClose();
                    }
                } else if (response.assets && response.assets[0]) {
                    const newImage: SelectedImage = {
                        uri: response.assets[0].uri!,
                        id: `${Date.now()}`,
                        fileName: response.assets[0].fileName || `photo_${Date.now()}.jpg`,
                        fileSize: response.assets[0].fileSize,
                        type: response.assets[0].type || 'image/jpeg',
                    };
                    setSelectedImages((prev) => [...prev, newImage]);
                }
            }
        );
    }, [selectedImages.length, onClose]);


    const removeImage = (id: string) => {
        setSelectedImages((prev) => prev.filter((img) => img.id !== id));
    };

    const handleSend = () => {
        if (selectedImages.length > 0) {
            onComplete(selectedImages);
            onClose();
        }
    };

    const handleAddMore = () => {
        if (selectedImages.length < maxImages) {
            if (mode === 'camera') {
                openCamera();
            } else {
                openGallery();
            }
        } else {
            Alert.alert('Limit Reached', `You can only select up to ${maxImages} images`);
        }
    };

    if (!visible || selectedImages.length === 0) {
        return null;
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {selectedImages.length} {selectedImages.length === 1 ? 'Photo' : 'Photos'}
                </Text>
                <View style={styles.headerButton} />
            </View>

            {/* Image Preview Grid */}
            <View style={styles.previewContainer}>
                <FlatList
                    data={selectedImages}
                    keyExtractor={(item) => item.id}
                    numColumns={3}
                    contentContainerStyle={styles.gridContainer}
                    renderItem={({ item, index }) => (
                        <View style={styles.imageWrapper}>
                            <Image source={{ uri: item.uri }} style={styles.image} />
                            <View style={styles.imageOverlay}>
                                <View style={styles.imageNumber}>
                                    <Text style={styles.imageNumberText}>{index + 1}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => removeImage(item.id)}
                                >
                                    <Ionicons name="close-circle" size={24} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomBar}>
                {mode === 'camera' && selectedImages.length < maxImages && (
                    <TouchableOpacity style={styles.addMoreButton} onPress={handleAddMore}>
                        <Ionicons name="add" size={24} color="#FFFFFF" />
                        <Text style={styles.addMoreText}>Add More</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[
                        styles.sendButton,
                        mode === 'gallery' && styles.sendButtonFull,
                    ]}
                    onPress={handleSend}
                >
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#1A1A1A',
    },
    headerButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    previewContainer: {
        flex: 1,
    },
    gridContainer: {
        padding: 1,
    },
    imageWrapper: {
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        padding: 1,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: '#2A2A2A',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        padding: 8,
    },
    imageNumber: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#25D366',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageNumberText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    removeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 12,
    },
    bottomBar: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#1A1A1A',
        gap: 12,
    },
    addMoreButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#2A2A2A',
        paddingVertical: 14,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    addMoreText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    sendButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#25D366',
        paddingVertical: 14,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    sendButtonFull: {
        flex: 1,
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});