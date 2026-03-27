// hr_employee_management/exemptionModal.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import { WHATSAPP_COLORS } from './constants';
import { styles as globalStyles } from './styles';
import alert from '../../utils/Alert';

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

type ExemptionType = 'attendance' | 'geofence';
type ScheduleType = 'ALL_DAYS' | 'DAYS_OF_WEEK' | 'SPECIFIC_DATES';
type ModalMode = 'view' | 'add' | 'edit';

interface Exemption {
  id: number;
  schedule_type: ScheduleType;
  days_of_week: number[];
  specific_dates: string[];
  created_at: string;
  updated_at: string;
}

interface ExemptionModalProps {
  visible: boolean;
  onClose: () => void;
  exemptionType: ExemptionType;
  employeeId: string;
  token: string;
  onSuccess?: () => void;
}

const DAYS_OF_WEEK = [
  { label: 'Mon', value: 0 },
  { label: 'Tue', value: 1 },
  { label: 'Wed', value: 2 },
  { label: 'Thu', value: 3 },
  { label: 'Fri', value: 4 },
  { label: 'Sat', value: 5 },
  { label: 'Sun', value: 6 },
];

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

const formatIsoForDisplay = (iso: string): string => {
  const [y, m, d] = iso.split('-');
  return `${d} ${MONTHS[parseInt(m) - 1]} ${y}`;
};

const scheduleLabel = (exemption: Exemption): string => {
  switch (exemption.schedule_type) {
    case 'ALL_DAYS':
      return 'Everyday';
    case 'DAYS_OF_WEEK':
      return exemption.days_of_week
        .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label)
        .join(', ');
    case 'SPECIFIC_DATES':
      return exemption.specific_dates.map(formatIsoForDisplay).join(', ');
    default:
      return '—';
  }
};

const scheduleIcon = (type: ScheduleType): string => {
  switch (type) {
    case 'ALL_DAYS': return 'infinite-outline';
    case 'DAYS_OF_WEEK': return 'repeat-outline';
    case 'SPECIFIC_DATES': return 'calendar-outline';
  }
};

// ─────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────

const Chip: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
  variant?: 'day' | 'date';
}> = ({ label, selected, onPress, variant = 'day' }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={[
      localStyles.chip,
      variant === 'date' && localStyles.chipDate,
      selected && localStyles.chipSelected,
    ]}
  >
    <Text style={[localStyles.chipText, selected && localStyles.chipTextSelected]}>
      {label}
    </Text>
    {selected && variant === 'date' && (
      <TouchableOpacity
        onPress={onPress}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={{ marginLeft: 4 }}
      >
        <Ionicons name="close-circle" size={14} color="#fff" />
      </TouchableOpacity>
    )}
  </TouchableOpacity>
);

const ScheduleOption: React.FC<{
  selected: boolean;
  onPress: () => void;
  icon: string;
  title: string;
  description: string;
}> = ({ selected, onPress, icon, title, description }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={[localStyles.scheduleCard, selected && localStyles.scheduleCardSelected]}
  >
    <View style={[localStyles.scheduleIconWrap, selected && localStyles.scheduleIconWrapSelected]}>
      <Ionicons name={icon as any} size={20} color={selected ? '#fff' : WHATSAPP_COLORS.textSecondary} />
    </View>
    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={[localStyles.scheduleTitle, selected && localStyles.scheduleTitleSelected]}>
        {title}
      </Text>
      <Text style={localStyles.scheduleDesc}>{description}</Text>
    </View>
    <View style={[localStyles.radioOuter, selected && localStyles.radioOuterSelected]}>
      {selected && <View style={localStyles.radioInner} />}
    </View>
  </TouchableOpacity>
);

