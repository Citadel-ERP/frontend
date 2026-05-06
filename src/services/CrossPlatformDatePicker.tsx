/**
 * CrossPlatformDatePicker
 *
 * A production-ready, cross-platform date picker that resolves the fundamental
 * incompatibility of @react-native-community/datetimepicker on web.
 *
 * Platform strategy:
 *   - web     → native <input type="date"> (zero dependency, full browser support)
 *   - iOS     → DateTimePicker inside a bottom-sheet Modal (spinner style)
 *   - Android → DateTimePicker rendered inline (system date dialog)
 *
 * All platforms emit dates in YYYY-MM-DD format via the `onChange` callback.
 */

import React, { useState } from 'react';
import {
  Platform,
  TouchableOpacity,
  Text,
  View,
  Modal,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

// ─── Lazy-require so the native module is never evaluated on web ──────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  // This require only executes on native — the bundler tree-shakes it on web
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "2024-03-15"  →  Date object at midnight local time */
const parseDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  // Append T00:00:00 so that the Date is treated as local midnight, not UTC
  const d = new Date(`${dateString}T00:00:00`);
  return isNaN(d.getTime()) ? new Date() : d;
};

/** Date  →  "YYYY-MM-DD" */
const toYMD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** "YYYY-MM-DD" or ISO string  →  "DD/MM/YYYY" for display */
const toDisplayDate = (dateString: string): string => {
  if (!dateString) return '';
  const d = parseDate(dateString.split('T')[0]); // handle full ISO strings too
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-GB');
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CrossPlatformDatePickerProps {
  /** Current value in YYYY-MM-DD format (or empty string) */
  value: string;
  /** Called with YYYY-MM-DD string on change */
  onChange: (dateString: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  /** Tint colour for icons and action buttons */
  accentColor?: string;
  /** Additional styles for the trigger button / web wrapper */
  buttonStyle?: ViewStyle;
  /** Additional styles for the displayed date text */
  textStyle?: TextStyle;
  /** Accessibility label — also used as a unique ID for the web input */
  accessibilityLabel?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const CrossPlatformDatePicker: React.FC<CrossPlatformDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
  accentColor = '#008069',
  buttonStyle,
  textStyle,
  accessibilityLabel,
}) => {
  // iOS only: track a "draft" date while the spinner is open.
  // We only commit it when the user taps "Done".
  const [draftDate, setDraftDate] = useState<Date>(parseDate(value));
  const [showPicker, setShowPicker] = useState(false);

  const minAttr = minimumDate ? toYMD(minimumDate) : undefined;
  const maxAttr = maximumDate ? toYMD(maximumDate) : undefined;

  // Stable DOM id derived from the accessibilityLabel (fallback to random)
  const inputId = `date-input-${accessibilityLabel ?? Math.random().toString(36).slice(2)}`;

  // ── Web ─────────────────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      /*
       * position: 'relative' on the wrapper so the transparent overlay can be
       * absolutely positioned to cover the entire button area.
       */
      <View
        style={[s.button, buttonStyle, { position: 'relative' }]}
        accessibilityLabel={accessibilityLabel}
      >
        <MaterialIcons name="event" size={20} color={accentColor} />

        {/*
         * The actual <input type="date">.
         * Visually invisible — the parent View provides all styling.
         * The `id` is used by the overlay click handler to call showPicker().
         */}
        <input
          id={inputId}
          type="date"
          value={value || ''}
          min={minAttr}
          max={maxAttr}
          aria-label={accessibilityLabel || placeholder}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.value) onChange(e.target.value);
          }}
          style={webInputStyle}
        />

        <Ionicons name="chevron-down" size={20} color="#666" />

        {/*
         * Transparent full-cover overlay.
         * Clicking anywhere on the button row (text, icons, empty space) will
         * programmatically open the browser's native date picker via
         * showPicker() (modern API) with a fallback to .click().
         *
         * zIndex: 1 ensures the overlay sits above the sibling elements so
         * clicks are intercepted; the actual value change still flows through
         * the <input>'s onChange above.
         */}
        <div
          onClick={() => {
            const input = document.getElementById(inputId) as HTMLInputElement | null;
            if (input) {
              if (typeof input.showPicker === 'function') {
                input.showPicker();
              } else {
                input.click();
              }
            }
          }}
          style={webOverlayStyle}
          aria-hidden="true"
        />
      </View>
    );
  }

  // ── Android ─────────────────────────────────────────────────────────────────
  if (Platform.OS === 'android') {
    return (
      <>
        <TouchableOpacity
          style={[s.button, buttonStyle]}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.7}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
        >
          <MaterialIcons name="event" size={20} color={accentColor} />
          <Text style={[s.buttonText, !value && s.placeholder, textStyle]}>
            {value ? toDisplayDate(value) : placeholder}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>

        {showPicker && DateTimePicker && (
          <DateTimePicker
            value={parseDate(value)}
            mode="date"
            display="default"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(event: { type: string }, selectedDate?: Date) => {
              setShowPicker(false);
              if (event.type === 'set' && selectedDate) {
                onChange(toYMD(selectedDate));
              }
            }}
          />
        )}
      </>
    );
  }

  // ── iOS ──────────────────────────────────────────────────────────────────────
  const handleIOSDone = () => {
    onChange(toYMD(draftDate));
    setShowPicker(false);
  };

  const handleIOSCancel = () => {
    // Reset draft so next open starts from committed value
    setDraftDate(parseDate(value));
    setShowPicker(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[s.button, buttonStyle]}
        onPress={() => {
          setDraftDate(parseDate(value));
          setShowPicker(true);
        }}
        activeOpacity={0.7}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        <MaterialIcons name="event" size={20} color={accentColor} />
        <Text style={[s.buttonText, !value && s.placeholder, textStyle]}>
          {value ? toDisplayDate(value) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={handleIOSCancel}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={s.iosBackdrop}
          activeOpacity={1}
          onPress={handleIOSCancel}
        />
        <View style={s.iosSheet}>
          {/* Header bar */}
          <View style={s.iosHeader}>
            <TouchableOpacity
              onPress={handleIOSCancel}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={s.iosCancelText}>Cancel</Text>
            </TouchableOpacity>

            <Text style={s.iosTitle}>Select Date</Text>

            <TouchableOpacity
              onPress={handleIOSDone}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[s.iosDoneText, { color: accentColor }]}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Spinner */}
          {DateTimePicker && (
            <DateTimePicker
              value={draftDate}
              mode="date"
              display="spinner"
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              textColor="#1A1A1A"
              onChange={(_: unknown, selected?: Date) => {
                if (selected) setDraftDate(selected);
              }}
            />
          )}
        </View>
      </Modal>
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  buttonText: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
  },
  placeholder: {
    color: '#999',
  },

  // iOS bottom-sheet
  iosBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  iosSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // safe-area bottom on newer iPhones
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 20,
  },
  iosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  iosTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  iosCancelText: {
    fontSize: 16,
    color: '#888',
  },
  iosDoneText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

/**
 * Web-only inline style for the <input type="date"> element.
 * Typed as React.CSSProperties for correctness; cast needed because
 * vendor-prefixed properties like WebkitAppearance are not in the
 * React Native StyleSheet type system.
 */
const webInputStyle: React.CSSProperties = {
  flex: 1,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: '15px',
  color: '#1A1A1A',
  fontFamily: 'inherit',
  cursor: 'pointer',
  padding: '0 4px',
  minWidth: 0,
  // Remove default browser chrome on some platforms
  WebkitAppearance: 'none',
  MozAppearance: 'textfield',
} as React.CSSProperties;

/**
 * Web-only inline style for the transparent overlay <div>.
 * Covers the entire button area so clicks anywhere open the date picker,
 * not just on the browser's native calendar icon inside the input.
 */
const webOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  cursor: 'pointer',
  zIndex: 1,
};

export default CrossPlatformDatePicker;