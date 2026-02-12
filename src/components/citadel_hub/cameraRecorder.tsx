import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Text,
  Animated,
  Image,
} from 'react-native';
import { Camera, CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CameraRecorderProps {
  visible: boolean;
  mode: 'photo' | 'video';
  onClose: () => void;
  onCapture: (uri: string, type: 'photo' | 'video') => void;
}

export const CameraRecorder: React.FC<CameraRecorderProps> = ({
  visible,
  mode: initialMode,
  onClose,
  onCapture,
}) => {
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<'photo' | 'video'>(initialMode);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'photo' | 'video'>('photo');
  const recordingPromise = useRef<Promise<any> | null>(null);
  const [canStopRecording, setCanStopRecording] = useState(false);
  const recordingStarted = useRef(false);

  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

  const recordButtonScale = useRef(new Animated.Value(1)).current;

  // Request permissions when modal opens
  useEffect(() => {
    if (visible) {
      (async () => {
        if (!cameraPermission?.granted) {
          await requestCameraPermission();
        }
        if (!microphonePermission?.granted) {
          await requestMicrophonePermission();
        }
      })();
    }
  }, [visible]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!visible) {
      // Reset state when modal closes
      console.log('🚪 Modal closing, cleaning up...');

      if (isRecording && cameraRef.current) {
        try {
          cameraRef.current.stopRecording();
        } catch (e) {
          console.log('Error stopping on close:', e);
        }
      }

      setIsRecording(false);
      setCanStopRecording(false);
      recordingStarted.current = false;
      setRecordingDuration(0);
      setPreviewUri(null);
      recordingPromise.current = null;

      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
    }
  }, [visible, isRecording]);

  const handleStopAttempt = () => {
  if (!isRecording) {
    console.log('⏹️ Not recording, ignoring stop attempt');
    return;
  }

  // ✅ Check if native recording has started
  if (!recordingStarted.current) {
    console.log('⏸️ Released before native started, waiting 500ms...');
    setTimeout(() => {
      if (isRecording && recordingStarted.current) {
        console.log('✅ Native ready now, stopping...');
        stopRecording();
      } else if (isRecording) {
        console.log('⚠️ Still not ready, forcing stop...');
        Alert.alert('Recording Issue', 'Recording did not start properly. Please try again.');
        forceStopRecording();
      }
    }, 500);
    return;
  }

  // ✅ Check minimum time
  if (!canStopRecording) {
    console.log('⏸️ Minimum time not reached, waiting...');
    setTimeout(() => {
      if (isRecording) {
        stopRecording();
      }
    }, 300);
    return;
  }

  // ✅ All checks passed, stop normally
  console.log('✅ All checks passed, stopping recording');
  stopRecording();
};

  const startRecording = async () => {
  if (!cameraRef.current || mode !== 'video') return;
  if (isRecording) return;

  try {
    console.log('🎬 Starting recording...');
    setIsRecording(true);
    setCanStopRecording(false);
    setRecordingDuration(0);
    recordingStarted.current = false; // ← NOT started yet

    // Animate button
    Animated.spring(recordButtonScale, {
      toValue: 1.3,
      useNativeDriver: true,
    }).start();

    // Start timer
    recordingTimer.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);

    // ✅ Start recording
    console.log('📹 Calling recordAsync...');
    recordingPromise.current = cameraRef.current.recordAsync({
      maxDuration: 60,
      mute: false,
    });

    // ✅ CRITICAL FIX: Wait for native recording to actually initialize
    // The native camera module needs time to start capturing data
    setTimeout(() => {
      recordingStarted.current = true;
      console.log('✅ Native recording initialized');
    }, 300); // 300ms delay for native initialization

    // ✅ Allow stopping after minimum 1.5 seconds total (300ms init + 1200ms recording)
    setTimeout(() => {
      setCanStopRecording(true);
      console.log('✅ Can now stop recording (minimum time reached)');
    }, 1500);

    // ✅ Handle completion
    recordingPromise.current
      .then((video) => {
        console.log('✅ Recording completed:', video?.uri);
        if (video && video.uri) {
          setPreviewUri(video.uri);
          setPreviewType('video');
        }
      })
      .catch((error) => {
        if (error?.message?.includes('stopped')) {
          console.log('ℹ️ Recording stopped by user');
        } else {
          console.error('❌ Recording error:', error);
          Alert.alert('Error', 'Failed to record video. Please try again.');
        }
      });

  } catch (error) {
    console.error('❌ Start recording error:', error);
    Alert.alert('Error', 'Failed to start recording. Please try again.');

    // Cleanup
    setIsRecording(false);
    setCanStopRecording(false);
    recordingStarted.current = false;
    
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }

    Animated.spring(recordButtonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }
};

  const stopRecording = async () => {
  if (!cameraRef.current || !isRecording) {
    console.log('⏹️ Stop called but not recording');
    return;
  }

  // ✅ CRITICAL: Don't stop until native recording has initialized
  if (!recordingStarted.current) {
    console.log('⏸️ Native recording not initialized yet, waiting...');
    // Wait and retry
    setTimeout(() => {
      if (isRecording && recordingStarted.current) {
        stopRecording();
      } else {
        console.log('⚠️ Recording never initialized properly');
        forceStopRecording();
      }
    }, 600); // Wait 600ms and retry
    return;
  }

  // ✅ Don't stop before minimum time
  if (!canStopRecording) {
    console.log('⏸️ Minimum recording time not reached');
    return;
  }

  // ✅ Additional safety: Check recording duration
  if (recordingDuration < 1) {
    console.log('⚠️ Recording duration too short, waiting...');
    setTimeout(() => {
      if (isRecording) {
        stopRecording();
      }
    }, 300);
    return;
  }

  try {
    console.log(`🛑 Stopping recording (duration: ${recordingDuration}s)...`);
    
    // Stop the camera
    cameraRef.current.stopRecording();
    
    // Reset states
    setIsRecording(false);
    setCanStopRecording(false);
    recordingStarted.current = false;

    // Animate button
    Animated.spring(recordButtonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    // Clear timer
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }

    recordingPromise.current = null;
    console.log('✅ Recording stopped successfully');

  } catch (error) {
    console.error('❌ Stop recording error:', error);
    forceStopRecording();
  }
};

  const forceStopRecording = () => {
    console.log('🚨 Force stopping recording');

    if (cameraRef.current && isRecording) {
      try {
        cameraRef.current.stopRecording();
      } catch (e) {
        console.log('Error force stopping:', e);
      }
    }

    setIsRecording(false);
    setCanStopRecording(false);
    recordingStarted.current = false;
    recordingPromise.current = null;

    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }

    Animated.spring(recordButtonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };
  const handleRecordingPress = async () => {
    if (mode !== 'video') return;

    if (!isRecording) {
      await startRecording();
    } else {
      // Check minimum duration (at least 0.5 seconds)
      if (recordingDuration < 1) {
        Alert.alert('Too Short', 'Hold the button longer to record video');
        return;
      }
      await stopRecording();
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current || mode !== 'photo') return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo && photo.uri) {
        setPreviewUri(photo.uri);
        setPreviewType('photo');
      }
    } catch (error) {
      console.error('Photo capture error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleCapture = () => {
    if (!previewUri) return;
    onCapture(previewUri, previewType);
    handleClose();
  };

  const handleRetake = () => {
    setPreviewUri(null);
    setRecordingDuration(0);
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    setPreviewUri(null);
    setRecordingDuration(0);
    onClose();
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check permissions
  if (!cameraPermission || !microphonePermission) {
    return null;
  }

  if (!cameraPermission.granted || !microphonePermission.granted) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-off" size={64} color="#8696a0" />
          <Text style={styles.permissionText}>
            Camera and microphone permissions are required
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={async () => {
              await requestCameraPermission();
              await requestMicrophonePermission();
            }}
          >
            <Text style={styles.permissionButtonText}>Grant Permissions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: '#8696a0', marginTop: 10 }]}
            onPress={handleClose}
          >
            <Text style={styles.permissionButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {previewUri ? (
          // Preview mode
          <View style={styles.previewContainer}>
            {previewType === 'photo' ? (
              <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="contain" />
            ) : (
              <Video
                source={{ uri: previewUri }}
                style={styles.preview}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                isLooping
                useNativeControls
              />
            )}

            <View style={styles.previewControls}>
              <TouchableOpacity style={styles.previewButton} onPress={handleRetake}>
                <Ionicons name="refresh" size={28} color="#ffffff" />
                <Text style={styles.previewButtonText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.previewButton, styles.sendButton]} onPress={handleCapture}>
                <Ionicons name="send" size={28} color="#ffffff" />
                <Text style={styles.previewButtonText}>Send</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={32} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          // Camera mode
          <>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              flash={flash}
            />

            <View style={styles.topControls}>
              <TouchableOpacity style={styles.topButton} onPress={handleClose}>
                <Ionicons name="close" size={32} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.topButton} onPress={toggleFlash}>
                <Ionicons
                  name={flash === 'on' ? 'flash' : 'flash-off'}
                  size={28}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>

            {mode === 'video' && isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>
                  {formatDuration(recordingDuration)}
                  {!canStopRecording && ' - Hold...'}
                </Text>
              </View>
            )}

            <View style={styles.bottomControls}>
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeButton, mode === 'photo' && styles.modeButtonActive]}
                  onPress={() => setMode('photo')}
                >
                  <Text style={[styles.modeText, mode === 'photo' && styles.modeTextActive]}>
                    Photo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, mode === 'video' && styles.modeButtonActive]}
                  onPress={() => setMode('video')}
                >
                  <Text style={[styles.modeText, mode === 'video' && styles.modeTextActive]}>
                    Video
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.captureControls}>
                <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
                  <Ionicons name="camera-reverse" size={32} color="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.captureButtonContainer}
                  onPressIn={mode === 'video' ? startRecording : undefined}
                  onPressOut={mode === 'video' ? handleStopAttempt : undefined}
                  onPress={mode === 'photo' ? takePhoto : undefined}
                  activeOpacity={0.8}
                >
                  <Animated.View
                    style={[
                      styles.captureButton,
                      mode === 'video' && styles.videoCaptureButton,
                      isRecording && styles.recordingButton,
                      { transform: [{ scale: recordButtonScale }] },
                    ]}
                  >
                    {mode === 'video' && isRecording && (
                      <View style={styles.recordingSquare} />
                    )}
                  </Animated.View>
                </TouchableOpacity>

                <View style={{ width: 64 }} />
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  topControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  topButton: {
    padding: 8,
  },
  recordingIndicator: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234, 67, 53, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  recordingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    marginBottom: 30,
  },
  modeButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  modeButtonActive: {
    backgroundColor: '#00a884',
  },
  modeText: {
    color: '#ffffff',
    fontSize: 16,
    opacity: 0.6,
  },
  modeTextActive: {
    opacity: 1,
    fontWeight: '600',
  },
  captureControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 40,
  },
  flipButton: {
    padding: 8,
  },
  captureButtonContainer: {
    padding: 4,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    borderWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCaptureButton: {
    borderColor: '#ea4335',
  },
  recordingButton: {
    backgroundColor: '#ea4335',
  },
  recordingSquare: {
    width: 30,
    height: 30,
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  preview: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  previewControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  previewButton: {
    alignItems: 'center',
    padding: 12,
  },
  sendButton: {
    backgroundColor: '#00a884',
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 8,
  },
  previewButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    padding: 8,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    color: '#111b21',
    marginTop: 20,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 30,
    backgroundColor: '#00a884',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});