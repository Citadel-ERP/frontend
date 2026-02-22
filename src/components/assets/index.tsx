import React, { useState } from 'react';
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
import { AssetCitySelection } from './components/CitySelection';

interface AssetModuleProps {
  onBack: () => void;
  isDark?: boolean;
}

export default function AssetModule({ onBack, isDark = false }: AssetModuleProps) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const {
    assets,
    filteredAssets,
    loading,
    refreshing,
    error,
    filters,
    setFilters,
    fetchAssets,
    refreshAssets,
    createAsset,
    updateAsset,
    deleteAsset,
  } = useAssets(selectedCity ?? '');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  const theme = {
    bgColor: isDark ? '#050b18' : '#ece5dd',
  };

  // ─── City not yet chosen → show city picker ───────────────────────────────
  if (!selectedCity) {
    return (
      <AssetCitySelection
        onCitySelect={(city) => setSelectedCity(city)}
        onBack={onBack}
        isDark={isDark}
      />
    );
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────
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
      } catch {
        errorCount++;
      }
    }

    Alert.alert(
      'Upload Complete',
      `Successfully uploaded: ${successCount}\nFailed: ${errorCount}`,
    );
  };

  const handleRefresh = () => {
    fetchAssets();
  };

  // Go back to city selection instead of exiting the module entirely
  const handleBackToCity = () => {
    setSelectedCity(null);
  };

  // ─── Main asset list UI ───────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bgColor }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="#008069"
      />

      <AssetHeader
        title={`Assets · ${selectedCity}`}
        onBack={handleBackToCity}
        onSearch={(query) => setFilters({ ...filters, search: query })}
        searchQuery={filters.search || ''}
        onAddPress={() => setShowCreateModal(true)}
        onUploadPress={() => setShowUploadModal(true)}
        selectedCity={selectedCity}
        onCityFilter={() => {}}   // no-op – city is set at module level now
        isDark={isDark}
      />

      <AssetList
        assets={filteredAssets}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onAssetPress={handleAssetPress}
        onDeletePress={handleDeletePress}
        selectedCity={selectedCity}
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
        city={selectedCity}
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