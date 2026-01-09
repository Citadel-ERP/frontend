import React from 'react';
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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FuelLogModalProps } from '../../types';
import { styles } from '../../styles';

export const FuelLogModal: React.FC<FuelLogModalProps> = ({
  isVisible,
  onClose,
  onSubmit,
  form,
  setForm,
  loading,
}) => {
  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#075E54" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Fuel Log</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formGroup}>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons
                    name="fuel"
                    size={20}
                    color="#075E54"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={form.quantity}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, quantity: text }))}
                    placeholder="Enter fuel quantity (Liters)"
                    placeholderTextColor="#888"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

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
                    placeholder="Enter fuel cost"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons
                    name="speedometer"
                    size={20}
                    color="#075E54"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={form.odometer_reading}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, odometer_reading: text }))}
                    placeholder="Enter odometer reading (KM)"
                    placeholderTextColor="#888"
                    keyboardType="numeric"
                  />
                </View>
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
                    (!form.quantity || !form.cost || !form.odometer_reading) &&
                      styles.modalSubmitButtonDisabled,
                  ]}
                  onPress={onSubmit}
                  disabled={loading || !form.quantity || !form.cost || !form.odometer_reading}
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
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};