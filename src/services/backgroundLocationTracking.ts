/**
 * src/services/backgroundLocationTracking.ts
 *
 * Periodic location capture for employer visibility (separate from attendance).
 * Sends coordinates to /core/saveLocation every ≥15 minutes during work hours.
 *
 * Google Play compliance:
 *   ✅  requestBackgroundPermissionsAsync only called after prominent disclosure
 *   ✅  showDisclosure callback required; service aborts if not provided when
 *       background permission is missing
 *   ✅  Work-status check prevents tracking on leave / holidays
 *   ✅  Only runs Monday–Friday 08:00–11:00 (configurable)
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/config';

// ── Constants ─────────────────────────────────────────────────────────────────

const LOCATION_TRACK_TASK = 'citadel-location-track';
const LAST_TRACKED_KEY = 'citadel_last_location_tracked';
const TOKEN_KEY = 'token_2';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isWithinTrackingHours(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  return day >= 1 && day <= 5 && hour >= 8 && hour < 11;
}

// ── Task definition ───────────────────────────────────────────────────────────

TaskManager.defineTask(LOCATION_TRACK_TASK, async () => {
  try {
    if (!isWithinTrackingHours()) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // Check leave / holiday
    const statusRes = await fetch(`${BACKEND_URL}/core/checkWorkStatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (statusRes.ok) {
      const data = await statusRes.json();
      if (data.data === false) {
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const res = await fetch(`${BACKEND_URL}/core/saveLocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
      }),
    });

    if (res.ok) {
      await AsyncStorage.setItem(LAST_TRACKED_KEY, new Date().toISOString());
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.Failed;

  } catch (err) {
    console.error('[LocationTrack] Task error:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ── BackgroundLocationService ─────────────────────────────────────────────────

export class BackgroundLocationService {
  /**
   * Initialize the periodic location tracking service.
   *
   * Requires background location permission. If not yet granted, calls
   * `showDisclosure` first (Google Play mandatory prominent disclosure),
   * then requests the system permission.
   *
   * @param showDisclosure  Async callback that shows the disclosure modal and
   *                        resolves with true (accepted) / false (declined).
   *                        If omitted and background permission is not granted,
   *                        the service will NOT start.
   */
  static async initialize(
    showDisclosure?: () => Promise<boolean>,
  ): Promise<boolean> {
    try {
      console.log('[LocationTrack] Initializing…');

      // Foreground permission must already exist
      const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        console.warn('[LocationTrack] Foreground permission missing — aborting');
        return false;
      }

      // Background permission
      const bgGranted = await BackgroundLocationService.ensureBackgroundPermission(
        showDisclosure,
      );
      if (!bgGranted) {
        console.log('[LocationTrack] Background permission not available — skipping');
        return false;
      }

      // Register (or skip if already registered)
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TRACK_TASK);
      if (isRegistered) {
        console.log('[LocationTrack] Already registered');
        return true;
      }

      await BackgroundFetch.registerTaskAsync(LOCATION_TRACK_TASK, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('[LocationTrack] Initialized (15-min interval)');
      return true;

    } catch (err) {
      console.error('[LocationTrack] Initialization failed:', err);
      return false;
    }
  }

  /** Stop the location tracking service. */
  static async stop(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TRACK_TASK);
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(LOCATION_TRACK_TASK);
        console.log('[LocationTrack] Stopped');
      }
    } catch (err) {
      console.error('[LocationTrack] Stop failed:', err);
    }
  }

  /** True if the tracking task is currently registered. */
  static async isRunning(): Promise<boolean> {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TRACK_TASK);
      return (
        status === BackgroundFetch.BackgroundFetchStatus.Available && isRegistered
      );
    } catch {
      return false;
    }
  }

  /** Diagnostic info for settings / debug screens. */
  static async getInfo(): Promise<{
    isRunning: boolean;
    lastTracked: string | null;
  }> {
    const isRunning = await BackgroundLocationService.isRunning();
    const lastTracked = await AsyncStorage.getItem(LAST_TRACKED_KEY);
    return { isRunning, lastTracked };
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private static async ensureBackgroundPermission(
    showDisclosure?: () => Promise<boolean>,
  ): Promise<boolean> {
    const { status } = await Location.getBackgroundPermissionsAsync();

    if (status === 'granted') {
      return true;
    }

    if (!showDisclosure) {
      console.warn(
        '[LocationTrack] Background permission not granted and no showDisclosure provided.',
      );
      return false;
    }

    // Mandatory prominent disclosure BEFORE the OS dialog
    const accepted = await showDisclosure();
    if (!accepted) {
      console.log('[LocationTrack] User declined disclosure');
      return false;
    }

    const { status: newStatus } = await Location.requestBackgroundPermissionsAsync();
    return newStatus === 'granted';
  }
}