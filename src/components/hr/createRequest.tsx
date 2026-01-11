import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';
import { WHATSAPP_COLORS } from './constants';
import { Header } from './header';
import { RequestNature, TabType } from './types';

interface CreateRequestProps {
  activeTab: TabType;
  newItemForm: { nature: string; natureName: string; description: string };
  onFormChange: (form: { nature: string; natureName: string; description: string }) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
  onOpenDropdown: () => void;
}

export const CreateRequest: React.FC<CreateRequestProps> = ({
  activeTab,
  newItemForm,
  onFormChange,
  onSubmit,
  onBack,
  loading,
  onOpenDropdown
}) => {
  const insets = useSafeAreaInsets();

  const getTypeIcon = () => {
    if (!newItemForm.natureName) return activeTab === 'requests' ? 'document-text' : 'alert-circle';
    
    const name = newItemForm.natureName.toLowerCase();
    if (activeTab === 'requests') {
      if (name.includes('leave') || name.includes('time off')) return 'calendar';
      if (name.includes('salary') || name.includes('pay')) return 'cash';
      if (name.includes('promotion') || name.includes('raise')) return 'trending-up';
      if (name.includes('transfer')) return 'swap-horizontal';
      if (name.includes('training')) return 'school';
      if (name.includes('equipment')) return 'desktop';
      return 'document-text';
    } else {
      if (name.includes('harassment')) return 'warning';
      if (name.includes('discrimination')) return 'ban';
      if (name.includes('workload')) return 'barbell';
      if (name.includes('management')) return 'people';
      if (name.includes('policy')) return 'book';
      if (name.includes('facility')) return 'business';
      return 'alert-circle';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={WHATSAPP_COLORS.primaryDark}
      />

      <Header
        title={`New ${activeTab === 'requests' ? 'Request' : 'Grievance'}`}
        subtitle="Submit to HR Department"
        onBack={onBack}
      />

      <View style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.formCard}>
            <View style={styles.formSection}>
              <View style={styles.formLabelContainer}>
                <Text style={styles.formLabel}>
                  Type of {activeTab === 'requests' ? 'Request' : 'Grievance'}
                </Text>
                <Text style={styles.requiredLabel}>Required</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.selectField,
                  !newItemForm.natureName && styles.selectFieldEmpty
                ]}
                onPress={onOpenDropdown}
                activeOpacity={0.7}
              >
                <View style={styles.selectFieldLeft}>
                  <View style={[
                    styles.fieldIconContainer,
                    { backgroundColor: !newItemForm.natureName ? 
                      'rgba(18, 140, 126, 0.1)' : 
                      newItemForm.nature === 'other' ? 'rgba(156, 39, 176, 0.1)' : 'rgba(18, 140, 126, 0.1)' }
                  ]}>
                    <Ionicons
                      name={getTypeIcon()}
                      size={20}
                      color={!newItemForm.natureName ? WHATSAPP_COLORS.gray : 
                        newItemForm.nature === 'other' ? WHATSAPP_COLORS.purple : WHATSAPP_COLORS.primary}
                    />
                  </View>
                  <View style={styles.selectFieldTextContainer}>
                    <Text style={[
                      styles.selectFieldText,
                      !newItemForm.natureName && styles.placeholderText
                    ]}>
                      {newItemForm.natureName || 'Select type...'}
                    </Text>
                    {newItemForm.natureName && (
                      <Text style={styles.selectFieldHint}>
                        Tap to change selection
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={WHATSAPP_COLORS.gray} 
                />
              </TouchableOpacity>
              {!newItemForm.natureName && (
                <Text style={styles.fieldHelpText}>
                  Tap to select from available {activeTab === 'requests' ? 'request' : 'grievance'} types
                </Text>
              )}
            </View>

            <View style={styles.formSection}>
              <View style={styles.formLabelContainer}>
                <Text style={styles.formLabel}>Description</Text>
                <Text style={styles.requiredLabel}>Required</Text>
              </View>
              <View style={styles.textAreaContainer}>
                <TextInput
                  style={styles.textArea}
                  value={newItemForm.description}
                  onChangeText={(text) => {
                    if (text.length <= 500) {
                      onFormChange({ ...newItemForm, description: text });
                    }
                  }}
                  placeholder={`Describe your ${activeTab.slice(0, -1)} in detail...`}
                  placeholderTextColor={WHATSAPP_COLORS.gray}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <View style={styles.textAreaFooter}>
                  <View style={styles.characterCounter}>
                    <Ionicons name="information-circle-outline" size={16} color={WHATSAPP_COLORS.gray} />
                    <Text style={styles.characterHint}>Be specific and include relevant details</Text>
                  </View>
                  <Text style={[
                    styles.characterCount,
                    newItemForm.description.length === 500 && styles.characterCountWarning
                  ]}>
                    {newItemForm.description.length}/500
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onBack}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={20}  />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!newItemForm.nature || !newItemForm.description.trim()) && styles.submitButtonDisabled
              ]}
              onPress={onSubmit}
              disabled={loading || !newItemForm.nature || !newItemForm.description.trim()}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={WHATSAPP_COLORS.white} size="small" />
              ) : (
                <View style={styles.submitButtonContent}>
                  <Ionicons name="paper-plane-outline" size={20} color={WHATSAPP_COLORS.white} />
                  <Text style={styles.submitButtonText}>
                    Submit {activeTab === 'requests' ? 'Request' : 'Grievance'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};