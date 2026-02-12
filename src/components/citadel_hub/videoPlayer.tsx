import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoPlayerProps {
  visible: boolean;
  videoUri: string;
  onClose: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  visible,
  videoUri,
  onClose,
}) => {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setError(null);
      setIsPlaying(true);
      setPosition(0);
      setDuration(0);
    }
  }, [visible]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
      setIsPlaying(status.isPlaying);
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        videoRef.current?.setPositionAsync(0);
      }
    } else if (status.error) {
      setIsLoading(false);
      console.error('Video playback error:', status.error);
      setError(`Playback error: ${status.error}`);
    }
  };

  const handleLoadError = (error: any) => {
    console.error('Video load error:', error);
    setIsLoading(false);
    setError('Unable to load video. Please check your connection.');
  };

  const togglePlayPause = async () => {
    if (!videoRef.current) return;
    
    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    } catch (err) {
      console.error('Play/Pause error:', err);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleClose = async () => {
    try {
      if (videoRef.current) {
        await videoRef.current.stopAsync();
        await videoRef.current.unloadAsync();
      }
    } catch (err) {
      console.error('Error closing video:', err);
    } finally {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={32} color="#ffffff" />
        </TouchableOpacity>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color="#ff4444" />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorSubtext}>
              The video might be corrupted or not yet uploaded to the server.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleClose}>
              <Text style={styles.retryText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Video
              ref={videoRef}
              source={{ uri: videoUri }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping={false}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              onError={handleLoadError}
              useNativeControls={false}
            />

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00a884" />
                <Text style={styles.loadingText}>Loading video...</Text>
              </View>
            )}

            {!isLoading && !error && (
              <View style={styles.controlsContainer}>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={togglePlayPause}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={48}
                    color="#ffffff"
                  />
                </TouchableOpacity>

                <View style={styles.timelineContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' },
                      ]}
                    />
                  </View>
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{formatTime(position)}</Text>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.6,
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorSubtext: {
    color: '#cccccc',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#00a884',
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 168, 132, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  timelineContainer: {
    width: SCREEN_WIDTH - 40,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00a884',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  timeText: {
    color: '#ffffff',
    fontSize: 13,
  },
});