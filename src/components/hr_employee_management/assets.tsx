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
import { BACKEND_URL } from '../../config/config';

// Mock types and constants for demo
interface Employee {
  employee_id: string;
  full_name: string;
}

interface AssetsProps {
  visible: boolean;
  onClose: () => void;
  employee: Employee;
  token: string;
  assignedAssets: any[];
  onRefresh?: () => void; // Add this prop
}

interface Asset {
  id: string;
  asset_name: string;
  asset_type: string;
  asset_count: number;
  available_count: number;
}

const WHATSAPP_COLORS = {
  primary: '#25D366',
  textPrimary: '#000',
  surface: '#fff',
  border: '#e0e0e0',
};

const AssetsModal: React.FC<AssetsProps> = ({
  visible,
  onClose,
  employee,
  token,
  assignedAssets,
  onRefresh, // Receive the refresh callback
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
      const response = await fetch(`${BACKEND_URL}/manager/getAssets`, {
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

    const payload = {
      token,
      employee_id: employee.employee_id,
      assets: [{
        asset_id: selectedAsset.id,
        asset_count: parseInt(quantity)
      }]
    };

    try {
      const response = await fetch(`${BACKEND_URL}/manager/assignEmployeeAssets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok) {
        // Close the assign modal first
        setShowAssignModal(false);
        setSelectedAsset(null);
        setQuantity('1');

        // Show success alert with callback
        Alert.alert(
          'Success',
          'Asset assigned successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh the data if callback provided
                if (onRefresh) {
                  onRefresh();
                }
                // Refresh assets list in this modal
                fetchAssets();
                // Don't close the modal - let user close it manually
                // onClose(); // REMOVED - This was causing the issue
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', responseData.message || 'Failed to assign asset');
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
              const response = await fetch(`${BACKEND_URL}/manager/removeAssignedAssets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  assigned_asset_id: assetId
                }),
              });

              const responseData = await response.json();

              if (response.ok) {
                Alert.alert(
                  'Success',
                  'Asset removed successfully',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        if (onRefresh) {
                          onRefresh();
                        }
                        fetchAssets();
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Error', responseData.message || 'Failed to remove asset');
              }
            } catch (error) {
              console.error('Error removing asset:', error);
              Alert.alert('Error', 'Network error occurred');
            }
          }
        }
      ]
    );
  };

  const renderAssetItem = ({ item }: { item: Asset }) => (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: '#f5f5f5',
      borderRadius: 8,
      marginBottom: 8,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#000' }}>
          {item.asset_name}
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          {item.asset_type}
        </Text>
        <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
          Available: {item.available_count}
        </Text>
      </View>
      <TouchableOpacity
        style={{
          backgroundColor: WHATSAPP_COLORS.primary,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 6,
        }}
        onPress={() => {
          setSelectedAsset(item);
          setShowAssignModal(true);
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>Assign</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAssignedAsset = (asset: any, index: number) => (
    <View key={index} style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: '#e8f5e9',
      borderRadius: 8,
      marginBottom: 8,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#000' }}>
          {asset.asset.name}
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
          {asset.asset.type} • Qty: {asset.asset_count}
        </Text>
      </View>
      <TouchableOpacity
        style={{ padding: 8 }}
        onPress={() => removeAsset(asset.id)}
      >
        <Text style={{ color: '#D32F2F', fontSize: 20 }}>🗑️</Text>
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
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}>
        <View style={{
          flex: 1,
          backgroundColor: '#fff',
          marginTop: 60,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: WHATSAPP_COLORS.border,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>
              Manage Assets - {employee.full_name}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 24 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }}>
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
                Assigned Assets
              </Text>
              {assignedAssets.length > 0 ? (
                assignedAssets.map(renderAssignedAsset)
              ) : (
                <Text style={{ color: '#888', fontStyle: 'italic' }}>
                  No assets assigned
                </Text>
              )}
            </View>

            <View style={{ padding: 16 }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <Text style={{ fontSize: 16, fontWeight: '600' }}>
                  Available Assets
                </Text>
                <TouchableOpacity onPress={fetchAssets}>
                  <Text style={{ color: WHATSAPP_COLORS.primary }}>🔄</Text>
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
                <Text style={{ color: '#888', fontStyle: 'italic' }}>
                  No assets available
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Assign Asset Modal */}
      <Modal
        visible={showAssignModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 20,
            width: '85%',
            maxWidth: 400,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
              Assign Asset
            </Text>

            {selectedAsset && (
              <>
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                  Asset: {selectedAsset.asset_name}
                </Text>
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                  Type: {selectedAsset.asset_type}
                </Text>
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
                  Available: {selectedAsset.available_count}
                </Text>

                <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                  Quantity
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: WHATSAPP_COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                    marginBottom: 20,
                  }}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="Enter quantity"
                />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: '#f5f5f5',
                      padding: 14,
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                    onPress={() => setShowAssignModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: WHATSAPP_COLORS.primary,
                      padding: 14,
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                    onPress={assignAsset}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                      Assign
                    </Text>
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