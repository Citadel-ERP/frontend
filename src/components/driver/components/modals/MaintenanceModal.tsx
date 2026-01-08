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
  Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MaintenanceModalProps } from '../../types';
import { styles } from '../../styles';

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

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

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={[
          styles.modalOverlay,
          { 
            justifyContent: keyboardVisible ? 'flex-start' : 'center',
            paddingTop: keyboardVisible ? Platform.OS === 'ios' ? 40 : 20 : 0
          }
        ]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[
                styles.modalContainer,
                keyboardVisible && {
                  maxHeight: Dimensions.get('window').height - keyboardHeight - 100,
                  marginTop: 0
                }
              ]}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                    <Ionicons name="close" size={24} color="#075E54" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Log Maintenance</Text>
                  <View style={{ width: 40 }} />
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.modalScrollContent,
                    keyboardVisible && { paddingBottom: 20 }
                  ]}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                >
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
                        // returnKeyType="next"
                        blurOnSubmit={false}
                      />
                    </View>
                  </View>

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
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <MaterialIcons
                        name="date-range"
                        size={20}
                        color="#075E54"
                        style={styles.buttonIcon}
                      />
                      <Text style={[styles.dateButtonText, !form.start_date && styles.dateButtonPlaceholder]}>
                        {form.start_date || 'Select start date'}
                      </Text>
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
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <MaterialIcons
                        name="date-range"
                        size={20}
                        color="#075E54"
                        style={styles.buttonIcon}
                      />
                      <Text style={[styles.dateButtonText, !form.end_date && styles.dateButtonPlaceholder]}>
                        {form.end_date || 'Select end date'}
                      </Text>
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

                  <View style={styles.formGroup}>
                    <TouchableOpacity style={styles.documentButton} onPress={handleDocumentPick}>
                      <MaterialIcons
                        name="attach-file"
                        size={20}
                        color="#075E54"
                        style={styles.buttonIcon}
                      />
                      <Text style={styles.documentButtonText}>
                        {form.document ? form.document.name || 'Document Selected' : 'Attach Document (Optional)'}
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
                        (!form.cost || !form.description || !form.start_date || !form.end_date) &&
                          styles.modalSubmitButtonDisabled,
                      ]}
                      onPress={onSubmit}
                      disabled={loading || !form.cost || !form.description || !form.start_date || !form.end_date}
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
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};