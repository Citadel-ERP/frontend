import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { Asset, AssetFormData, AssetFilters } from '../types/asset.types';
import { AssetService } from '../services/assetService';
import { validateAssetForm } from '../utils/validators';

export const useAssets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AssetFilters>({});

  const fetchAssets = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const response = await AssetService.getAssets();
      if (response.data && Array.isArray(response.data)) {
        setAssets(response.data);
      }
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Error', err.message || 'Failed to fetch assets');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const refreshAssets = useCallback(async () => {
    setRefreshing(true);
    await fetchAssets(false);
    setRefreshing(false);
  }, [fetchAssets]);

  const createAsset = useCallback(async (data: AssetFormData) => {
    const errors = validateAssetForm(data);
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors[0].message);
      return false;
    }

    setLoading(true);
    try {
      const response = await AssetService.createAsset(data);
      Alert.alert('Success', response.message || 'Asset created successfully');
      await fetchAssets(false);
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchAssets]);

  const updateAsset = useCallback(async (id: number, data: Partial<AssetFormData>) => {
    const errors = validateAssetForm(data);
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors[0].message);
      return false;
    }

    setLoading(true);
    try {
      const response = await AssetService.updateAsset(id, data);
      Alert.alert('Success', response.message || 'Asset updated successfully');
      await fetchAssets(false);
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchAssets]);

  const deleteAsset = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const response = await AssetService.deleteAsset(id);
      Alert.alert('Success', response.message || 'Asset deleted successfully');
      await fetchAssets(false);
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchAssets]);

  const filterAssets = useCallback((assets: Asset[]): Asset[] => {
    return assets.filter(asset => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          asset.asset_name.toLowerCase().includes(searchLower) ||
          asset.asset_type.toLowerCase().includes(searchLower) ||
          asset.asset_description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      if (filters.asset_type && asset.asset_type !== filters.asset_type) {
        return false;
      }
      
      if (filters.location) {
        const location = asset.asset_name.split('-')[1] || '';
        if (!location.toLowerCase().includes(filters.location.toLowerCase())) {
          return false;
        }
      }
      
      return true;
    });
  }, [filters]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return {
    assets,
    filteredAssets: filterAssets(assets),
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
  };
};