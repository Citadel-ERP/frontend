/**
 * src/services/geofencing.ts
 *
 * Event-driven attendance via Expo Location geofencing.
 * This is the SINGLE authoritative geofence service — do not define
 * duplicate geofence tasks anywhere else in the codebase.
 *
 * Google Play / Android compliance:
 *   ✅  Prominent disclosure shown before requestBackgroundPermissionsAsync
 *   ✅  Geofence radius ≥ 150 m (Google recommends 100–150 m minimum)
 *   ✅  Only ENTER events tracked (battery efficient)
 *   ✅  Working-hours guard prevents spurious triggers
 *   ✅  Re-registration handled externally on BOOT_COMPLETED
 *   ✅  Single task definition — no conflicts with other services
 *
 * Android 14 note:
 *   expo-location's startGeofencingAsync internally declares the required
 *   FOREGROUND_SERVICE_LOCATION type when the expo-location plugin is
 *   configured with isAndroidBackgroundLocationEnabled: true in app.json.
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AttendanceUtils } from './attendanceUtils';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Single canonical task name — must match across the entire codebase */
export const GEOFENCE_TASK_NAME = 'citadel-attendance-geofence';

const GEOFENCE_REGIONS_KEY = 'citadel_geofence_regions';
const LAST_GEOFENCE_TRIGGER_KEY = 'citadel_last_geofence_trigger';

/**
 * Google recommends 100–150 m as the minimum for reliable detection.
 * 150 m accounts for typical Wi-Fi location accuracy (20–50 m) plus
 * network-only accuracy (several hundred metres in poor conditions).
 */
const GEOFENCE_RADIUS_METERS = 150;

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeofencingEventData {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
}

interface SavedRegion {
  id: string;
  lat: number;
  lng: number;
  radius: number;
}

// ── Task definition ───────────────────────────────────────────────────────────
/**
 * IMPORTANT: TaskManager.defineTask must be called at module evaluation time
 * (top level), not inside a function or useEffect. Expo's task runner
 * re-evaluates this module in a headless JS context when the device wakes
 * the app for a geofence event.
 */
TaskManager.defineTask<GeofencingEventData>(
  GEOFENCE_TASK_NAME,
  async ({ data, error }) => {
    if (error) {
      console.error('[Geofence] Task error:', error.message);
      return;
    }

    if (!data) {
      console.warn('[Geofence] No event data received');
      return;
    }

    const { eventType, region } = data;

    // We only care about ENTER events
    if (eventType !== Location.GeofencingEventType.Enter) {
      return;
    }

    console.log('[Geofence] ENTER event for region:', region.identifier);

    // ── Guard: working hours ────────────────────────────────────────────────
    if (!AttendanceUtils.isWithinWorkingHours()) {
      console.log('[Geofence] Outside working hours — skipping');
      return;
    }

    // ── Guard: prevent duplicate triggers within 60 s ───────────────────────
    const lastTrigger = await AsyncStorage.getItem(LAST_GEOFENCE_TRIGGER_KEY);
    if (lastTrigger) {
      const elapsed = Date.now() - Number(lastTrigger);
      if (elapsed < 60_000) {
        console.log('[Geofence] Triggered too recently — skipping');
        return;
      }
    }
    await AsyncStorage.setItem(LAST_GEOFENCE_TRIGGER_KEY, String(Date.now()));

    // ── Execute attendance flow ─────────────────────────────────────────────
    console.log('[Geofence] Executing attendance flow…');
    const success = await AttendanceUtils.executeAttendanceFlow(
      'geofence',
      false, // no UI alert from background context
    );

    console.log(success
      ? '[Geofence] Attendance marked successfully'
      : '[Geofence] Attendance marking failed or already marked',
    );
  },
);

// ── GeofencingService ─────────────────────────────────────────────────────────

export class GeofencingService {
  /**
   * Initialize geofencing.
   *
   * Flow:
   *   1. Check foreground permission (must be granted; user already approved this)
   *   2. Check background permission
   *      a. Already granted → skip disclosure
   *      b. Not granted → call showDisclosure() first, then requestBackgroundPermissionsAsync
   *   3. Fetch office locations from backend
   *   4. Register geofence regions
   *
   * @param showDisclosure  Async callback that displays the prominent-disclosure
   *                        modal and resolves with true (accepted) / false (declined).
   *                        Required when background permission is not yet granted.
   */
  static async initialize(
    showDisclosure?: () => Promise<boolean>,
  ): Promise<boolean> {
    try {
      console.log('[Geofence] Initializing…');

      // ── 1. Foreground permission must already be granted ────────────────
      const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        console.warn('[Geofence] Foreground location not granted — cannot initialize');
        return false;
      }

      // ── 2. Background permission ────────────────────────────────────────
      const bgGranted = await GeofencingService.ensureBackgroundPermission(
        showDisclosure,
      );
      if (!bgGranted) {
        console.log('[Geofence] Background location not available — geofencing disabled');
        return false;
      }

      // ── 3. Fetch office locations ───────────────────────────────────────
      const token = await AttendanceUtils.getToken();
      if (!token) {
        console.warn('[Geofence] No auth token — skipping');
        return false;
      }

      const offices = await AttendanceUtils.getOfficeLocations(token);
      if (!offices || offices.length === 0) {
        console.warn('[Geofence] No office locations returned — geofencing disabled');
        return false;
      }

      // ── 4. Build region list ────────────────────────────────────────────
      const regions: Location.LocationRegion[] = offices.map(office => ({
        identifier: office.id,
        latitude: office.latitude,
        longitude: office.longitude,
        radius: GEOFENCE_RADIUS_METERS,
        notifyOnEnter: true,
        notifyOnExit: false, // exit detection not needed for attendance
      }));

      console.log(`[Geofence] Setting up ${regions.length} region(s) with radius ${GEOFENCE_RADIUS_METERS} m`);

      // ── 5. Stop existing task before (re-)registering ───────────────────
      const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
      if (isRegistered) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
        console.log('[Geofence] Stopped previous registration');
      }

