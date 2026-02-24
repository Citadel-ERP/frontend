import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Animated,
    Platform,
    Alert,
    InteractionManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface AudioRecorderProps {
    visible: boolean;
    onClose: () => void;
    onSend: (uri: string) => void;
}

// Reduced bar count — each extra bar adds one more native animation loop.
// 20 is plenty for a good waveform visual.
const BAR_COUNT = 20;
const BAR_MAX_HEIGHT = 40;

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
    visible,
    onClose,
    onSend,
}) => {
    // ─── UI state ────────────────────────────────────────────────
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [isReady, setIsReady] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // ─── Refs ────────────────────────────────────────────────────
    const recordingRef = useRef<Audio.Recording | null>(null);
    const isInitializingRef = useRef(false);
    const isActiveRef = useRef(false);
    const isSendingRef = useRef(false);
    const startWallClockRef = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ─── Animations ──────────────────────────────────────────────
    const slideAnim = useRef(new Animated.Value(300)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // KEY FIX: We animate scaleY instead of height.
    // scaleY is a transform property → useNativeDriver: true is valid.
    // All 20 animation loops run on the NATIVE thread, not the JS thread.
    // This is what was blocking the timer: the old code used
    // useNativeDriver: false (required for 'height'), which runs every
    // animation frame callback on the JS thread — 60 callbacks per
    // 150ms on 30 bars completely saturated Android's JS message queue,
    // preventing setInterval from executing.
    const barScales = useRef<Animated.Value[]>(
        Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.15))
    ).current;

    const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
    const barLoopsRef = useRef<Animated.CompositeAnimation[]>([]);

    // ─── Timer: wall-clock based, immune to interval drift ───────
    const startTimer = useCallback(() => {
        if (timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        startWallClockRef.current = Date.now();
        setRecordingDuration(0);

        // 500ms tick is sufficient. Elapsed is derived from Date.now()
        // so it is always accurate regardless of how often we tick.
        timerRef.current = setInterval(() => {
            if (!isActiveRef.current) return;
            const elapsed = Math.floor(
                (Date.now() - startWallClockRef.current) / 1000
            );
            setRecordingDuration(elapsed);
        }, 500);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // ─── Animations: all useNativeDriver: true ────────────────────
    const startAnimations = useCallback(() => {
        // Pulse indicator
        pulseLoopRef.current = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.25,
                    duration: 700,
                    useNativeDriver: true,  // ✅ runs on native thread
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1.0,
                    duration: 700,
                    useNativeDriver: true,  // ✅ runs on native thread
                }),
            ])
        );
        pulseLoopRef.current.start();

        // Waveform bars: scaleY + useNativeDriver: true
        // Each loop starts with a per-bar offset so bars move independently.
        barLoopsRef.current = barScales.map((anim, i) => {
            const baseDuration = 180 + (i % 7) * 40; // 180–420ms, varies by position
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 0.2 + ((i * 0.137) % 0.8), // pseudo-random high
                        duration: baseDuration,
                        useNativeDriver: true,  // ✅ runs on native thread
                    }),
                    Animated.timing(anim, {
                        toValue: 0.1 + ((i * 0.073) % 0.35), // pseudo-random low
                        duration: baseDuration,
                        useNativeDriver: true,  // ✅ runs on native thread
                    }),
                ])
            );
            loop.start();
            return loop;
        });
    }, [pulseAnim, barScales]);

    const stopAnimations = useCallback(() => {
        pulseLoopRef.current?.stop();
        pulseLoopRef.current = null;
        barLoopsRef.current.forEach(l => l.stop());
        barLoopsRef.current = [];
        pulseAnim.setValue(1);
        barScales.forEach(a => a.setValue(0.15));
    }, [pulseAnim, barScales]);

    // ─── Audio recording ─────────────────────────────────────────
    const startRecording = useCallback(async () => {
        if (isInitializingRef.current || recordingRef.current) return;
        isInitializingRef.current = true;

        try {
            const { granted } = await Audio.requestPermissionsAsync();
            if (!granted) {
                Alert.alert('Permission Required', 'Microphone access is needed to record audio.');
                isInitializingRef.current = false;
                if (isActiveRef.current) onClose();
                return;
            }
            if (!isActiveRef.current) { isInitializingRef.current = false; return; }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });
            if (!isActiveRef.current) { isInitializingRef.current = false; return; }

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            if (!isActiveRef.current) {
                try { await recording.stopAndUnloadAsync(); } catch (_) {}
                isInitializingRef.current = false;
                return;
            }

            recordingRef.current = recording;
            setIsReady(true);
        } catch (err) {
            console.error('AudioRecorder: startRecording failed:', err);
            if (isActiveRef.current) {
                Alert.alert('Error', 'Failed to start recording. Please try again.');
                onClose();
            }
        } finally {
            isInitializingRef.current = false;
        }
    }, [onClose]);

    const stopAndUnload = useCallback(async (): Promise<string | null> => {
        const rec = recordingRef.current;
        if (!rec) return null;
        recordingRef.current = null;
        try {
            await rec.stopAndUnloadAsync();
            return rec.getURI() ?? null;
        } catch (err) {
            console.error('AudioRecorder: stopAndUnload failed:', err);
            return null;
        }
    }, []);

    const resetAudioMode = useCallback(async () => {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: false,
            });
        } catch (_) {}
    }, []);

    // ─── Lifecycle ────────────────────────────────────────────────
    useEffect(() => {
        if (visible) {
            isActiveRef.current = true;
            isSendingRef.current = false;
            setIsSending(false);
            setIsReady(false);
            setRecordingDuration(0);

            // Slide-in (native thread)
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 8,
            }).start();

            // Start timer + animations IMMEDIATELY.
            // Because these now use useNativeDriver: true, they run on
            // the native thread and are completely decoupled from
            // whatever the JS thread does during audio init.
            startTimer();
            startAnimations();

            // Defer audio init until after the slide-in frame completes.
            // Even though audio init is async, promise resolution still
            // queues microtasks on the JS thread. InteractionManager
            // ensures we don't start until the animation frame is done.
            InteractionManager.runAfterInteractions(() => {
                if (isActiveRef.current) {
                    startRecording();
                }
            });
        } else {
            isActiveRef.current = false;
            stopTimer();
            stopAnimations();
            setIsReady(false);

            Animated.timing(slideAnim, {
                toValue: 300,
                duration: 200,
                useNativeDriver: true,
            }).start();

            stopAndUnload().catch(() => {});
            resetAudioMode().catch(() => {});
        }

        return () => {
            isActiveRef.current = false;
            stopTimer();
            stopAnimations();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // ─── User actions ─────────────────────────────────────────────
    const handleCancel = useCallback(async () => {
        if (isSendingRef.current) return;
        isActiveRef.current = false;
        stopTimer();
        stopAnimations();
        await stopAndUnload();
        await resetAudioMode();
        onClose();
    }, [stopTimer, stopAnimations, stopAndUnload, resetAudioMode, onClose]);

    const handleSend = useCallback(async () => {
        if (isSendingRef.current) return;
        isSendingRef.current = true;
        setIsSending(true);

        isActiveRef.current = false;
        stopTimer();
        stopAnimations();

        const uri = await stopAndUnload();
        await resetAudioMode();

        if (uri) {
            onSend(uri);
        } else {
            Alert.alert('Error', 'Recording could not be saved. Please try again.');
        }

        isSendingRef.current = false;
        onClose();
    }, [stopTimer, stopAnimations, stopAndUnload, resetAudioMode, onSend, onClose]);

    // ─── Formatting ───────────────────────────────────────────────
    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // ─── Render ───────────────────────────────────────────────────
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
                    onPress={handleCancel}
                />

                <Animated.View
                    style={[
                        styles.recorderContainer,
                        { transform: [{ translateY: slideAnim }] },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={handleCancel}
                            style={styles.closeBtn}
                            disabled={isSending}
                        >
                            <Ionicons name="close" size={28} color="#8696a0" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>
                            {isReady ? 'Recording Audio' : 'Preparing…'}
                        </Text>
                        <View style={{ width: 28 }} />
                    </View>

                    {/* Timer */}
                    <View style={styles.recordingInfo}>
                        <Animated.View
                            style={[
                                styles.recordingDot,
                                { transform: [{ scale: pulseAnim }] },
                            ]}
                        />
                        <Text style={styles.duration}>
                            {formatDuration(recordingDuration)}
                        </Text>
                    </View>

                    {/* Waveform
                        Each bar lives in a fixed-height track (barTrack).
                        The bar itself is full height (BAR_MAX_HEIGHT) and is
                        compressed via scaleY. Because scaleY scales from the
                        center by default, we add translateY to pin the bar
                        bottom to the track bottom, so it visually grows upward.
                    */}
                    <View style={styles.waveformContainer}>
                        {barScales.map((scaleAnim, i) => (
                            <View key={i} style={styles.barTrack}>
                                <Animated.View
                                    style={[
                                        styles.waveformBar,
                                        {
                                            transform: [{ scaleY: scaleAnim }],
                                            opacity: isReady ? 1 : 0.35,
                                        },
                                    ]}
                                />
                            </View>
                        ))}
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={handleCancel}
                            activeOpacity={0.7}
                            disabled={isSending}
                        >
                            <Ionicons name="trash-outline" size={24} color="#ea4335" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.sendBtn,
                                isSending && styles.sendBtnDisabled,
                            ]}
                            onPress={handleSend}
                            activeOpacity={0.7}
                            disabled={isSending}
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
        minWidth: 68,
        textAlign: 'center',
    },
    // Row of bar tracks
    waveformContainer: {
        flexDirection: 'row',
        alignItems: 'center',     // centers tracks vertically in the row
        justifyContent: 'center',
        height: BAR_MAX_HEIGHT + 8,
        gap: 3,
        marginBottom: 32,
    },
    // Fixed-height track — bars scale inside this space
    barTrack: {
        width: 3,
        height: BAR_MAX_HEIGHT,
        justifyContent: 'center', // scaleY scales from center of the bar
        alignItems: 'center',
        overflow: 'visible',
    },
    // Full-height bar; scaleY animates it between 15% and 100% height
    waveformBar: {
        width: 3,
        height: BAR_MAX_HEIGHT,
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
    sendBtnDisabled: {
        opacity: 0.5,
    },
});