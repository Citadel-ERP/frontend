import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

const C = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  primaryDark: '#054D44',
  secondary: '#25D366',
  accent: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#f0f0f0',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#25D366',
  chatBg: '#ECE5DD',
  incoming: '#FFFFFF',
  outgoing: '#DCF8C6',
  leadInfoBg: '#F0F9FF',
  leadInfoBorder: '#0EA5E9',
  customFieldBg: '#F5F3FF',
  customFieldBorder: '#8B5CF6',
};

interface Lead {
  id: number;
  name: string;
  company?: string;
  phase: string;
  subphase: string;
  status: string;
  emails?: Array<{ email: string }>;
  phone_numbers?: Array<{ number: string }>;
  created_at?: string;
  createdAt?: string;
  assigned_to?: {
    first_name: string;
    last_name: string;
    full_name?: string;
  };
  city?: string;
  meta?: any; // Added meta field
}

interface LeadDetailsInfoProps {
  lead: Lead;
  token: string | null;
  onBack: () => void; // Callback to go back to the chat screen
}

const LeadDetailsInfo: React.FC<LeadDetailsInfoProps> = ({ lead, token, onBack }) => {
  const beautifyName = (name: string): string => {
    if (!name) return '';
    return name
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string): string => {
    if (!name || name.trim().length === 0) return '?';
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
    }
  };

  const getOfficeTypeLabel = (value: string): string => {
    const officeTypes: {[key: string]: string} = {
      'conventional_office': 'Conventional Office',
      'managed_office': 'Managed Office',
      'conventional_and_managed_office': 'Conventional and Managed Office'
    };
    return officeTypes[value] || beautifyName(value);
  };

  const renderSection = ({ item }: { item: string }) => {
    switch (item) {
      case 'lead-info':
        return (
          <View style={s.infoCard}>
            <View style={s.infoCardHeader}>
              <View style={s.infoAvatarContainer}>
                <View style={s.infoAvatar}>
                  <Text style={s.infoAvatarText}>
                    {getInitials(lead.name)}
                  </Text>
                </View>
              </View>
              <View style={s.infoHeaderText}>
                <Text style={s.infoName}>{lead.name || 'Lead'}</Text>
                {lead.company && <Text style={s.infoCompany}>{lead.company}</Text>}
              </View>
            </View>
            <View style={s.statusBadges}>
              <View style={[s.statusBadge, { backgroundColor: C.primary + '15' }]}>
                <Text style={[s.statusBadgeText, { color: C.primary }]}>
                  {beautifyName(lead.phase)}
                </Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: C.secondary + '15' }]}>
                <Text style={[s.statusBadgeText, { color: C.secondary }]}>
                  {beautifyName(lead.subphase)}
                </Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: C.accent + '15' }]}>
                <Text style={[s.statusBadgeText, { color: C.accent }]}>
                  {beautifyName(lead.status)}
                </Text>
              </View>
            </View>
          </View>
        );

      case 'contact-info':
        return (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Contact Information</Text>
            {lead.emails && lead.emails.length > 0 ? lead.emails.map((email, idx) => (
              <View key={idx} style={s.detailRow}>
                <MaterialIcons name="email" size={20} color={C.primary} />
                <Text style={s.detailValue}>{email.email}</Text>
                <TouchableOpacity style={s.copyButton}>
                  <Ionicons name="copy-outline" size={16} color={C.textTertiary} />
                </TouchableOpacity>
              </View>
            )) : (
              <Text style={s.emptyText}>No emails</Text>
            )}
            {lead.phone_numbers && lead.phone_numbers.length > 0 ? lead.phone_numbers.map((phone, idx) => (
              <View key={idx} style={s.detailRow}>
                <MaterialIcons name="phone" size={20} color={C.primary} />
                <Text style={s.detailValue}>{phone.number}</Text>
                <TouchableOpacity style={s.copyButton}>
                  <Ionicons name="copy-outline" size={16} color={C.textTertiary} />
                </TouchableOpacity>
              </View>
            )) : (
              <Text style={s.emptyText}>No phone numbers</Text>
            )}
          </View>
        );

      case 'lead-specific-info':
        // Extract lead specific information from meta
        const hasLeadSpecificInfo = lead.meta && typeof lead.meta === 'object' && (
          lead.meta.area_requirements || 
          lead.meta.office_type || 
          lead.meta.location || 
          Object.keys(lead.meta).some(key => 
            !['area_requirements', 'office_type', 'location'].includes(key)
          )
        );

        if (!hasLeadSpecificInfo) {
          return null;
        }

        const defaultKeys = ['area_requirements', 'office_type', 'location'];
        const customFields = lead.meta ? Object.entries(lead.meta)
          .filter(([key]) => !defaultKeys.includes(key))
          .map(([key, value]) => ({ key, value: String(value) }))
          : [];

        return (
          <View style={s.section}>
            <View style={s.sectionHeaderWithIcon}>
              <MaterialIcons name="business" size={20} color={C.leadInfoBorder} />
              <Text style={s.sectionTitle}>Lead Specific Information</Text>
            </View>
            
            {lead.meta?.area_requirements && (
              <View style={s.metaRow}>
                <MaterialIcons name="square-foot" size={18} color={C.leadInfoBorder} />
                <Text style={s.metaLabel}>Area Requirements:</Text>
                <Text style={s.metaValue}>{lead.meta.area_requirements}</Text>
              </View>
            )}
            
            {lead.meta?.office_type && (
              <View style={s.metaRow}>
                <MaterialIcons name="business-center" size={18} color={C.leadInfoBorder} />
                <Text style={s.metaLabel}>Office Type:</Text>
                <Text style={s.metaValue}>{getOfficeTypeLabel(lead.meta.office_type)}</Text>
              </View>
            )}
            
            {lead.meta?.location && (
              <View style={s.metaRow}>
                <MaterialIcons name="location-on" size={18} color={C.leadInfoBorder} />
                <Text style={s.metaLabel}>Location Preference:</Text>
                <Text style={s.metaValue}>{lead.meta.location}</Text>
              </View>
            )}
            
            {customFields.length > 0 && (
              <View style={s.customFieldsSection}>
                <Text style={s.customFieldsTitle}>Additional Information</Text>
                {customFields.map((field, index) => (
                  <View key={index} style={s.customFieldItem}>
                    <View style={s.customFieldKeyContainer}>
                      <MaterialIcons name="category" size={16} color={C.customFieldBorder} />
                      <Text style={s.customFieldKey}>{beautifyName(field.key)}:</Text>
                    </View>
                    <Text style={s.customFieldValue}>{field.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      case 'metadata':
        return (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Metadata</Text>
            <View style={s.metadataRow}>
              <MaterialIcons name="calendar-today" size={18} color={C.textTertiary} />
              <Text style={s.metadataLabel}>Created:</Text>
              <Text style={s.metadataValue}>
                {formatDateTime(lead.created_at || lead.createdAt)}
              </Text>
            </View>
            {lead.assigned_to && (
              <View style={s.metadataRow}>
                <MaterialIcons name="person" size={18} color={C.textTertiary} />
                <Text style={s.metadataLabel}>Assigned to:</Text>
                <Text style={s.metadataValue}>
                  {lead.assigned_to.first_name} {lead.assigned_to.last_name}
                  {lead.assigned_to.full_name && lead.assigned_to.full_name !== `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}`
                    ? ` (${lead.assigned_to.full_name})`
                    : ''}
                </Text>
              </View>
            )}
            {lead.city && (
              <View style={s.metadataRow}>
                <MaterialIcons name="location-on" size={18} color={C.textTertiary} />
                <Text style={s.metadataLabel}>Location:</Text>
                <Text style={s.metadataValue}>{lead.city}</Text>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };
  
  const BackIcon = () => (
    <View style={s.backIcon}>
      <View style={s.backArrow} />
    </View>
  );

  const sections = useMemo(() => {
    const sectionsArray = ['lead-info', 'contact-info', 'lead-specific-info', 'metadata'];
    return sectionsArray;
  }, [lead.meta]);

  return (
    <View style={s.container}>
      {/* Header with Back Button */}
      <View style={s.headerSafeArea}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={onBack}
            style={s.backButton}
          >
            <BackIcon />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Lead Details</Text>
          <View style={s.headerPlaceholder} />
        </View>
      </View>

      {/* Content */}
      <View style={s.contentContainer}>
        <FlatList
          data={sections}
          renderItem={renderSection}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          ListFooterComponent={
            <SafeAreaView edges={['bottom']}>
              <View style={s.bottomSpacing} />
            </SafeAreaView>
          }
        />
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  headerSafeArea: {
    backgroundColor: C.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    minHeight: 56,
    marginTop: Platform.OS === 'ios' ? 30 : 20,
  },
  backButton: {
    padding: 6,
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: C.background,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    flexGrow: 1,
  },

  // Info Card Styles
  infoCard: {
    backgroundColor: C.surface,
    marginBottom: 12,
    borderRadius: 8,
    padding: 16,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoAvatarContainer: {
    marginRight: 12
  },
  infoAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF'
  },
  infoHeaderText: {
    flex: 1
  },
  infoName: {
    fontSize: 18,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 2,
  },
  infoCompany: {
    fontSize: 14,
    color: C.textSecondary
  },
  statusBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '500'
  },

  // Section Styles
  section: {
    backgroundColor: C.surface,
    marginBottom: 10,
    borderRadius: 8,
    padding: 16,
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.primary,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    backgroundColor: C.background,
    borderRadius: 6,
  },
  detailValue: {
    fontSize: 14,
    color: C.textPrimary,
    marginLeft: 10,
    flex: 1,
  },
  copyButton: {
    padding: 4
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  metadataLabel: {
    fontSize: 13,
    color: C.textSecondary,
    marginLeft: 8,
    marginRight: 4,
    minWidth: 90,
  },
  metadataValue: {
    fontSize: 13,
    color: C.textPrimary,
    flex: 1
  },
  emptyText: {
    fontSize: 13,
    color: C.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  bottomSpacing: {
    height: 30
  },
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'row',
    alignContent: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },

  // Lead Specific Information Styles
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 10,
    backgroundColor: C.leadInfoBg,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: C.leadInfoBorder,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
    marginLeft: 8,
    marginRight: 4,
    minWidth: 120,
  },
  metaValue: {
    fontSize: 13,
    color: C.textPrimary,
    flex: 1,
    flexWrap: 'wrap',
  },
  customFieldsSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
  },
  customFieldsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.customFieldBorder,
    marginBottom: 8,
  },
  customFieldItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    padding: 10,
    backgroundColor: C.customFieldBg,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: C.customFieldBorder,
  },
  customFieldKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
  },
  customFieldKey: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
    marginLeft: 6,
  },
  customFieldValue: {
    fontSize: 13,
    color: C.textPrimary,
    flex: 1,
    marginLeft: 12,
    flexWrap: 'wrap',
  },
});

export default LeadDetailsInfo;