      // ── 6. Start geofencing ─────────────────────────────────────────────
      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);

      // ── 7. Persist region metadata for diagnostics / boot re-register ───
      const savedRegions: SavedRegion[] = regions.map(r => ({
        id: r.identifier!,
        lat: r.latitude,
        lng: r.longitude,
        radius: r.radius,
      }));
      await AsyncStorage.setItem(
        GEOFENCE_REGIONS_KEY,
        JSON.stringify(savedRegions),
      );

      console.log('[Geofence] Initialized successfully');
      return true;

    } catch (err) {
      console.error('[Geofence] Initialization failed:', err);
      return false;
    }
  }

  /**
   * Stop geofencing and clean up.
   */
  static async stop(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
      if (isRegistered) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
        console.log('[Geofence] Stopped');
      }
    } catch (err) {
      console.error('[Geofence] Stop failed:', err);
    }
  }

  /**
   * Refresh geofence regions — e.g. when office locations change in the backend.
   * Stops the existing task and re-initializes.
   */
  static async refresh(showDisclosure?: () => Promise<boolean>): Promise<boolean> {
    console.log('[Geofence] Refreshing regions…');
    await GeofencingService.stop();
    return GeofencingService.initialize(showDisclosure);
  }

  /**
   * Re-register geofences using persisted region data.
   * Called after device reboot (BOOT_COMPLETED) or after app reinstall.
   * Does NOT show disclosure — background permission must already be granted.
   */
  static async reRegisterAfterBoot(): Promise<boolean> {
    try {
      console.log('[Geofence] Re-registering after boot…');

      const bgStatus = (await Location.getBackgroundPermissionsAsync()).status;
      if (bgStatus !== 'granted') {
        console.log('[Geofence] Background permission not granted — cannot re-register');
        return false;
      }

      const raw = await AsyncStorage.getItem(GEOFENCE_REGIONS_KEY);
      if (!raw) {
        console.log('[Geofence] No saved regions — cannot re-register');
        return false;
      }

      const savedRegions: SavedRegion[] = JSON.parse(raw);
      const regions: Location.LocationRegion[] = savedRegions.map(r => ({
        identifier: r.id,
        latitude: r.lat,
        longitude: r.lng,
        radius: r.radius,
        notifyOnEnter: true,
        notifyOnExit: false,
      }));

      const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
      if (isRegistered) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      }

      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
      console.log(`[Geofence] Re-registered ${regions.length} region(s) after boot`);
      return true;

    } catch (err) {
      console.error('[Geofence] Boot re-registration failed:', err);
      return false;
    }
  }

  /** True if the geofence task is currently registered. */
  static async isRunning(): Promise<boolean> {
    try {
      return TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
    } catch {
      return false;
    }
  }

  /** Diagnostic info for settings/debug screens. */
  static async getStatus(): Promise<{
    isRunning: boolean;
    regionCount: number;
    regions: SavedRegion[] | null;
    backgroundPermission: boolean;
  }> {
    const isRunning = await GeofencingService.isRunning();
    const raw = await AsyncStorage.getItem(GEOFENCE_REGIONS_KEY);
    const regions: SavedRegion[] | null = raw ? JSON.parse(raw) : null;
    const { status } = await Location.getBackgroundPermissionsAsync();

    return {
      isRunning,
      regionCount: regions?.length ?? 0,
      regions,
      backgroundPermission: status === 'granted',
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Ensure background location permission is granted.
   * Shows disclosure if permission is not yet granted and a callback is provided.
   */
  private static async ensureBackgroundPermission(
    showDisclosure?: () => Promise<boolean>,
  ): Promise<boolean> {
    const { status } = await Location.getBackgroundPermissionsAsync();

    if (status === 'granted') {
      return true; // already granted — no disclosure needed
    }

    if (!showDisclosure) {
      console.warn(
        '[Geofence] Background location not granted and no showDisclosure provided. ' +
        'Pass showDisclosure to GeofencingService.initialize() to comply with Google Play policy.',
      );
      return false;
    }

    // ── Mandatory prominent disclosure before system permission dialog ──────
    const accepted = await showDisclosure();
    if (!accepted) {
      console.log('[Geofence] User declined background location disclosure');
      return false;
    }

    // ── System permission request (must come AFTER disclosure) ──────────────
    const { status: newStatus } = await Location.requestBackgroundPermissionsAsync();
    if (newStatus !== 'granted') {
      console.log('[Geofence] Background permission denied at system level');
      return false;
    }

    return true;
  }
}