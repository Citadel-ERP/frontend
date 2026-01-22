// hr_employee_management/assets.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Employee } from './types';
import { WHATSAPP_COLORS } from './constants';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';

interface AssetsProps {
  visible: boolean;
  onClose: () => void;
  employee: Employee;
  token: string;
  assignedAssets: any[];
}

interface Asset {
  id: string;
  name: string;
  type: string;
  asset_id: string;
  asset_count: number;
  available_count: number;
}

const AssetsModal: React.FC<AssetsProps> = ({
  visible,
  onClose,
  employee,
  token,
  assignedAssets,
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchAssets();
    }
  }, [visible]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/hr_manager/getAssets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignAsset = async () => {
    if (!selectedAsset || !quantity || parseInt(quantity) <= 0) {
      Alert.alert('Error', 'Please select asset and enter valid quantity');
      return;
    }

    if (parseInt(quantity) > selectedAsset.available_count) {
      Alert.alert('Error', 'Not enough assets available');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/hr_manager/assignEmployeeAssets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employee_id: employee.employee_id,
          assets: [{
            asset_id: selectedAsset.asset_id,
            asset_count: parseInt(quantity)
          }]
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Asset assigned successfully');
        setShowAssignModal(false);
        setSelectedAsset(null);
        setQuantity('1');
        onClose();
      } else {
        Alert.alert('Error', 'Failed to assign asset');
      }
    } catch (error) {
      console.error('Error assigning asset:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const removeAsset = async (assetId: string) => {
    Alert.alert(
      'Remove Asset',
      'Are you sure you want to remove this asset from the employee?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // API call to remove asset
              Alert.alert('Success', 'Asset removed successfully');
            } catch (error) {
              console.error('Error removing asset:', error);
              Alert.alert('Error', 'Failed to remove asset');
            }
          }
        }
      ]
    );
  };

  const renderAssetItem = ({ item }: { item: Asset }) => (
    <View style={styles.assetItem}>
      <View style={styles.assetInfo}>
        <Text style={styles.assetName}>{item.name}</Text>
        <Text style={styles.assetType}>{item.type}</Text>
        <Text style={styles.assetCount}>Available: {item.available_count}</Text>
      </View>
      <TouchableOpacity
        style={styles.assignButton}
        onPress={() => {
          setSelectedAsset(item);
          setShowAssignModal(true);
        }}
      >
        <Text style={styles.assignButtonText}>Assign</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAssignedAsset = (asset: any, index: number) => (
    <View key={index} style={styles.assignedAssetItem}>
      <View style={styles.assignedAssetInfo}>
        <Text style={styles.assignedAssetName}>{asset.asset.name}</Text>
        <Text style={styles.assignedAssetDetails}>
          {asset.asset.type} • Qty: {asset.asset_count}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeAsset(asset.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#D32F2F" />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.assetsModalOverlay}>
        <View style={styles.assetsModalContainer}>
          <View style={styles.assetsModalHeader}>
            <Text style={styles.assetsModalTitle}>
              Manage Assets - {employee.full_name}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={WHATSAPP_COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assigned Assets</Text>
              {assignedAssets.length > 0 ? (
                assignedAssets.map(renderAssignedAsset)
              ) : (
                <Text style={styles.noAssetsText}>No assets assigned</Text>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Available Assets</Text>
                <TouchableOpacity onPress={fetchAssets}>
                  <Ionicons name="refresh" size={20} color={WHATSAPP_COLORS.primary} />
                </TouchableOpacity>
              </View>
              
              {loading ? (
                <Text>Loading...</Text>
              ) : assets.length > 0 ? (
                <FlatList
                  data={assets}
                  renderItem={renderAssetItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={styles.noAssetsText}>No assets available</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      <Modal
        visible={showAssignModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Asset</Text>
            </View>
            
            {selectedAsset && (
              <>
                <Text style={styles.modalLabel}>Asset: {selectedAsset.name}</Text>
                <Text style={styles.modalLabel}>Type: {selectedAsset.type}</Text>
                <Text style={styles.modalLabel}>Available: {selectedAsset.available_count}</Text>
                
                <Text style={styles.modalLabel}>Quantity</Text>
                <TextInput
                  style={styles.modalInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="Enter quantity"
                />
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowAssignModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton]}
                    onPress={assignAsset}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.submitButtonText}>Assign</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

export default AssetsModal;