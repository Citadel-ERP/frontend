// hr_employee_management/assets.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import alert from '../../utils/Alert';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  employee_id: string;
  full_name: string;
}

interface SerialId {
  id: number;
  serial_id: string;
  is_assigned: boolean;
}

interface Asset {
  id: number;
  asset_name: string;
  asset_type: string;
  asset_count: number;
  assigned_count: number;
  available_count: number;
  asset_city: string;
  asset_serial_id: SerialId[];
}

interface AssignedAsset {
  id: number;
  asset: {
    id: number;
    asset_name: string;
    asset_type: string;
  };
  asset_serial_id: SerialId | null;
  asset_count: number;
  assigned_at: string;
  assigned_by: { full_name: string } | null;
  status: string;
}

interface AssetsProps {
  visible: boolean;
  onClose: () => void;
  employee: Employee;
  token: string;
  onRefresh?: () => void;
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:           '#F7F8FA',
  surface:      '#FFFFFF',
  headerBg:     '#1A2332',
  headerText:   '#FFFFFF',
  accent:       '#2563EB',
  accentLight:  '#EFF6FF',
  success:      '#16A34A',
  successLight: '#F0FDF4',
  danger:       '#DC2626',
  dangerLight:  '#FEF2F2',
  warning:      '#D97706',
  warningLight: '#FFFBEB',
  textPrimary:  '#111827',
  textSecondary:'#6B7280',
  textTertiary: '#9CA3AF',
  border:       '#E5E7EB',
  borderFocus:  '#2563EB',
  serialBadge:  '#F0F9FF',
  serialText:   '#0369A1',
};

// ─── Small reusable components ────────────────────────────────────────────────

const Badge: React.FC<{
  label: string;
  color: string;
  bg: string;
  icon?: string;
}> = ({ label, color, bg, icon }) => (
  <View style={{
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: bg, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start',
  }}>
    {icon && <Ionicons name={icon as any} size={10} color={color} />}
    <Text style={{ fontSize: 11, fontWeight: '600', color, letterSpacing: 0.3 }}>
      {label}
    </Text>
  </View>
);

const Divider = () => (
  <View style={{ height: 1, backgroundColor: C.border, marginVertical: 2 }} />
);

