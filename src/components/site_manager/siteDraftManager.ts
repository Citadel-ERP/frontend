import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Storage key. Namespaced to avoid collisions with other features. */
export const DRAFT_STORAGE_KEY = 'site_manager:create_site_draft:v1';

/**
 * How long a draft is considered valid after its last update.
 * Using 1 hour as specified in the requirements.
 */
export const DRAFT_TTL_MS = 60 * 60 * 1000; // 1 hour

// ─── Types ────────────────────────────────────────────────────────────────────

/** The shape of a single chip-list field (floor-wise area, total area, etc.). */
export type ChipEntries = string[];

/** All form state that should be persisted in the draft. */
export interface SiteDraftData {
  // Step 0
  siteType: 'managed' | 'conventional' | 'for_sale' | null;

  // Step 1 – Basic information
  newSite: Record<string, any>;

  // Step 2 – Property specs (chip-based fields)
  floorWiseAreaEntries: ChipEntries;
  totalAreaEntries: ChipEntries;
  numberOfUnitsEntries: ChipEntries;
  seatsPerUnitEntries: ChipEntries;

  // Step 3 – Commercial
  customFloorCondition: string;
  customBuildingStatus: string;
  rentalEscalationPercentage: string;
  rentalEscalationValue: string;
  rentalEscalationPeriod: 'year' | 'month';

  // Step 4 – Metro
  selectedMetroStation: { id: number; name: string; city: string } | null;
  customMetroStation: string;

  // Step 5 – Other amenities
  otherAmenities: Array<{ id: string; key: string; value: string }>;

  // Navigation state (restore to correct step)
  currentStep: number;

  /**
   * Photos are intentionally excluded from the draft.
   * Local file URIs are ephemeral and may be invalidated between sessions;
   * persisting them would cause broken image references.
   */
}

/** The envelope stored in AsyncStorage. */
interface DraftEnvelope {
  data: SiteDraftData;
  /** Unix timestamp (ms) of the last save. Used for TTL validation. */
  savedAt: number;
  /** Incremented on every save; useful for debugging / multi-tab awareness. */
  version: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the envelope has not yet exceeded DRAFT_TTL_MS.
 * Pure function — easy to unit-test.
 */
export function isDraftFresh(savedAt: number, now: number = Date.now()): boolean {
  return now - savedAt < DRAFT_TTL_MS;
}

/**
 * Returns the time remaining (in ms) before a draft expires.
 * Returns 0 if already expired.
 */
export function draftTimeRemainingMs(savedAt: number, now: number = Date.now()): number {
  return Math.max(0, DRAFT_TTL_MS - (now - savedAt));
}

// ─── Core API ─────────────────────────────────────────────────────────────────

/**
 * Persists the current draft to AsyncStorage.
 *
 * Idempotent — calling this multiple times with the same data is safe.
 * The `version` counter makes it possible to detect concurrent writes in a
 * multi-tab scenario (though React Native typically runs one JS context).
 *
 * @returns true on success, false on storage failure.
 */
export async function saveDraft(data: SiteDraftData): Promise<boolean> {
  try {
    // Read current version to increment it (optimistic counter).
    let currentVersion = 0;
    try {
      const existing = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (existing) {
        const parsed: DraftEnvelope = JSON.parse(existing);
        currentVersion = parsed.version ?? 0;
      }
    } catch {
      // Ignore read errors; we'll overwrite with version 1.
    }

    const envelope: DraftEnvelope = {
      data,
      savedAt: Date.now(),
      version: currentVersion + 1,
    };

    await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(envelope));
    return true;
  } catch (error) {
    // Storage quota exceeded, serialisation failure, etc.
    console.warn('[siteDraftManager] Failed to save draft:', error);
    return false;
  }
}

/**
 * Loads the draft from AsyncStorage.
 *
 * Returns null in all failure cases:
 *  - No draft exists
 *  - Draft is corrupted / unparseable
 *  - Draft has expired (TTL exceeded)
 *
 * Expired drafts are cleaned up automatically to prevent stale data.
 */
export async function loadDraft(): Promise<SiteDraftData | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;

    let envelope: DraftEnvelope;
    try {
      envelope = JSON.parse(raw);
    } catch {
      // Corrupted data — clean up silently.
      console.warn('[siteDraftManager] Corrupted draft detected; discarding.');
      await deleteDraft();
      return null;
    }

    // Validate envelope shape before trusting its contents.
    if (
      !envelope ||
      typeof envelope.savedAt !== 'number' ||
      !envelope.data ||
      typeof envelope.data !== 'object'
    ) {
      console.warn('[siteDraftManager] Invalid draft envelope; discarding.');
      await deleteDraft();
      return null;
    }

    // TTL check — expired drafts must not be restored.
    if (!isDraftFresh(envelope.savedAt)) {
      console.info('[siteDraftManager] Draft expired; discarding.');
      await deleteDraft();
      return null;
    }

    return envelope.data;
  } catch (error) {
    console.warn('[siteDraftManager] Failed to load draft:', error);
    return null;
  }
}

/**
 * Reads the raw envelope metadata (savedAt, version) without parsing the full
 * data payload. Useful for showing "last saved X minutes ago" UI without the
 * cost of hydrating the entire form state.
 */
export async function getDraftMeta(): Promise<{ savedAt: number; version: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const envelope: DraftEnvelope = JSON.parse(raw);
    if (typeof envelope.savedAt !== 'number') return null;
    if (!isDraftFresh(envelope.savedAt)) {
      await deleteDraft();
      return null;
    }
    return { savedAt: envelope.savedAt, version: envelope.version };
  } catch {
    return null;
  }
}

/**
 * Permanently deletes the draft.
 *
 * Must be called:
 *  1. When the user explicitly discards the draft ("Start Fresh").
 *  2. Immediately after the site is successfully created.
 *
 * @returns true on success, false on storage failure.
 */
export async function deleteDraft(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
    return true;
  } catch (error) {
    console.warn('[siteDraftManager] Failed to delete draft:', error);
    return false;
  }
}

/**
 * Checks whether a non-expired draft exists without loading its full payload.
 * Prefer this over `loadDraft()` when you only need a boolean gate.
 */
export async function hasDraft(): Promise<boolean> {
  return (await getDraftMeta()) !== null;
}