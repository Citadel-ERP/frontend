import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface AudioPlayerProps {
  audioUrl: string;
  isOwnMessage?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  isOwnMessage = false,
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

 const loadAudio = async () => {
    if (sound) return sound; // Return existing sound

    try {
        setIsLoading(true);
        const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: audioUrl },
            { shouldPlay: false },
            onPlaybackStatusUpdate
        );
        setSound(newSound);
        setIsLoading(false);
        return newSound; // Return the newly loaded sound
    } catch (error) {
        console.error('Error loading audio:', error);
        setIsLoading(false);
        return null;
    }
};

const handlePlayPause = async () => {
    try {
        let currentSound = sound;
        
        // If sound not loaded, load it first
        if (!currentSound) {
            currentSound = await loadAudio();
            if (!currentSound) return; // Failed to load
        }

        // Now play or pause
        if (isPlaying) {
            await currentSound.pauseAsync();
        } else {
            await currentSound.playAsync();
        }
    } catch (error) {
        console.error('Error playing audio:', error);
    }
};

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        sound?.setPositionAsync(0);
      }
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={styles.container}>
      {/* Play/Pause Button */}
      <TouchableOpacity
        style={styles.playButton}
        onPress={handlePlayPause}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#00a884" />
        ) : (
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={20}
            color="#00a884"
          />
        )}
      </TouchableOpacity>

      {/* Waveform */}
      <View style={styles.waveformContainer}>
        {[...Array(40)].map((_, i) => {
          const barProgress = i / 40;
          const isActive = progress >= barProgress;
          const height = Math.sin(i * 0.5) * 12 + 8; // Varied heights
          
          return (
            <View
              key={i}
              style={[
                styles.waveBar,
                {
                  height: height,
                  backgroundColor: isActive 
                    ? (isOwnMessage ? '#00a884' : '#ffffff')
                    : (isOwnMessage ? '#d1d5db' : 'rgba(255,255,255,0.4)'),
                },
              ]}
            />
          );
        })}
      </View>

      {/* Duration */}
      <Text style={[styles.duration, isOwnMessage && styles.durationOwn]}>
        {formatTime(isPlaying ? position : duration)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 200,
    maxWidth: 250,
    gap: 8,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    gap: 1.5,
  },
  waveBar: {
    width: 2,
    borderRadius: 1,
  },
  duration: {
    fontSize: 11,
    color: '#667781',
    fontVariant: ['tabular-nums'],
    minWidth: 35,
    textAlign: 'right',
  },
  durationOwn: {
    color: '#667781',
  },
});