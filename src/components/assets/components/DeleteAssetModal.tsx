import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from '../types/asset.types';

interface DeleteAssetModalProps {
  visible: boolean;
  asset: Asset | null;
  onClose: () => void;
  onConfirm: (id: number) => Promise<void>;
  loading?: boolean;
  isDark?: boolean;
}

export const DeleteAssetModal: React.FC<DeleteAssetModalProps> = ({
  visible,
  asset,
  onClose,
  onConfirm,
  loading = false,
  isDark = false,
}) => {
  const theme = {
    bgColor: isDark ? '#111a2d' : '#ffffff',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    accentBlue: '#008069',
    errorBg: isDark ? '#3a1a1a' : '#fee',
    errorText: '#ff4444',
    borderColor: isDark ? '#2a3549' : '#e0e0e0',
  };

  if (!asset) return null;

  const assetBaseName = asset.asset_name.split('-')[0];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.bgColor }]}>
          <View style={[styles.iconContainer, { backgroundColor: theme.errorBg }]}>
            <Ionicons name="warning" size={48} color={theme.errorText} />
          </View>

          <Text style={[styles.title, { color: theme.textMain }]}>
            Delete Asset
          </Text>

          <Text style={[styles.message, { color: theme.textSub }]}>
            Are you sure you want to delete{' '}
            <Text style={{ fontWeight: '600', color: theme.textMain }}>
              {assetBaseName}
            </Text>
            ? This action cannot be undone.
          </Text>

          {asset.asset_count > 0 && (
            <View style={[styles.warningBox, { backgroundColor: theme.errorBg }]}>
              <Ionicons name="information-circle" size={20} color={theme.errorText} />
              <Text style={[styles.warningText, { color: theme.errorText }]}>
                This asset has a count of {asset.asset_count}. Deleting it will remove all instances.
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: theme.borderColor }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: theme.textMain }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.deleteButton, { backgroundColor: theme.errorText }]}
              onPress={() => onConfirm(asset.id!)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={[styles.buttonText, { color: 'white' }]}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  deleteButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});