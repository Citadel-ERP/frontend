// hr_employee_management/priority.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from './header';
import { WHATSAPP_COLORS } from './constants';
import { BACKEND_URL } from '../../config/config';

interface DesignationPriority {
  id: number;
  designation: string;
  priority: number;
}

interface DesignationPriorityProps {
  token: string;
  onBack: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
//  Draggable row
// ────────────────────────────────────────────────────────────────────────────
const ITEM_HEIGHT = 64;

interface DraggableRowProps {
  item: DesignationPriority;
  index: number;
  totalCount: number;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isDirty: boolean;
}

const DraggableRow: React.FC<DraggableRowProps> = ({
  item,
  index,
  totalCount,
  onMoveUp,
  onMoveDown,
  isDirty,
}) => {
  const isFirst = index === 0;
  const isLast = index === totalCount - 1;

  const getBadgeColor = (priority: number): string => {
    if (priority === 1) return '#2E7D32';
    if (priority <= 3) return '#1565C0';
    if (priority <= 6) return '#EF6C00';
    return '#6B7280';
  };

  return (
    <View style={[rowStyles.container, isDirty && rowStyles.containerDirty]}>
      {/* Rank badge */}
      <View style={[rowStyles.rankBadge, { backgroundColor: getBadgeColor(item.priority) }]}>
        <Text style={rowStyles.rankText}>{item.priority}</Text>
      </View>

      {/* Designation label */}
      <View style={rowStyles.labelContainer}>
        <Text style={rowStyles.designationText} numberOfLines={1}>
          {item.designation}
        </Text>
        <Text style={rowStyles.prioritySubtext}>Priority {item.priority}</Text>
      </View>

      {/* Up / Down controls */}
      <View style={rowStyles.controls}>
        <TouchableOpacity
          style={[rowStyles.arrowBtn, isFirst && rowStyles.arrowBtnDisabled]}
          onPress={() => !isFirst && onMoveUp(index)}
          activeOpacity={isFirst ? 1 : 0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="chevron-up"
            size={20}
            color={isFirst ? '#D1D5DB' : WHATSAPP_COLORS.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[rowStyles.arrowBtn, isLast && rowStyles.arrowBtnDisabled]}
          onPress={() => !isLast && onMoveDown(index)}
          activeOpacity={isLast ? 1 : 0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="chevron-down"
            size={20}
            color={isLast ? '#D1D5DB' : WHATSAPP_COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Drag handle hint */}
      <View style={rowStyles.dragHandle}>
        <Ionicons name="reorder-three" size={22} color="#9CA3AF" />
      </View>
    </View>
  );
};

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: ITEM_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  containerDirty: {
    borderColor: WHATSAPP_COLORS.primary,
    borderWidth: 1.5,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  labelContainer: {
    flex: 1,
    marginRight: 8,
  },
  designationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  prioritySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 10,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtnDisabled: {
    backgroundColor: '#F9FAFB',
  },
  dragHandle: {
    paddingLeft: 4,
  },
});

// ────────────────────────────────────────────────────────────────────────────
//  Main screen
// ────────────────────────────────────────────────────────────────────────────
const DesignationPriorityScreen: React.FC<DesignationPriorityProps> = ({ token, onBack }) => {
  const [items, setItems] = useState<DesignationPriority[]>([]);
  const [originalItems, setOriginalItems] = useState<DesignationPriority[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchPriorities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/manager/getPriorities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        const sorted: DesignationPriority[] = (data.priorities ?? []).sort(
          (a: DesignationPriority, b: DesignationPriority) => a.priority - b.priority,
        );
        setItems(sorted);
        setOriginalItems(JSON.parse(JSON.stringify(sorted)));
        setIsDirty(false);
      } else {
        const err = await response.json().catch(() => ({ message: 'Unknown error' }));
        setError(err.message || 'Failed to fetch priorities');
      }
    } catch (e: any) {
      setError(`Network error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPriorities();
  }, [fetchPriorities]);

  // ── Re-index priorities to keep them contiguous after any move ─────────────
  const reindex = (arr: DesignationPriority[]): DesignationPriority[] =>
    arr.map((item, i) => ({ ...item, priority: i + 1 }));

  // ── Move handlers ─────────────────────────────────────────────────────────
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setItems(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      const reindexed = reindex(next);
      setIsDirty(true);
      return reindexed;
    });
  };

  const handleMoveDown = (index: number) => {
    setItems(prev => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      const reindexed = reindex(next);
      setIsDirty(true);
      return reindexed;
    });
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setItems(JSON.parse(JSON.stringify(originalItems)));
    setIsDirty(false);
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      // Build the { designation: priority } dict the API expects
      const designationsDict: Record<string, number> = {};
      items.forEach(item => {
        designationsDict[item.designation] = item.priority;
      });

      const response = await fetch(`${BACKEND_URL}/manager/updatePriorities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ token, designations: designationsDict }),
      });

      if (response.ok) {
        setOriginalItems(JSON.parse(JSON.stringify(items)));
        setIsDirty(false);
        Alert.alert('Success', 'Designation priorities updated successfully.');
      } else {
        const err = await response.json().catch(() => ({ message: 'Unknown error' }));
        Alert.alert('Error', err.message || 'Failed to update priorities');
      }
    } catch (e: any) {
      Alert.alert('Error', `Network error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title="Designation Order"
          subtitle="Loading..."
          onBack={onBack}
          variant="details"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading designation priorities…</Text>
        </View>
      </View>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.container}>
        <Header
          title="Designation Order"
          subtitle="Error"
          onBack={onBack}
          variant="details"
        />
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={52} color={WHATSAPP_COLORS.error ?? '#EF4444'} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPriorities}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Designation Order"
        subtitle={`${items.length} designation${items.length !== 1 ? 's' : ''}`}
        onBack={onBack}
        variant="details"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={WHATSAPP_COLORS.primary} />
          <Text style={styles.infoText}>
            Use the arrows to reorder designations. Higher positions indicate higher seniority.
            Save when done.
          </Text>
        </View>

        {/* Dirty-state banner */}
        {isDirty && (
          <View style={styles.dirtyBanner}>
            <Ionicons name="pencil-outline" size={18} color="#D97706" />
            <Text style={styles.dirtyBannerText}>You have unsaved changes</Text>
          </View>
        )}

        {/* List */}
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={52} color="#9CA3AF" />
            <Text style={styles.emptyText}>No designations found.</Text>
            <Text style={styles.emptySubtext}>
              Designations appear here once employees have been assigned one.
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {items.map((item, index) => (
              <DraggableRow
                key={`${item.designation}-${item.id}`}
                item={item}
                index={index}
                totalCount={items.length}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                isDirty={
                  isDirty &&
                  originalItems.findIndex(o => o.designation === item.designation) !== index
                }
              />
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Footer action bar */}
      {items.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, styles.resetButton, !isDirty && styles.footerButtonDisabled]}
            onPress={handleReset}
            disabled={!isDirty}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={18} color={isDirty ? '#374151' : '#9CA3AF'} />
            <Text style={[styles.resetButtonText, !isDirty && styles.disabledText]}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.footerButton, styles.saveButton, (!isDirty || saving) && styles.footerButtonDisabled]}
            onPress={handleSave}
            disabled={!isDirty || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Order</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ────────────────────────────────────────────────────────────────────────────
//  Screen-level styles
// ────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: WHATSAPP_COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 14,
    fontSize: 15,
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: WHATSAPP_COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#3730A3',
    lineHeight: 19,
    fontWeight: '500',
  },
  dirtyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  dirtyBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  listContainer: {
    // rows render here
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 4,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  footerButtonDisabled: {
    opacity: 0.45,
  },
  resetButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    backgroundColor: WHATSAPP_COLORS.primary,
    shadowColor: WHATSAPP_COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  error: {
    color: '#EF4444',
  },
});

export default DesignationPriorityScreen;