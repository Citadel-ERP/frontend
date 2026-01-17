import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MaintenanceModalProps } from './types';
import { styles } from './styles';

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isVisible,
  onClose,
  onSubmit,
  form,
  setForm,
  loading,
}) => {
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const formatDateForDisplay = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      setForm((prev) => ({ ...prev, start_date: formatDateForDisplay(selectedDate) }));
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
      setForm((prev) => ({ ...prev, end_date: formatDateForDisplay(selectedDate) }));
    }
  };

  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const document = result.assets[0];
        setForm(prev => ({ 
          ...prev, 
          document: {
            uri: document.uri,
            name: document.name,
            type: document.mimeType || 'application/octet-stream',
            size: document.size || 0,
          }
        }));
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const isFormValid = form.cost && form.description && form.start_date && form.end_date;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerLeft}>
                <TouchableOpacity 
                  style={styles.detailBackButton} 
                  onPress={onClose}
                >
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.modalTitle}>Add Maintenance</Text>
                  <Text style={styles.modalSubtitle}>Record vehicle maintenance</Text>
                </View>
              </View>
            </View>

            {/* Content */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              bounces={true}
              scrollEventThrottle={16}
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
                    />
                  </View>
                </View>
              </View>

              {/* Date Section */}
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
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowStartDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="event" size={20} color="#008069" />
                    <Text style={[
                      styles.dateTimeButtonText,
                      !form.start_date && { color: '#999' }
                    ]}>
                      {form.start_date || 'Select start date'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                  {showStartDatePicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="default"
                      onChange={handleStartDateChange}
                    />
                  )}
                </View>

                <View style={styles.formGroup}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.formLabel}>End Date</Text>
                    <Text style={styles.requiredStar}>*</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowEndDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="event" size={20} color="#008069" />
                    <Text style={[
                      styles.dateTimeButtonText,
                      !form.end_date && { color: '#999' }
                    ]}>
                      {form.end_date || 'Select end date'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                  {showEndDatePicker && (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display="default"
                      onChange={handleEndDateChange}
                    />
                  )}
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
                            {form.document.size ? (form.document.size / 1024).toFixed(2) + ' KB' : 'Unknown size'}
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

            {/* Footer Actions */}
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
                style={[
                  styles.nextButton,
                  !isFormValid && styles.nextButtonDisabled,
                ]}
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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default MaintenanceModal;