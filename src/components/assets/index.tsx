import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { AssetHeader } from './components/AssetHeader';
import { AssetList } from './components/AssetList';
import { CreateAssetModal } from './components/CreateAssetModal';
import { UpdateAssetModal } from './components/UpdateAssetModal';
import { ExcelUploadModal } from './components/ExcelUploadModal';
import { useAssets } from './hooks/useAssets';
import { Asset, AssetFormData } from './types/asset.types';
import { DeleteAssetModal } from './components/DeleteAssetModal';

interface AssetModuleProps {
  onBack: () => void;
  isDark?: boolean;
}

export default function AssetModule({ onBack, isDark = false }: AssetModuleProps) {
  const {
    assets,
    filteredAssets,
    loading,
    refreshing,        // Add this
    error,
    filters,
    setFilters,
    fetchAssets,       // Add this
    refreshAssets,     // Add this (if you want separate refresh function)
    createAsset,
    updateAsset,
    deleteAsset,
  } = useAssets();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  const theme = {
    bgColor: isDark ? '#050b18' : '#ece5dd',
  };

  const handleAssetPress = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowUpdateModal(true);
  };

  const handleDeletePress = (asset: Asset) => {
    setAssetToDelete(asset);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async (id: number) => {
    const success = await deleteAsset(id);
    if (success) {
      setShowDeleteModal(false);
      setAssetToDelete(null);
    }
  };

  const handleExcelUpload = async (assets: AssetFormData[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const asset of assets) {
      try {
        const success = await createAsset(asset);
        if (success) successCount++;
        else errorCount++;
      } catch (error) {
        errorCount++;
      }
    }

    Alert.alert(
      'Upload Complete',
      `Successfully uploaded: ${successCount}\nFailed: ${errorCount}`
    );
  };

  const handleRefresh = () => {
    fetchAssets();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgColor }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="#008069"
      />
      
      <AssetHeader
        title="Asset Management"
        onBack={onBack}
        onSearch={(query) => setFilters({ ...filters, search: query })}
        searchQuery={filters.search || ''}
        onAddPress={() => setShowCreateModal(true)}
        onUploadPress={() => setShowUploadModal(true)}
        isDark={isDark}
      />

      <AssetList
        assets={filteredAssets}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onAssetPress={handleAssetPress}
        onDeletePress={handleDeletePress}
        isDark={isDark}
      />

      <DeleteAssetModal
        visible={showDeleteModal}
        asset={assetToDelete}
        onClose={() => {
          setShowDeleteModal(false);
          setAssetToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={loading}
        isDark={isDark}
      />

      <CreateAssetModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={createAsset}
        isDark={isDark}
      />

      <UpdateAssetModal
        visible={showUpdateModal}
        asset={selectedAsset}
        onClose={() => {
          setShowUpdateModal(false);
          setSelectedAsset(null);
        }}
        onSubmit={updateAsset}
        isDark={isDark}
      />

      <ExcelUploadModal
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleExcelUpload}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});