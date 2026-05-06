/**
 * src/services/backgroundAttendance.ts
 *
 * Periodic attendance check via expo-background-fetch (fallback mechanism).
 *
 * IMPORTANT — architecture note:
 *   This service handles BACKGROUND FETCH ONLY (polling every ≥15 min).
 *   Geofencing is handled exclusively by geofencing.ts.
 *   Having both provides redundancy:
 *     • Geofencing (geofencing.ts) = event-driven, battery-efficient, primary
 *     • Background fetch (this file) = time-driven, fallback if geofencing misses
 *
 *   Do NOT define any geofence TaskManager tasks here — that caused the
 *   conflicting duplicate-task bug in the previous version.
 *
 * Google Play compliance:
 *   ✅  No background location permission requested here directly
 *       (background fetch only needs foreground location to check position)
 *   ✅  Working-hours guard limits battery impact
 *   ✅  "Already marked today" guard prevents duplicate API calls
 */

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/config';

// ── Constants ─────────────────────────────────────────────────────────────────

const BACKGROUND_FETCH_TASK = 'citadel-attendance-fetch';
const TOKEN_KEY = 'token_2';
const LAST_ATTENDANCE_KEY = 'last_attendance_marked';

/** Minimum allowed by both iOS and Android (15 min). */
const FETCH_INTERVAL_SECONDS = 15 * 60;

// ── Internal helpers ──────────────────────────────────────────────────────────

async function isAlreadyMarkedToday(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(LAST_ATTENDANCE_KEY);
  if (!raw) return false;
  const last = new Date(raw);
  const now = new Date();
  return (
    last.getDate() === now.getDate() &&
    last.getMonth() === now.getMonth() &&
    last.getFullYear() === now.getFullYear()
  );
}

function isWithinWorkingHours(): boolean {
  const now = new Date();
  const day = now.getDay();   // 0=Sun … 6=Sat
  const hour = now.getHours();
  return day >= 1 && day <= 5 && hour >= 8 && hour < 12;
}

async function markAttendanceViaFetch(): Promise<BackgroundFetch.BackgroundFetchResult> {
  // Skip outside working hours
  if (!isWithinWorkingHours()) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  // Skip if already marked today (prevents duplicate records)
  if (await isAlreadyMarkedToday()) {
    console.log('[BgFetch] Attendance already marked today');
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }

  // Auth token
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }

  // Check work status (leave / holiday)
  try {
    const statusRes = await fetch(`${BACKEND_URL}/core/checkWorkStatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (statusData.data === false) {
        console.log('[BgFetch] Leave/holiday — skipping');
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }
    }
  } catch {
    // Non-critical — proceed with attendance attempt
  }

  // Get current location
  // Background fetch can use foreground location (no background permission needed
  // when the task is woken by the OS fetch timer, iOS still provides location
  // via the "location" background mode declared in app.json).
  let location: Location.LocationObject;
  try {
    location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  } catch (err) {
    console.error('[BgFetch] Could not get location:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }

  // Mark attendance
  try {
    const res = await fetch(`${BACKEND_URL}/core/markAutoAttendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
        source: 'background_fetch',
      }),
    });

    if (res.ok) {
      await AsyncStorage.setItem(LAST_ATTENDANCE_KEY, new Date().toISOString());
      console.log('[BgFetch] Attendance marked successfully');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    console.warn('[BgFetch] Backend rejected attendance:', res.status);
    return BackgroundFetch.BackgroundFetchResult.Failed;

  } catch (err) {
    console.error('[BgFetch] Network error:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
}

// ── Task definition ───────────────────────────────────────────────────────────
// Must be at module top-level so Expo's task runner can find it in a headless
// JS context without re-initializing the full React app.

TaskManager.defineTask(BACKGROUND_FETCH_TASK, markAttendanceViaFetch);

// ── BackgroundAttendanceService ───────────────────────────────────────────────

export const BackgroundAttendanceService = {

  /**
   * Register the background-fetch task.
   * Safe to call multiple times — skips if already registered.
   *
   * Does NOT request any location permissions (the OS wakes the app on its
   * own schedule; location is obtained inside the task).
   */
  async registerBackgroundFetchTask(): Promise<boolean> {
    try {
      const status = await BackgroundFetch.getStatusAsync();

      if (
        status === BackgroundFetch.BackgroundFetchStatus.Denied ||
        status === BackgroundFetch.BackgroundFetchStatus.Restricted
      ) {
        console.log('[BgFetch] Background fetch unavailable on this device');
        return false;
      }

      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      if (isRegistered) {
        console.log('[BgFetch] Already registered');
        return true;
      }

      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: FETCH_INTERVAL_SECONDS,
        stopOnTerminate: false,  // continue after app is killed
        startOnBoot: true,       // restart after device reboot
      });

      console.log('[BgFetch] Registered (interval: 15 min)');
      return true;

    } catch (err) {
      console.error('[BgFetch] Registration failed:', err);
      return false;
    }
  },

  /**
   * Unregister the background-fetch task.
   */
  async unregisterBackgroundFetchTask(): Promise<boolean> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
        console.log('[BgFetch] Unregistered');
      }
      return true;
    } catch (err) {
      console.error('[BgFetch] Unregister failed:', err);
      return false;
    }
  },

  /**
   * Stop all services managed by this module.
   * (Geofencing is stopped separately by GeofencingService.stop().)
   */
  async stop(): Promise<boolean> {
    return this.unregisterBackgroundFetchTask();
  },

  // ── Backward-compatible aliases ───────────────────────────────────────────
  // Dashboard.tsx may still call initialize() or initializeAll() from before
  // the refactor. These aliases forward to registerBackgroundFetchTask() so
  // the old call sites keep working without any Dashboard changes.

  /** @deprecated Use registerBackgroundFetchTask() directly. */
  async initialize(
    _showDisclosure?: () => Promise<boolean>,
  ): Promise<{ backgroundFetch: boolean; geofencing: boolean }> {
    const backgroundFetch = await this.registerBackgroundFetchTask();
    return { backgroundFetch, geofencing: false };
  },

  /** @deprecated Use registerBackgroundFetchTask() directly. */
  async initializeAll(
    _showDisclosure?: () => Promise<boolean>,
  ): Promise<{ backgroundFetch: boolean; geofencing: boolean }> {
    return this.initialize(_showDisclosure);
  },

  /** Diagnostic status for settings / debug screens. */
  async getStatus(): Promise<{
    fetchRegistered: boolean;
    fetchStatus: string;
    lastAttendance: string | null;
    isAuthenticated: boolean;
  }> {
    const fetchRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    const fetchStatusCode = await BackgroundFetch.getStatusAsync();
    const lastAttendance = await AsyncStorage.getItem(LAST_ATTENDANCE_KEY);
    const token = await AsyncStorage.getItem(TOKEN_KEY);

    const statusLabel = {
      [BackgroundFetch.BackgroundFetchStatus.Available]: 'Available',
      [BackgroundFetch.BackgroundFetchStatus.Denied]: 'Denied',
      [BackgroundFetch.BackgroundFetchStatus.Restricted]: 'Restricted',
    };

    return {
      fetchRegistered,
      fetchStatus: statusLabel[fetchStatusCode ?? BackgroundFetch.BackgroundFetchStatus.Denied] ?? 'Unknown',
      lastAttendance,
      isAuthenticated: !!token,
    };
  },
};