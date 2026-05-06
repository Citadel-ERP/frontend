import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MaintenanceModalProps } from './types';
import { styles } from './styles';
import CrossPlatformDatePicker from '../../services/CrossPlatformDatePicker';
// ↑ Adjust this import path to wherever you place CrossPlatformDatePicker
//   relative to this file, e.g. '../../components/CrossPlatformDatePicker'

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isVisible,
  onClose,
  onSubmit,
  form,
  setForm,
  loading,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // ─── Document picker ────────────────────────────────────────────────────────

  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/*',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const document = result.assets[0];
        setForm((prev) => ({
          ...prev,
          document: {
            uri: document.uri,
            name: document.name,
            type: document.mimeType || 'application/octet-stream',
            size: document.size || 0,
          },
        }));
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  // ─── Validation ─────────────────────────────────────────────────────────────

  const isFormValid =
    Boolean(form.cost) &&
    Boolean(form.description) &&
    Boolean(form.start_date) &&
    Boolean(form.end_date);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <TouchableOpacity style={styles.detailBackButton} onPress={onClose}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.modalTitle}>Add Maintenance</Text>
                <Text style={styles.modalSubtitle}>Record vehicle maintenance</Text>
              </View>
            </View>
          </View>

          {/* ── Scrollable body ─────────────────────────────────────────────── */}
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
            removeClippedSubviews={false}
          >

            {/* Cost Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="cash" size={22} color="#008069" />
                <Text style={styles.cardTitle}>Cost Details</Text>
              </View>
              <View style={styles.formGroup}>
                <View style={styles.labelContainer}>
                  <Text style={styles.formLabel}>Maintenance Cost</Text>
                  <Text style={styles.requiredStar}>*</Text>
                </View>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons
                    name="currency-inr"
                    size={20}
                    color="#008069"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={form.cost}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, cost: text }))}
                    placeholder="Enter cost"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                      }, 150);
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Description Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="description" size={22} color="#008069" />
                <Text style={styles.cardTitle}>Work Description</Text>
              </View>
              <View style={styles.formGroup}>
                <View style={styles.labelContainer}>
                  <Text style={styles.formLabel}>Description</Text>
                  <Text style={styles.requiredStar}>*</Text>
                </View>
                <View style={styles.textAreaContainer}>
                  <TextInput
                    style={styles.textAreaInput}
                    value={form.description}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
                    placeholder="Describe the maintenance work performed"
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    scrollEnabled={false}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({ y: 150, animated: true });
                      }, 150);
                    }}
                  />
                </View>
              </View>
            </View>

            {/* ── Date Section ──────────────────────────────────────────────── */}
            {/*
             * Previously: two separate DateTimePicker instances with local state
             * (showStartDatePicker, showEndDatePicker, startDate, endDate).
             *
             * Now: CrossPlatformDatePicker handles all platform rendering
             * internally. The form values (YYYY-MM-DD strings) flow directly
             * from props — no local date state needed here at all.
             */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="date-range" size={22} color="#008069" />
                <Text style={styles.cardTitle}>Maintenance Period</Text>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.labelContainer}>
                  <Text style={styles.formLabel}>Start Date</Text>
                  <Text style={styles.requiredStar}>*</Text>
                </View>
                <CrossPlatformDatePicker
                  value={form.start_date}
                  onChange={(dateString) =>
                    setForm((prev) => ({ ...prev, start_date: dateString }))
                  }
                  placeholder="Select start date"
                  accentColor="#008069"
                  buttonStyle={styles.dateTimeButton as any}
                  accessibilityLabel="Maintenance start date"
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.labelContainer}>
                  <Text style={styles.formLabel}>End Date</Text>
                  <Text style={styles.requiredStar}>*</Text>
                </View>
                <CrossPlatformDatePicker
                  value={form.end_date}
                  onChange={(dateString) =>
                    setForm((prev) => ({ ...prev, end_date: dateString }))
                  }
                  placeholder="Select end date"
                  minimumDate={form.start_date ? new Date(form.start_date + 'T00:00:00') : undefined}
                  accentColor="#008069"
                  buttonStyle={styles.dateTimeButton as any}
                  accessibilityLabel="Maintenance end date"
                />
              </View>
            </View>

            {/* Document Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="attach-file" size={22} color="#008069" />
                <Text style={styles.cardTitle}>Supporting Documents</Text>
              </View>
              <View style={styles.formGroup}>
                <View style={styles.labelContainer}>
                  <Text style={styles.formLabel}>Attachment</Text>
                  <Text style={styles.optionalText}>(optional)</Text>
                </View>
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={handleDocumentPick}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="cloud-upload" size={20} color="#008069" />
                  <Text style={styles.searchButtonText}>
                    {form.document ? 'Change Document' : 'Upload Document'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>

                {form.document && (
                  <View style={styles.selectedUserCard}>
                    <View style={styles.selectedUserContent}>
                      <View style={styles.selectedUserAvatar}>
                        <MaterialIcons name="insert-drive-file" size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.selectedUserInfo}>
                        <Text style={styles.selectedUserName} numberOfLines={1}>
                          {form.document.name}
                        </Text>
                        <Text style={styles.selectedUserEmail}>
                          {form.document.size
                            ? (form.document.size / 1024).toFixed(2) + ' KB'
                            : 'Unknown size'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeUserButton}
                      onPress={() => setForm((prev) => ({ ...prev, document: null }))}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <View style={styles.modalActionsFooter}>
            <TouchableOpacity
              style={styles.backButtonSecondary}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#008069" />
              <Text style={styles.backButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextButton, !isFormValid && styles.nextButtonDisabled]}
              onPress={onSubmit}
              disabled={loading || !isFormValid}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>Submit</Text>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

export default MaintenanceModal;