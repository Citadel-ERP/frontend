/**
 * useCreateSiteDraft.ts
 *
 * Custom React hook that wires the siteDraftManager to the CreateSite form.
 *
 * Responsibilities:
 *  1. On mount — check for an existing draft and surface it to the caller.
 *  2. On form change — debounce writes to AsyncStorage (500 ms default) to
 *     avoid hammering I/O on every keystroke.
 *  3. On completion — delete the draft immediately.
 *  4. Expose helpers so the UI can show "draft detected" prompts and let the
 *     user choose to restore or discard.
 *
 * Design notes:
 *  - The hook never mutates form state; it is purely a persistence side-effect.
 *    Form state lives in CreateSite and is passed in via `currentDraftData`.
 *  - The debounce timer is cancelled on unmount to prevent memory leaks and
 *    stale-closure writes after the component is gone.
 *  - `isSaving` is exposed so the UI can optionally show a subtle "saving…"
 *    indicator without blocking user interaction.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  saveDraft,
  loadDraft,
  deleteDraft,
  getDraftMeta,
  SiteDraftData,
  draftTimeRemainingMs,
} from './siteDraftManager';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseDraftOptions {
  /** How long (ms) to wait after the last change before writing to storage. */
  debounceMs?: number;
  /** Called once on mount when a valid draft is found. */
  onDraftDetected?: (draft: SiteDraftData, savedAt: number) => void;
}

export interface UseDraftReturn {
  /** True while a save is in-flight. */
  isSaving: boolean;
  /** True if a draft was detected on mount and has not yet been acted upon. */
  draftDetected: boolean;
  /** The raw draft data detected on mount (null after restore/discard). */
  detectedDraft: SiteDraftData | null;
  /** ms remaining before the detected draft expires (0 = already expired). */
  draftExpiresInMs: number;
  /** Restore the detected draft into the form. Returns the draft data. */
  restoreDraft: () => SiteDraftData | null;
  /** Discard the detected draft and start fresh. */
  discardDraft: () => Promise<void>;
  /** Call this when the site is successfully created. Deletes the draft. */
  onSiteCreated: () => Promise<void>;
  /** Manually trigger a save (useful for programmatic saves outside debounce). */
  saveNow: (data: SiteDraftData) => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param currentDraftData - The live form state to persist. Pass the assembled
 *   SiteDraftData object. The hook watches it via a ref so the debounce closure
 *   always captures the latest value without re-registering the timer.
 * @param options - Optional configuration (debounce interval, callbacks).
 */
export function useCreateSiteDraft(
  currentDraftData: SiteDraftData,
  options: UseDraftOptions = {},
): UseDraftReturn {
  const { debounceMs = 500, onDraftDetected } = options;

  // ── State ────────────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [draftDetected, setDraftDetected] = useState(false);
  const [detectedDraft, setDetectedDraft] = useState<SiteDraftData | null>(null);
  const [draftExpiresInMs, setDraftExpiresInMs] = useState(0);

  // ── Refs ─────────────────────────────────────────────────────────────────────

  /** Always holds the latest form data — avoids stale closures in debounce. */
  const latestDataRef = useRef<SiteDraftData>(currentDraftData);

  /** The debounce timer handle. */
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Set to true once the user has acted on the draft prompt (restore/discard). */
  const draftResolvedRef = useRef(false);

  /** Set to true once the component mounts; prevents saves before mount check. */
  const mountedRef = useRef(false);

  // Keep latestDataRef in sync with caller's form state.
  useEffect(() => {
    latestDataRef.current = currentDraftData;
  });

  // ── Mount: check for existing draft ──────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const checkForDraft = async () => {
      const meta = await getDraftMeta();
      if (cancelled) return;

      if (meta) {
        const draft = await loadDraft();
        if (cancelled || !draft) return;

        const expiresIn = draftTimeRemainingMs(meta.savedAt);
        setDetectedDraft(draft);
        setDraftExpiresInMs(expiresIn);
        setDraftDetected(true);
        onDraftDetected?.(draft, meta.savedAt);
      }

      // Allow auto-save only after the mount check completes.
      mountedRef.current = true;
    };

    checkForDraft();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally runs once

  // ── Auto-save with debounce ───────────────────────────────────────────────────

  useEffect(() => {
    // Do not auto-save until the mount draft-check is done and the user has
    // resolved the "restore / discard" prompt (or there was no draft).
    if (!mountedRef.current) return;
    if (draftDetected && !draftResolvedRef.current) return;

    // Clear any pending timer.
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    // Schedule a new write after the debounce interval.
    debounceTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await saveDraft(latestDataRef.current);
      } finally {
        setIsSaving(false);
      }
    }, debounceMs);

    // Cleanup: cancel the timer if the component unmounts mid-debounce.
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDraftData, draftDetected, debounceMs]);
  // NOTE: we include `currentDraftData` (not just its ref) so the effect
  // re-runs whenever the form changes, which is what schedules the debounce.

  // ── Public API ────────────────────────────────────────────────────────────────

  /**
   * Returns the detected draft data so the caller can hydrate the form.
   * Marks the draft prompt as resolved so auto-save begins.
   */
  const restoreDraft = useCallback((): SiteDraftData | null => {
    draftResolvedRef.current = true;
    setDraftDetected(false);
    const draft = detectedDraft;
    setDetectedDraft(null);
    return draft;
  }, [detectedDraft]);

  /**
   * Deletes the draft from storage and marks the prompt as resolved.
   * Auto-save will begin writing fresh data from the next form change.
   */
  const discardDraft = useCallback(async (): Promise<void> => {
    draftResolvedRef.current = true;
    setDraftDetected(false);
    setDetectedDraft(null);
    await deleteDraft();
  }, []);

  /**
   * Must be called when the site is successfully created.
   * Cancels any pending debounced write and deletes the draft immediately
   * so no stale data remains.
   */
  const onSiteCreated = useCallback(async (): Promise<void> => {
    // Cancel any pending write — the form is done.
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await deleteDraft();
  }, []);

  /**
   * Immediately persists the current form state, bypassing the debounce.
   * Useful for saving before navigating away (e.g. on back-press).
   */
  const saveNow = useCallback(async (data: SiteDraftData): Promise<void> => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setIsSaving(true);
    try {
      await saveDraft(data);
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    isSaving,
    draftDetected,
    detectedDraft,
    draftExpiresInMs,
    restoreDraft,
    discardDraft,
    onSiteCreated,
    saveNow,
  };
}