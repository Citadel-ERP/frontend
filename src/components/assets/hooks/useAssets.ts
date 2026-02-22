import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { Asset, AssetFormData, AssetFilters } from '../types/asset.types';
import { AssetService } from '../services/assetService';
import { validateAssetForm } from '../utils/validators';

export const useAssets = (city: string = '') => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AssetFilters>({});

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchAssets = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      setError(null);
      try {
        // Always pass city — backend handles exact matching
        const response = await AssetService.getAssets(city || undefined);
        if (response.data && Array.isArray(response.data)) {
          setAssets(response.data);
        }
      } catch (err: any) {
        setError(err.message);
        Alert.alert('Error', err.message || 'Failed to fetch assets');
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [city], // re-fetch automatically when city changes
  );

  const refreshAssets = useCallback(async () => {
    setRefreshing(true);
    await fetchAssets(false);
    setRefreshing(false);
  }, [fetchAssets]);

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  const createAsset = useCallback(
    async (data: AssetFormData) => {
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
    },
    [fetchAssets],
  );

  const updateAsset = useCallback(
    async (id: number, data: Partial<AssetFormData>) => {
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
    },
    [fetchAssets],
  );

  const deleteAsset = useCallback(
    async (id: number) => {
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
    },
    [fetchAssets],
  );

  // ─── Client-side filtering (search + type only; city is handled server-side) ──
  const filterAssets = useCallback(
    (rawAssets: Asset[]): Asset[] => {
      return rawAssets.filter((asset) => {
        // 1. Text search
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const matches =
            asset.asset_name.toLowerCase().includes(q) ||
            asset.asset_type.toLowerCase().includes(q) ||
            (asset.asset_description ?? '').toLowerCase().includes(q) ||
            (asset.asset_serial ?? '').toLowerCase().includes(q);
          if (!matches) return false;
        }

        // 2. Asset-type dropdown filter
        if (filters.asset_type && asset.asset_type !== filters.asset_type) {
          return false;
        }

        return true;
      });
    },
    [filters],
  );

  // ─── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]); // fetchAssets already re-creates when city changes

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