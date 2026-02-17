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
    console.log('👆 User released button');

    if (!isRecording) {
      console.log('⏹️ Not recording');
      return;
    }

    if (!recordingStarted.current) {
      console.log('⏸️ Not started yet, waiting 600ms...');
      setTimeout(() => {
        if (isRecording && recordingStarted.current) {
          console.log('✅ Ready now, stopping...');
          stopRecording();
        } else if (isRecording) {
          console.log('⚠️ Still not ready, forcing...');
          Alert.alert('Too Quick', 'Please hold the button longer to record video');
          forceStopRecording();
        }
      }, 600);
      return;
    }

    if (!canStopRecording) {
      console.log('⏸️ Too soon, waiting 400ms...');
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 400);
      return;
    }

    console.log('✅ Conditions met, stopping now');
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
      recordingStarted.current = false;

      // Animate button
      Animated.spring(recordButtonScale, {
        toValue: 1.3,
        useNativeDriver: true,
      }).start();

      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // ✅ FIX: Await the recording and handle it properly
      console.log('📹 Starting recordAsync...');

      // Mark as started after brief delay for native init
      setTimeout(() => {
        recordingStarted.current = true;
        console.log('✅ Recording started (native initialized)');
      }, 300);

      setTimeout(() => {
        setCanStopRecording(true);
        console.log('✅ Can stop recording now');
      }, 1500);

      // ✅ CRITICAL: Store the promise but don't await yet
      const recordingOperation = cameraRef.current.recordAsync({
        maxDuration: 60,
        mute: false,
      });

      recordingPromise.current = recordingOperation;

      // ✅ Handle the promise separately (this runs in background)
      recordingOperation
        .then((video) => {
          console.log('✅ Recording promise resolved!');
          console.log('📹 Video data:', JSON.stringify(video));

          if (video && video.uri) {
            console.log('✅ Setting preview URI:', video.uri);
            setPreviewUri(video.uri);
            setPreviewType('video');
          } else {
            console.error('❌ No video URI in response:', video);
            Alert.alert('Error', 'Video was not saved properly');
          }
        })
        .catch((error) => {
          console.error('❌ Recording promise rejected:', error);
          console.error('Error details:', JSON.stringify(error));

          // Only show error if it's not a normal stop
          if (!error?.message?.includes('stopped') && !error?.message?.includes('cancelled')) {
            Alert.alert('Recording Error', error?.message || 'Failed to record video');
          }
        })
        .finally(() => {
          console.log('🏁 Recording promise completed');
          recordingPromise.current = null;
        });

    } catch (error) {
      console.error('❌ Start recording failed:', error);
      Alert.alert('Error', 'Failed to start recording');

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
      console.log('⏹️ Not recording, cannot stop');
      return;
    }

    if (!recordingStarted.current) {
      console.log('⏸️ Recording not started yet, waiting...');
      setTimeout(() => {
        if (isRecording && recordingStarted.current) {
          stopRecording();
        } else if (isRecording) {
          console.log('⚠️ Force stopping...');
          forceStopRecording();
        }
      }, 500);
      return;
    }

    if (!canStopRecording) {
      console.log('⏸️ Too early to stop, waiting...');
      return;
    }

    if (recordingDuration < 1) {
      console.log('⚠️ Duration too short, waiting...');
      setTimeout(() => {
        if (isRecording) stopRecording();
      }, 300);
      return;
    }

    try {
      console.log(`🛑 Stopping recording (${recordingDuration}s recorded)...`);

      // ✅ CRITICAL: Call stopRecording which will resolve the promise
      cameraRef.current.stopRecording();

      // ✅ Reset UI state immediately
      setIsRecording(false);
      setCanStopRecording(false);
      recordingStarted.current = false;

      Animated.spring(recordButtonScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();

      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }

      // ✅ DON'T set recordingPromise.current = null here!
      // Let it resolve naturally and clean up in .finally()
      console.log('✅ Stop command sent, waiting for promise to resolve...');

    } catch (error) {
      console.error('❌ Stop failed:', error);
      forceStopRecording();
      Alert.alert('Error', 'Failed to stop recording properly');
    }
  };

  const forceStopRecording = () => {
    console.log('🚨 Force stopping...');

    if (cameraRef.current && isRecording) {
      try {
        cameraRef.current.stopRecording();
      } catch (e) {
        console.log('Error in force stop:', e);
      }
    }

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

    // Clear the promise reference
    recordingPromise.current = null;
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
    console.log('📤 Send button pressed');
    console.log('Preview URI:', previewUri);
    console.log('Preview Type:', previewType);

    if (!previewUri) {
      console.error('❌ No preview URI!');
      Alert.alert('Error', 'No video to send');
      return;
    }

    console.log('✅ Calling onCapture callback...');
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