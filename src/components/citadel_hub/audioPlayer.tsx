import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  PanResponder,
  GestureResponderEvent,
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0); // live position during drag

  // ─── Refs (avoid stale closures in callbacks) ──────────────────────────────
  const soundRef = useRef<Audio.Sound | null>(null);
  const isPlayingRef = useRef(false);
  const durationRef = useRef(0);         // mirrors `duration` state for callbacks
  const waveformWidthRef = useRef(0);    // set by onLayout
  const waveformPageXRef = useRef(0);    // absolute X of waveform on screen

  // ─── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  // ─── Playback status callback (stable ref — no stale closures) ────────────
  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (!status.isLoaded) return;

    const dur = status.durationMillis ?? 0;
    const pos = status.positionMillis ?? 0;

    durationRef.current = dur;
    setDuration(dur);
    setPosition(pos);
    setIsPlaying(status.isPlaying);
    isPlayingRef.current = status.isPlaying;

    // ── FIX 2: Reset to start when finished, using ref not stale state ──────
    if (status.didJustFinish) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setPosition(0);
      // soundRef.current is always current — no stale closure problem
      soundRef.current?.stopAsync().catch(() => { });
    }
  }, []); // empty deps — refs never go stale

  // ─── Load audio on first interaction ──────────────────────────────────────
  const loadAudio = async (): Promise<Audio.Sound | null> => {
    if (soundRef.current) return soundRef.current;

    try {
      setIsLoading(true);
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
      });
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      soundRef.current = newSound;
      return newSound;
    } catch (error) {
      console.error('Error loading audio:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Play / Pause ──────────────────────────────────────────────────────────
  const handlePlayPause = async () => {
    try {
      const currentSound = soundRef.current ?? await loadAudio();
      if (!currentSound) return;

      if (isPlayingRef.current) {
        await currentSound.pauseAsync();
      } else {
        await currentSound.playAsync();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  // ─── Seek to a progress fraction [0, 1] ───────────────────────────────────
  const seekToFraction = async (fraction: number) => {
    const clamped = Math.max(0, Math.min(1, fraction));
    const targetMs = clamped * durationRef.current;

    try {
      // Load audio silently if not yet loaded (user dragged before playing)
      const currentSound = soundRef.current ?? await loadAudio();
      if (!currentSound) return;

      await currentSound.setPositionAsync(targetMs);
      setPosition(targetMs);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  // ── FIX 3: PanResponder for drag-to-seek ──────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (e: GestureResponderEvent) => {
        setIsSeeking(true);
        const fraction = Math.max(0, Math.min(1,
          e.nativeEvent.locationX / waveformWidthRef.current
        ));
        setSeekPosition(fraction * durationRef.current);
      },

      onPanResponderMove: (e: GestureResponderEvent) => {
        // locationX is relative to the waveform view on both iOS & Android
        const fraction = Math.max(0, Math.min(1,
          e.nativeEvent.locationX / waveformWidthRef.current
        ));
        // Update visual position in real-time while dragging
        setSeekPosition(fraction * durationRef.current);
      },

      onPanResponderRelease: async (e: GestureResponderEvent) => {
        const fraction = Math.max(0, Math.min(1,
          e.nativeEvent.locationX / waveformWidthRef.current
        ));
        setIsSeeking(false);
        await seekToFraction(fraction);
      },

      onPanResponderTerminate: () => {
        setIsSeeking(false);
      },
    })
  ).current;

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (millis: number) => {
    const totalSec = Math.floor(millis / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // While dragging use seekPosition, otherwise use actual playback position
  const displayPosition = isSeeking ? seekPosition : position;
  const progress = duration > 0 ? displayPosition / duration : 0;

  // ── FIX 1: Visible colors on both bubble types ────────────────────────────
  // Own message bubble:      #d9fdd3 (light green) → green active, muted green inactive
  // Received message bubble: #ffffff (white)       → green active, grey inactive
  const activeBarColor = '#00a884';
  const inactiveBarColor = isOwnMessage ? '#96c9ad' : '#b8c8ce';

  // Duration display: show remaining/total when not playing, elapsed when playing
  const timeDisplay = (isPlaying || position > 0)
    ? formatTime(displayPosition)
    : formatTime(duration);

  return (
    <View style={styles.container}>

      {/* ── Play / Pause button ── */}
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
            name={isPlaying ? 'pause' : 'play'}
            size={20}
            color="#00a884"
          />
        )}
      </TouchableOpacity>

      {/* ── Seekable waveform ── */}
      <View
        style={styles.waveformContainer}
        onLayout={(e) => {
          waveformWidthRef.current = e.nativeEvent.layout.width;
        }}
        {...panResponder.panHandlers}
      >
        {[...Array(40)].map((_, i) => {
          const barThreshold = i / 40;
          const isActive = progress >= barThreshold;
          // Organic waveform heights via sine
          const height = Math.sin(i * 0.5) * 10 + 8;

          return (
            <View
              key={i}
              style={[
                styles.waveBar,
                {
                  height,
                  backgroundColor: isActive ? activeBarColor : inactiveBarColor,
                  // Slightly scale played bars so the scrub head is obvious
                  transform: [{ scaleY: isActive ? 1.15 : 1 }],
                },
              ]}
            />
          );
        })}

        {/* ── Scrub thumb indicator (visible while seeking) ── */}
        {isSeeking && (
          <View
            style={[
              styles.scrubThumb,
              { left: progress * waveformWidthRef.current - 4 },
            ]}
          />
        )}
      </View>

      {/* ── Time display ── */}
      <Text style={[
        styles.duration,
        isOwnMessage && styles.durationOwn,
      ]}>
        {timeDisplay}
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    // Taller touch target makes dragging comfortable
    height: 36,
    gap: 1.5,
    // overflow hidden clips the scrub thumb cleanly
    overflow: 'hidden',
    position: 'relative',
  },
  waveBar: {
    width: 2,
    borderRadius: 1,
  },
  scrubThumb: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00a884',
    top: '50%',
    marginTop: -4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
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