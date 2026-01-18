import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors } from './types';

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
};

interface InvoiceFile {
  id: number;
  file: string;
  created_at: string;
  updated_at: string;
}

interface InvoiceData {
  lead: any;
  vendor_name: string;
  vendor_gst_or_pan: string;
  vendor_address?: string;
  terrace_rent?: string;
  billing_area: string;
  car_parking: string;
  property_type: string;
  particular_matter_to_mention: string;
  executive_name: string;
  created_at: string;
  updated_at: string;
  files?: InvoiceFile[];
}

interface InvoiceProps {
  leadId: number;
  leadName: string;
  token: string | null;
  theme: ThemeColors;
  onBack: () => void;
}

const Invoice: React.FC<InvoiceProps> = ({
  leadId,
  leadName,
  token,
  theme,
  onBack,
}) => {
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  useEffect(() => {
    fetchInvoice();
  }, []);

  const fetchInvoice = async () => {
    if (!token) {
      onBack();
      setTimeout(() => {
        Alert.alert('Error', 'Authentication token not found');
      }, 300);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/employee/getInvoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          lead_id: leadId,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Invoice for this lead is yet to be raised';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If parsing fails, use default message
        }

        onBack();
        setTimeout(() => {
          Alert.alert('Invoice Not Found', errorMessage);
        }, 300);
        return;
      }

      const data = await response.json();
      console.log('Invoice data received:', data);

      // Check if invoices array exists and has at least one invoice
      if (!data.invoices || data.invoices.length === 0) {
        onBack();
        setTimeout(() => {
          Alert.alert('Invoice Not Found', 'No invoice found for this lead');
        }, 300);
        return;
      }

      // Get the first invoice from the array
      const invoiceData = {
        ...data.invoices[0],
        files: data.invoices[0].files || []
      };

      setInvoice(invoiceData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      onBack();
      setTimeout(() => {
        Alert.alert('Error', 'Failed to fetch invoice. Please try again.');
      }, 300);
    }
  };

  const formatDateTime = (dateString: string): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  };

  const handleDownloadFile = async (fileUrl: string) => {
    try {
      const supported = await Linking.canOpenURL(fileUrl);
      if (supported) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert('Error', 'Unable to open this file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const BackIcon = () => (
    <View style={s.backIcon}>
      <View style={s.backArrow} />
    </View>
  );

  const InfoRow: React.FC<{ label: string; value: string; icon?: string }> = ({
    label,
    value,
    icon,
  }) => (
    <View style={s.infoRow}>
      {icon && (
        <MaterialIcons name={icon as any} size={20} color={C.primary} style={s.infoIcon} />
      )}
      <View style={s.infoContent}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value || '-'}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={s.container}>
        <SafeAreaView style={s.headerSafeArea} edges={['top']}>
          <View style={s.header}>
            <StatusBar barStyle="light-content" backgroundColor={C.primary} />
            <TouchableOpacity onPress={onBack} style={s.backButton}>
              <BackIcon />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Invoice Details</Text>
            <View style={s.headerPlaceholder} />
          </View>
        </SafeAreaView>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingText}>Loading invoice...</Text>
        </View>
      </View>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <View style={s.container}>
      <SafeAreaView style={s.headerSafeArea} edges={['top']}>
        <View style={s.header}>
          <StatusBar barStyle="light-content" backgroundColor={C.primary} />
          <TouchableOpacity onPress={onBack} style={s.backButton}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Invoice Details</Text>
          <View style={s.headerPlaceholder} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Lead Info Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <MaterialIcons name="receipt-long" size={24} color={C.primary} />
            <Text style={s.cardTitle}>Invoice for {leadName}</Text>
          </View>
          <View style={s.metadataRow}>
            <MaterialIcons name="calendar-today" size={16} color={C.textTertiary} />
            <Text style={s.metadataLabel}>Created:</Text>
            <Text style={s.metadataValue}>{formatDateTime(invoice.created_at)}</Text>
          </View>
          <View style={s.metadataRow}>
            <MaterialIcons name="update" size={16} color={C.textTertiary} />
            <Text style={s.metadataLabel}>Updated:</Text>
            <Text style={s.metadataValue}>{formatDateTime(invoice.updated_at)}</Text>
          </View>
        </View>

        {/* Vendor Information */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Vendor Information</Text>
          <InfoRow label="Vendor Name" value={invoice.vendor_name} icon="business" />
          <InfoRow label="GST/PAN" value={invoice.vendor_gst_or_pan} icon="badge" />
          {invoice.vendor_address && invoice.vendor_address.trim() && (
            <InfoRow label="Address" value={invoice.vendor_address} icon="location-on" />
          )}
        </View>

        {/* Property Details */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Property Details</Text>
          <InfoRow label="Property Type" value={invoice.property_type} icon="home" />
          <InfoRow label="Billing Area" value={invoice.billing_area} icon="square-foot" />
          {invoice.car_parking && invoice.car_parking.trim() && (
            <InfoRow label="Car Parking" value={invoice.car_parking} icon="local-parking" />
          )}
          {invoice.terrace_rent && invoice.terrace_rent.trim() && (
            <InfoRow label="Terrace Rent" value={invoice.terrace_rent} icon="roofing" />
          )}
        </View>

        {/* Additional Information */}
        {((invoice.executive_name && invoice.executive_name.trim()) ||
          (invoice.particular_matter_to_mention && invoice.particular_matter_to_mention.trim())) && (
            <View style={s.card}>
              <Text style={s.sectionTitle}>Additional Information</Text>
              {invoice.executive_name && invoice.executive_name.trim() && (
                <InfoRow label="Executive Name" value={invoice.executive_name} icon="person" />
              )}
              {invoice.particular_matter_to_mention && invoice.particular_matter_to_mention.trim() && (
                <View style={s.infoRow}>
                  <MaterialIcons name="notes" size={20} color={C.primary} style={s.infoIcon} />
                  <View style={s.infoContent}>
                    <Text style={s.infoLabel}>Special Notes</Text>
                    <Text style={s.infoValue}>{invoice.particular_matter_to_mention}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

        {/* Attached Files */}
        {invoice.files && invoice.files.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Attached Files ({invoice.files.length})</Text>
            {invoice.files.map((file, index) => {
              const fileName = file.file.split('/').pop() || `File ${index + 1}`;
              return (
                <TouchableOpacity
                  key={file.id}
                  style={s.fileItem}
                  onPress={() => handleDownloadFile(file.file)}
                >
                  <View style={s.fileIconContainer}>
                    <MaterialIcons name="insert-drive-file" size={24} color={C.primary} />
                  </View>
                  <View style={s.fileInfo}>
                    <Text style={s.fileName} numberOfLines={1}>
                      {fileName}
                    </Text>
                    <Text style={s.fileHint}>Tap to open</Text>
                  </View>
                  <Ionicons name="download-outline" size={20} color={C.primary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
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
    backgroundColor: C.primary,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.primaryDark,
  },
  backButton: {
    padding: 6,
  },
  backIcon: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: C.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.primary,
    marginLeft: 10,
    flex: 1,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  metadataLabel: {
    fontSize: 13,
    color: C.textSecondary,
    marginLeft: 8,
    marginRight: 4,
    minWidth: 70,
  },
  metadataValue: {
    fontSize: 13,
    color: C.textPrimary,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.primary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border + '40',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: C.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: C.textPrimary,
    lineHeight: 20,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
    marginBottom: 2,
  },
  fileHint: {
    fontSize: 12,
    color: C.textSecondary,
  },
});

export default Invoice;