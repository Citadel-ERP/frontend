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
import { MaintenanceModalProps } from '../../types';
import { styles } from '../../styles';
import CrossPlatformDatePicker from '../../../../services/CrossPlatformDatePicker';

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isVisible,
  onClose,
  onSubmit,
  form,
  setForm,
  loading,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // ── Document picker ──────────────────────────────────────────────────────
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

      if (!result.canceled && result.assets && result.assets.length > 0) {
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

  const isFormValid =
    Boolean(form.cost) &&
    Boolean(form.description) &&
    Boolean(form.start_date) &&
    Boolean(form.end_date);

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

          {/* ── Header ── */}
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#075E54" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Log Maintenance</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >

            {/* ── Cost ── */}
            <View style={styles.formGroup}>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons
                  name="currency-inr"
                  size={20}
                  color="#075E54"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={form.cost}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, cost: text }))}
                  placeholder="Enter maintenance cost"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  blurOnSubmit={false}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                    }, 150);
                  }}
                />
              </View>
            </View>

            {/* ── Description ── */}
            <View style={styles.formGroup}>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="description"
                  size={20}
                  color="#075E54"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.descriptionInput}
                  value={form.description}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
                  placeholder="Describe the maintenance work"
                  placeholderTextColor="#888"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  returnKeyType="done"
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 100, animated: true });
                    }, 150);
                  }}
                />
              </View>
            </View>

            {/* ── Start Date ── */}
            <View style={styles.formGroup}>
              <CrossPlatformDatePicker
                value={form.start_date}
                onChange={(dateString) =>
                  setForm((prev) => ({ ...prev, start_date: dateString }))
                }
                placeholder="Select start date"
                accentColor="#075E54"
                accessibilityLabel="Maintenance start date"
              />
            </View>

            {/* ── End Date ── */}
            <View style={styles.formGroup}>
              <CrossPlatformDatePicker
                value={form.end_date}
                onChange={(dateString) =>
                  setForm((prev) => ({ ...prev, end_date: dateString }))
                }
                placeholder="Select end date"
                minimumDate={form.start_date ? new Date(form.start_date + 'T00:00:00') : undefined}
                accentColor="#075E54"
                accessibilityLabel="Maintenance end date"
              />
            </View>

            {/* ── Document ── */}
            <View style={styles.formGroup}>
              <TouchableOpacity style={styles.documentButton} onPress={handleDocumentPick}>
                <MaterialIcons
                  name="attach-file"
                  size={20}
                  color="#075E54"
                  style={styles.buttonIcon}
                />
                <Text style={styles.documentButtonText}>
                  {form.document
                    ? form.document.name || 'Document Selected'
                    : 'Attach Document (Optional)'}
                </Text>
              </TouchableOpacity>

              {form.document && (
                <View style={styles.documentInfo}>
                  <View style={styles.documentRow}>
                    <MaterialIcons name="insert-drive-file" size={16} color="#075E54" />
                    <Text style={styles.documentName} numberOfLines={1}>
                      {form.document.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeDocumentButton}
                    onPress={() => setForm((prev) => ({ ...prev, document: null }))}
                  >
                    <Ionicons name="close-circle" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* ── Buttons ── */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitButton,
                  !isFormValid && styles.modalSubmitButtonDisabled,
                ]}
                onPress={onSubmit}
                disabled={loading || !isFormValid}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};