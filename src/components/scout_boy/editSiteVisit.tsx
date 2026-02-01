import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BACKEND_URL } from '../../config/config';
import { ThemeColors, Visit } from './types';

const WHATSAPP_COLORS = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  primaryDark: '#054D44',
  secondary: '#25D366',
  accent: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#e7e6e5',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#25D366',
  info: '#3B82F6',
  white: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
};

interface EditSiteVisitProps {
  visit: Visit;
  onBack: () => void;
  onUpdate?: () => void;
  token: string | null;
  theme: ThemeColors;
}

const EditSiteVisit: React.FC<EditSiteVisitProps> = ({ visit, onBack, onUpdate, token }) => {
  const [loading, setLoading] = useState(false);

  const handleMarkComplete = async () => {
    if (!token) {
      Alert.alert('Error', 'Token not found. Please login again.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/employee/updateVisitDetails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          visit_ids: [visit.id],
          status: 'scout_completed'
        }),
      });

      const data = await response.json();
      console.log('Mark complete response:', data);

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      Alert.alert('Success', 'Visit marked as completed!', [
        {
          text: 'OK',
          onPress: () => {
            // Call the onUpdate callback to refresh parent component
            if (onUpdate) {
              onUpdate();
            }
            // Go back after a short delay
            setTimeout(() => {
              onBack();
            }, 300);
          }
        }
      ]);
    } catch (error) {
      console.error('Error marking visit complete:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to mark visit as complete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={WHATSAPP_COLORS.primary} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Visit</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.section}>
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle" size={48} color={WHATSAPP_COLORS.primary} />
            <Text style={styles.infoTitle}>Mark Visit as Completed</Text>
            <Text style={styles.infoDescription}>
              This will update the visit status to "Scout Completed". 
              Are you sure you want to proceed?
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.completeButton, loading && styles.buttonDisabled]}
            onPress={handleMarkComplete}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.completeButtonText}>Mark as Completed</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: WHATSAPP_COLORS.primary,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: WHATSAPP_COLORS.background,
    padding: 16,
  },
  section: {
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: WHATSAPP_COLORS.border,
    alignItems: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: WHATSAPP_COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  infoDescription: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  completeButton: {
    backgroundColor: WHATSAPP_COLORS.success,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  completeButtonText: {
    color: WHATSAPP_COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default EditSiteVisit;