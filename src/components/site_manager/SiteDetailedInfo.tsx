import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

// ─── Theme ────────────────────────────────────────────────────────────────────

const C = {
  primary:        '#075E54',
  primaryLight:   '#128C7E',
  secondary:      '#25D366',
  accent:         '#10B981',
  info:           '#3B82F6',
  background:     '#F0F2F5',
  surface:        '#FFFFFF',
  textPrimary:    '#111827',
  textSecondary:  '#6B7280',
  border:         '#E5E7EB',
  white:          '#FFFFFF',
  divider:        '#F3F4F6',
  chip:           '#E8F5E9',
  chipText:       '#1B5E20',
  gold:           '#F59E0B',
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface SiteData {
  id: number;
  building_name: string;
  location: string;
  location_link: string;
  floor_condition: string;
  area_per_floor: string;
  area_offered: string;
  rent: string;
  rent_per_seat: string;
  car_parking_slots: string;
  car_parking_charges: string;
  cam: string;
  cam_deposit: string;
  micro_market?: string;
  building_status?: string;
  managed_property?: boolean;
  conventional_property?: boolean;
  created_by?: { first_name: string; last_name: string; employee_id: string };
  created_at?: string;
  [key: string]: any;
}

interface SiteDetailedInfoProps {
  visible: boolean;
  onClose: () => void;
  siteData: SiteData | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const beautifyName = (name: string): string => {
  if (!name) return '-';
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

const formatCurrency = (value: string): string => {
  if (!value || value.trim() === '') return '-';
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return value;
  return '₹' + num.toLocaleString('en-IN');
};

const getInitials = (name: string): string => {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].charAt(0).toUpperCase()
    : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** A single label + value row inside a card */
const InfoRow: React.FC<{
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
  last?: boolean;
}> = ({ label, value, icon, highlight = false, last = false }) => (
  <View style={[rowStyles.container, !last && rowStyles.border]}>
    <View style={rowStyles.labelRow}>
      {icon ? <View style={rowStyles.iconWrap}>{icon}</View> : null}
      <Text style={rowStyles.label}>{label}</Text>
    </View>
    <Text style={[rowStyles.value, highlight && rowStyles.valueHighlight]}>
      {value || '-'}
    </Text>
  </View>
);

const rowStyles = StyleSheet.create({
  container:       { paddingVertical: 14, paddingHorizontal: 20 },
  border:          { borderBottomWidth: 1, borderBottomColor: C.divider },
  labelRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  iconWrap:        { marginRight: 6 },
  label:           { fontSize: 11, fontWeight: '700', color: C.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
  value:           { fontSize: 15, fontWeight: '500', color: C.textPrimary },
  valueHighlight:  { fontSize: 17, fontWeight: '700', color: C.primary },
});

/** Section card with coloured left-border accent */
const SectionCard: React.FC<{
  title: string;
  accent: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, accent, icon, children }) => (
  <View style={[cardStyles.card, { borderLeftColor: accent }]}>
    <View style={[cardStyles.header, { backgroundColor: accent + '12' }]}>
      {icon}
      <Text style={[cardStyles.title, { color: accent }]}>{title}</Text>
    </View>
    {children}
  </View>
);

const cardStyles = StyleSheet.create({
  card:   {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderLeftWidth: 4,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title:  { fontSize: 14, fontWeight: '700', letterSpacing: 0.2, flex: 1 },
});

// ─── Main Component ───────────────────────────────────────────────────────────

const SiteDetailedInfo: React.FC<SiteDetailedInfoProps> = ({
  visible,
  onClose,
  siteData,
}) => {
  if (!siteData) return null;

  const openGoogleMaps = () => {
    if (siteData.location_link) {
      Linking.openURL(siteData.location_link).catch(console.error);
    }
  };

  const propertyTypeLabel = siteData.managed_property
    ? 'Managed Property'
    : siteData.conventional_property
    ? 'Conventional Property'
    : null;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(siteData.building_name)}
                </Text>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.buildingName} numberOfLines={2}>
                  {siteData.building_name}
                </Text>
                {siteData.micro_market ? (
                  <View style={styles.chip}>
                    <Ionicons name="map" size={11} color={C.secondary} />
                    <Text style={styles.chipText}>{siteData.micro_market}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={C.white} />
            </TouchableOpacity>
          </View>

          {/* ── Location strip ───────────────────────────────────────────── */}
          {siteData.location ? (
            <TouchableOpacity
              style={styles.locationStrip}
              onPress={siteData.location_link ? openGoogleMaps : undefined}
              activeOpacity={siteData.location_link ? 0.7 : 1}
            >
              <Ionicons name="location" size={16} color={C.secondary} />
              <Text style={styles.locationText} numberOfLines={2}>
                {siteData.location}
              </Text>
              {siteData.location_link ? (
                <View style={styles.mapPill}>
                  <Ionicons name="map-outline" size={12} color={C.white} />
                  <Text style={styles.mapPillText}>Map</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}

          {/* ── Body ────────────────────────────────────────────────────── */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >

            {/* ── Property badge ── */}
            {(propertyTypeLabel || siteData.building_status) ? (
              <View style={styles.badgeRow}>
                {propertyTypeLabel ? (
                  <View style={styles.badge}>
                    <Ionicons name="business" size={12} color={C.primary} />
                    <Text style={styles.badgeText}>{propertyTypeLabel}</Text>
                  </View>
                ) : null}
                {siteData.building_status ? (
                  <View style={[styles.badge, { backgroundColor: C.secondary + '18' }]}>
                    <MaterialIcons name="verified" size={12} color={C.secondary} />
                    <Text style={[styles.badgeText, { color: C.secondary }]}>
                      {beautifyName(siteData.building_status)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* ── 1. Building Details ── */}
            <SectionCard
              title="Building Details"
              accent={C.primary}
              icon={<MaterialIcons name="business" size={18} color={C.primary} />}
            >
              <InfoRow
                label="Floor Condition"
                value={beautifyName(siteData.floor_condition)}
                icon={<MaterialCommunityIcons name="layers-outline" size={13} color={C.textSecondary} />}
              />
              <InfoRow
                label="Area per Floor — Typical Floor Plate"
                value={siteData.area_per_floor ? `${siteData.area_per_floor} sq ft` : '-'}
                icon={<MaterialCommunityIcons name="floor-plan" size={13} color={C.textSecondary} />}
              />
              <InfoRow
                label="Total Available Area"
                value={siteData.area_offered || '-'}
                icon={<MaterialCommunityIcons name="texture-box" size={13} color={C.textSecondary} />}
                last
              />
            </SectionCard>

            {/* ── 2. Financials ── */}
            <SectionCard
              title="Financials"
              accent={C.accent}
              icon={<MaterialIcons name="currency-rupee" size={18} color={C.accent} />}
            >
              <InfoRow
                label="Monthly Rent"
                value={formatCurrency(siteData.rent)}
                icon={<MaterialCommunityIcons name="currency-inr" size={13} color={C.textSecondary} />}
                highlight
              />
              <InfoRow
                label="Rent per Seat"
                value={formatCurrency(siteData.rent_per_seat)}
                icon={<MaterialCommunityIcons name="seat" size={13} color={C.textSecondary} />}
                last
              />
            </SectionCard>

            {/* ── 3. Parking ── */}
            <SectionCard
              title="Parking"
              accent={C.info}
              icon={<MaterialIcons name="directions-car" size={18} color={C.info} />}
            >
              <InfoRow
                label="Car Parking Slots"
                value={siteData.car_parking_slots || '-'}
                icon={<MaterialCommunityIcons name="car-multiple" size={13} color={C.textSecondary} />}
              />
              <InfoRow
                label="Car Parking Charges"
                value={formatCurrency(siteData.car_parking_charges)}
                icon={<MaterialCommunityIcons name="cash" size={13} color={C.textSecondary} />}
                last
              />
            </SectionCard>

            {/* ── 4. CAM ── */}
            <SectionCard
              title="Common Area Maintenance"
              accent={C.gold}
              icon={<MaterialCommunityIcons name="wrench-outline" size={18} color={C.gold} />}
            >
              <InfoRow
                label="CAM"
                value={siteData.cam || '-'}
                icon={<MaterialCommunityIcons name="clipboard-list-outline" size={13} color={C.textSecondary} />}
              />
              <InfoRow
                label="CAM Deposit"
                value={siteData.cam_deposit || '-'}
                icon={<MaterialCommunityIcons name="bank-outline" size={13} color={C.textSecondary} />}
                last
              />
            </SectionCard>

          </ScrollView>

        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sheet: {
    flex: 1,
    marginTop: 44,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: C.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: C.primary,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: C.white },
  headerText:  { flex: 1 },
  buildingName: {
    fontSize: 18,
    fontWeight: '800',
    color: C.white,
    lineHeight: 24,
    marginBottom: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  chipText: { fontSize: 11, fontWeight: '700', color: C.white },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Location strip ──────────────────────────────────────────────────────────
  locationStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: C.primaryLight,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  mapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.secondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  mapPillText: { fontSize: 11, fontWeight: '700', color: C.white },

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scroll:        { flex: 1, backgroundColor: C.background },
  scrollContent: { padding: 16, paddingBottom: 36 },

  // ── Badges ──────────────────────────────────────────────────────────────────
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.primary + '30',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
});

export default SiteDetailedInfo;