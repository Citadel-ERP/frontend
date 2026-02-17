import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Animated,
    Platform,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface AudioRecorderProps {
    visible: boolean;
    onClose: () => void;
    onSend: (uri: string) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
    visible,
    onClose,
    onSend,
}) => {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const isRecordingRef = useRef(false);


    const pulseAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(300)).current;
    const durationInterval = useRef<NodeJS.Timeout | null>(null);
    const waveformValues = useRef(Array(30).fill(0).map(() => new Animated.Value(0.3))).current;

    useEffect(() => {
        if (visible) {
            startRecording();
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 8,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: 300,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    useEffect(() => {
        // Clear any existing interval/animations first
        if (durationInterval.current) {
            clearInterval(durationInterval.current);
            durationInterval.current = null;
        }

        if (isRecording) {
            // Red pulse animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 700,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 700,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Waveform animation
            waveformValues.forEach((anim) => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: Math.random() * 0.7 + 0.3,
                            duration: 150 + Math.random() * 100,
                            useNativeDriver: false,
                        }),
                        Animated.timing(anim, {
                            toValue: Math.random() * 0.7 + 0.3,
                            duration: 150 + Math.random() * 100,
                            useNativeDriver: false,
                        }),
                    ])
                ).start();
            });

            // Duration counter - create interval ONLY if one doesn't exist
            durationInterval.current = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);
        } else {
            // Stop animations
            pulseAnim.setValue(1);
            waveformValues.forEach(anim => anim.setValue(0.3));
        }

        // Cleanup on unmount or when isRecording changes
        return () => {
            if (durationInterval.current) {
                clearInterval(durationInterval.current);
                durationInterval.current = null;
            }
        };
    }, [isRecording]); // Only depend on isRecording

    const startRecording = async () => {
    // Prevent multiple simultaneous recordings
    if (isRecordingRef.current) {
        console.log('Recording already in progress');
        return;
    }
    
    try {
        isRecordingRef.current = true;
        
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Microphone permission is required!');
            isRecordingRef.current = false;
            onClose();
            return;
        }

        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });

        const { recording: newRecording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
        );

        setRecording(newRecording);
        setIsRecording(true);
        setRecordingDuration(0);
    } catch (err) {
        console.error('Failed to start recording:', err);
        Alert.alert('Failed to start recording');
        isRecordingRef.current = false;
        onClose();
    }
};

    const stopRecording = async () => {
        if (!recording) return;

        try {
            setIsRecording(false);
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            return uri;
        } catch (err) {
            console.error('Failed to stop recording:', err);
            return null;
        }
    };

    const handleCancel = async () => {
    try {
        setIsRecording(false);
        isRecordingRef.current = false; // ADD THIS LINE
        
        if (durationInterval.current) {
            clearInterval(durationInterval.current);
            durationInterval.current = null;
        }
        
        if (recording) {
            await recording.stopAndUnloadAsync();
            setRecording(null);
        }
        
        setRecordingDuration(0);
        onClose();
    } catch (error) {
        console.error('Error canceling recording:', error);
        isRecordingRef.current = false; // ADD THIS LINE
        onClose();
    }
};

    const handleSend = async () => {
    try {
        // Stop recording first
        setIsRecording(false);
        
        // Clear interval
        if (durationInterval.current) {
            clearInterval(durationInterval.current);
            durationInterval.current = null;
        }
        
        // Get the URI
        const uri = await stopRecording();
        
        // Send if valid
        if (uri) {
            onSend(uri);
        }
        
        // Cleanup
        setRecording(null);
        setRecordingDuration(0);
        
        // Close modal
        onClose();
    } catch (error) {
        console.error('Error sending recording:', error);
        onClose(); // Close anyway
    }
};

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleCancel}
        >
            <View style={styles.container}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={(e) => {
                        e.stopPropagation(); // Prevent event bubbling
                        handleCancel();
                    }}
                />
                <Animated.View
                    style={[
                        styles.recorderContainer,
                        { transform: [{ translateY: slideAnim }] },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
                            <Ionicons name="close" size={28} color="#8696a0" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Recording Audio</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    {/* Recording Indicator & Duration */}
                    <View style={styles.recordingInfo}>
                        <Animated.View
                            style={[
                                styles.recordingDot,
                                { transform: [{ scale: pulseAnim }] },
                            ]}
                        />
                        <Text style={styles.duration}>{formatDuration(recordingDuration)}</Text>
                    </View>

                    {/* Waveform */}
                    <View style={styles.waveformContainer}>
                        {waveformValues.map((anim, i) => (
                            <Animated.View
                                key={i}
                                style={[
                                    styles.waveformBar,
                                    {
                                        height: anim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [4, 40],
                                        }),
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={handleCancel}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="trash-outline" size={24} color="#ea4335" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.sendBtn}
                            onPress={handleSend}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="send" size={22} color="#ffffff" />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    recorderContainer: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        paddingTop: 8,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111b21',
    },
    closeBtn: {
        padding: 4,
    },
    recordingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 24,
    },
    recordingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#ea4335',
    },
    duration: {
        fontSize: 28,
        fontWeight: '400',
        color: '#111b21',
        fontVariant: ['tabular-nums'],
    },
    waveformContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        gap: 2,
        marginBottom: 32,
    },
    waveformBar: {
        width: 3,
        backgroundColor: '#00a884',
        borderRadius: 2,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    deleteBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#f0f2f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#00a884',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
});