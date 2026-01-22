import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';
import { WHATSAPP_COLORS } from './constants';
import { Header } from './header';

interface CommonGrievanceProps {
  onSubmit: (data: { common_grievance: string; description: string }) => Promise<void>;
  onBack: () => void;
  loading: boolean;
}

export const CommonGrievance: React.FC<CommonGrievanceProps> = ({
  onSubmit,
  onBack,
  loading
}) => {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
    common_grievance: '',
    description: ''
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async () => {
    console.log('handleSubmit called');  // ADD THIS
    if (!formData.common_grievance.trim()) {
      Alert.alert('Validation Error', 'Please enter a grievance type');
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description');
      return;
    }

    await onSubmit(formData);
  };

  const isFormValid = formData.common_grievance.trim() && formData.description.trim();

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={WHATSAPP_COLORS.primaryDark}
      />

      <Header
        title="Add Common Grievance"
        subtitle=""
        onBack={onBack}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        enabled
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentPadded}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}  // ADD THIS
          nestedScrollEnabled={true}  // ADD THIS
        >
          {/* Info Card */}
          <View style={styles.infoCardBanner}>
            <View style={styles.infoIconWrapper}>
              <Ionicons name="alert-circle" size={24} color={WHATSAPP_COLORS.primary} />
            </View>
            <View style={styles.infoTextWrapper}>
              <Text style={styles.infoTitle}>Create Grievance Type</Text>
              <Text style={styles.infoDescription}>
                Define a new grievance category that employees can use when reporting workplace issues
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={styles.modernFormCard}>
            {/* Grievance Type Field */}
            <View style={styles.modernFormSection}>
              <View style={styles.modernLabelContainer}>
                <Text style={styles.modernLabel}>Grievance Type</Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredBadgeText}>Required</Text>
                </View>
              </View>

              <View style={[
                styles.modernInputContainer,
                focusedField === 'grievance_type' && styles.modernInputContainerFocused
              ]}>
                <View style={styles.inputIconContainer}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color={focusedField === 'grievance_type' ? WHATSAPP_COLORS.primary : WHATSAPP_COLORS.gray}
                  />
                </View>
                <TextInput
                  style={styles.modernTextInput}
                  value={formData.common_grievance}
                  onChangeText={(text) => {
                    if (text.length <= 100) {
                      setFormData({ ...formData, common_grievance: text });
                    }
                  }}
                  placeholder="e.g., Harassment, Discrimination, Safety Concern"
                  placeholderTextColor={WHATSAPP_COLORS.placeholderGray}
                  maxLength={100}
                  onFocus={() => setFocusedField('grievance_type')}
                  onBlur={() => setFocusedField(null)}
                  editable={!loading}  // ADD THIS
                  autoCorrect={false}  // ADD THIS
                />
              </View>

              <View style={styles.inputFooter}>
                <View style={styles.inputHintContainer}>
                  <Ionicons name="bulb-outline" size={14} color={WHATSAPP_COLORS.gray} />
                  <Text style={styles.inputHint}>
                    This will appear in dropdown menus
                  </Text>
                </View>
                <Text style={[
                  styles.characterCounter,
                  formData.common_grievance.length === 100 && styles.characterCounterWarning
                ]}>
                  {formData.common_grievance.length}/100
                </Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.formDivider} />

            {/* Description Field */}
            <View style={styles.modernFormSection}>
              <View style={styles.modernLabelContainer}>
                <Text style={styles.modernLabel}>Description</Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredBadgeText}>Required</Text>
                </View>
              </View>

              <View style={[
                styles.modernTextAreaContainer,
                focusedField === 'description' && styles.modernInputContainerFocused
              ]}>
                <View style={styles.textAreaIconContainer}>
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={focusedField === 'description' ? WHATSAPP_COLORS.primary : WHATSAPP_COLORS.gray}
                  />
                </View>
                <TextInput
                  style={styles.modernTextArea}
                  value={formData.description}
                  onChangeText={(text) => {
                    if (text.length <= 500) {
                      setFormData({ ...formData, description: text });
                    }
                  }}
                  placeholder="Provide a clear description of this grievance type. Include what situations or issues this category covers and any important guidelines..."
                  placeholderTextColor={WHATSAPP_COLORS.placeholderGray}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={500}
                  onFocus={() => setFocusedField('description')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              <View style={styles.inputFooter}>
                <View style={styles.inputHintContainer}>
                  <Ionicons name="information-circle-outline" size={14} color={WHATSAPP_COLORS.gray} />
                  <Text style={styles.inputHint}>
                    Help employees identify the right category
                  </Text>
                </View>
                <Text style={[
                  styles.characterCounter,
                  formData.description.length === 500 && styles.characterCounterWarning
                ]}>
                  {formData.description.length}/500
                </Text>
              </View>
            </View>
          </View>

          {/* Preview Card */}
          {(formData.common_grievance.trim() || formData.description.trim()) && (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Ionicons name="eye-outline" size={20} color={WHATSAPP_COLORS.primary} />
                <Text style={styles.previewTitle}>Preview</Text>
              </View>
              <View style={styles.previewContent}>
                {formData.common_grievance.trim() && (
                  <View style={styles.previewItem}>
                    <Text style={styles.previewLabel}>Grievance Type:</Text>
                    <Text style={styles.previewValue}>{formData.common_grievance}</Text>
                  </View>
                )}
                {formData.description.trim() && (
                  <View style={styles.previewItem}>
                    <Text style={styles.previewLabel}>Description:</Text>
                    <Text style={styles.previewValue}>{formData.description}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Fixed Bottom Action Buttons */}
        <View style={[styles.fixedBottomContainer, { paddingBottom: insets.bottom || 16 }]}>
          <TouchableOpacity
            style={styles.modernCancelButton}
            onPress={onBack}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={20} color={WHATSAPP_COLORS.darkGray} />
            <Text style={styles.modernCancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modernSubmitButton,
              !isFormValid && styles.modernSubmitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={loading || !isFormValid}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color={WHATSAPP_COLORS.white} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={WHATSAPP_COLORS.white} />
                <Text style={styles.modernSubmitButtonText}>
                  Create Grievance Type
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};