
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssetFormData } from '../types/asset.types';

interface CreateAssetModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: AssetFormData) => Promise<boolean>;
  isDark?: boolean;
  city?: string;
}

const EMPTY = (city: string): AssetFormData => ({
  asset_name: '', asset_type: '', asset_description: '', asset_count: '', city,
});

export const CreateAssetModal: React.FC<CreateAssetModalProps> = ({
  visible, onClose, onSubmit, isDark = false, city = '',
}) => {
  const [form, setForm] = useState<AssetFormData>(EMPTY(city));
  const [loading, setLoading] = useState(false);

  useEffect(() => { setForm(f => ({ ...f, city })); }, [city]);

  const T = {
    bg: isDark ? '#111a2d' : '#ffffff',
    inputBg: isDark ? '#1a2539' : '#f6f6f6',
    text: isDark ? '#ffffff' : '#333333',
    sub: isDark ? '#a0a0a0' : '#666666',
    accent: '#008069',
    border: isDark ? '#2a3549' : '#e0e0e0',
    cityBg: isDark ? '#1e3a2f' : '#e6f4f1',
  };

  const handleSubmit = async () => {
    if (!form.asset_name.trim() || !form.asset_type.trim() || !form.asset_count) {
      Alert.alert('Error', 'Asset name, type, and count are required');
      return;
    }
    const suffix = `-${city.toLowerCase()}`;
    const finalName = city && !form.asset_name.toLowerCase().endsWith(suffix)
      ? `${form.asset_name.trim()}${suffix}` : form.asset_name.trim();

    setLoading(true);
    const success = await onSubmit({ ...form, asset_name: finalName, city });
    setLoading(false);
    if (success) { setForm(EMPTY(city)); onClose(); }
  };

  const handleClose = () => { setForm(EMPTY(city)); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: T.bg }]}>

          <View style={styles.header}>
            <Text style={[styles.title, { color: T.text }]}>Create Asset</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={T.sub} />
            </TouchableOpacity>
          </View>

          {city ? (
            <View style={[styles.cityBadge, { backgroundColor: T.cityBg }]}>
              <Ionicons name="location" size={14} color={T.accent} />
              <Text style={[styles.cityBadgeText, { color: T.accent }]}>{city}</Text>
            </View>
          ) : null}

          {/* Info note about serials */}
          <View style={[styles.infoNote, { backgroundColor: isDark ? '#1a2539' : '#EFF6FF' }]}>
            <Ionicons name="information-circle-outline" size={15} color="#2563EB" />
            <Text style={{ fontSize: 12, color: '#2563EB', flex: 1, lineHeight: 17 }}>
              Serial numbers can be added after creation via the asset's edit screen.
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { label: 'Asset Name', key: 'asset_name', placeholder: 'e.g., Laptop, Printer', required: true },
              { label: 'Asset Type', key: 'asset_type', placeholder: 'e.g., Electronics, Furniture', required: true },
            ].map(field => (
              <View style={styles.group} key={field.key}>
                <Text style={[styles.label, { color: T.text }]}>
                  {field.label} {field.required && <Text style={{ color: '#ff4444' }}>*</Text>}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: T.inputBg, color: T.text, borderColor: T.border }]}
                  placeholder={field.placeholder} placeholderTextColor={T.sub}
                  value={(form as any)[field.key]}
                  onChangeText={t => setForm(f => ({ ...f, [field.key]: t }))}
                />
                {field.key === 'asset_name' && city && (
                  <Text style={{ fontSize: 11, color: T.sub, marginTop: 3 }}>
                    Saved as: "{form.asset_name || 'name'}-{city.toLowerCase()}"
                  </Text>
                )}
              </View>
            ))}

            <View style={styles.group}>
              <Text style={[styles.label, { color: T.text }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: T.inputBg, color: T.text, borderColor: T.border }]}
                placeholder="Optional description" placeholderTextColor={T.sub}
                value={form.asset_description} onChangeText={t => setForm(f => ({ ...f, asset_description: t }))}
                multiline numberOfLines={3}
              />
            </View>

            <View style={styles.group}>
              <Text style={[styles.label, { color: T.text }]}>
                Count <Text style={{ color: '#ff4444' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: T.inputBg, color: T.text, borderColor: T.border }]}
                placeholder="Total quantity" placeholderTextColor={T.sub}
                value={form.asset_count.toString()} keyboardType="numeric"
                onChangeText={t => setForm(f => ({ ...f, asset_count: t }))}
              />
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: T.border }]}>
            <TouchableOpacity
              style={[styles.btn, { borderWidth: 1, borderColor: T.border }]}
              onPress={handleClose}
            >
              <Text style={[styles.btnText, { color: T.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: T.accent }]}
              onPress={handleSubmit} disabled={loading}
            >
              <Text style={[styles.btnText, { color: 'white' }]}>
                {loading ? 'Creating...' : 'Create Asset'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  cityBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 12, gap: 5 },
  cityBadgeText: { fontSize: 13, fontWeight: '700' },
  infoNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, padding: 10, borderRadius: 10, marginBottom: 16 },
  group: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 7 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15 },
  textArea: { minHeight: 76, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },
});
