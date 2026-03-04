
import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Alert } from 'react-native';
import { AssetHeader } from './components/AssetHeader';
import { AssetList } from './components/AssetList';
import { CreateAssetModal } from './components/CreateAssetModal';
import { UpdateAssetModal } from './components/UpdateAssetModal';
import { ExcelUploadModal } from './components/ExcelUploadModal';
import { DeleteAssetModal } from './components/DeleteAssetModal';
import { AssetCitySelection } from './components/CitySelection';
import { useAssets } from './hooks/useAssets';
import { Asset, AssetFormData } from './types/asset.types';

interface AssetModuleProps {
  onBack: () => void;
  isDark?: boolean;
}

export default function AssetModule({ onBack, isDark = false }: AssetModuleProps) {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  const {
    assets, filteredAssets, loading, refreshing, error,
    filters, setFilters, fetchAssets,
    createAsset, updateAsset, deleteAsset,
    addSerialIds, deleteSerialId,
  } = useAssets(selectedCity ?? '');

  if (!selectedCity) {
    return <AssetCitySelection onCitySelect={setSelectedCity} onBack={onBack} isDark={isDark} />;
  }

  const handleAssetPress = (asset: Asset) => { setSelectedAsset(asset); setShowUpdateModal(true); };
  const handleDeletePress = (asset: Asset) => { setAssetToDelete(asset); setShowDeleteModal(true); };

  const handleConfirmDelete = async (id: number) => {
    const success = await deleteAsset(id);
    if (success) { setShowDeleteModal(false); setAssetToDelete(null); }
  };

  const handleExcelUpload = async (assetsData: AssetFormData[]) => {
    let successCount = 0;
    let errorCount = 0;
    for (const asset of assetsData) {
      const success = await createAsset(asset);
      if (success) successCount++; else errorCount++;
    }
    Alert.alert('Upload Complete', `Uploaded: ${successCount}  Failed: ${errorCount}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#050b18' : '#ece5dd' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="#008069" />

      <AssetHeader
        title={`Assets · ${selectedCity}`}
        onBack={() => setSelectedCity(null)}
        onSearch={(query) => setFilters({ ...filters, search: query })}
        searchQuery={filters.search || ''}
        onAddPress={() => setShowCreateModal(true)}
        onUploadPress={() => setShowUploadModal(true)}
        selectedCity={selectedCity}
        onCityFilter={() => {}}
        isDark={isDark}
      />

      <AssetList
        assets={filteredAssets}
        loading={loading}
        refreshing={refreshing}
        onRefresh={fetchAssets}
        onAssetPress={handleAssetPress}
        onDeletePress={handleDeletePress}
        selectedCity={selectedCity}
        isDark={isDark}
      />

      <DeleteAssetModal
        visible={showDeleteModal}
        asset={assetToDelete}
        onClose={() => { setShowDeleteModal(false); setAssetToDelete(null); }}
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
        onClose={() => { setShowUpdateModal(false); setSelectedAsset(null); }}
        onSubmit={updateAsset}
        onAddSerialIds={addSerialIds}
        onDeleteSerialId={deleteSerialId}
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

const styles = StyleSheet.create({ container: { flex: 1 } });