const DatePicker: React.FC<{
  selectedDates: string[];
  onToggle: (isoDate: string) => void;
}> = ({ selectedDates, onToggle }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const isoDate = (day: number) => `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View style={localStyles.calendarWrap}>
      <View style={localStyles.calendarNav}>
        <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={20} color={WHATSAPP_COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={localStyles.calendarMonthLabel}>
          {MONTHS[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={localStyles.calendarDayHeaders}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <Text key={d} style={localStyles.calendarDayHeader}>{d}</Text>
        ))}
      </View>
      <View style={localStyles.calendarGrid}>
        {cells.map((day, idx) => {
          if (day === null) return <View key={`e-${idx}`} style={localStyles.calendarCell} />;
          const iso = isoDate(day);
          const isSelected = selectedDates.includes(iso);
          return (
            <TouchableOpacity
              key={iso}
              onPress={() => onToggle(iso)}
              activeOpacity={0.7}
              style={[localStyles.calendarCell, isSelected && localStyles.calendarCellSelected]}
            >
              <Text style={[localStyles.calendarDayText, isSelected && localStyles.calendarDayTextSelected]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
//  Existing exemption card
// ─────────────────────────────────────────────

const ExemptionCard: React.FC<{
  exemption: Exemption;
  onEdit: (e: Exemption) => void;
  onDelete: (id: number) => void;
  deleting: boolean;
  accentColor: string;
}> = ({ exemption, onEdit, onDelete, deleting, accentColor }) => (
  <View style={localStyles.exemptionCard}>
    <View style={[localStyles.exemptionCardIconWrap, { backgroundColor: accentColor + '18' }]}>
      <Ionicons name={scheduleIcon(exemption.schedule_type) as any} size={20} color={accentColor} />
    </View>

    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={localStyles.exemptionCardType}>
        {exemption.schedule_type === 'ALL_DAYS'
          ? 'Everyday'
          : exemption.schedule_type === 'DAYS_OF_WEEK'
            ? 'Days of Week'
            : 'Specific Dates'}
      </Text>
      <Text style={localStyles.exemptionCardDetail} numberOfLines={2}>
        {scheduleLabel(exemption)}
      </Text>
    </View>

    <View style={localStyles.exemptionCardActions}>
      <TouchableOpacity
        onPress={() => onEdit(exemption)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[localStyles.exemptionCardActionBtn, { marginRight: 4 }]}
      >
        <Ionicons name="pencil-outline" size={18} color={WHATSAPP_COLORS.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onDelete(exemption.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={localStyles.exemptionCardActionBtn}
        disabled={deleting}
      >
        {deleting
          ? <ActivityIndicator size="small" color="#D32F2F" />
          : <Ionicons name="trash-outline" size={18} color="#D32F2F" />
        }
      </TouchableOpacity>
    </View>
  </View>
);

// ─────────────────────────────────────────────
//  Form — shared between add and edit
// ─────────────────────────────────────────────

const ExemptionForm: React.FC<{
  scheduleType: ScheduleType;
  selectedDays: number[];
  selectedDates: string[];
  onScheduleTypeChange: (t: ScheduleType) => void;
  onToggleDay: (d: number) => void;
  onToggleDate: (iso: string) => void;
  onClearDates: () => void;
}> = ({
  scheduleType, selectedDays, selectedDates,
  onScheduleTypeChange, onToggleDay, onToggleDate, onClearDates,
}) => (
  <View>
    <Text style={localStyles.sectionLabel}>Exemption Schedule</Text>

    <ScheduleOption
      selected={scheduleType === 'ALL_DAYS'}
      onPress={() => onScheduleTypeChange('ALL_DAYS')}
      icon="infinite-outline"
      title="Everyday"
      description="Permanently exempt — applies to all days"
    />
    <ScheduleOption
      selected={scheduleType === 'DAYS_OF_WEEK'}
      onPress={() => onScheduleTypeChange('DAYS_OF_WEEK')}
      icon="repeat-outline"
      title="Specific Days of the Week"
      description="Repeats weekly on selected days"
    />
    <ScheduleOption
      selected={scheduleType === 'SPECIFIC_DATES'}
      onPress={() => onScheduleTypeChange('SPECIFIC_DATES')}
      icon="calendar-outline"
      title="Specific Dates"
      description="One-off exemption on selected calendar dates"
    />

    {scheduleType === 'DAYS_OF_WEEK' && (
      <View style={localStyles.subSection}>
        <Text style={localStyles.subSectionLabel}>Select days</Text>
        <View style={localStyles.daysRow}>
          {DAYS_OF_WEEK.map(({ label, value }) => (
            <Chip
              key={value}
              label={label}
              selected={selectedDays.includes(value)}
              onPress={() => onToggleDay(value)}
            />
          ))}
        </View>
        {selectedDays.length > 0 && (
          <Text style={localStyles.selectionSummary}>
            {selectedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ')} selected
          </Text>
        )}
      </View>
    )}

    {scheduleType === 'SPECIFIC_DATES' && (
      <View style={localStyles.subSection}>
        <Text style={localStyles.subSectionLabel}>Select dates</Text>
        <DatePicker selectedDates={selectedDates} onToggle={onToggleDate} />
        {selectedDates.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <View style={localStyles.selectedDatesHeader}>
              <Text style={localStyles.subSectionLabel}>Selected ({selectedDates.length})</Text>
              <TouchableOpacity onPress={onClearDates}>
                <Text style={localStyles.clearAll}>Clear all</Text>
              </TouchableOpacity>
            </View>
            <View style={localStyles.datesChipWrap}>
              {selectedDates.map((iso) => (
                <Chip
                  key={iso}
                  label={formatIsoForDisplay(iso)}
                  selected={true}
                  onPress={() => onToggleDate(iso)}
                  variant="date"
                />
              ))}
            </View>
          </View>
        )}
      </View>
    )}
  </View>
);

// ─────────────────────────────────────────────
//  Main modal
// ─────────────────────────────────────────────

const ExemptionModal: React.FC<ExemptionModalProps> = ({
  visible, onClose, exemptionType, employeeId, token, onSuccess,
}) => {
  // ── Derived config ──
  const isAttendance = exemptionType === 'attendance';
  const title = isAttendance ? 'Attendance Exemptions' : 'Geofence Exemptions';
  const accentColor = isAttendance ? '#4CAF50' : '#2196F3';
  const getAllEndpoint = isAttendance
    ? `${BACKEND_URL}/manager/getAllAttendanceExemptions`
    : `${BACKEND_URL}/manager/getAllGeofenceExemptions`;
  const addEndpoint = isAttendance
    ? `${BACKEND_URL}/manager/addAttendanceExemption`
    : `${BACKEND_URL}/manager/addGeofenceExemption`;
  const updateEndpoint = isAttendance
    ? `${BACKEND_URL}/manager/updateAttendanceExemption`
    : `${BACKEND_URL}/manager/updateGeofenceExemption`;
  const deleteEndpoint = isAttendance
    ? `${BACKEND_URL}/manager/deleteAttendanceExemption`
    : `${BACKEND_URL}/manager/deleteGeofenceExemption`;

  // ── UI state ──
  const [mode, setMode] = useState<ModalMode>('view');
  const [editingExemption, setEditingExemption] = useState<Exemption | null>(null);

  // ── Data state ──
  const [exemptions, setExemptions] = useState<Exemption[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Form state ──
  const [scheduleType, setScheduleType] = useState<ScheduleType>('ALL_DAYS');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // ── Lifecycle ──
  useEffect(() => {
    if (visible) {
      setMode('view');
      setEditingExemption(null);
      fetchExemptions();
    }
  }, [visible]);

  // ── API calls ──
  const fetchExemptions = async () => {
    setFetchLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(getAllEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, employee_id: employeeId }),
      });
      const data = await response.json();
      if (response.ok) {
        setExemptions(data.exemptions || []);
      } else {
        setFetchError(data.message || 'Failed to load exemptions');
      }
    } catch {
      setFetchError('Network error. Please try again.');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (scheduleType === 'DAYS_OF_WEEK' && selectedDays.length === 0) {
      alert('Validation Error', 'Please select at least one day of the week.');
      return;
    }
    if (scheduleType === 'SPECIFIC_DATES' && selectedDates.length === 0) {
      alert('Validation Error', 'Please select at least one date.');
      return;
    }

    setSubmitting(true);
    const isEdit = mode === 'edit' && editingExemption !== null;
    const endpoint = isEdit ? updateEndpoint : addEndpoint;

    const payload: Record<string, any> = {
      token,
      employee_id: employeeId,
      schedule_type: scheduleType,
      days_of_week: scheduleType === 'DAYS_OF_WEEK' ? selectedDays : [],
      specific_dates: scheduleType === 'SPECIFIC_DATES' ? selectedDates : [],
    };
    if (isEdit) payload.exemption_id = editingExemption!.id;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok) {
        alert('Success', data.message || (isEdit ? 'Exemption updated' : 'Exemption added'));
        onSuccess?.();
        // Return to view and refresh list
        setMode('view');
        setEditingExemption(null);
        fetchExemptions();
      } else {
        alert('Error', data.message || 'Operation failed');
      }
    } catch {
      alert('Error', 'Network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    alert(
      'Delete Exemption',
      'Are you sure you want to remove this exemption?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              const response = await fetch(deleteEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, exemption_id: id }),
              });
              const data = await response.json();
              if (response.ok) {
                onSuccess?.();
                fetchExemptions();
              } else {
                alert('Error', data.message || 'Failed to delete exemption');
              }
            } catch {
              alert('Error', 'Network error occurred. Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // ── Form helpers ──
  const openAdd = () => {
    setScheduleType('ALL_DAYS');
    setSelectedDays([]);
    setSelectedDates([]);
    setEditingExemption(null);
    setMode('add');
  };

  const openEdit = (exemption: Exemption) => {
    setScheduleType(exemption.schedule_type);
    setSelectedDays([...(exemption.days_of_week || [])]);
    setSelectedDates([...(exemption.specific_dates || [])]);
    setEditingExemption(exemption);
    setMode('edit');
  };

  const handleBack = () => {
    setMode('view');
    setEditingExemption(null);
  };

  const toggleDay = useCallback((day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  }, []);

  const toggleDate = useCallback((iso: string) => {
    setSelectedDates(prev =>
      prev.includes(iso) ? prev.filter(d => d !== iso) : [...prev, iso].sort()
    );
  }, []);

  // ── Render sections ──
  const renderHeader = () => (
    <View style={[globalStyles.assetsModalHeader, { borderBottomColor: accentColor, borderBottomWidth: 2 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {mode !== 'view' && (
          <TouchableOpacity onPress={handleBack} style={{ marginRight: 10 }}>
            <Ionicons name="arrow-back" size={22} color={WHATSAPP_COLORS.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={[localStyles.headerIconWrap, { backgroundColor: accentColor + '20' }]}>
          <Ionicons
            name={isAttendance ? 'finger-print-outline' : 'location-outline'}
            size={22}
            color={accentColor}
          />
        </View>
        <Text style={[globalStyles.assetsModalTitle, { marginLeft: 10 }]}>
          {mode === 'view' ? title : mode === 'add' ? 'Add Exemption' : 'Edit Exemption'}
        </Text>
      </View>
      <TouchableOpacity onPress={onClose}>
        <Ionicons name="close" size={28} color={WHATSAPP_COLORS.textPrimary} />
      </TouchableOpacity>
    </View>
  );

  const renderViewMode = () => (
    <>
      <ScrollView
        style={globalStyles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ padding: 16 }}>
          {/* Info banner */}
          <View style={[localStyles.infoBanner, { borderLeftColor: accentColor }]}>
            <Ionicons name="information-circle-outline" size={18} color={accentColor} />
            <Text style={localStyles.infoBannerText}>
              {isAttendance
                ? 'Manage attendance exemptions for this employee.'
                : 'Manage geofence exemptions for this employee.'}
            </Text>
          </View>

          {/* Existing exemptions */}
          {fetchLoading ? (
            <View style={localStyles.centerState}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={localStyles.centerStateText}>Loading exemptions...</Text>
            </View>
          ) : fetchError ? (
            <View style={localStyles.centerState}>
              <Ionicons name="cloud-offline-outline" size={36} color={WHATSAPP_COLORS.textTertiary} />
              <Text style={localStyles.centerStateText}>{fetchError}</Text>
              <TouchableOpacity
                onPress={fetchExemptions}
                style={[localStyles.retryBtn, { borderColor: accentColor }]}
              >
                <Text style={[localStyles.retryBtnText, { color: accentColor }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : exemptions.length === 0 ? (
            <View style={localStyles.centerState}>
              <Ionicons name="shield-outline" size={40} color={WHATSAPP_COLORS.textTertiary} />
              <Text style={localStyles.centerStateTitle}>No exemptions set</Text>
              <Text style={localStyles.centerStateText}>
                Tap the button below to add an exemption rule.
              </Text>
            </View>
          ) : (
            <View>
              <Text style={localStyles.sectionLabel}>
                Active Exemptions ({exemptions.length})
              </Text>
              {exemptions.map(exemption => (
                <ExemptionCard
                  key={exemption.id}
                  exemption={exemption}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  deleting={deletingId === exemption.id}
                  accentColor={accentColor}
                />
              ))}
            </View>
          )}

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* Footer — Add button */}
      <View style={[
        globalStyles.actionContainer,
        { backgroundColor: WHATSAPP_COLORS.background, paddingTop: 12, borderTopWidth: 1, borderTopColor: WHATSAPP_COLORS.border },
      ]}>
        <TouchableOpacity
          style={[globalStyles.actionButtonLarge, globalStyles.cancelButton]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={globalStyles.cancelButtonText}>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[globalStyles.actionButtonLarge, globalStyles.saveButton, { backgroundColor: accentColor }]}
          onPress={openAdd}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={[globalStyles.saveButtonText, { marginLeft: 6 }]}
            numberOfLines={1} adjustsFontSizeToFit>
            Add Exemption
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderFormMode = () => (
    <>
      <ScrollView
        style={globalStyles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ padding: 16 }}>
          <ExemptionForm
            scheduleType={scheduleType}
            selectedDays={selectedDays}
            selectedDates={selectedDates}
            onScheduleTypeChange={setScheduleType}
            onToggleDay={toggleDay}
            onToggleDate={toggleDate}
            onClearDates={() => setSelectedDates([])}
          />
          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      <View style={[
        globalStyles.actionContainer,
        { backgroundColor: WHATSAPP_COLORS.background, paddingTop: 12, borderTopWidth: 1, borderTopColor: WHATSAPP_COLORS.border },
      ]}>
        <TouchableOpacity
          style={[globalStyles.actionButtonLarge, globalStyles.cancelButton]}
          onPress={handleBack}
          disabled={submitting}
          activeOpacity={0.7}
        >
          <Text style={globalStyles.cancelButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            globalStyles.actionButtonLarge,
            globalStyles.saveButton,
            { backgroundColor: accentColor, flexShrink: 1 },
            submitting && globalStyles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.7}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={[globalStyles.saveButtonText, { marginLeft: 6 }]}
                  numberOfLines={1} adjustsFontSizeToFit>
                  {mode === 'edit' ? 'Update' : 'Apply'}
                </Text>
              </>
            )
          }
        </TouchableOpacity>
      </View>
    </>
  );

  // ─────────────────────────────────────────────
  //  Root render
  // ─────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={globalStyles.assetsModalOverlay}>
        <View style={[
          globalStyles.assetsModalContainer,
          Platform.OS === 'web' && { width: '45%', alignSelf: 'center' },
        ]}>
          {renderHeader()}
          {mode === 'view' ? renderViewMode() : renderFormMode()}
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────
//  Local styles
// ─────────────────────────────────────────────

const localStyles = StyleSheet.create({
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: WHATSAPP_COLORS.chatBubbleReceived,
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    lineHeight: 20,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 4,
  },

  // Existing exemption card
  exemptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exemptionCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exemptionCardType: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 2,
  },
  exemptionCardDetail: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textSecondary,
    lineHeight: 16,
  },
  exemptionCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  exemptionCardActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },

  // Empty / loading / error state
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  centerStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  centerStateText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Schedule option card
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: WHATSAPP_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scheduleCardSelected: {
    borderColor: WHATSAPP_COLORS.primary,
    backgroundColor: WHATSAPP_COLORS.chatBubbleReceived,
    shadowColor: WHATSAPP_COLORS.primary,
    shadowOpacity: 0.1,
    elevation: 3,
  },
  scheduleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHATSAPP_COLORS.background,
  },
  scheduleIconWrapSelected: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginBottom: 2,
  },
  scheduleTitleSelected: {
    color: WHATSAPP_COLORS.primary,
  },
  scheduleDesc: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: WHATSAPP_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioOuterSelected: {
    borderColor: WHATSAPP_COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: WHATSAPP_COLORS.primary,
  },

  // Sub-section
  subSection: {
    marginTop: 16,
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  subSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textSecondary,
    marginBottom: 10,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  chipDate: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
  },
  chipSelected: {
    borderColor: WHATSAPP_COLORS.primary,
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: WHATSAPP_COLORS.textPrimary,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  selectionSummary: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '500',
    color: WHATSAPP_COLORS.primary,
  },

  // Calendar
  calendarWrap: {
    backgroundColor: WHATSAPP_COLORS.background,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  calendarMonthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
  },
  calendarDayHeaders: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calendarDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textTertiary,
    paddingVertical: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  calendarCellSelected: {
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  calendarDayText: {
    fontSize: 13,
    color: WHATSAPP_COLORS.textPrimary,
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  selectedDatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  clearAll: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D32F2F',
  },
  datesChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});

export default ExemptionModal;