const SectionHeader: React.FC<{ title: string; count?: number; right?: React.ReactNode }> = ({
  title, count, right,
}) => (
  <View style={{
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: C.bg,
    borderBottomWidth: 1, borderBottomColor: C.border,
  }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: C.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase' }}>
        {title}
      </Text>
      {count !== undefined && (
        <View style={{
          backgroundColor: C.accent, borderRadius: 10,
          paddingHorizontal: 7, paddingVertical: 1,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{count}</Text>
        </View>
      )}
    </View>
    {right}
  </View>
);

// ─── Assigned asset row ────────────────────────────────────────────────────────

const AssignedAssetRow: React.FC<{
  item: AssignedAsset;
  onRemove: (id: number) => void;
}> = ({ item, onRemove }) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleRemove = () => {
    alert(
      'Return Asset',
      `Remove "${item.asset.asset_name}"${item.asset_serial_id ? ` (SN: ${item.asset_serial_id.serial_id})` : ''} from ${''} employee?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Return',
          style: 'destructive',
          onPress: () => {
            Animated.timing(fadeAnim, {
              toValue: 0, duration: 250, useNativeDriver: true,
            }).start(() => onRemove(item.id));
          },
        },
      ]
    );
  };

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: C.surface,
      }}>
        {/* Icon */}
        <View style={{
          width: 40, height: 40, borderRadius: 10,
          backgroundColor: C.successLight,
          alignItems: 'center', justifyContent: 'center',
          marginRight: 12,
        }}>
          <Ionicons name="cube" size={20} color={C.success} />
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: C.textPrimary, marginBottom: 3 }}>
            {item.asset.asset_name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 12, color: C.textSecondary }}>{item.asset.asset_type}</Text>
            {item.asset_count > 1 && (
              <>
                <Text style={{ fontSize: 12, color: C.border }}>•</Text>
                <Text style={{ fontSize: 12, color: C.textSecondary }}>Qty: {item.asset_count}</Text>
              </>
            )}
          </View>
          {item.asset_serial_id && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5,
              backgroundColor: C.serialBadge, borderRadius: 6,
              paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start',
            }}>
              <Ionicons name="barcode-outline" size={12} color={C.serialText} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: C.serialText, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}>
                {item.asset_serial_id.serial_id}
              </Text>
            </View>
          )}
        </View>

        {/* Remove button */}
        <TouchableOpacity
          onPress={handleRemove}
          style={{
            width: 34, height: 34, borderRadius: 8,
            backgroundColor: C.dangerLight,
            alignItems: 'center', justifyContent: 'center',
            marginLeft: 8,
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="return-down-back-outline" size={16} color={C.danger} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ─── Available asset row ───────────────────────────────────────────────────────

const AvailableAssetRow: React.FC<{
  item: Asset;
  onAssign: (asset: Asset) => void;
}> = ({ item, onAssign }) => {
  const availableSerials = item.asset_serial_id.filter(s => !s.is_assigned);
  const hasSerials = availableSerials.length > 0;
  const isOutOfStock = item.available_count <= 0;

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14,
      backgroundColor: C.surface,
      opacity: isOutOfStock ? 0.5 : 1,
    }}>
      {/* Icon */}
      <View style={{
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: isOutOfStock ? '#F3F4F6' : C.accentLight,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
      }}>
        <Ionicons
          name="cube-outline"
          size={20}
          color={isOutOfStock ? C.textTertiary : C.accent}
        />
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: C.textPrimary, marginBottom: 3 }}>
          {item.asset_name}
        </Text>
        <Text style={{ fontSize: 12, color: C.textSecondary, marginBottom: 4 }}>
          {item.asset_type}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Badge
            label={`${item.available_count} available`}
            color={isOutOfStock ? C.textTertiary : C.success}
            bg={isOutOfStock ? '#F3F4F6' : C.successLight}
            icon="checkmark-circle-outline"
          />
          {hasSerials && (
            <Badge
              label={`${availableSerials.length} serial${availableSerials.length !== 1 ? 's' : ''}`}
              color={C.serialText}
              bg={C.serialBadge}
              icon="barcode-outline"
            />
          )}
        </View>
      </View>

      {/* Assign button */}
      <TouchableOpacity
        style={{
          backgroundColor: isOutOfStock ? '#F3F4F6' : C.accent,
          paddingHorizontal: 14, paddingVertical: 8,
          borderRadius: 8, marginLeft: 8,
        }}
        onPress={() => !isOutOfStock && onAssign(item)}
        disabled={isOutOfStock}
        activeOpacity={0.8}
      >
        <Text style={{
          fontSize: 13, fontWeight: '700',
          color: isOutOfStock ? C.textTertiary : '#fff',
        }}>
          Assign
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Serial picker sheet ───────────────────────────────────────────────────────

const SerialPickerSheet: React.FC<{
  visible: boolean;
  asset: Asset | null;
  onClose: () => void;
  onConfirm: (serialId: number | null) => void;
  loading: boolean;
}> = ({ visible, asset, onClose, onConfirm, loading }) => {
  const [selectedSerialId, setSelectedSerialId] = useState<number | null>(null);
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      setSelectedSerialId(null);
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true,
        tension: 65, friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 400, duration: 200, useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!asset) return null;

  const availableSerials = asset.asset_serial_id.filter(s => !s.is_assigned);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
        onPress={onClose}
      />
      <Animated.View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: C.surface,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        maxHeight: '75%',
        transform: [{ translateY: slideAnim }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
      }}>
        {/* Handle */}
        <View style={{
          width: 36, height: 4, borderRadius: 2,
          backgroundColor: C.border, alignSelf: 'center', marginTop: 10, marginBottom: 4,
        }} />

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
          borderBottomWidth: 1, borderBottomColor: C.border,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.textPrimary }}>
              Assign Asset
            </Text>
            <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
              {asset.asset_name} · {asset.asset_type}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 2 }}>
            <Ionicons name="close" size={22} color={C.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Serial selection (only if serials exist) */}
          {availableSerials.length > 0 ? (
            <View style={{ padding: 16 }}>
              <Text style={{
                fontSize: 12, fontWeight: '700', color: C.textSecondary,
                letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
              }}>
                Select Serial Number  ·  Optional
              </Text>

              {/* No serial option */}
              <TouchableOpacity
                onPress={() => setSelectedSerialId(null)}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  padding: 12, borderRadius: 10, marginBottom: 8,
                  borderWidth: 1.5,
                  borderColor: selectedSerialId === null ? C.accent : C.border,
                  backgroundColor: selectedSerialId === null ? C.accentLight : C.surface,
                }}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                  borderColor: selectedSerialId === null ? C.accent : C.border,
                  alignItems: 'center', justifyContent: 'center', marginRight: 10,
                }}>
                  {selectedSerialId === null && (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent }} />
                  )}
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: C.textPrimary }}>
                    No specific serial
                  </Text>
                  <Text style={{ fontSize: 12, color: C.textSecondary }}>
                    Assign without tracking serial number
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Serial options */}
              {availableSerials.map(serial => (
                <TouchableOpacity
                  key={serial.id}
                  onPress={() => setSelectedSerialId(serial.id)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    padding: 12, borderRadius: 10, marginBottom: 8,
                    borderWidth: 1.5,
                    borderColor: selectedSerialId === serial.id ? C.accent : C.border,
                    backgroundColor: selectedSerialId === serial.id ? C.accentLight : C.surface,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{
                    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                    borderColor: selectedSerialId === serial.id ? C.accent : C.border,
                    alignItems: 'center', justifyContent: 'center', marginRight: 10,
                  }}>
                    {selectedSerialId === serial.id && (
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent }} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="barcode-outline" size={14} color={C.serialText} />
                      <Text style={{
                        fontSize: 14, fontWeight: '700', color: C.serialText,
                        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
                      }}>
                        {serial.serial_id}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 1 }}>
                      Available
                    </Text>
                  </View>
                  {selectedSerialId === serial.id && (
                    <Ionicons name="checkmark-circle" size={18} color={C.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={{
              padding: 20, alignItems: 'center',
              flexDirection: 'row', gap: 10,
              backgroundColor: C.warningLight, margin: 16, borderRadius: 10,
            }}>
              <Ionicons name="information-circle-outline" size={18} color={C.warning} />
              <Text style={{ fontSize: 13, color: C.warning, flex: 1 }}>
                No serial numbers registered for this asset. You can still assign it without one.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={{
          paddingHorizontal: 16, paddingTop: 12,
          borderTopWidth: 1, borderTopColor: C.border,
        }}>
          {selectedSerialId !== null && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              marginBottom: 10, padding: 10, borderRadius: 8,
              backgroundColor: C.accentLight,
            }}>
              <Ionicons name="barcode-outline" size={14} color={C.accent} />
              <Text style={{ fontSize: 13, color: C.accent, fontWeight: '600' }}>
                Serial: {availableSerials.find(s => s.id === selectedSerialId)?.serial_id}
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1, padding: 14, borderRadius: 10,
                borderWidth: 1.5, borderColor: C.border,
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: C.textSecondary }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onConfirm(selectedSerialId)}
              disabled={loading}
              style={{
                flex: 2, padding: 14, borderRadius: 10,
                backgroundColor: loading ? '#93C5FD' : C.accent,
                alignItems: 'center', flexDirection: 'row',
                justifyContent: 'center', gap: 8,
              }}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              }
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                {loading ? 'Assigning...' : 'Confirm Assign'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

const AssetsModal: React.FC<AssetsProps> = ({
  visible, onClose, employee, token, onRefresh,
}) => {
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [assignedAssets, setAssignedAssets] = useState<AssignedAsset[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showSerialPicker, setShowSerialPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      fetchData();
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, tension: 60, friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 600, duration: 250, useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const fetchData = async () => {
    fetchAvailableAssets();
    fetchAssignedAssets();
  };

  const fetchAvailableAssets = async () => {
    setLoadingAvailable(true);
    try {
      const res = await fetch(`${BACKEND_URL}/manager/getAssets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableAssets(data.assets || []);
      }
    } catch (e) {
      console.error('fetchAvailableAssets:', e);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const fetchAssignedAssets = async () => {
    setLoadingAssigned(true);
    try {
      const res = await fetch(`${BACKEND_URL}/manager/getEmployeeAssignedAssets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, employee_id: employee.employee_id }),
      });
      if (res.ok) {
        const data = await res.json();
        setAssignedAssets(data.data || []);
      }
    } catch (e) {
      console.error('fetchAssignedAssets:', e);
    } finally {
      setLoadingAssigned(false);
    }
  };

  const handleAssignPress = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowSerialPicker(true);
  };

  const handleConfirmAssign = async (serialIdPk: number | null) => {
    if (!selectedAsset) return;
    setAssigning(true);

    const assetPayload: any = {
      asset_id: selectedAsset.id,
      asset_count: 1,
    };
    if (serialIdPk !== null) {
      assetPayload.serial_id_pk = serialIdPk;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/manager/assignEmployeeAssets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id,
          assets: [assetPayload],
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowSerialPicker(false);
        setSelectedAsset(null);
        fetchData();
        if (onRefresh) onRefresh();
        alert('Success', `${selectedAsset.asset_name} assigned successfully`);
      } else {
        alert('Error', data.message || 'Failed to assign asset');
      }
    } catch (e) {
      console.error('handleConfirmAssign:', e);
      alert('Error', 'Network error occurred');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAsset = async (assignedAssetId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/manager/removeAssignedAssets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, assigned_asset_id: assignedAssetId }),
      });

      const data = await res.json();

      if (res.ok) {
        setAssignedAssets(prev => prev.filter(a => a.id !== assignedAssetId));
        fetchAvailableAssets(); // refresh stock counts
        if (onRefresh) onRefresh();
      } else {
        alert('Error', data.message || 'Failed to remove asset');
      }
    } catch (e) {
      console.error('handleRemoveAsset:', e);
      alert('Error', 'Network error occurred');
    }
  };

  const filteredAvailable = availableAssets.filter(a =>
    !searchQuery.trim() ||
    a.asset_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.asset_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLoading = loadingAvailable || loadingAssigned;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Animated.View style={{
            flex: 1,
            backgroundColor: C.bg,
            marginTop: 52,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
            transform: [{ translateY: slideAnim }],
          }}>
            {/* ── Header ── */}
            <View style={{
              backgroundColor: C.headerBg,
              paddingTop: 16, paddingBottom: 14,
              paddingHorizontal: 16,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: C.headerText }}>
                    Asset Management
                  </Text>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                    {employee.full_name}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={fetchData}
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh" size={18} color={C.headerText} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onClose}
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={20} color={C.headerText} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Stats strip */}
              <View style={{
                flexDirection: 'row', marginTop: 14, gap: 8,
              }}>
                <View style={{
                  flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: 10, alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>
                    {loadingAssigned ? '—' : assignedAssets.length}
                  </Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
                    Assigned
                  </Text>
                </View>
                <View style={{
                  flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: 10, alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>
                    {assignedAssets.filter(a => a.asset_serial_id).length}
                  </Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
                    With Serial
                  </Text>
                </View>
                <View style={{
                  flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: 10, alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>
                    {loadingAvailable ? '—' : availableAssets.filter(a => a.available_count > 0).length}
                  </Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
                    In Stock
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Body ── */}
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              {/* Assigned section */}
              <SectionHeader
                title="Currently Assigned"
                count={assignedAssets.length}
              />
              <View style={{ backgroundColor: C.surface, marginBottom: 8 }}>
                {loadingAssigned ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <ActivityIndicator color={C.accent} />
                  </View>
                ) : assignedAssets.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <View style={{
                      width: 52, height: 52, borderRadius: 26,
                      backgroundColor: C.bg, alignItems: 'center',
                      justifyContent: 'center', marginBottom: 10,
                    }}>
                      <Ionicons name="cube-outline" size={24} color={C.textTertiary} />
                    </View>
                    <Text style={{ fontSize: 14, color: C.textTertiary, fontWeight: '500' }}>
                      No assets assigned yet
                    </Text>
                  </View>
                ) : (
                  assignedAssets.map((item, idx) => (
                    <View key={item.id}>
                      {idx > 0 && <Divider />}
                      <AssignedAssetRow item={item} onRemove={handleRemoveAsset} />
                    </View>
                  ))
                )}
              </View>

              {/* Available section */}
              <SectionHeader
                title="Available to Assign"
                count={filteredAvailable.length}
                right={
                  <TouchableOpacity
                    onPress={fetchAvailableAssets}
                    style={{ padding: 4 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh-outline" size={16} color={C.accent} />
                  </TouchableOpacity>
                }
              />

              {/* Search */}
              <View style={{
                backgroundColor: C.surface,
                paddingHorizontal: 16, paddingVertical: 10,
                borderBottomWidth: 1, borderBottomColor: C.border,
              }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: C.bg, borderRadius: 10,
                  paddingHorizontal: 10, height: 38,
                  borderWidth: 1, borderColor: C.border,
                }}>
                  <Ionicons name="search-outline" size={15} color={C.textTertiary} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search assets..."
                    placeholderTextColor={C.textTertiary}
                    style={{
                      flex: 1, marginLeft: 8, fontSize: 14,
                      color: C.textPrimary, paddingVertical: 0,
                    }}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color={C.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={{ backgroundColor: C.surface }}>
                {loadingAvailable ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <ActivityIndicator color={C.accent} />
                  </View>
                ) : filteredAvailable.length === 0 ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Ionicons name="search-outline" size={24} color={C.textTertiary} />
                    <Text style={{ fontSize: 14, color: C.textTertiary, marginTop: 8 }}>
                      {searchQuery ? 'No matching assets' : 'No assets available'}
                    </Text>
                  </View>
                ) : (
                  filteredAvailable.map((item, idx) => (
                    <View key={item.id}>
                      {idx > 0 && <Divider />}
                      <AvailableAssetRow item={item} onAssign={handleAssignPress} />
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Serial picker bottom sheet (rendered outside the main modal to avoid nesting issues) */}
      <SerialPickerSheet
        visible={showSerialPicker}
        asset={selectedAsset}
        onClose={() => { setShowSerialPicker(false); setSelectedAsset(null); }}
        onConfirm={handleConfirmAssign}
        loading={assigning}
      />
    </>
  );
};

export default AssetsModal;